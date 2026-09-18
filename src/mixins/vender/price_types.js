import Vue from 'vue'
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
	Lo que el re-pedido del catalogo dejo dicho, en un objeto REACTIVO (Vue.observable) y no en
	dos `let`: lo leen computeds --el `show` del selector, a traves de requiere_lista_de_precios()--
	y una variable suelta no dispara su re-evaluacion. Con el `let` la confirmacion llegaba despues
	del flush y el selector vacio quedaba a la vista en una cuenta que no tiene listas.

	- confirmado_vacio: el servidor CONTESTO que la cuenta no tiene ninguna lista. Es la paridad
	  con el `PriceType::exists()` del back (PriceTypeHelper::requiere_lista_de_precios): con el
	  flag prendido y cero listas el back acepta la venta con null, y el front no puede frenarla
	  para siempre con "recarga la pagina". Solo lo prende una respuesta que trae `models` como
	  ARRAY de largo cero; una request que fallo, que todavia no llego, o que contesto otra cosa
	  (el HTML generico que devuelve el shared hosting saturado llega con 200 y sin `models`) NO lo
	  prende, y ahi se sigue frenando: es el caso de Trama, donde no se distingue "no hay listas"
	  de "no llego el catalogo", asi que ante la duda se frena.
	- pedido_en_vuelo: el re-pedido salio y todavia no volvio. Lo mira el chequeo del guardado
	  para no decir "recarga la pagina" cuando la respuesta esta por llegar.
*/
const estado_del_catalogo_de_listas = Vue.observable({
	confirmado_vacio: false,
	pedido_en_vuelo: false,
})

