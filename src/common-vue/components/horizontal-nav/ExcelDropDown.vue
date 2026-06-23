<template>

	<div>

		<export-history
		:model_name="model_name"></export-history>

		<masive-update-history
		v-if="show_masive_update_history"
		:model_name="model_name"></masive-update-history>

		<!-- Modal de importación IA: mismo criterio que el ítem del menú (evita id inexistente al abrir) -->
		<ai-excel-import-modal
		v-if="can_import_ai"
		:model="model_name">
		</ai-excel-import-modal>

		<b-dropdown

		right

		split 

		:id="'dropdown_'+model_name"

		size="sm"

		variant="primary"

		boundary="viewport"

		:popper-opts="dropdown_popper_opts"

		menu-class="excel-create-dropdown-menu"

		v-if="can_create || has_permission_create_dropdown"

		@click="call_set_model">

			<template 

			#button-content>

				<span

				:dusk="'btn_create_'+model_name">

					<i class="icon-plus"></i>

					Crear

				</span>

			</template>

			<excel-dropdown-option-item
			v-if="can_create"
			icon="icon-plus"
			@click="setModel(null, model_name)">
				{{ create_spanish(model_name) }}
			</excel-dropdown-option-item>

			<excel-dropdown-submenu
			v-if="show_export_submenu"
			icon="icon-upload"
			label="Exportación">
				<excel-dropdown-option-item
				icon="icon-upload"
				@click="exportModels">
					Nueva exportación
				</excel-dropdown-option-item>
				<excel-dropdown-option-item
				icon="icon-list"
				@click="open_export_history">
					Historial de exportaciones
				</excel-dropdown-option-item>
			</excel-dropdown-submenu>

			<excel-dropdown-submenu
			v-if="show_import_submenu"
			icon="icon-download"
			label="Importación">
				<excel-dropdown-option-item
				v-if="can_import_ai"
				icon="bi bi-stars"
				@click="open_ai_import">
					Importar con IA
				</excel-dropdown-option-item>
				<excel-dropdown-option-item
				v-if="can_import"
				icon="icon-list"
				@click="open_import_history">
					Historial de importaciones
				</excel-dropdown-option-item>
			</excel-dropdown-submenu>

			<excel-dropdown-option-item
			v-if="show_masive_update_history"
			icon="icon-history"
			@click="open_masive_update_history">
				Historial de actualizaciones masivas
			</excel-dropdown-option-item>

			<slot name="excel_drop_down_options"></slot>
		</b-dropdown>

	</div>

</template>

<script>

export default {

	components: {
		ExportHistory: () => import('@/common-vue/components/horizontal-nav/ExportHistory'),
		MasiveUpdateHistory: () => import('@/common-vue/components/horizontal-nav/MasiveUpdateHistory'),
		AiExcelImportModal: () => import('@/components/listado/modals/ai-excel-import/Index'),
		ExcelDropdownSubmenu: () => import('@/common-vue/components/horizontal-nav/ExcelDropdownSubmenu'),
		ExcelDropdownOptionItem: () => import('@/common-vue/components/horizontal-nav/ExcelDropdownOptionItem'),
	},
	props: {

		model_name: String,

		check_permissions: Boolean,

		can_create: Boolean,

		has_permission_create_dropdown: Boolean,

	},

	data() {
		return {
			// Popper en fixed para que el menú no quede limitado por el ancho del botón split.
			dropdown_popper_opts: {
				positionFixed: true,
			},
		}
	},

	methods: {

		/**
		 * Encola una nueva exportación Excel del modelo actual.
		 *
		 * @return {void}
		 */
		exportModels() {

			this.$api.get(this.model_name + '/excel/export')

			.then(() => {

				this.$toast.success('La exportacion se esta procesando. Te avisaremos cuando el excel este listo.', {

					duration: 4000,

				})

			})

			.catch(() => {

				this.$toast.error('No se pudo iniciar la exportacion de excel', {

					duration: 4000,

				})

			})

		},

		/**
		 * Abre el modal de historial de exportaciones del modelo actual.
		 *
		 * @return {void}
		 */
		open_export_history() {
			this.$bvModal.show('export-history')
		},

		/**
		 * Abre el modal de historial de importaciones del modelo actual.
		 *
		 * @return {void}
		 */
		open_import_history() {
			this.$bvModal.show('import-history')
		},

		/**
		 * Abre el modal de importación asistida por IA según el model_name.
		 *
		 * @return {void}
		 */
		open_ai_import() {
			// nextTick: el submenú teleportado puede cerrar el dropdown en el mismo tick del click.
			let modal_id = this.ai_import_modal_id
			let self = this
			this.$nextTick(function () {
				self.$bvModal.show(modal_id)
			})
		},

		/**
		 * Abre el historial de actualizaciones masivas (solo artículos).
		 *
		 * @return {void}
		 */
		open_masive_update_history() {
			this.$bvModal.show('masive-update-history')
		},

		/**
		 * Acción del botón principal split: crear registro si hay permiso.
		 *
		 * @return {void}
		 */
		call_set_model() {
			if (this.can_create) {

				this.setModel(null, this.model_name)

			}

		},

	},

	computed: {

		/**
		 * Permiso de exportación Excel según check_permissions y can().
		 *
		 * @return {boolean}
		 */
		can_export() {

			if (!this.check_permissions || this.can(this.model_name + '.excel.export')) {

				return true

			} 

			return false 

		},

		/**
		 * Permiso de importación clásica (historial y flujo legacy en modal import).
		 *
		 * @return {boolean}
		 */
		can_import() {
			if (!this.check_permissions || this.can(this.model_name + '.excel.import')) {
				return true
			}
			return false
		},

		/**
		 * True si el modelo actual soporta importación con IA (artículos, clientes, proveedores).
		 *
		 * @return {boolean}
		 */
		can_import_ai() {
			let models_with_ai = ['article', 'client', 'provider']
			return models_with_ai.indexOf(this.model_name) !== -1
		},

		/**
		 * ID del modal de importación IA según model_name (compatible con instancias existentes).
		 *
		 * @return {string}
		 */
		ai_import_modal_id() {
			if (this.model_name === 'article') {
				return 'ai-excel-import-modal'
			}
			return 'ai-' + this.model_name + '-excel-import-modal'
		},

		/**
		 * Muestra el submenú Exportación cuando hay permiso de exportar.
		 *
		 * @return {boolean}
		 */
		show_export_submenu() {
			return this.can_export
		},

		/**
		 * Muestra el submenú Importación si hay al menos una opción hija visible.
		 *
		 * @return {boolean}
		 */
		show_import_submenu() {
			return this.can_import || this.can_import_ai
		},

		/**
		 * Historial de actualizaciones masivas solo aplica al listado de artículos.
		 *
		 * @return {boolean}
		 */
		show_masive_update_history() {
			return this.model_name === 'article'
		},
	}
}
</script>

<style lang="sass">
.excel-create-dropdown-menu
	min-width: 300px !important
	max-width: calc(100vw - 24px)
	max-height: 70vh
	overflow-y: auto
	overflow-x: hidden
	padding-top: 0.35rem
	padding-bottom: 0.35rem
	text-align: left

	> li
		width: 100%

	.dropdown-item
		text-align: left
		border: none
		box-shadow: none
</style>
