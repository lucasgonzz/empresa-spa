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

			<!--
				Stock de cada deposito antes y despues del movimiento (stock_por_deposito del
				movimiento, ver SetStockPorDeposito en empresa-api). Una linea por deposito,
				"Nombre: anterior → resultante", en negrita los que el movimiento toco. Si el
				movimiento es de una variante que reparte por depositos, va un bloque aparte con el
				rotulo de la variante. Movimiento sin el dato (anterior a la mision, o de un
				articulo sin depositos): celda vacia.
			-->
			<template #cell(stock_por_deposito)="data">

				<div
				v-if="data.item.stock_por_deposito"
				class="stock-por-deposito">

					<div
					v-for="bloque in data.item.stock_por_deposito"
					:key="bloque.clave"
					class="stock-por-deposito__bloque">

						<p
						v-if="bloque.rotulo"
						class="stock-por-deposito__rotulo">
							{{ bloque.rotulo }}
						</p>

						<p
						v-for="linea in bloque.lineas"
						:key="bloque.clave+'-'+linea.address_id"
						data-testid="stock-por-deposito-linea"
						:data-address-id="linea.address_id"
						:data-tocado="linea.tocado ? 1 : 0"
						:class="{'stock-por-deposito__linea--tocado': linea.tocado}"
						class="stock-por-deposito__linea">
							{{ linea.nombre }}: {{ linea.anterior }} → {{ linea.resultante }}
						</p>
					</div>
				</div>

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
		/**
		 * Si algun movimiento de la lista trae la foto de stock por deposito. Sin ninguno (un
		 * articulo que no reparte por depositos, o movimientos anteriores a que existiera el dato)
		 * la columna no se muestra: no tiene sentido una columna entera vacia.
		 *
		 * @returns {Boolean}
		 */
		hay_stock_por_deposito() {
			return this.stock_movements.some(model => {
				return this.foto_por_deposito(model) !== null
			})
		},
		fields() {
			let fields = [
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
			]
			if (this.hay_stock_por_deposito) {
				fields.push({
					label: 'Stock por depósito',
					key: 'stock_por_deposito',
				})
			}
			return fields.concat([
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
			])
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
					// Bloques ya armados para la celda y, para el data-*, la foto cruda en JSON.
					stock_por_deposito: this.bloques_por_deposito(model),
					stock_por_deposito_crudo: this.foto_por_deposito(model) !== null ? JSON.stringify(this.foto_por_deposito(model)) : null,
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
				'data-stock-por-deposito': item.stock_por_deposito_crudo,
			}
		},
		/**
		 * La foto de stock por deposito del movimiento, o null si no la trae.
		 *
		 * El endpoint la manda como objeto (el modelo tiene el cast 'array'); igual se acepta el
		 * JSON como texto, por si llega de algun lado sin el cast. Una API anterior a la mision no
		 * manda la clave: queda null y la celda vacia.
		 *
		 * @param {Object} model Movimiento de stock.
		 * @returns {Object|null} {articulo: [...], variante: [...]} o null.
		 */
		foto_por_deposito(model) {
			let foto = model.stock_por_deposito
			if (typeof foto == 'undefined' || foto === null || foto === '') {
				return null
			}
			if (typeof foto == 'string') {
				try {
					foto = JSON.parse(foto)
				} catch (e) {
					return null
				}
			}
			if (!foto || !Array.isArray(foto.articulo)) {
				return null
			}
			return foto
		},
		/**
		 * Bloques que dibuja la celda "Stock por depósito": uno para el articulo y, si el
		 * movimiento es de una variante que reparte por depositos, otro con el rotulo de la
		 * variante. Cada linea trae el nombre del deposito, los dos numeros en es-AR y si el
		 * movimiento lo toco (cambio su cantidad, o es el origen / destino del movimiento).
		 *
		 * @param {Object} model Movimiento de stock.
		 * @returns {Array|null} [{clave, rotulo, lineas: [{address_id, nombre, anterior, resultante, tocado}]}] o null.
		 */
		bloques_por_deposito(model) {
			let foto = this.foto_por_deposito(model)
			if (foto === null) {
				return null
			}
			let bloques = [
				{
					clave: 'articulo',
					rotulo: null,
					lineas: this.lineas_por_deposito(foto.articulo, model),
				},
			]
			if (Array.isArray(foto.variante) && foto.variante.length) {
				bloques.push({
					clave: 'variante',
					rotulo: model.article_variant ? 'Variante '+model.article_variant.variant_description : 'Variante',
					lineas: this.lineas_por_deposito(foto.variante, model),
				})
			}
			return bloques
		},
		/**
		 * @param {Array} renglones Lista de la foto: [{address_id, deposito, anterior, resultante}].
		 * @param {Object} model Movimiento de stock.
		 * @returns {Array}
		 */
		lineas_por_deposito(renglones, model) {
			return renglones.map(renglon => {
				let tocado = Number(renglon.anterior) != Number(renglon.resultante)
					|| renglon.address_id == model.from_address_id
					|| renglon.address_id == model.to_address_id
				return {
					address_id: renglon.address_id,
					nombre: this.nombre_de_deposito(renglon),
					anterior: this.numero_es(renglon.anterior),
					resultante: this.numero_es(renglon.resultante),
					tocado: tocado,
				}
			})
		},
		/**
		 * Nombre del deposito: el de la sucursal en el store si existe (asi un renombre se ve), si
		 * no el que quedo guardado en la foto (una sucursal borrada), y como ultimo recurso el id.
		 *
		 * @param {Object} renglon Renglon de la foto.
		 * @returns {String}
		 */
		nombre_de_deposito(renglon) {
			let address = this.$store.state.address.models.find(_address => {
				return _address.id == renglon.address_id
			})
			if (typeof address != 'undefined' && address.street) {
				return address.street
			}
			if (renglon.deposito) {
				return renglon.deposito
			}
			return 'Depósito N° '+renglon.address_id
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

<style lang="sass">
/* Celda "Stock por depósito" del historial de movimientos: una linea por deposito */
.stock-por-deposito
	p
		margin: 0
		white-space: nowrap

.stock-por-deposito__bloque + .stock-por-deposito__bloque
	margin-top: 6px

/* Rotulo del bloque de la variante */
.stock-por-deposito__rotulo
	font-size: .85em
	opacity: .75

/* Deposito que el movimiento toco: cambio su cantidad, o es el origen o el destino */
.stock-por-deposito__linea--tocado
	font-weight: bold
</style>
