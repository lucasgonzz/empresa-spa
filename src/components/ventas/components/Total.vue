<template>
	<div
	v-if="can('sale.index.total')"
	class="cont-total-ventas">
		<div>
			<div
			class="j-start align-end"
			v-if="!loading">

				<div
				class="cont-totales">
					
					<div
					class="j-start align-center">
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

					<div
					class="j-start align-center m-t-15"
					v-if="hasExtencion('ventas_en_dolares')">
						<p
						class="total-ventas">
							Total USD {{ price(total_usd) }}
						</p>

						<p
						class="text-left m-b-0 m-md-l-10"
						v-if="is_admin">
							| Costos <strong>{{ price(total_cost_usd) }}</strong>
						</p> 

						<p
						class="text-left m-b-0 m-md-l-10"
						v-if="is_admin">
							| Ganancia <strong>{{ price(total_usd - total_cost_usd) }}</strong>
						</p> 
					</div>
				</div>

				<b-button
				v-if="is_admin"
				@click="export_excel"
				class="m-l-10"
				variant="outline-success"
				size="sm">
					<i class="icon-download"></i>
					Excel
				</b-button>
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
				if (model.moneda_id == 1) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total 
		},
		total_cost() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 1) {
					total += Number(model.total_cost)
				}
			})
			return total 
		},
		total_usd() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 2) {
					total += Number(this.totalSale(model, false))
				}
			})
			return total 
		},
		total_cost_usd() {
			let total = 0
			this.sales_to_show.forEach(model => {
				if (model.moneda_id == 2) {
					total += Number(model.total_cost)
				}
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
		from_date() {
			return this.$store.state.sale.from_date
		},
		until_date() {
			return this.$store.state.sale.until_date
		},
	},
	methods: {
		export_excel() {
            var link = process.env.VUE_APP_API_URL+'/sales/excel/export/'+this.from_date+'/'+this.until_date
            window.open(link)
		}
	}
}
</script>
<style lang="sass">
.cont-total-ventas
	// display: flex
	// flex-direction: row 
	// justify-content: space-between
	// align-items: center

	.cont-totales
		display: flex 
		flex-direction: column
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
	