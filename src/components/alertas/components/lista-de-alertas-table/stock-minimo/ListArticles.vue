<template>
	<div>
		
		<b-table
		v-if="articles_stock_minimo.length"
		head-variant="dark"
		responsive
		:fields="fields"
		:items="items">
		</b-table>

		<div 
		v-else
		class="text-with-icon">
			No hay articulos con stock minimo
			<i class="icon-eye-slash"></i>
		</div>

	</div>

</template>
<script>
export default {
	computed: {
		fields() {
			return [
				{
					key: 'num',
				},
				{
					key: 'codigo_barras',
				},
				{
					key: 'codigo_proveedor',
				},
				{
					key: 'nombre',
				},
				{
					key: 'precio',
				},
				{
					key: 'stock',
				},
				{
					key: 'stock_minimo',
				},
				{
					key: 'proveedor',
				},
				{
					key: 'actualizacion',
				},
			]
		},
		items() {
			let items = []

			this.articles_stock_minimo.forEach(article => {
				items.push({
					num: article.id,
					codigo_barras: article.bar_code,
					codigo_proveedor: article.provider_code,
					nombre: article.name,
					precio: this.price(article.final_price),
					stock: article.stock,
					stock_minimo: article.stock_min,
					proveedor: this.get_provider(article),
					actualizacion: this.date(article.updated_at),
				})
			})

			return items
		},


		articles_stock_minimo() {
			if (this.$store.state.inventory_performance.models[0]) {

				return this.$store.state.inventory_performance.models[0].articles_stock_minimo
			}

			return []
		},
	},
	methods: {
		get_provider(article) {
			let provider = this.get_store_model('provider', article.provider_id)
			if (provider) {
				return provider.name
			}
			return null
		},
		showSale(sale) {
            this.show_model('sale', sale.id)
		},
		get_afip_information(sale) {
			let model = this.$store.state.afip_information.models.find(m => sale.afip_information_id == m.id)

			if (typeof model != 'undefined') {
				return model.razon_social
			}
			return ''
		},
		get_afip_tipo_comprobante(sale) {
			let model = this.$store.state.afip_tipo_comprobante.models.find(m => sale.afip_tipo_comprobante_id == m.id)

			if (typeof model != 'undefined') {
				return model.name
			}
			return ''
		},
	}
}
</script>