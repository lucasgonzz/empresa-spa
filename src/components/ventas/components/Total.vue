<template>
	<div
	v-if="is_owner || is_admin"
	class="cont-total-ventas">
		<div>
			<div
			class="j-lg-start align-lg-center"
			v-if="!loading">
				<p
				class="total-ventas">
					Total {{ price(total) }}
				</p>

				<p
				class="text-left m-b-0 m-md-l-10"
				v-if="is_admin">
					| Costos <strong>{{ price(total_cost) }}</strong>
				</p> 

				<p
				class="text-left m-b-0 m-md-l-10"
				v-if="is_admin">
					| Ganancia <strong>{{ price(total - total_cost) }}</strong>
				</p> 
			</div>
			<b-skeleton 
			v-else
			type="button"
			width="200px" 
			class="m-b-20"></b-skeleton>
		</div>
		<div>
			<p 
			v-if="!loading"
			class="cantidad-ventas">
				{{ cantidad_ventas }} ventas	
			</p>
			<b-skeleton 
			v-else
			type="button"
			width="200px" 
			class="m-b-20"></b-skeleton>
		</div>
	</div>
</template>
<script>
import sale from '@/mixins/sale'
export default {
	mixins: [sale],
	computed: {
		loading() {
			return this.$store.state.sale.loading  
		},
		total() {
			let total = 0
			this.sales_to_show.forEach(model => {
				total += Number(this.totalSale(model, false))
			})
			return total 
		},
		total_cost() {
			let total = 0
			this.sales_to_show.forEach(model => {
				total += model.total_cost
			})
			return total 
		},
		cantidad_ventas() {
			let total = 0
			this.sales_to_show.forEach(model => {
				total++
			})
			return total 
		},
	}
}
</script>
<style lang="sass">
.cont-total-ventas
	display: flex
	flex-direction: row 
	justify-content: space-between
	align-items: center
	.total-ventas 
		margin-bottom: 0
		font-size: 1.5em 
		font-weight: bold 
		text-align: left
	.cantidad-ventas 
		margin-bottom: 0
		font-size: 25px 
		font-weight: bold 
		text-align: right
</style>
	