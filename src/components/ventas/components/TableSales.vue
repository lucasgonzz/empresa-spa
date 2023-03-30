<template>
<b-row>
	<b-col>
		<div
		v-if="!loading">
			<b-table 
			class="shadow-2 b-r-1"
			v-show="to_show.length"
			:items="items" 
			head-variant="dark" 
			:fields="fields" 
			responsive 
			ref="tableSales"
			hover 
			selectable 
			select-mode="multi"
			@row-selected="onRowSelected">
				<template #cell(selected)="{ rowSelected }">
					<template v-if="rowSelected">
						<span aria-hidden="true">
							<i class="icon-check text-primary"></i>
						</span>
					</template>
					<template v-else>
						<span aria-hidden="true">&nbsp;</span>
					</template>
				</template>
				<template #cell(ver)="data">
					<div class="j-start align-center">
						<b-button 
						class="btn-eye"
						@click="showSaleDetails(to_show[data.index])">
							<i class="icon-eye"></i>
						</b-button>
						<b-badge
						v-if="to_show[data.index].special_price_id"
						variant="success">
							{{ to_show[data.index].special_price.name }}
						</b-badge>
					</div>
				</template>
				<template #cell(client)="data">
					<b-button
					v-if="to_show[data.index].client || (to_show[data.index].buyer && to_show[data.index].buyer.comercio_city_client)"
					@click="showCurrentAcounts(to_show[data.index])"
					variant="link">
						{{ getClient(to_show[data.index]) }}
					</b-button>
					<span v-else-if="to_show[data.index].buyer">
						{{ to_show[data.index].buyer.name }}
					</span>
				</template>
			</b-table>
			<p 
			v-show="!to_show.length"
			class="text-with-icon">
				<i class="icon-not"></i>
				No hay ventas
			</p>
		</div>
		<b-skeleton-table
			v-else
			:hide-header="false"
			:rows="8"
			:columns="10"
			:table-props="{ bordered: true, striped: true }"
		></b-skeleton-table>
	</b-col>
