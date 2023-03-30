<template>
	<div>
		<div 
		v-if="sale_details.budget">
			Esta venta pertenece al Presupuesto n°{{ sale_details.budget.num }}
			<b-button
			class="m-l-15"
			variant="primary"
			@click="budgetDetails">
				Ver presupuesto
			</b-button>
			<hr>
		</div>
		<div 
		v-else-if="sale_details.order_production">
			Esta venta pertenece a la Orden de Produccion n°{{ sale_details.order_production.num }}
			<b-button
			class="m-l-15"
			variant="primary"
			@click="orderProductionDetails">
				Ver Orden de Produccion
			</b-button>
			<hr>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		sale_details() {
			return this.$store.state.sale.model 
		},
	},
	methods: {
		budgetDetails() {
			this.setModel(this.sale_details.budget, 'budget')
		},
		orderProductionDetails() {
			this.setModel(this.sale_details.order_production, 'order_production')
		},
	}
}
</script>