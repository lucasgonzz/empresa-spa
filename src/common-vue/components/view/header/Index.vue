<template>
	<b-row
	class="p-t-15 align-center">
		<b-col
		class="j-start m-b-25 m-xl-b-0"
		lg="6"
		xl="3">
			
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
				:model_name="model_name"></btn-create>
			</slot>

			<btn-seleccion
			:model_name="model_name"
			:ask_selectable="ask_selectable"></btn-seleccion>
		</b-col>

		<b-col
		class="d-flex j-sm-center j-lg-end j-xl-start m-b-25 m-xl-b-0"
		lg="6"
		xl="3">

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
			variant="danger">
				Restaurar todos ({{ total_filtrados_papelera }})
			</b-button>

		</b-col>
		
		<b-col
		xl="6">
			<div class="j-end">
				
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