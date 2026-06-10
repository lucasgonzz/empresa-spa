<template>
	<b-row
	class="view-header-toolbar p-t-15 align-center">

		<!-- Columna de acciones primarias: toggler de columnas, crear, seleccionar -->
		<!-- cols=6: ocupa mitad en mobile; xl=auto: ancho exacto del contenido en desktop (≥1200px) -->
		<b-col
		class="j-start align-center flex-wrap flex-xl-nowrap m-b-10 m-xl-b-0"
		cols="6"
		xl="auto">
			
			<props-to-show
			v-if="show_btn_props_to_show"
			:model_name="model_name"></props-to-show>

			<slot name="btn_create">
				<excel-drop-down
				class="m-l-10"
				v-if="show_excel_drop_down"
				:check_permissions="check_permissions"
				:can_create="can_create"
				:has_permission_create_dropdown="has_permission_create_dropdown"
				:model_name="model_name">
					<template #excel_drop_down_options>
						<slot name="excel_drop_down_options"></slot>
					</template>
				</excel-drop-down>

				<btn-create
				v-else-if="show_btn_create && can_create"
				class="m-l-10"
				:with_margin="false"
				:block="false"
				button_size="sm"
				:model_name="model_name"></btn-create>
			</slot>

			<btn-seleccion
			:model_name="model_name"
			:ask_selectable="ask_selectable"></btn-seleccion>
		</b-col>

		<!-- Columna de estado: dropdowns de selección/filtro y limpiar filtros -->
		<!-- cols=6: ocupa mitad en mobile; xl=auto: ancho exacto del contenido en desktop (≥1200px) -->
		<b-col
		class="j-start align-center flex-wrap flex-xl-nowrap m-b-10 m-xl-b-0"
		cols="6"
		xl="auto">

			<opciones-filtrados-seleccion
			:papelera="papelera"
			:show_actualizar_option="show_actualizar_option"
			:check_permissions="check_permissions"
			:model_name="model_name">
				<template #options_drop_down>
					<slot name="options_drop_down"></slot>
				</template>

				<template #options_drop_down_seleccion>
					<slot name="options_drop_down_seleccion"></slot>
				</template>

				<template #options_drop_down_filtro>
					<slot name="options_drop_down_filtro"></slot>
				</template>
			</opciones-filtrados-seleccion>
			
			<btn-restart-filter
			:papelera="papelera"
			:model_name="model_name"></btn-restart-filter>

			<b-button
			v-if="papelera && is_filtered_papelera && total_filtrados_papelera > 0"
			@click="restaurarTodosFiltradosPapelera"
			class="m-l-10"
			size="sm"
			variant="danger">
				Restaurar todos ({{ total_filtrados_papelera }})
			</b-button>

		</b-col>
		
		<!-- Columna de contenido del módulo: crece para llenar el espacio restante en desktop (≥1200px) -->
		<b-col
		cols="12"
		:xl="true">
			<div class="j-end align-center flex-wrap">
				
				<slot name="horizontal_nav_center"></slot>

				<display-nav
				v-if="change_from_dates_option"
				:change_from_dates_option="change_from_dates_option"
				:model_name="model_name"></display-nav>
			</div>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
		BtnRestartFilter: () => import('@/common-vue/components/view/header/BtnRestartFilter'),
		BtnCreate: () => import('@/common-vue/components/BtnCreate'),
		BtnSeleccion: () => import('@/common-vue/components/view/header/BtnSeleccion'),
		OpcionesFiltradosSeleccion: () => import('@/common-vue/components/view/header/opciones-filtrados-seleccion/Index'),

		// De horizontal-nav original
		ExcelDropDown: () => import('@/common-vue/components/horizontal-nav/ExcelDropDown'),
		DisplayNav: () => import('@/common-vue/components/horizontal-nav/DisplayNav'),
	},
	props: {
		model_name: String,
		papelera: {
			type: Boolean,
			default: false,
		},
		ask_selectable: Boolean,
		show_excel_drop_down: {
			type: Boolean,
			default: false,
		},
		check_permissions: {
			type: Boolean,
			default: false,
		},
		show_btn_create: {
			type: Boolean,
			default: false,
		},
		has_permission_create_dropdown: {
			type: Boolean,
			default: false,
		},
		change_from_dates_option: {
			type: Boolean,
			default: false,
		},
		show_btn_props_to_show: {
			type: Boolean,
			default: true,
		},
		show_actualizar_option: Boolean,
	},
	computed: {
		can_create() {
			if (this.check_permissions) {
				return this.can(this.model_name+'.store')
			}
			return true 
		},
		is_filtered_papelera() {
			if (!this.papelera || !this.model_name) {
				return false
			}
			return this.$store.state.papelera[this.model_name].is_filtered
		},
		/**
		 * Total de registros que coinciden con el filtro (todas las páginas), alineado con el paginador.
		 */
		total_filtrados_papelera() {
			if (!this.papelera || !this.model_name) {
				return 0
			}
			let n = this.$store.state.papelera[this.model_name].total_filter_results
			return n ? parseInt(n, 10) : 0
		},
		cantidad_filtrados_papelera() {
			if (!this.papelera || !this.model_name) {
				return 0
			}
			let filtrados = this.$store.state.papelera[this.model_name].filtered
			return filtrados ? filtrados.length : 0
		},
	},
	methods: {
		/**
		 * Restaura en servidor todos los que coinciden con filters (misma consulta que search+papelera).
		 */
		restaurarTodosFiltradosPapelera() {
			let total = this.total_filtrados_papelera
			if (total < 1) {
				return
			}
			let filters = this.$store.state[this.model_name].filters
			let label = this.plural(this.model_name)
			let mensaje = '¿Restaurar ' + total + ' ' + label + ' de esta búsqueda en la papelera?'
			if (!window.confirm(mensaje)) {
				return
			}
			let that = this
			this.$store.commit('auth/setLoading', true)
			this.$api.post('papelera/restaurar-filtrados/' + this.model_name, {
				filters: filters,
			}).then(function () {
				that.$store.commit('auth/setLoading', false)
				that.$toast.success('Registros restaurados')
				return that.$store.dispatch('papelera/' + that.model_name + '/getModels')
			}).catch(function (err) {
				that.$store.commit('auth/setLoading', false)
				that.$toast.error('Error al restaurar')
				console.log(err)
			})
		},
	},
}
</script>

<style lang="sass">

/* Quitar margen inferior de las cols cuando ya están en una sola fila (Bootstrap xl ≥1200px) */
@media (min-width: 1200px)
	.view-header-toolbar
		[class*='col-xl']
			margin-bottom: 0 !important

/* Altura unificada de botones y dropdowns en la cabecera (misma que btn-sm: Seleccionar / Actualizar) */
.view-header-toolbar
	::v-deep .btn:not(.btn-link):not(.dropdown-item)
		padding: 0.25rem 0.5rem
		font-size: 0.875rem
		line-height: 1.5

	::v-deep .dropdown > .btn
		padding: 0.25rem 0.5rem
		font-size: 0.875rem
		line-height: 1.5

	/* Buscador del listado en horizontal_nav_center: input alineado con btn-sm */
	::v-deep .buscador-listado
		.cont-search
			align-items: stretch

		.icon
			font-size: 0.875rem
			width: 32px

		.input-search
			height: auto !important
			padding: 0.25rem 0.5rem
			font-size: 0.875rem
			line-height: 1.5

</style>