</b-row>
</template>
<script>
import numeral from 'numeral'
// Mixins
import Sales from '@/mixins/sales'
import Clients from '@/mixins/clients'
export default {
	name: 'TableSales',
	mixins: [Sales, Clients],
	computed: {
		all_sales_selected() {
			return this.$store.state.sale.all_sales_selected
		},
		to_show() {
			return this.$store.state.sale.to_show
		},
		loading() {
			return this.$store.state.sale.loading
		},
		items() {
			let items = []
			this.to_show.forEach(sale => { 
				items.push({
					id: sale.id,
					afip_ticket: sale.afip_ticket,
					client: sale.client,
					articles: sale.articles,
					budgets: sale.budgets,
					date: sale.created_at,
					hour: this.hour(sale.created_at),
					cantidad_productos: this.getCantidadProducts(sale),
					cantidad_unidades: this.getCantidadUnidades(sale),
					cost: this.getTotalSale(sale, true, true, false).cost,
					total: this.getTotalSale(sale, true, true, false).total,
					_rowVariant: this.getRowVariant(sale),
				})
			})
			return items
		},
		fields() {
			if (this.only_one_date != '' || this.to != '') {
				return [
					{ key: 'selected', label: '' },
					{ key: 'ver', label: 'Ver' },
					{ key: 'date', label: 'Fecha', formatter: 'date_format', sortable: true },
					{ key: 'hour', label: 'Hora', sortable: true },
					{ key: 'cantidad_productos', label: 'Cant. Productos', sortable: true },
					{ key: 'cantidad_unidades', label: 'Cant. Unidades', sortable: true },
					{ key: 'cost', label: 'Costo', sortable: true },
					{ key: 'total', sortable: true, formatter: 'total_format'},
					{ key: 'client', label: 'Cliente', sortable: true},
				]
			} else {
				return [
					{ key: 'selected', label: '' },
					{ key: 'ver', label: 'Ver' },
					{ key: 'hour', label: 'Hora', sortable: true },
					{ key: 'cantidad_productos', label: 'Cant. Productos', sortable: true },
					{ key: 'cantidad_unidades', label: 'Cant. Unidades', sortable: true },
					{ key: 'cost', label: 'Cost', sortable: true },
					{ key: 'total', sortable: true, formatter: 'total_format'},
					{ key: 'client', label: 'Cliente', sortable: true},
				]
			}
		},
	},
	watch: {
		all_sales_selected() {
			if (this.all_sales_selected) {
				this.$refs.tableSales.selectAllRows()
			} else {
				this.$refs.tableSales.clearSelected()
				console.log('engro')
			}
		}
	},
	methods: {
		getRowVariant(sale) {
			let variant = ''
			sale.impressions.forEach(impression => {
				if (impression.type == 'commerce') {
					if (variant == 'warning') {
						variant = 'primary'
					} else {
						variant = 'danger'
					}
				} else if (impression.type == 'client') {
					if (variant == 'danger') {
						variant = 'primary'
					} else {
						variant = 'warning'
					}
				}
			})
			return variant
			// if (sale.special_price) {
			// 	return 'success'
			// }
			// if (sale.percentage_card) {
			// 	return 'primary'
			// }
			// return ''
		},
		onRowSelected(items) {
			this.$store.commit('sale/setSelected', items)
		},
		date_format(value) {
			return this.date(value)
		},
		total_format(value) {
			return this.price(value)
		},
		getSpecialPrice(sale) {
			return sale.special_price.name
		},
		getClient(sale) {
			if (sale.client) {
				return sale.client.name
			}
			if (sale.buyer) {
				return sale.buyer.name
			}
			return '-'
		},
		getSaleDebt(sale) {
			if (sale.debt) {
				return '-'+this.price(this.getTotalSale(sale, false) - sale.debt)
			}
		},
		getCantidadProducts(sale) {
			return sale.articles.length + sale.combos.length
		},
		getCantidadUnidades(sale) {
			var cantidad_unidades = 0
			sale.articles.forEach(article => {
				cantidad_unidades += Number(article.pivot.amount)
			})
			sale.combos.forEach(combo => {
				cantidad_unidades += parseFloat(combo.pivot.amount)
			})
			cantidad_unidades = cantidad_unidades.toFixed(2)
			return cantidad_unidades
		},
		getCost(sale) {
			var cost = 0
			let without_cost = false
			sale.articles.forEach(article => {
				if (!article.pivot.cost) {
					without_cost = true
				}
				if (article.uncontable == 0) {
					cost += parseFloat(article.cost) * article.pivot.amount
				} else {
					if (article.pivot.measurement == article.measurement) {
						cost += parseFloat(article.pivot.cost) * article.pivot.amount
					} else {
						cost += parseFloat(article.pivot.cost) * article.pivot.amount / 1000
					}				
				}
			})
			if (without_cost) {
				return 'No disponible'
			} else {
				return numeral(cost).format('$0,0.00')
			}
		},
		// getArticleSpecialPriceForSale(sale, article) {
		// 	let result
		// 	if ()
		// 	article.special_prices.forEach(special_price => {
		// 		if (special_price.id == sale.special_price.id) {
		// 			result = special_price
		// 		}
		// 	})
		// 	return result
		// },
		getPrice(sale, formated = true) {
			var price = 0
			sale.articles.forEach(article => {
				if (article.uncontable == 0) {
					price += parseFloat(article.pivot.price) * article.pivot.amount
				} else {
					if (article.pivot.measurement == article.measurement) {
						price += parseFloat(article.pivot.price) * article.pivot.amount
					} else {
						price += parseFloat(article.pivot.price) * article.pivot.amount / 1000
					}				
				}
			})
            if (sale.percentage_card) {
                var p = Number('1.'+parseInt(sale.percentage_card))
                price = price * p
            }
			if (formated) {
				return numeral(price).format('$0,0.00')
			} else {
				return price
			}
		},
		selectAllSales() {
			this.$emit('selectAllSales')
		},
		showSaleDetails(sale) {
			this.$store.commit('sale/setDetails', sale)
			setTimeout(() => {
				this.$bvModal.show('sale-details')
			}, 100)
		},
		printSale(sale) {
			this.$store.commit('sale/setSelected', [sale])
			// this.$store.commit('sale/setPrint', sale)
			this.$bvModal.show('print-sales')
		},
		deleteSale(sale) {
			this.$store.commit('sale/setDelete', sale)
			this.$bvModal.show('delete-sales')
		}
	},
}
</script>
<style scoped lang="sass">
.badges
	.badge 
		margin: 0 .5em
.badge-percentage-card
	// position: absolute
	top: 10%
.badge-special-price
	// position: absolute
	top: 50%
.btn-eye 
	background: none
	color: #0069d9
	border: none
	font-size: 1.4em

</style>