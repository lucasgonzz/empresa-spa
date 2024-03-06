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
		<p
		class="m-0"
		v-for="discount in sale_discounts">
			<strong>-</strong> {{ discount.name }} {{ discount.percentage }}%
		</p>
		<p
		class="m-0"
		v-for="surchage in sale_surchages">
			<strong>+</strong> {{ surchage.name }} {{ surchage.percentage }}%
		</p>
	</b-col>
</template>
<script>
export default {
	computed: {
		previus_sale() {
			return this.$store.state.vender.previus_sales.previus_sale
		},
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
		sale_discounts() {
			// if (this.previus_sale.id) {
			// 	return this.previus_sale.discounts
			// } 

			let sale_discounts_id = this.$store.state.vender.discounts_id
			let discounts = []
			this.$store.state.discount.models.forEach(discount => {
				if (sale_discounts_id.includes(discount.id)) {
					discounts.push(discount)
				}
			})
			return discounts
		},
		sale_surchages() {
			// if (this.previus_sale.id) {
			// 	return this.previus_sale.surchages
			// } 

			let sale_surchages_id = this.$store.state.vender.surchages_id
			let surchages = []
			this.$store.state.surchage.models.forEach(surchage => {
				if (sale_surchages_id.includes(surchage.id)) {
					surchages.push(surchage)
				}
			})
			return surchages
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