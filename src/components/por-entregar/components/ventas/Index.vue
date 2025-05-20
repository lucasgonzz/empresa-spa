<template>
	<div
	v-if="view == 'ventas'">
	    <confirm
	    model_name="sale"
	    :actions="['sale/delete']"
	    id="delete-sale"></confirm>

		<current-acounts></current-acounts>
		
		<view-component
		:show_view_header="false"
		:models_to_show="sales_to_show"
		:properties_to_show="properties_to_show"
		show_models_if_empty
		:show_previus_days="show_previus_days"
		:show_btn_create="false"
		:show_modal="false"
		model_name="sale"> 
			<template #header>
				<rango-fechas></rango-fechas>
			</template>
			<template #table_right_options="props">
				<b-button
				class="m-l-15"
				variant="success"
				@click.stop="terminada(props.model)">
					<i class="icon-check"></i>
					Terminada
				</b-button> 
			</template>
		</view-component>
	</div>
</template>
<script>
import marcar_como_terminada from '@/mixins/sale/marcar_como_terminada'
export default {
	mixins: [marcar_como_terminada],
	created() {
		this.$store.commit('sale/set_from_depositos', 1)
		this.$store.commit('sale/setIsSelecteable', false)
		this.$store.commit('sale/setSelected', [])
		this.$store.commit('sale/setFromDates', false)
		this.$store.dispatch('sale/getModels')
	},
	components: {
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		// SaleModal: () => import('@/components/common/SaleModal'),
		RangoFechas: () => import('@/components/por-entregar/components/ventas/RangoFechas'),
		Confirm: () => import('@/common-vue/components/Confirm'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		SaleButtons: () => import('@/components/deposito/components/SaleButtons'),
	},
	computed: {
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
		sales() {
			return this.$store.state.sale.models 
		},
		sales_to_show() {
			return this.sales.filter(sale => {
				return sale.fecha_entrega && !sale.terminada 
			})
		},
		show_previus_days() {
			return this.$store.state.sale.from_dates
		}
	},
	methods: {
		clicked(model) {
			this.setPreviusSale(model)
		}
	}
}
</script>