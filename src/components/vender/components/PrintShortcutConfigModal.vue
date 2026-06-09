<template>
	<b-modal
	id="vender-print-shortcut-config-modal"
	title="Configurar impresión del atajo"
	size="md"
	hide-footer
	@shown="on_modal_shown"
	@hidden="on_modal_hidden">

		<p class="vender-print-shortcut-modal__help">
			Define qué se imprime al presionar el atajo
			<kbd>{{ print_shortcut_key }}</kbd>.
			Si elegís Ticket 2.0, aplica tanto a ventas sin factura AFIP como facturadas.
		</p>

		<div class="vender-print-shortcut-modal__field">
			<label class="vender-print-shortcut-modal__label">Modo de impresión</label>
			<b-form-select
			size="sm"
			:value="modal_print_mode_value"
			:options="print_mode_options"
			:disabled="saving"
			@change="on_print_mode_change">
			</b-form-select>
		</div>

		<template v-if="!modal_print_options.use_ticket_2_for_both">
			<div class="vender-print-shortcut-modal__field">
				<label class="vender-print-shortcut-modal__label">Ventas sin factura AFIP (remitos)</label>
				<b-form-select
				size="sm"
				v-model="modal_print_options.remito"
				:options="remito_print_options"
				:disabled="saving">
				</b-form-select>
			</div>

			<div class="vender-print-shortcut-modal__field">
				<label class="vender-print-shortcut-modal__label">Ventas facturadas (con ticket AFIP)</label>
				<b-form-select
				size="sm"
				v-model="modal_print_options.facturado"
				:options="facturado_print_options"
				:disabled="saving">
				</b-form-select>
			</div>
		</template>

		<div class="vender-print-shortcut-modal__actions">
			<b-button
			variant="secondary"
			size="sm"
			:disabled="saving"
			@click="close_modal">
				Cancelar
			</b-button>
			<b-button
			variant="primary"
			size="sm"
			:disabled="saving"
			@click="apply_changes">
				Aplicar
			</b-button>
		</div>
	</b-modal>
</template>

<script>
import {
	VENDER_PRINT_OPTION_TICKET_2,
	normalize_vender_print_options,
	build_vender_remito_print_select_options,
	build_vender_facturado_print_select_options,
} from '@/constants/vender_print_shortcut_options'

export default {
	name: 'PrintShortcutConfigModal',
	props: {
		/**
		 * Borrador actual de opciones de impresión del topbar.
		 */
		print_options: {
			type: Object,
			required: true,
		},

		/**
		 * Tecla asignada al atajo Imprimir (p. ej. F6).
		 */
		print_shortcut_key: {
			type: String,
			default: 'F6',
		},

		/**
		 * Perfiles PDF para opciones de remito/factura A4.
		 */
		pdf_column_profiles: {
			type: Array,
			default() {
				return []
			},
		},

		/**
		 * Indica si hay un guardado en curso en el topbar.
		 */
		saving: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/* Borrador editable mientras el modal está abierto */
			modal_print_options: normalize_vender_print_options(null),
		}
	},
	computed: {
		/**
		 * Valor del selector principal de modo de impresión.
		 *
		 * @returns {string}
		 */
		modal_print_mode_value() {
			if (this.modal_print_options.use_ticket_2_for_both) {
				return VENDER_PRINT_OPTION_TICKET_2
			}

			return 'split'
		},

		/**
		 * Modo Ticket 2.0 único o configuración separada.
		 *
		 * @returns {Array<{value: string, text: string}>}
		 */
		print_mode_options() {
			return [
				{ value: VENDER_PRINT_OPTION_TICKET_2, text: 'Ticket 2.0 (remito y facturado)' },
				{ value: 'split', text: 'Opciones separadas sin AFIP / con AFIP' },
			]
		},

		/**
		 * Opciones para ventas sin ticket AFIP.
		 *
		 * @returns {Array<{value: string, text: string}>}
		 */
		remito_print_options() {
			return build_vender_remito_print_select_options(this.pdf_column_profiles)
		},

		/**
		 * Opciones para ventas facturadas.
		 *
		 * @returns {Array<{value: string, text: string}>}
		 */
		facturado_print_options() {
			return build_vender_facturado_print_select_options(this.pdf_column_profiles)
		},
	},
	methods: {
		/**
		 * Abre el modal de configuración de impresión.
		 */
		open_modal() {
			this.$bvModal.show('vender-print-shortcut-config-modal')
		},

		/**
		 * Cierra el modal sin aplicar cambios.
		 */
		close_modal() {
			this.$bvModal.hide('vender-print-shortcut-config-modal')
		},

		/**
		 * Al mostrarse, copia el borrador del padre al modal.
		 */
		on_modal_shown() {
			this.modal_print_options = normalize_vender_print_options(this.print_options)
		},

		/**
		 * Al cerrarse, descarta el borrador local del modal.
		 */
		on_modal_hidden() {
			this.modal_print_options = normalize_vender_print_options(this.print_options)
		},

		/**
		 * Cambia entre Ticket 2.0 único o selects separados.
		 *
		 * @param {string} value
		 */
		on_print_mode_change(value) {
			if (value === VENDER_PRINT_OPTION_TICKET_2) {
				this.modal_print_options = normalize_vender_print_options({
					use_ticket_2_for_both: true,
				})
				return
			}

			this.modal_print_options = normalize_vender_print_options({
				use_ticket_2_for_both: false,
				remito: this.modal_print_options.remito,
				facturado: this.modal_print_options.facturado,
			})
		},

		/**
		 * Emite las opciones elegidas al topbar y cierra el modal.
		 */
		apply_changes() {
			const normalized = normalize_vender_print_options(this.modal_print_options)

			this.$emit('apply', normalized)
			this.close_modal()
		},
	},
}
</script>

<style scoped lang="sass">
.vender-print-shortcut-modal__help
	font-size: 0.85rem
	color: var(--color-text-secondary, #6c757d)
	margin-bottom: 16px

	kbd
		display: inline-block
		padding: 1px 5px
		font-size: 0.72rem
		font-family: monospace
		background: var(--bg-card, #fff)
		border: 1px solid var(--color-border-tertiary, #dee2e6)
		border-radius: 3px

.vender-print-shortcut-modal__field
	margin-bottom: 14px

.vender-print-shortcut-modal__label
	display: block
	font-size: 0.8rem
	font-weight: 600
	margin-bottom: 4px
	color: var(--color-text-primary, #212529)

.vender-print-shortcut-modal__actions
	display: flex
	justify-content: flex-end
	gap: 8px
	margin-top: 8px
</style>
