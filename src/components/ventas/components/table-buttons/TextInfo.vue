<template>
	<div
	class="p-l-5">
		<b-badge
		variant="light"
		class="text-dark border"
		v-if="model.budget">
			<i class="bi bi-file-earmark-text"></i>
			Pre N° {{ model.budget.num }}
		</b-badge>
		<b-badge
		variant="light"
		class="text-dark border"
		v-else-if="model.order_production">
			<i class="bi bi-gear"></i>
			O Produ N° {{ model.order_production.num }}
		</b-badge>
		<b-badge
		variant="light"
		class="text-dark border"
		v-else-if="model.order">
			<i class="bi bi-cart3"></i>
			Pedido N° {{ model.order.num }}
		</b-badge>
		<b-badge
		variant="light"
		class="text-dark border"
		v-else-if="model.meli_order">
			<i class="bi bi-shop"></i>
			Pedido Meli N° {{ model.meli_order.id }}
		</b-badge>
	</div>
</template>
<script>
export default {
	props: {
		model: Object,
	},
}
</script>