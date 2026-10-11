<template>
	<div>
	    <confirm
	    model_name="sale"
	    show_compensar_caja_checkbox
	    :actions="['sale/delete']"
	    id="delete-sale"></confirm>

		<current-acounts></current-acounts>

		<!--
			listado_paginado_por_defecto en false: esta vista arma su propio listado scopeado
			por sale_status_id (modulo 'por_estado' en created()). Mismo defecto que
			por-entregar/ventas/Index.vue: sin la prop, runListadoPorDefecto del grupo 221
			corre igual apenas monta y pisa el listado scopeado con el general de ventas
			terminadas. Sin arreglar aca desde el 25/7/2026.
		-->
		<!--
			mostrar_models_que_vinienen_por_prop_siempre dinamica a proposito (Historico y el
			buscador): ver el JSDoc de hay_filtro_del_store().
		-->
		<view-component
		:show_view_header="false"
		:models_to_show="sales_to_show"
		:mostrar_models_que_vinienen_por_prop_siempre="hay_filtro_del_store"
		:properties_to_show="properties_to_show"
		show_models_if_empty
		:listado_paginado_por_defecto="false"
		:show_previus_days="show_previus_days"
		change_from_dates_option
		:show_btn_create="false"
		:show_modal="false"
		model_name="sale">

		</view-component>
	</div>
</template>
<script>
import sale_por_estado from '@/mixins/sale_por_estado'
export default {
	mixins: [sale_por_estado],
	created() {
		this.$store.commit('sale/setIsSelecteable', false)
		this.$store.commit('sale/setSelected', [])
		this.$store.commit('sale/setFromDates', false)
		
		this.$store.commit('sale/set_modulo', 'por_estado')
		this.$store.dispatch('sale/getModels')
	},
	components: {
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		Confirm: () => import('@/common-vue/components/Confirm'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		SaleButtons: () => import('@/components/deposito/components/SaleButtons'),
	},
	computed: {
		/**
		 * Hay un filtro del store activo (Historico, buscador o modal de filtros).
		 *
		 * Alimenta `mostrar_models_que_vinienen_por_prop_siempre` del view-component. El display
		 * (common-vue/components/display/Index.vue::models_to_show) con `is_filtered` en true
		 * IGNORA la prop `models_to_show` y dibuja `state.sale.filtered` entero, o sea que el filtro
		 * propio de la vista (`sales_to_show`) no llegaba a la tabla. Con esta prop en true se usa
		 * `sales_to_show`, que arranca de `filtered` cuando corresponde (ver `sales()`).
		 *
		 * 🔴 Es dinamica y NO fija en true, a proposito: sin filtro del store el display ya usa la
		 * prop (`show_models_if_empty && !is_filtered`), asi que la tabla se ve igual con la prop en
		 * false; y una prop fija en true dispararia siempre el "Corte 3" de
		 * common-vue/components/view/Index.vue::disparar_listado_por_defecto(). Hoy en esta vista
		 * corta antes el Corte 1 (`listado_paginado_por_defecto` en false, defecto documentado en el
		 * comentario del template), pero si alguien lo arregla, una prop fija mataria el listado por
		 * defecto sin aviso.
		 *
		 * @returns {Boolean}
		 */
		hay_filtro_del_store() {
			return this.$store.state.sale.is_filtered
		},
		properties_to_show() {
			return [
				{
					text: 'N°',
					key: 'num',
					type: 'number',
					not_show_on_form: true,
					filter_modal_position: 1,
				},
				{
					text: 'Total',
					key: 'total',
					type: 'number',
					only_show: true,
					function: 'totalSale',
				},
				{
					text: 'Fecha Entrega',
					key: 'fecha_entrega',
					type: 'date',
					only_show: true,
					is_date: true,
				},
				{
					text: 'Cliente',
					key: 'client_id',
					type: 'search',
					store: 'client',
					only_show: true,
					v_if: ['client_id', '!=', null],
					button: {
						function: 'showClientCurrentAcount',
					},
					filter_modal_position: 2,
				},
				{
					text: 'Empleado',
					key: 'employee_id',
					type: 'search',
					only_show: true,
				},
			]
		},
		show_previus_days() {
			return this.$store.state.sale.from_dates
		},
	},
	methods: {
		clicked(model) {
			this.setPreviusSale(model)
		}
	}
}
</script>