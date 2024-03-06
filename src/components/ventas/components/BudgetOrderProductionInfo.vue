<template>
	<div>
		<span
		v-if="model.budget">
			Pre N° {{ model.budget.num }}
		</span>
		<span
		v-else-if="model.order_production">
			O Produ N° {{ model.order_production.num }}
		</span>
		<span
		v-else-if="model.order">
			Pedido N° {{ model.order.num }}
		</span>
		<span
		v-else-if="model.afip_ticket">
			Factura N° {{ model.afip_ticket.cbte_numero }}
		</span>
		<strong
		class="text-danger"
		v-if="model.afip_errors.length">
			{{ model.afip_errors.length }} errores
		</strong>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
}
</script>