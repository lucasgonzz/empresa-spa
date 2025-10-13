<template>
	<div
	class="p-l-5">
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
		v-else-if="model.meli_order">
			Pedido Meli N° {{ model.meli_order.id }}
		</span>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
}
</script>