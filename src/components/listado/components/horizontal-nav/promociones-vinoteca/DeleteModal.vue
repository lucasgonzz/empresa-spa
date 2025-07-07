<template>
	<b-modal
	v-if="model.articles"
	title="Eliminar Promocion"
	hide-footer
	size="lg"
	id="delete-promocion-vinoteca">
		<b-form-group
		description="Cuantas promociones vas a eliminar. El valor que ingreses se va a restar al stock actual de la promocion, no de los articulos que la componen."
		:label="label">
			<b-form-input
			v-model="stock_a_eliminar"
			placeholder="Ingrese cantidad a eliminar"></b-form-input>
		</b-form-group>

		<hr>
		<p>
			Cuantas unidades de los siguientes articulos van a regresar al stock cuando elimines estas promociones
		</p>
		<b-table
		head-variant="dark"
		:fields="fields"
		:items="items">
			<template #cell(amount_para_regrersar)="data">
				<b-form-input
				placeholder="Cantidad para regrersar al stock"
				v-model="items[data.index].amount_para_regrersar"></b-form-input>
			</template>
		</b-table>

		<btn-loader
		:loader="loading"
		@clicked="eliminar"
		variant="danger"
		text="Eliminar"></btn-loader>
	</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			stock_a_eliminar: '',
			loading: false,
		}
	},
	computed: {
		label() {
			return 'Stock para eliminar ('+this.model.stock+' en stock)'
		},
		fields() {
			return [
				{
					label: 'Articulo',
					key: 'article',
				},
				{
					label: 'Cantidad usada',
					key: 'amount',
				},
				{
					label: 'Cantidad para regresar',
					key: 'amount_para_regrersar',
				},
			]
		},
		items() {
			let items = []

			this.model.articles.forEach(_article => {
				items.push({
					id: _article.id, 
					article: _article.name, 
					amount: _article.pivot.amount, 
					amount_para_regrersar: ''
				})
			})

			return items
		},
		model() {
			return this.$store.state.promocion_vinoteca.model
		}
	},
	methods: {
		eliminar() {
			if (this.check()) {

				this.loading = true 
				this.$api.put('/promocion-vinoteca/delete-stock/'+this.model.id, {
					articles: this.items,
					stock_a_eliminar: this.stock_a_eliminar,
				})
				.then(res => {
					this.loading = false
					this.$toast.success('Promocion eliminada correctamente')
					this.$bvModal.hide('delete-promocion-vinoteca')
					this.$bvModal.hide('promocion_vinoteca')
					this.$store.dispatch('promocion_vinoteca/getModels')

					this.stock_a_eliminar = ''
				})
				.catch(err => {
					this.loading = false
					this.$toast.error('Error al eliminar Promocion')
					console.log(err)
				})
			}
		},
		check() {

			if (this.model.stock && this.model.stock > 0) {

				if (this.stock_a_eliminar == '' || this.stock_a_eliminar <= 0) {
					this.$toast.error('Ingrese la cantidad a eliminar de la promocion')
					return false
				}
				
				if (this.stock_a_eliminar > this.model.stock) {
					this.$toast.error('El stock a eliminar no puede ser mayor que el de la promo')
					return false
				}
			}

			return true
		}
	}
}
</script>