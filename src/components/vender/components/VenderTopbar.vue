<template>
	<!-- Barra superior del módulo Vender con atajos configurables por usuario -->
	<div class="vender-topbar vender-full-bleed">
		<span class="vender-topbar__title">Vender</span>

		<!-- Boton para elegir columnas visibles de la tabla de items (sistema props-to-show) -->
		<props-to-show
		class="vender-topbar__props-to-show"
		model_name="vender"></props-to-show>

		<!-- Lista de atajos editables con select F1-F10 por acción -->
		<div class="vender-topbar__shortcuts">
			<span
			v-for="shortcut in shortcut_actions"
			:key="shortcut.action"
			class="vender-topbar__shortcut"
			:class="{ 'vender-topbar__shortcut--print': shortcut.action === 'print' }">
				<b-form-select
				class="vender-topbar__select"
				size="sm"
				:value="draft_shortcuts[shortcut.action]"
				:options="key_options"
				:disabled="keyboard_shortcuts_saving"
				@change="on_shortcut_key_change(shortcut.action, $event)">
				</b-form-select>
				<span class="vender-topbar__label">{{ shortcut.label }}</span>

				<!-- Configuración de impresión solo en el atajo Imprimir -->
				<button
				v-if="shortcut.action === 'print'"
				type="button"
				class="btn btn-sm btn-link vender-topbar__config-btn"
				title="Configurar impresión del atajo"
				aria-label="Configurar impresión del atajo"
				:disabled="keyboard_shortcuts_saving"
				@click="open_print_config_modal">
					<i class="icon-configuration"></i>
				</button>
			</span>

			<!-- Botón guardar visible solo si hay cambios pendientes -->
			<button
			v-if="has_unsaved_changes"
			type="button"
			class="btn btn-sm btn-primary vender-topbar__save-btn"
			:disabled="keyboard_shortcuts_saving"
			@click="save_shortcuts">
				{{ keyboard_shortcuts_saving ? 'Guardando...' : 'Guardar atajos' }}
			</button>
		</div>

		<print-shortcut-config-modal
		ref="print_shortcut_config_modal"
		:print_options="draft_print_options"
		:print_shortcut_key="draft_shortcuts.print"
		:pdf_column_profiles="pdf_column_profiles"
		:saving="keyboard_shortcuts_saving"
		@apply="on_print_options_apply">
		</print-shortcut-config-modal>
	</div>
</template>

<script>
import {
	VENDER_KEYBOARD_SHORTCUT_ACTIONS,
	get_vender_keyboard_shortcut_key_options,
	normalize_vender_keyboard_shortcuts,
	vender_keyboard_shortcuts_have_duplicates,
} from '@/constants/vender_keyboard_shortcuts'
import {
	normalize_vender_print_options,
	vender_print_options_are_equal,
} from '@/constants/vender_print_shortcut_options'
import PrintShortcutConfigModal from './PrintShortcutConfigModal'

