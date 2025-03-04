<template>
	<div
	v-if="sale"
	class="j-start m-t-15">
		<p
		v-if="sale.client">
			Cliente: {{ sale.client.name }}
		</p>

		<div
		v-if="sale.discounts.length">
			Descuentos
			<p
			v-for="discount in sale.discounts">
				- {{ discount.pivot.percentage }}% ({{ discount.name }})
			</p>
		</div>

		<div
		v-if="sale.surchages.length">
			Recargos
			<p
			v-for="surchage in sale.surchages">
				- {{ surchage.pivot.percentage }}% ({{ surchage.name }})
			</p>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		sale() {
			return this.$store.state.devoluciones.sale
		}
	}
}
</script>