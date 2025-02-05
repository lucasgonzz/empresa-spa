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
	// data() {
	// 	return {
	// 		stock_movements: [],
	// 		loading: false,
	// 	}
	// },
	// mounted() {
	// 	this.$root.$on('bv::modal::show', (bvEvent, modal_id) => {
	// 		console.log('SE ABRIO MODAL')
	// 		if (modal_id == 'stock-movement-modal-info') {
	// 			console.log('y era stock-movement-modal-info')
	// 			setTimeout(() => {
	// 				this.getStockMovements() 
	// 			}, 500)
	// 		}
	// 	})
	// },
	computed: {
		stock_movements() {
			return this.$store.state.article.stock_movement.models 
		},
		loading() {
			return this.$store.state.article.stock_movement.loading 
		},
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
					label: 'Variante',
					key: 'article_variant',
				},
				{
					label: 'Stock Resultante',
					key: 'stock_resultante',
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
					label: 'Empleado',
					key: 'employee',
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
					concepto: this.get_store_model('concepto_stock_movement', model.concepto_stock_movement_id).name,
					amount: model.amount,
					article_variant: model.article_variant ? model.article_variant.variant_description : null,
					stock_resultante: model.stock_resultante,
					provider: this.getRelation('provider', 'provider_id', 'name', model),
					from_address: this.getRelation('address', 'from_address_id', 'street', model),
					to_address: this.getRelation('address', 'to_address_id', 'street', model),
					employee: this.getEmployee(model),
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
		getEmployee(stock_movement) {
			let employee_id = stock_movement.employee_id
			if (employee_id) {
				if (employee_id == this.owner.id) {
					return this.owner.name 
				}
				let employee = this.$store.state.employee.models.find(employee => {
					return employee.id == employee_id
				})
				if (typeof employee != 'undefined') {
					return employee.name 
				}
			}
			return null
		},
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
		// getStockMovements() {
		// 	console.log('getStockMovements, loading: '+this.loading)
		// 	if (!this.loading) {
		// 		console.log('Entro, loading: '+this.loading)
		// 		this.loading = true 
		// 		this.$api.get('stock-movement/'+this.article.id)
		// 		.then(res => {
		// 			this.loading = false 
		// 			this.stock_movements = res.data.models 
		// 		})
		// 		.catch(err => {
		// 			this.loading = false 
		// 			this.$toast.error(err)
		// 		})
		// 	}
		// }
	}
}
</script>