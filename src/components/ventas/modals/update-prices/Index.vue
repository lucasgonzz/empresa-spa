<template>
<b-modal
v-if="sale.articles"
title="Actualizar precios"
hide-footer
size="lg"
id="update-prices">
	<b-table
	class="s-2 b-r-1" 
	head-variant="dark"
	:fields="fields"
	:items="items">
		<template #cell(price_vender)="data">
			<b-form-input
			type="number"
			placeholder="Nuevo precio"
			v-model="items[data.index].price_vender"></b-form-input>
		</template>
	</b-table>
	<btn-loader
	@clicked="update"
	:loader="loading"
	text="Actualizar"></btn-loader>
</b-modal>
</template>
<script>
import previus_sale from '@/mixins/vender/previus_sale/index'
import BtnLoader from '@/common-vue/components/BtnLoader'
export default {
	mixins: [previus_sale],
	components: {
		BtnLoader,
	},
	data() {
		return {
			loading: false,
			articles: [],
		}
	},
	computed: {
		sale() {
			return this.$store.state.sale.model 
		},
		fields() {
			return [
				{label: 'Articulo', key: 'name'},
				{label: 'Precio de venta', key: 'actual_price'},
				{label: 'Nuevo precio | Precio actual', key: 'price_vender'},
			]
		},
		items() {
			let items = []
			let item 
			this.sale.articles.forEach(article => {
				item = {
					is_article: true,
					id: article.id,
					name: article.name,
					actual_price: this.price(article.pivot.price),
				}
				item.price_vender = article.final_price
				items.push(item)
			})
			this.sale.services.forEach(service => {
				item = {
					is_service: true,
					id: service.id,
					name: service.name,
					actual_price: service.pivot.price,
				}
				item.price_vender = service.pivot.price
				items.push(item)
			})
			return items 
		},
	},
	methods: {
		update() {
			this.loading = true 
			this.$api.put('sale/update-prices/'+this.sale.id, {
				items: this.items 
			})
			.then(res => {
				this.loading = false 
				// this.$bvModal.hide('update-prices')
				// this.$bvModal.hide('sale')

				this.setPreviusSale(this.sale)
			})
			.catch(err => {
				console.log(err)
				this.loading = false 
				this.$toast.error('Error al actualizar precios')
			})
		}
	}
}
</script>