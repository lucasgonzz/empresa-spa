<template>
	<div
	class="m-t-15">
		<b-table
		v-if="items.length"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		head-variant="dark"
		responsive
		striped
		:fields="fields"
		:items="table_items">
			
			<template #cell(price_vender)="data">
				
				<b-form-input
				@change="call_set_total_devolucion"
				@keyup="call_set_total_devolucion"
				type="number"
				v-model="items[data.index].price_vender"></b-form-input>

			</template>
			
			<template #cell(article_variant_id)="data">
				
				<b-form-select
				v-if="items[data.index].is_article"
				:disabled="is_variant_disabled"
				:options="article_variant_options(items[data.index])"
				v-model="items[data.index].article_variant_id"></b-form-select>

			</template>
			
			<template #cell(returned)="data">
				
				<div class="j-between">
					
					<b-form-input
					@change="call_set_total_devolucion"
					@keyup="call_set_total_devolucion"
					type="number"
					:min="minimo(items[data.index])"
					:max="items[data.index].amount"
					v-model="items[data.index].returned_amount"></b-form-input>


					<b-button
					@click="remove_item(items[data.index])"
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
import set_total from '@/mixins/devoluciones/set_total'
export default {
	mixins: [set_total],
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
		table_items() {
			let items = []
			
			this.items.forEach(item => {
				items.push({
					is_article: item.is_article,
					is_service: item.is_service,
					bar_code: item.bar_code,
					name: item.name,
					price_vender: this.price(item.price_vender),
					amount: item.amount,
					article_variant_id: item.article_variant_id,
				})
			})

			return items 
		},
		sale() {
			return this.$store.state.devoluciones.sale 
		},
		items() {
			return this.$store.state.devoluciones.items 
		},
		is_variant_disabled() {
			if (this.sale) {
				return true
			}
			return false
		}
	},
	methods: {
		remove_item(item) {
			this.$store.commit('devoluciones/remove_item', item)
		},
		minimo(item) {
			if (item.ya_devueltas) {
				return item.ya_devueltas
			}
			return 0
		}, 
		call_set_total_devolucion() {
			// this.$store.commit('devoluciones/set_total_devolucion')
			this.set_total_devolucion()
		},
		article_variant_options(item) {
			let options = [{
				value: 0, 
				text: 'Seleccione Variante' 
			}]

			item.article_variants.forEach(variant => {
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