export default {
	name: 'VenderTopbar',
	components: {
		PrintShortcutConfigModal,
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
	},
	data() {
		return {
			/* Mapa editable en pantalla antes de persistir en la API */
			draft_shortcuts: normalize_vender_keyboard_shortcuts(null),

			/* Opciones del atajo Imprimir (se editan en el modal) */
			draft_print_options: normalize_vender_print_options(null),

			/* Indica si el borrador difiere de lo guardado en el store */
			has_unsaved_changes: false,
		}
	},
	computed: {
		/**
		 * Acciones fijas del módulo con su etiqueta visible.
		 *
		 * @returns {Array<{action: string, label: string}>}
		 */
		shortcut_actions() {
			return VENDER_KEYBOARD_SHORTCUT_ACTIONS
		},

		/**
		 * Opciones F1-F10 para cada select de tecla.
		 *
		 * @returns {Array<{value: string, text: string}>}
		 */
		key_options() {
			return get_vender_keyboard_shortcut_key_options()
		},

		/**
		 * Atajos persistidos en el store (fuente de verdad tras guardar).
		 *
		 * @returns {Object<string, string>}
		 */
		saved_shortcuts() {
			return this.$store.state.vender.keyboard_shortcuts
		},

		/**
		 * Opciones de impresión persistidas en el store.
		 *
		 * @returns {Object}
		 */
		saved_print_options() {
			return this.$store.state.vender.keyboard_print_options
		},

		/**
		 * Perfiles PDF cargados para armar opciones de remito/factura A4.
		 *
		 * @returns {Array}
		 */
		pdf_column_profiles() {
			return this.$store.state.pdf_column_profile.models || []
		},

		/**
		 * Indica si hay un guardado en curso.
		 *
		 * @returns {boolean}
		 */
		keyboard_shortcuts_saving() {
			return this.$store.state.vender.keyboard_shortcuts_saving
		},
	},
	watch: {
		/**
		 * Sincroniza el borrador cuando se cargan o guardan atajos desde la API.
		 */
		saved_shortcuts: {
			handler() {
				if (!this.has_unsaved_changes) {
					this.sync_draft_from_store()
				}
			},
			deep: true,
		},

		/**
		 * Sincroniza opciones de impresión cuando cambian en el store.
		 */
		saved_print_options: {
			handler() {
				if (!this.has_unsaved_changes) {
					this.sync_draft_from_store()
				}
			},
			deep: true,
		},
	},
	mounted() {
		this.sync_draft_from_store()
	},
	methods: {
		/**
		 * Copia atajos y opciones de impresión del store al borrador local.
		 */
		sync_draft_from_store() {
			this.draft_shortcuts = normalize_vender_keyboard_shortcuts(this.saved_shortcuts)
			this.draft_print_options = normalize_vender_print_options(this.saved_print_options)
			this.has_unsaved_changes = false
		},

		/**
		 * Compara borrador y store para saber si hay cambios sin guardar.
		 */
		update_unsaved_flag() {
			const draft_shortcuts = normalize_vender_keyboard_shortcuts(this.draft_shortcuts)
			const saved_shortcuts = normalize_vender_keyboard_shortcuts(this.saved_shortcuts)
			let shortcuts_changed = false

			this.shortcut_actions.forEach(function (item) {
				if (draft_shortcuts[item.action] !== saved_shortcuts[item.action]) {
					shortcuts_changed = true
				}
			})

			const print_changed = !vender_print_options_are_equal(
				this.draft_print_options,
				this.saved_print_options
			)

			this.has_unsaved_changes = shortcuts_changed || print_changed
		},

		/**
		 * Cambia la tecla de una acción; si ya estaba asignada, intercambia con la otra acción.
		 *
		 * @param {string} action
		 * @param {string} new_key
		 */
		on_shortcut_key_change(action, new_key) {
			const previous_key = this.draft_shortcuts[action]
			const next_shortcuts = Object.assign({}, this.draft_shortcuts)

			next_shortcuts[action] = new_key

			/* Intercambiar tecla si otra acción ya la tenía asignada */
			this.shortcut_actions.forEach(function (item) {
				if (item.action !== action && next_shortcuts[item.action] === new_key) {
					next_shortcuts[item.action] = previous_key
				}
			})

			this.draft_shortcuts = next_shortcuts
			this.update_unsaved_flag()
		},

		/**
		 * Abre el modal de configuración del atajo Imprimir.
		 */
		open_print_config_modal() {
			this.$refs.print_shortcut_config_modal.open_modal()
		},

		/**
		 * Recibe las opciones aplicadas desde el modal de impresión.
		 *
		 * @param {Object} print_options
		 */
		on_print_options_apply(print_options) {
			this.draft_print_options = normalize_vender_print_options(print_options)
			this.update_unsaved_flag()
		},

		/**
		 * Persiste atajos y opciones de impresión en la API.
		 */
		save_shortcuts() {
			const shortcuts = normalize_vender_keyboard_shortcuts(this.draft_shortcuts)
			const print_options = normalize_vender_print_options(this.draft_print_options)

			if (vender_keyboard_shortcuts_have_duplicates(shortcuts)) {
				this.$toast.error('No puede repetir la misma tecla en dos acciones')
				return
			}

			this.$store.commit('auth/setMessage', 'Guardando atajos de teclado')
			this.$store.commit('auth/setLoading', true)

			this.$store.dispatch('vender/save_keyboard_shortcuts', {
				shortcuts: shortcuts,
				print_options: print_options,
			})
				.then(() => {
					this.has_unsaved_changes = false
					this.$toast.success('Atajos de teclado guardados')
				})
				.catch((err) => {
					if (err && err.message === 'duplicate_keys') {
						this.$toast.error('No puede repetir la misma tecla en dos acciones')
					} else {
						this.$toast.error('Error al guardar los atajos de teclado')
					}
				})
				.finally(() => {
					this.$store.commit('auth/setLoading', false)
					this.$store.commit('auth/setMessage', '')
				})
		},
	},
}
</script>

<style scoped lang="sass">
/* Topbar superior del módulo Vender */
.vender-topbar
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 16px
	box-sizing: border-box
	flex-shrink: 0
	border-bottom: 1px solid var(--color-border-tertiary, #dee2e6)
	padding: 8px 15px

	/* Título del módulo */
	&__title
		font-weight: 600
		font-size: 0.85rem
		color: var(--color-text-secondary, #6c757d)
		letter-spacing: 0.05em
		text-transform: uppercase

	/* Boton del sistema de columnas configurables (ojito) */
	&__props-to-show
		display: inline-flex
		flex-shrink: 0

	/* Contenedor de todos los atajos */
	&__shortcuts
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 10px

	/* Chip de un atajo individual */
	&__shortcut
		display: inline-flex
		align-items: center
		gap: 6px
		padding: 4px 10px 4px 6px
		font-size: 0.78rem
		color: var(--color-text-primary, #212529)
		background: var(--bg-section, #f8f9fa)
		border: 1px solid var(--color-border-tertiary, #dee2e6)
		border-radius: 999px
		box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04)

	&__shortcut--print
		padding-right: 6px

	/* Select de tecla F1-F10 */
	&__select
		width: auto
		min-width: 54px
		font-size: 0.72rem
		font-family: monospace
		font-weight: 600
		padding: 2px 6px
		height: auto
		background: var(--bg-card, #fff)
		border-color: var(--color-border-tertiary, #dee2e6)
		border-radius: 6px
		color: var(--color-text-primary, #212529)

	/* Descripción del atajo */
	&__label
		color: var(--color-text-primary, #212529)
		font-weight: 500
		white-space: nowrap

	/* Botón de configuración del atajo Imprimir */
	&__config-btn
		display: inline-flex
		align-items: center
		justify-content: center
		width: 22px
		height: 22px
		padding: 0
		margin-left: 2px
		line-height: 1
		border-radius: 50%
		color: var(--color-text-secondary, #6c757d)
		text-decoration: none
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border-tertiary, #dee2e6)

		&:hover,
		&:focus
			color: var(--color-primary, #007bff)
			border-color: var(--color-primary, #007bff)
			background: var(--bg-card, #fff)
			text-decoration: none

	/* Botón guardar a la derecha del último atajo */
	&__save-btn
		margin-left: 2px
		font-size: 0.78rem
		white-space: nowrap
		border-radius: 999px
		padding-left: 12px
		padding-right: 12px
</style>
