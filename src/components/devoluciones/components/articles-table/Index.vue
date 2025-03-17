<template>
	<div
	class="m-t-15">
		<b-table
		v-if="articles.length"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		head-variant="dark"
		responsive
		striped
		:fields="fields"
		:items="items">
			
			<template #cell(price_vender)="data">
				
				<b-form-input
				@change="set_total_devolucion"
				@keyup="set_total_devolucion"
				type="number"
				v-model="articles[data.index].price_vender"></b-form-input>

			</template>
			
			<template #cell(article_variant_id)="data">
				
				<b-form-select
				:disabled="is_variant_disabled"
				:options="article_variant_options(articles[data.index])"
				v-model="articles[data.index].article_variant_id"></b-form-select>

			</template>
			
			<template #cell(returned)="data">
				
				<div class="j-between">
					
					<b-form-input
					@change="set_total_devolucion"
					@keyup="set_total_devolucion"
					type="number"
					:min="minimo(articles[data.index])"
					:max="articles[data.index].amount"
					v-model="articles[data.index].returned_amount"></b-form-input>


					<b-button
					@click="remove_article(articles[data.index])"
					v-if="!sale"
					variant="danger">
						<i class="icon-trash"></i>
					</b-button>
				</div>

			</template>
		</b-table>

		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay articulos
		</p>
	</div>
</template>
<script>
export default {
	computed: {
		fields() {
			let fields =  [
				{
					label: 'Codigo',
					key: 'bar_code',
				},
				{
					label: 'Nombre',
					key: 'name',
				},
				{
					label: 'Precio',
					key: 'price_vender',
				},
			]

			if (this.hasExtencion('article_variants')) {
				fields.push({
					label: 'Variante',
					key: 'article_variant_id'
				})
			}

			if (this.sale) {
				fields.push({
					label: 'Cant vendida',
					key: 'amount',
				})
			}

			fields = fields.concat([
				{
					label: 'Cant devuelta',
					key: 'returned',
				},
			])

			return fields
		},
		items() {
			let items = []
			this.articles.forEach(article => {
				items.push({
					bar_code: article.bar_code,
					name: article.name,
					price_vender: this.price(article.price_vender),
					amount: article.amount,
					article_variant_id: article.article_variant_id,
				})
			})
			// this.sale.services.forEach(service => {
			// 	items.push({
			// 		name: service.name,
			// 		amount: service.pivot.amount,
			// 		price: this.price(article.price_vender),
			// 		ya_devueltas: service.pivot.returned,
			// 		returned: service.pivot.returned,
			// 		pivot: service.pivot,
			// 		is_service: true,
			// 	})
			// })
			return items 
		},
		sale() {
			return this.$store.state.devoluciones.sale 
		},
		articles() {
			return this.$store.state.devoluciones.articles 
		},
		is_variant_disabled() {
			if (this.sale) {
				return true
			}
			return false
		}
	},
	methods: {
		remove_article(article) {
			this.$store.commit('devoluciones/remove_article', article)
		},
		minimo(article) {
			if (article.ya_devueltas) {
				return article.ya_devueltas
			}
			return 0
		},
		set_total_devolucion() {

			this.$store.commit('devoluciones/set_total_devolucion')
		},
		article_variant_options(article) {
			let options = [{
				value: 0, 
				text: 'Seleccione Variante' 
			}]

			article.article_variants.forEach(variant => {
				options.push({
					value: variant.id,
					text: variant.variant_description
				})
			})

			return options
		}
	}
}
</script>