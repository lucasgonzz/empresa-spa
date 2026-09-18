import computed from '@/mixins/vender/computed'

/*
	Bandera de MODULO y no de componente, a proposito.

	Este mixin lo comparten Vender.vue, limpiar_vender, previus_sale, el selector de lista de
	precios y el chequeo del guardado. Una bandera en `data()` seria una por componente: cinco
	pedidos del catalogo en vez de uno, y el "una sola vez" se perderia justo entre los que mas se
	llaman. Un modulo ES se evalua una sola vez por carga de la pagina, asi que esta variable es
	exactamente "una vez por sesion", y recargar la pagina --que es lo que pide el aviso del
	chequeo cuando el catalogo no llega-- la vuelve a cero sola.
*/
let catalogo_de_listas_ya_pedido = false

/*
	El servidor CONTESTO que la cuenta no tiene ninguna lista. Es la paridad con el
	`PriceType::exists()` del back (PriceTypeHelper::requiere_lista_de_precios): con el flag
	prendido y cero listas el back acepta la venta con null, y el front no puede frenarla para
	siempre con "recarga la pagina". Solo se prende con una respuesta del servidor; una request
	que fallo o que todavia no llego NO la prende, y ahi se sigue frenando (es el caso de Trama:
	no se distingue "no hay listas" de "no llego el catalogo", asi que ante la duda se frena).
*/
let catalogo_de_listas_confirmado_vacio = false

/** El elemento raiz de common-vue/components/download-resources/Index.vue: data-estado del arranque. */
const MARCADOR_DEL_ARRANQUE_DE_RECURSOS = '[data-testid="recursos-estado"]'

