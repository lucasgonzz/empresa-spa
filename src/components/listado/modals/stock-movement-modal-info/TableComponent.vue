<template>
<!--
	🔴 `estado-movimientos-stock` es la senal estable de que la tabla ya termino de cargar, y hace
	falta porque mientras carga se dibuja un <b-skeleton-table> y despues puede quedar la tabla O el
	cartel "No hay movimientos". Sin esto, un proceso que cuente filas apenas se abre el modal
	cuenta CERO y no puede distinguir "todavia no llegaron" de "no hay ninguno" -- que es
	exactamente la diferencia que hay que poder afirmar cuando se compra con cantidad recibida 0.

	Mismo patron que download-resources/Index.vue (data-estado/data-descargados/data-total): el
	elemento vive siempre y publica su estado en un atributo.

	El nombre empieza por `estado-` y no por `stock-movement-` a proposito: ya existe
	`stock-movement-row` y los selectores de prefijo son la forma estandar de este harness de
	encontrar filas (ver e2e/README.md).
-->
<div
data-testid="estado-movimientos-stock"
:data-estado="loading ? 'cargando' : 'listo'"
:data-cantidad="stock_movements.length">

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
					// La celda visible va con separadores es-AR...
					amount: this.numero_es(model.amount),
					article_variant: model.article_variant ? model.article_variant.variant_description : null,
					stock_resultante: this.numero_es(model.stock_resultante),
					/*
					 * ...y los data-* llevan el valor CRUDO del modelo, con punto decimal y sin
					 * separador de miles.
					 *
					 * 🔴 Estas dos claves no son una duplicacion por comodidad. Hasta el 31/8/2026
					 * `row_attrs()` leia `item.amount`, que ya venia pasado por `numero_es()`: el
					 * atributo terminaba diciendo "10,00" en vez de "10.00". Quien lo lee lo parsea
					 * como dato (punto decimal), asi que la coma se interpretaba como separador de
					 * miles y 10 unidades se leian como MIL. El comentario de arriba decia que los
					 * data-* llevaban el crudo mientras el codigo hacia lo contrario.
					 *
					 * Es una regresion de la unificacion a es-AR del 21/8/2026, y rompe el contrato
					 * que documenta e2e/README.md: lo que se MUESTRA va en es-AR, lo que es DATO va
					 * con punto.
					 */
					amount_crudo: model.amount,
					stock_resultante_crudo: model.stock_resultante,
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
		 * Atributos de cada <tr> de la tabla de movimientos.
		 *
		 * 🔴 Los numericos salen de las claves `_crudo`, NO de las que se muestran. Un `data-*`
		 * existe justamente para que otro proceso haga una cuenta con el, y para eso tiene que
		 * traer el valor del modelo con punto decimal. Si sale de la clave visible, la coma de
		 * es-AR se lee como separador de miles y una cantidad de 10 se convierte en 1000. Ver la
		 * nota en items().
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
				'data-cantidad': item.amount_crudo,
				'data-stock-resultante': item.stock_resultante_crudo,
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