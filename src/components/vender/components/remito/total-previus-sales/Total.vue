<template>
	<b-col
	cols="12"
	lg="6"
	class="col-total">
		<p class="m-0">
			<strong class="total">
				Total: {{ price(total) }}
			</strong>
		</p>
		<p class="m-0">
			{{ items.length }} productos, {{ cantidad_unidades }} unidades
		</p>
	</b-col>
</template>
<script>
export default {
	computed: {
		total() {
			return this.$store.state.vender.total
		},
		items() {
			return this.$store.state.vender.items
		},
		cantidad_unidades() {
			let cant = 0
			this.items.forEach(item => {
				cant += Number(item.amount)
				if (item.returned_amount) {
					cant -= Number(item.returned_amount)
				}
			})
			cant = cant.toFixed(2)
			return cant
		},
	}
}
</script>
<style lang="sass">
.col-total
	display: flex
	flex-direction: column
	align-items: flex-start
	justify-content: flex-start
	.total 
		font-size: 1.5rem
	@media screen and (min-width: 768px)
		p 
			text-align: left
</style>