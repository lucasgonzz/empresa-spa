<template>
<b-modal
:title="'Movimientos de Stock de '+article.name"
hide-footer
size="lg"
id="stock-movement-modal-info">
	<b-table
	v-if="!loading"
	class="s-2 b-r-1 animate__animated animate__fadeIn"
	head-variant="dark"
	responsive
	striped
	:fields="fields"
	:items="items"></b-table>

	<b-skeleton-table
	class="s-2 b-r-1 m-t-15 animate__animated animate__fadeIn"
	v-else
	:rows="10" 
	:columns="5"
	:table-props="{ bordered: true, striped: true }"
	></b-skeleton-table>
</b-modal>
</template>
<script>
export default {
	data() {
		return {
			stock_movements: [],
			loading: false,
		}
	},
	created() {
		this.$root.$on('bv::modal::show', (bvEvent, modal_id) => {
			console.log('SE ABRIO MODAL')
			if (modal_id == 'stock-movement-modal-info') {
				this.getStockMovements() 
			}
		})
	},
	computed: {
		fields() {
			return [
				{
					label: 'Concepto',
					key: 'concepto',
				},
				{
					label: 'Cantidad',
					key: 'amount',
				},
				{
					label: 'Proveedor',
					key: 'provider',
				},
				{
					label: 'Deposito ORIGEN',
					key: 'from_address',
				},
				{
					label: 'Deposito DESTINO',
					key: 'to_address',
				},
				{
					label: 'Observaciones',
					key: 'observations',
				},
				{
					label: 'Fecha',
					key: 'created_at',
				},
			]
		},
		items() {
			let items = []
			this.stock_movements.forEach(model => {
				items.push({
					concepto: model.concepto,
					amount: model.amount,
					provider: this.getRelation('provider', 'provider_id', 'name', model),
					from_address: this.getRelation('address', 'from_address_id', 'street', model),
					to_address: this.getRelation('address', 'to_address_id', 'street', model),
					observations: model.observations,
					created_at: this.date(model.created_at),
				})
			})
			return items 
		},
		article() {
			return this.$store.state.article.model 
		},
	},
	methods: {
		getRelation(store, prop_name, prop_to_return, stock_movement) {
			if (stock_movement[prop_name]) {
				let model = this.$store.state[store].models.find(_model => {
					return _model.id == stock_movement[prop_name]
				})
				if (typeof model != 'undefined') {
					return model[prop_to_return]
				}
			}
			return ''
		},
		getStockMovements() {
			if (!this.loading) {
				this.loading = true 
				this.$api.get('stock-movement/'+this.article.id)
				.then(res => {
					this.loading = false 
					this.stock_movements = res.data.models 
				})
				.catch(err => {
					this.loading = false 
					this.$toast.error(err)
				})
			}
		}
	}
}
</script>