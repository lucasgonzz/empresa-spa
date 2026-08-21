<template>
<div>
	
	<div
	v-if="!loading">
		
		<!--
			tbody-tr-attr le pone a cada fila data-testid="stock-movement-row" mas los datos del
			movimiento como atributos (data-concepto, data-cantidad, data-stock-resultante,
			data-deposito-destino). Es la unica forma de verificar por testid que una compra genero
			su movimiento de stock y que el stock entro al deposito correcto: esta es una b-table
			armada a mano (no pasa por display/table/Tr.vue), asi que no hereda ninguno de los
			data-testid genericos de la tabla del sistema.
		-->
		<b-table
		v-if="stock_movements.length"
		class="s-2 b-r-1 animate__animated animate__fadeIn"
		head-variant="dark"
		responsive
		striped
		id="stock-movement-table"
		:tbody-tr-attr="row_attrs"
		:fields="fields"
		:items="items">
			
			<template #cell(related_model)="data">

				<b-button
				v-if="stock_movements[data.index].sale_id"
				@click="show_related_model(stock_movements[data.index])"
				variant="primary">
					{{ btn_text(stock_movements[data.index]) }} 
				</b-button>

			</template>
		</b-table>

		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No hay movimientos
		</p>
	</div>

	<b-skeleton-table
	class="s-2 b-r-1 m-t-15 animate__animated animate__fadeIn"
	v-else
	:rows="10" 
	:columns="5"
	:table-props="{ bordered: true, striped: true }"
	></b-skeleton-table>
</div>
</template>
<script>
export default {
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
					label: '',
					key: 'related_model',
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
			let concepto = null 
			this.stock_movements.forEach(model => {
				concepto = this.get_store_model('concepto_stock_movement', model.concepto_stock_movement_id)
				items.push({
					concepto: typeof concepto != 'undefined' && concepto !== null ? concepto.name : null,
					// La celda visible va con separadores; los data-* de mas abajo siguen llevando
					// el valor CRUDO, que es lo que lee la suite e2e (y cualquier cosa que tenga
					// que hacer una cuenta con esto).
					amount: this.numero_es(model.amount),
					article_variant: model.article_variant ? model.article_variant.variant_description : null,
					stock_resultante: this.numero_es(model.stock_resultante),
					provider: this.getRelation('provider', 'provider_id', 'name', model),
					from_address: this.getRelation('address', 'from_address_id', 'street', model),
					to_address: this.getRelation('address', 'to_address_id', 'street', model),
					employee: this.getEmployee(model),
					observations: model.observations,
					created_at: this.date(model.created_at, true),
				})
			})
			return items 
		},
		article() {
			return this.$store.state.article.model 
		},
	},
	methods: {
		/**
		 * Atributos de cada <tr> de la tabla de movimientos. Los valores salen del mismo objeto
		 * `item` que ya arma el computed items(), asi que no pueden divergir de lo que se ve.
		 *
		 * @param {Object} item Fila ya armada por items().
		 * @returns {Object} atributos a poner en el <tr>.
		 */
		row_attrs(item) {
			if (!item) {
				return {}
			}
			return {
				'data-testid': 'stock-movement-row',
				'data-concepto': item.concepto,
				'data-cantidad': item.amount,
				'data-stock-resultante': item.stock_resultante,
				'data-deposito-destino': item.to_address,
			}
		},
		btn_text(stock_movement) {
			if (stock_movement.sale_id && stock_movement.sale) {
				return 'Venta N° '+stock_movement.sale.num
			}
		},
		show_related_model(stock_movement) {
			if (stock_movement.sale_id) {

            	this.show_model('sale', stock_movement.sale_id)
			}
		},
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