/*
	El reintento diferido de setPriceType() mientras el arranque de recursos no termino. Una
	bandera para no apilar timers (setPriceType() se llama desde muchos lados) y un tope para que
	sea acotado: 20 intentos de 1,5 s son 30 s, que cubren un arranque lento; pasado eso, el
	re-pedido sale igual con el primer Guardar o el primer limpiar_vender.
*/
let reintento_de_lista_agendado = false
let reintentos_de_lista_hechos = 0
const ESPERA_ENTRE_REINTENTOS_MS = 1500
const MAXIMO_DE_REINTENTOS = 20

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
		 * Un catalogo vacio puede ser "la cuenta no tiene listas" o "la request del arranque no
		 * llego", y desde el front no se distinguen hasta que el servidor lo confirma. En Trama la
		 * segunda opcion costo 7 ventas seguidas a costo el 10/9/2026, asi que mientras no haya
		 * confirmacion se frena.
		 *
		 * @returns {boolean}
		 */
		requiere_lista_de_precios() {
			/*
				Paridad con el exists() del back: cuenta con el flag pero SIN listas, confirmado por
				el servidor (ver estado_del_catalogo_de_listas), no requiere lista.
			*/
			if (!this.price_types.length && estado_del_catalogo_de_listas.confirmado_vacio) {
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
		 * ¿Todavia hay algo que esperar antes de decirle al vendedor "recarga la pagina"?
		 *
		 * Si: el re-pedido esta en vuelo, o el catalogo se esta bajando por getModels, o el
		 * arranque todavia no termino y el reintento diferido sigue vivo (pasado su tope ya no se
		 * espera nada mas: si el marcador no llega nunca a 'listo', el aviso no puede quedarse
		 * diciendo "proba de nuevo" para siempre).
		 *
		 * @returns {boolean}
		 */
		catalogo_de_listas_todavia_puede_llegar() {
			if (estado_del_catalogo_de_listas.pedido_en_vuelo) {
				return true
			}

			if (this.$store.state.price_type.loading) {
				return true
			}

			return !catalogo_de_listas_ya_pedido
				&& reintentos_de_lista_hechos < MAXIMO_DE_REINTENTOS
				&& this.estado_del_arranque_de_recursos() !== 'listo'
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
		 * catalogo sigue vacio, corresponde el pedido. Quien vuelve a llamar cuando eso pasa es el
		 * reintento diferido de setPriceType() (agendar_reintento_de_lista).
		 *
		 * 🔴 El pedido es PROPIO (this.$api.get a la misma URL que usa el store de price_type) y no
		 * un dispatch de price_type/getModels, porque hay que mirar la RESPUESTA: el getModels del
		 * store se come el error y resuelve igual, y su setModels(undefined) asigna un [] nuevo,
		 * asi que desde afuera un 200 sin `models` --la pagina generica del hosting saturado-- se
		 * veia igual que "la cuenta no tiene listas". Solo se commitea, y solo se confirma el
		 * vacio, cuando `models` es un array.
		 *
		 * No se espera la respuesta para aplicar la lista: quien reacciona al commit es el watch de
		 * Vender.vue, para que la lista se aplique aunque el componente que pidio el catalogo ya
		 * no exista.
		 */
		pedir_catalogo_de_listas_una_vez() {
			if (catalogo_de_listas_ya_pedido) {
				return
			}

			if (this.$store.state.price_type.loading) {
				return
			}

			if (this.estado_del_arranque_de_recursos() !== 'listo') {
				return
			}

			catalogo_de_listas_ya_pedido = true
			estado_del_catalogo_de_listas.pedido_en_vuelo = true

			let self = this

			/*
				Con tope de tiempo y sin el aviso global del interceptor. Sin timeout (ni $api ni
				axios traen uno) una request colgada dejaba pedido_en_vuelo prendido para siempre,
				y el chequeo del guardado decia "estamos trayendo las listas... proba en unos
				segundos" sin fin. Y si el re-pedido falla, el aviso que corresponde es el del
				Guardar ("recarga la pagina"): un cartel de "no pudimos conectarnos" que aparece
				solo, sin que el vendedor haya hecho nada, se lee como que se cayo todo el sistema.
			*/
			this.$api.get(this.routeString('price_type'), {
				timeout: 15000,
				skip_global_error_event: true,
			})
			.then(res => {
				estado_del_catalogo_de_listas.pedido_en_vuelo = false

				let models = res && res.data ? res.data.models : null

				if (!Array.isArray(models)) {
					console.log('el re-pedido del catalogo de listas no trajo un array de models: no se confirma nada')
					return
				}

				if (!models.length) {
					estado_del_catalogo_de_listas.confirmado_vacio = true
				}

				self.$store.commit('price_type/setModels', models)
			})
			.catch(err => {
				estado_del_catalogo_de_listas.pedido_en_vuelo = false
				console.log(err)
			})
		},

		/**
		 * Agenda UN reintento de setPriceType() para dentro de un rato, mientras el arranque de
		 * recursos no haya terminado.
		 *
		 * 🔴 Sin esto, despues de un F5 en /vender nadie volvia a llamar a setPriceType() cuando el
		 * arranque llegaba a 'listo' salvo que el catalogo cambiara (y si cambiaba, el watch podia
		 * correr antes de que el marcador dijera 'listo'). Dos consecuencias: en una cuenta con el
		 * flag prendido y CERO listas, el primer Guardar de cada carga frenaba con "recarga la
		 * pagina" y el segundo pasaba --y si el vendedor obedecia el aviso, entraba en un loop--; y
		 * en el caso de Trama el re-pedido salia recien con el primer Guardar. Con el reintento, el
		 * re-pedido y la confirmacion de "no hay listas" ocurren solos apenas el arranque termina.
		 *
		 * Acotado (MAXIMO_DE_REINTENTOS) y sin apilar timers (reintento_de_lista_agendado). Deja de
		 * agendarse en cuanto el re-pedido sale: desde ahi manda la respuesta.
		 */
		agendar_reintento_de_lista() {
			if (catalogo_de_listas_ya_pedido) {
				return
			}

			if (reintento_de_lista_agendado) {
				return
			}

			if (reintentos_de_lista_hechos >= MAXIMO_DE_REINTENTOS) {
				return
			}

			reintento_de_lista_agendado = true

			let self = this

			setTimeout(() => {
				reintento_de_lista_agendado = false
				reintentos_de_lista_hechos++

				/*
					El componente que agendo el reintento ya no existe (el vendedor salio de /vender
					antes de que venciera el timer; Vender.vue no tiene keep-alive). Sus computeds
					quedaron congelados al destruirse, asi que seguir desde el seria leer un catalogo
					viejo y encadenar hasta 20 timers sobre un componente muerto. El que vuelva a
					entrar a /vender agenda el suyo.
				*/
				if (self._isDestroyed) {
					return
				}

				/*
					Si mientras tanto ya hay lista --la aplico el watch cuando llego el catalogo, o
					la eligio el vendedor a mano-- no se toca: setPriceType() pisaria esa eleccion
					con la lista por defecto.
				*/
				if (self.$store.state.vender.price_type) {
					return
				}

				self.setPriceType()

				/*
					Si el reintento fue el que resolvio la lista y el remito ya tiene renglones, se
					re-precian a la vista, igual que en el watch de Vender.vue (ver el comentario
					ahi). setTotal() no es de este mixin: lo tiene quien lo mezcla junto a
					vender_set_total, que son todos los que llaman a setPriceType() desde Vender.
				*/
				if (
					self.$store.state.vender.price_type
					&& self.$store.state.vender.items.length
					&& typeof self.setTotal == 'function'
				) {
					self.setTotal()
				}
			}, ESPERA_ENTRE_REINTENTOS_MS)
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
				Cuenta sin listas, o con la extension de rangos por cantidad (que setea la lista por
				linea, no por comprobante): no hay nada que resolver. Es el mismo corte que tenian
				las compuertas de antes.
			*/
			if (!this.requiere_lista_de_precios()) {
				return
			}

			/*
				🔴 Catalogo vacio: se pide de nuevo si el arranque ya termino, y si todavia no
				termino se agenda un reintento para cuando termine (recuperar_catalogo_de_listas_si_falta).

				Va ANTES del guard de edicion, a proposito. Cuando estaba despues, editar un
				comprobante con el catalogo vacio no disparaba nunca el re-pedido ni el reintento
				(setPriceType() retornaba en el guard sin llegar aca), y en una cuenta con el flag
				prendido y cero listas la edicion quedaba trabada para siempre en "recarga la
				pagina": nada confirmaba el vacio por ese camino. Es seguro pedirlo en edicion:
				ni el GET ni el timer commitean una lista sobre un comprobante guardado --eso lo
				corta el guard de abajo--, solo traen el catalogo (o confirman que no hay).
			*/
			if (this.recuperar_catalogo_de_listas_si_falta()) {
				return
			}

			/*
				Editando un comprobante guardado, la lista de precios es la que quedo guardada en
				el, aunque el cliente tenga otra asignada. Cambiarsela por atras cambia los precios
				de todas las lineas.

				La unica excepcion es el comprobante que se ABRIO SIN LISTA porque el catalogo
				estaba vacio en ese momento (set_datos_para_actualizar_en_vender dejo null), y el
				catalogo llego despues: se le propone ahora exactamente la que se le hubiera
				propuesto al abrir --la suya si el id existe, la del cliente, o la por defecto--,
				que es lo que la venta editada ya hace desde que se abre con el catalogo cargado.
				Sin esto el selector quedaba vacio (y en un presupuesto, ademas deshabilitado) y el
				chequeo del guardado frenaba sin salida. Nunca se pisa una lista ya asignada, y
				mientras el comprobante todavia no se hidrato (previus_sale es {} durante los
				500 ms de setPreviusSale) no se propone nada, igual que antes.
			*/
			let editando = this.$store.getters['vender/previus_sales/editando_venta_previa'] || !!this.$store.state.vender.budget

			if (!force_reset && editando) {
				if (this.$store.state.vender.price_type) {
					return
				}

				let comprobante = this.comprobante_que_se_esta_editando()

				if (!comprobante) {
					return
				}

				let lista_del_comprobante = this.resolver_lista_de_comprobante_guardado(comprobante)

				if (lista_del_comprobante) {
					this.$store.commit('vender/setPriceType', lista_del_comprobante)
				}

				return
			}

			let price_type_para_vender = this.resolver_lista_por_defecto()

			if (price_type_para_vender) {
				this.$store.commit('vender/setPriceType', price_type_para_vender)
			}
		},

		/**
		 * Si la cuenta requiere lista y el catalogo esta vacio, lo pide de nuevo (si el arranque
		 * ya termino) y agenda el reintento (si todavia no). Devuelve true cuando el catalogo
		 * falta, o sea cuando no hay nada que resolver todavia.
		 *
		 * Es el primer paso de setPriceType(), y lo llama ademas el created() de Vender.vue al
		 * entrar a EDITAR un comprobante: ahi setPriceType() no se llama a proposito (los
		 * defaults pisarian lo guardado), pero el re-pedido del catalogo tiene que salir igual,
		 * o en una cuenta con el flag prendido y cero listas la confirmacion de "no hay listas"
		 * llegaba recien con el primer Guardar, que frenaba, y pasaba el segundo.
		 *
		 * @returns {boolean}
		 */
		recuperar_catalogo_de_listas_si_falta() {
			if (!this.requiere_lista_de_precios()) {
				return false
			}

			if (this.price_types.length) {
				return false
			}

			this.pedir_catalogo_de_listas_una_vez()
			this.agendar_reintento_de_lista()

			return true
		},

		/**
		 * El comprobante guardado que se esta editando en Vender (el presupuesto cargado con
		 * "Actualizar en VENDER", o la venta abierta desde Ventas), o null si es una venta nueva.
		 *
		 * Mientras la venta se esta abriendo (setPreviusSale prende el flag y recien 500 ms
		 * despues hidrata) previus_sale es {}: sin `id` se devuelve null para no resolver nada
		 * sobre un comprobante que todavia no llego.
		 *
		 * @returns {Object|null}
		 */
		comprobante_que_se_esta_editando() {
			if (this.$store.state.vender.budget && this.$store.state.vender.budget.id) {
				return this.$store.state.vender.budget
			}

			if (this.$store.getters['vender/previus_sales/editando_venta_previa']) {
				let venta = this.$store.state.vender.previus_sales.previus_sale

				return venta && venta.id ? venta : null
			}

			return null
		},

		/**
		 * Con que lista se abre un comprobante GUARDADO, en este orden: la relacion `price_type`
		 * que trajo el servidor; su `price_type_id` resuelto contra el catalogo (un id colgado
		 * --la lista se borro-- no es una lista); la del cliente; y, solo si la cuenta requiere
		 * lista, la por defecto del comercio. Devuelve el objeto o null.
		 *
		 * Es EL criterio con el que previus_sale/index.js hidrata la edicion; vive aca para que
		 * el caso "el catalogo llego despues de abrir" (setPriceType) resuelva igual.
		 *
		 * @param {Object} model la venta o el presupuesto, tal cual vino del servidor
		 * @returns {Object|null}
		 */
		resolver_lista_de_comprobante_guardado(model) {
			if (model.price_type && model.price_type.id) {
				return model.price_type
			}

			let lista = this.lista_del_catalogo(model.price_type_id)

			if (!lista) {
				lista = this.lista_de_precios_del_cliente(model.client)
			}

			if (!lista && this.requiere_lista_de_precios()) {
				lista = this.lista_de_mayor_posicion()
			}

			return lista
		},
	}
}