export default {
	mixins: [computed],
	methods: {
		/**
		 * La regla entera de "esta cuenta vende con lista de precios si o si", en UN solo lugar.
		 *
		 * Es la misma regla que aplica el back (PriceTypeHelper::requiere_lista_de_precios) para
		 * contestar 422 en POST sale / POST budget: el flag `users.listas_de_precio` del dueño,
		 * menos la extension de rangos por cantidad vendida, que setea la lista por linea y no por
		 * comprobante. La lectura del flag va por ownerUsesListasDePrecio(), que es como lo lee el
		 * resto de la SPA (contempla el "1" serializado como string).
		 *
		 * Lo que NO mira, y es a proposito: si el catalogo de listas esta cargado. Un catalogo vacio
		 * puede ser "la cuenta no tiene listas" o "la request del arranque no llego", y desde el
		 * front no se distinguen. En Trama la segunda opcion costo 7 ventas seguidas a costo el
		 * 10/9/2026, asi que ante la duda se frena y se pide recargar.
		 *
		 * @returns {boolean}
		 */
		requiere_lista_de_precios() {
			/*
				Paridad con el exists() del back: cuenta con el flag pero SIN listas (confirmado por
				el servidor, ver catalogo_de_listas_confirmado_vacio) no requiere lista. Se lee
				price_types primero, y no la bandera sola, para que los computed que llaman a esto
				(el `show` del selector) queden atados al catalogo.
			*/
			if (!this.price_types.length && catalogo_de_listas_confirmado_vacio) {
				return false
			}

			return this.ownerUsesListasDePrecio()
				&& !this.hasExtencion('lista_de_precios_por_rango_de_cantidad_vendida')
		},

		/**
		 * Una lista del catalogo, por id. Devuelve el OBJETO o null si el id no esta (es null, es
		 * 0, o apunta a una lista que ya no existe).
		 *
		 * Es el unico mecanismo para pasar de un `price_type_id` pelado --el de un cliente, el de
		 * una venta cuyo endpoint no embebio la relacion-- al objeto que espera vender/price_type.
		 * Commitear el id pelado deja `price_type_vender.id` en undefined y todo lo que precia una
		 * linea cae al precio base: era lo que hacia la edicion de una venta hasta esta mision.
		 *
		 * @param {number|string|null} price_type_id
		 * @returns {Object|null}
		 */
		lista_del_catalogo(price_type_id) {
			if (!price_type_id) {
				return null
			}

			let lista = this.price_types.find(price_type => {
				return price_type.id == price_type_id
			})

			return typeof lista != 'undefined' ? lista : null
		},

		/**
		 * La lista de precios de un cliente, como OBJETO del catalogo.
		 *
		 * El cliente puede venir con la relacion `price_type` cargada o solo con `price_type_id`
		 * (depende del endpoint que lo trajo): en el segundo caso se resuelve contra el catalogo.
		 *
		 * @param {Object|null} client
		 * @returns {Object|null}
		 */
		lista_de_precios_del_cliente(client) {
			if (!client) {
				return null
			}

			if (client.price_type && client.price_type.id) {
				return client.price_type
			}

			return this.lista_del_catalogo(client.price_type_id)
		},

		/**
		 * La lista por defecto del comercio: la de `position` mas alta, y a igual position la de
		 * id mas alto.
		 *
		 * 🔴 Es EL MISMO criterio que ArticlePricesHelper::resolver_precio_de_venta() del back
		 * (rama 4, "lista_por_defecto"), y no puede divergir: el back precia el articulo en el
		 * listado, el Excel y la tienda con ese criterio, y el front lo usa para decidir con que
		 * lista sale la venta. Si eligieran distinto, el precio que el vendedor ve en el listado y
		 * el que cobra en Vender serian de dos listas diferentes, sin que nada lo avise. Por eso
		 * tambien se recorren TODAS las listas y una position nula vale 0, igual que alla:
		 * `price_types` no tiene indice unico en (user_id, position), dos listas pueden compartir
		 * position, y sin el desempate por id el resultado dependeria del orden en que llego el
		 * catalogo.
		 *
		 * @returns {Object|null}
		 */
		lista_de_mayor_posicion() {
			let elegida = null

			this.price_types.forEach(price_type => {
				let position = price_type.position === null || typeof price_type.position == 'undefined'
					? 0
					: Number(price_type.position)

				if (elegida === null) {
					elegida = price_type
					return
				}

				let position_elegida = elegida.position === null || typeof elegida.position == 'undefined'
					? 0
					: Number(elegida.position)

				if (position > position_elegida) {
					elegida = price_type
					return
				}

				if (position == position_elegida && Number(price_type.id) > Number(elegida.id)) {
					elegida = price_type
				}
			})

			return elegida
		},

		/**
		 * Con que lista tiene que salir el comprobante que se esta armando, en este orden:
		 * la del presupuesto que se esta confirmando, la del cliente elegido, y si no la lista
		 * por defecto del comercio (lista_de_mayor_posicion). Devuelve el objeto o null.
		 *
		 * @returns {Object|null}
		 */
		resolver_lista_por_defecto() {
			if (this.budget && this.budget.price_type && this.budget.price_type.id) {
				return this.budget.price_type
			}

			let lista_del_cliente = this.lista_de_precios_del_cliente(this.client)

			if (lista_del_cliente) {
				return lista_del_cliente
			}

			return this.lista_de_mayor_posicion()
		},

		/**
		 * Que dice el arranque de recursos (download-resources/Index.vue) sobre si mismo.
		 *
		 * El componente publica su estado SOLO en el DOM (data-estado de su elemento raiz, el
		 * mismo contrato que usa el harness e2e); su store no lo expone. Se lee de ahi porque la
		 * llamada masiva del arranque (POST recursos-iniciales) commitea el catalogo con setModels
		 * directo, sin pasar por getModels, asi que `price_type.loading` no la ve.
		 *
		 * @returns {string} 'sin_marcador' (el componente todavia no monto: recien se recargo la
		 *                   pagina), 'pendiente', 'descargando' o 'listo'.
		 */
		estado_del_arranque_de_recursos() {
			let marcador = document.querySelector(MARCADOR_DEL_ARRANQUE_DE_RECURSOS)

			if (!marcador) {
				return 'sin_marcador'
			}

			return marcador.getAttribute('data-estado') || 'pendiente'
		},

		/**
		 * Vuelve a pedir el catalogo de listas, UNA sola vez por sesion, y solo cuando el
		 * arranque ya dijo lo suyo.
		 *
		 * El catalogo baja al arrancar (call_methods.js). Si esa request no llega, antes
		 * `price_types` quedaba vacio toda la sesion y todas las ventas salian sin lista, sin un
		 * solo aviso. Con un pedido mas hay una segunda oportunidad; con la bandera de modulo no
		 * hay loop: el watch de price_types() en Vender.vue vuelve a llamar a setPriceType()
		 * cuando la coleccion cambia, y si tambien viene vacia se corta aca.
		 *
		 * 🔴 Mientras el arranque esta en vuelo NO se pide ni se quema la bandera. Al recargar en
		 * /vender, el created() de la vista corre antes de que conteste la llamada del arranque,
		 * el catalogo esta vacio, y sin esta guarda salia un GET duplicado y la unica oportunidad
		 * de recuperacion se gastaba en el camino normal. El arranque va a commitear el catalogo
		 * (y el watch va a aplicar la lista) o va a fallar y marcarse 'listo': recien ahi, si el
		 * catalogo sigue vacio, corresponde el pedido. Sin marcador todavia (la pagina recien se
		 * recargo y el componente del arranque no monto) tampoco se pide: la proxima llamada
		 * --el watch, limpiar_vender o el chequeo del guardado-- lo encuentra montado.
		 *
		 * No se espera la respuesta para aplicar la lista: quien reacciona es ese watch, para que
		 * la lista se aplique aunque el componente que pidio el catalogo ya no exista. Lo unico
		 * que se mira de la respuesta es si el servidor CONFIRMO que no hay listas (ver
		 * catalogo_de_listas_confirmado_vacio): setModels asigna la coleccion que vino --una
		 * referencia nueva-- solo cuando la request salio bien; si fallo, el catch del store deja
		 * la anterior, y eso NO es una confirmacion.
		 */
		pedir_catalogo_de_listas_una_vez() {
			if (catalogo_de_listas_ya_pedido) {
				return
			}

			if (this.$store.state.price_type.loading) {
				return
			}

			let estado_del_arranque = this.estado_del_arranque_de_recursos()

			if (estado_del_arranque !== 'listo') {
				return
			}

			catalogo_de_listas_ya_pedido = true

			let coleccion_antes = this.$store.state.price_type.models
			let self = this

			this.$store.dispatch('price_type/getModels')
			.then(() => {
				let coleccion_despues = self.$store.state.price_type.models

				if (coleccion_despues !== coleccion_antes && !coleccion_despues.length) {
					catalogo_de_listas_confirmado_vacio = true
				}
			})
		},

		/**
		 * Aplica la lista de precios por defecto (la del presupuesto, la del cliente, o la de
		 * mayor posicion) a una venta NUEVA.
		 *
		 * 🔴 Nunca commitea null. Si no puede resolver una lista, deja lo que haya: los que
		 * limpian la venta (limpiar_vender) conservan la lista anterior, y el chequeo del guardado
		 * (chequeos/price_type.js) frena la venta si al final no hay ninguna. Hasta esta mision el
		 * camino de falla no commiteaba nada, y como limpiar_vender ya habia puesto null, la venta
		 * siguiente salia sin lista y a precio base.
		 *
		 * @param {boolean} force_reset true: es una accion explicita del usuario --sacar el
		 *                              cliente a mano en SelectClient-- y aplica igual en edicion.
		 */
		setPriceType(force_reset = false) {
			/*
				Editando un comprobante guardado, la lista de precios es la que quedo guardada en
				el, aunque el cliente tenga otra asignada. Cambiarsela por atras cambia los precios
				de todas las lineas.
			*/
			if (!force_reset && (this.$store.getters['vender/previus_sales/editando_venta_previa'] || !!this.$store.state.vender.budget)) {
				return
			}

			/*
				Cuenta sin listas, o con la extension de rangos por cantidad (que setea la lista por
				linea, no por comprobante): no hay nada que resolver. Es el mismo corte que tenian
				las compuertas de antes.
			*/
			if (!this.requiere_lista_de_precios()) {
				return
			}

			if (!this.price_types.length) {
				this.pedir_catalogo_de_listas_una_vez()
				return
			}

			let price_type_para_vender = this.resolver_lista_por_defecto()

			if (price_type_para_vender) {
				this.$store.commit('vender/setPriceType', price_type_para_vender)
			}
		},
	}
}
