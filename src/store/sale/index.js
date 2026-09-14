import __base_store from '@/store/__base_store'
import axios from 'axios'
import generals from '@/common-vue/mixins/generals'
import ventas_sin_cobrar from '@/store/sale/ventas_sin_cobrar'
import recordatorio_cobro from '@/store/sale/recordatorio_cobro'
import consolidar_facturacion from '@/store/sale/consolidar_facturacion'

/**
 * Indica si hay filtros de columnas activos, excluyendo búsqueda por N° de factura AFIP.
 *
 * @param {Array} filters Filtros del store sale.
 * @returns {boolean}
 */
function sale_filters_have_active_criteria_except_afip(filters) {
	let has_active = false
	filters.forEach(filter => {
		if (has_active || filter.key === 'afip_ticket_cbte_numero') {
			return
		}
		if (filter.en_blanco || filter.no_en_blanco) {
			has_active = true
			return
		}
		if (filter.ordenar_de !== null && filter.ordenar_de !== '' && typeof filter.ordenar_de !== 'undefined') {
			has_active = true
			return
		}
		if (filter.type === 'select' || filter.type === 'search') {
			if (filter.igual_que !== 0 && filter.igual_que !== '' && filter.igual_que !== null && typeof filter.igual_que !== 'undefined') {
				has_active = true
			}
			return
		}
		if (filter.type === 'checkbox') {
			if (typeof filter.checkbox !== 'undefined' && filter.checkbox !== -1) {
				has_active = true
			}
			return
		}
		if (filter.type === 'date') {
			if ((filter.menor_que !== '' && typeof filter.menor_que !== 'undefined')
				|| (filter.igual_que !== '' && typeof filter.igual_que !== 'undefined')
				|| (filter.mayor_que !== '' && typeof filter.mayor_que !== 'undefined')) {
				has_active = true
			}
			return
		}
		if (filter.type === 'number') {
			if ((filter.menor_que !== '' && typeof filter.menor_que !== 'undefined')
				|| (filter.igual_que !== '' && filter.igual_que !== null && typeof filter.igual_que !== 'undefined')
				|| (filter.mayor_que !== '' && typeof filter.mayor_que !== 'undefined')) {
				has_active = true
			}
			return
		}
		if ((filter.que_contenga !== '' && typeof filter.que_contenga !== 'undefined')
			|| (filter.igual_que !== '' && typeof filter.igual_que !== 'undefined')) {
			has_active = true
		}
	})
	return has_active
}

/**
 * Mutation `delete` tal como la arma el factory, para envolverla en este store sin copiar su
 * cuerpo (saca la venta de `models`, `filtered` y del `selected_model`). El factory con opciones
 * vacías devuelve exactamente las mutations base; no construye state ni registra nada.
 */
const base_delete = __base_store({}).mutations.delete

/**
 * Store de ventas (modelo `sale`) construido desde el factory común.
 *
 * Notas:
 * - Mantiene módulos internos propios.
 * - Mantiene estados/opciones de filtros de negocio.
 * - Sobrescribe `_getModels` porque `sale` usa un endpoint específico con `modulo` en la URL, y
 *   porque con `modulo == 'ventas'` pide el listado PAGINADO con los totales del día (14/9/2026).
 */
export default __base_store({
	modules: {
		ventas_sin_cobrar,
		recordatorio_cobro,
		consolidar_facturacion,
	},
	state: {
		modulo: 'ventas',

		model_name: 'sale',
		from_dates: true,

		use_per_page: false,
		per_page: 25,
		// Una sola cantidad por página gobierna los DOS modos del módulo: el listado del día que
		// pagina la API (modo por fecha, ver `_getModels`) y el buscador general / filtros de
		// columna (modo filtrado). Es el número que edita el input "Por página" de la barra.
		filter_per_page: 25,

		ventas_cobradas_show_option: 'cobradas-y-no-cobradas',
		afip_ticket_show_option: 'con-y-sin-factura',
		/** Texto para filtrar ventas por número de comprobante AFIP (cbte_numero). Vacío = sin filtro. */
		afip_ticket_cbte_numero_search: '',
		payment_method_show_option: 'todos',

		// Array de descripciones del cálculo del precio de la venta seleccionada para mostrar en el modal
		sale_price_description: [],

		/**
		 * Controla si las ventas contenedoras de facturación (is_consolidacion_facturacion=1)
		 * se muestran u ocultan en el listado general de ventas. Por defecto ocultas.
		 */
		mostrar_consolidadas: false,

		/**
		 * Si el usuario confirma con el checkbox activo, el DELETE envía `compensar_caja` al backend.
		 */
		compensar_caja_delete: true,

		/**
		 * true cuando el último listado que llegó vino PAGINADO por la API (contrato del 14/9/2026:
		 * `sale/from-date/ventas/...?per_page=N`), o sea con `models` como paginador de Laravel y
		 * `totales` del día completo al lado. false con la API vieja (que devuelve el array entero
		 * aunque se le pida `per_page`) y con los otros módulos que usan este mismo store
		 * (`por_entregar`, `por_estado`, `deposito`), que siguen bajando el listado completo.
		 *
		 * Lo leen Total.vue y los navs de sucursal/empleado (para saber si los totales y conteos
		 * salen del servidor o se calculan en el navegador como hasta ahora), la barra de paginación
		 * (para mostrarse sin filtro activo) y la tabla (para mandar el cambio de página al endpoint
		 * del día y no a global-search). Vive en el store y no en la vista porque la barra y la
		 * tabla son componentes comunes que solo conocen `state[model_name]`.
		 */
		paginado_por_fecha: false,

		/**
		 * Totales del día (o rango) COMPLETO tal como los manda la API en modo paginado:
		 * `{ cantidad, pesos: { total, costos, ganancia, cuenta_corriente }, dolares: { ídem },
		 * metodo_de_pago: null | { id, total }, por_sucursal: [{ address_id, cantidad }],
		 * por_empleado: [{ employee_id, cantidad }], sin_empleado }`. null cuando no hay (API vieja,
		 * otro módulo, o todavía no llegó nada).
		 *
		 * Hace falta porque `state.models` ya no es el día entero sino UNA página: sumar en el
		 * navegador daría el total de 25 ventas, no el del día.
		 */
		totales_del_dia: null,

		/**
		 * Se prende cuando una venta del store se agregó, editó o borró desde un modal (mutations
		 * `add` y `delete`) y por lo tanto los totales del día que tiene el navegador pueden haber
		 * quedado viejos: en modo paginado el navegador ya no los recalcula. Ventas.vue lo observa y
		 * pide un refresco silencioso.
		 *
		 * Se apaga al SALIR un pedido nuevo del listado, no al llegar su respuesta: así un cambio que
		 * cae mientras ese pedido viaja lo vuelve a prender y dispara otro refresco, en vez de quedar
		 * tapado por una respuesta que se calculó antes de ese cambio.
		 */
		totales_desactualizados: false,

		/**
		 * Solapa de sucursal / empleado que está mirando la pantalla, ya resuelta a ids (la ruta
		 * trae nombres: `/ventas/:view?/:sub_view?`). Es lo que viaja como `address_id`,
		 * `employee_id` y `only_owner` en la query string del modo paginado, para que el servidor
		 * recorte y totalice la misma vista que el usuario tiene adelante. La sincroniza Ventas.vue
		 * (`sincronizar_alcance`) porque resolver nombre → id necesita los stores de address y
		 * employee, que este store no conoce.
		 */
		alcance_de_pantalla: {
			address_id: null,
			employee_id: null,
			only_owner: false,
		},

		/**
		 * Último pedido del listado que todavía no terminó:
		 * `{ clave, promesa, loading_pendiente, overlay_pendiente }`.
		 *
		 * `clave` es la URL completa con sus params en orden fijo, y sirve para no pedir dos veces
		 * lo mismo cuando dos caminos lo piden casi a la vez (el ítem del menú y el `created()` de
		 * la vista; los watchers de `view` y `sub_view` en una misma navegación): el segundo recibe
		 * la misma promesa. Los dos flags dicen qué indicador de carga hay que apagar cuando llegue
		 * la respuesta que valga (ver `_getModels`). null cuando no hay nada en vuelo.
		 */
		pedido_en_curso: null,

		/**
		 * Contador de pedidos del listado. Cada `_getModels` lo incrementa y se guarda su número;
		 * una respuesta cuyo número ya no es el vigente se descarta. Sin esto, un listado entero
		 * pedido antes (o la página anterior) podía llegar DESPUÉS y pisar lo que el usuario pidió
		 * último. La regla es una sola: la última pedida gana.
		 */
		secuencia_de_carga: 0,
	},
	mutations: {
		/**
		 * Guarda la preferencia del modal de borrado: compensar caja o no en el próximo DELETE.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {boolean} value Valor del checkbox en Confirm.vue.
		 * @returns {void}
		 */
		setCompensarCajaDelete(state, value) {
			state.compensar_caja_delete = value
		},
		/**
		 * Cambia el módulo/fuente consultada en endpoint from-date de ventas.
		 *
		 * Con cualquier módulo que no sea 'ventas' se apaga el modo paginado por fecha en el acto,
		 * sin esperar a que llegue la respuesta del otro módulo: `paginado_por_fecha` lo leen la barra
		 * de paginación y la tabla común, y en Por Entregar / Depósito, si la respuesta del módulo
		 * tarda, la barra se mostraba un instante con los números del día de Ventas.
		 */
		set_modulo(state, value) {
			state.modulo = value
			if (value != 'ventas') {
				state.paginado_por_fecha = false
				state.totales_del_dia = null
			}
		},
		/**
		 * Filtro visual para ventas cobradas/no cobradas.
		 */
		setVentasCobradasShowOption(state, value) {
			state.ventas_cobradas_show_option = value
		},
		/**
		 * Filtro visual para mostrar ventas con/sin factura AFIP.
		 */
		setAfipTicketShowOption(state, value) {
			state.afip_ticket_show_option = value
		},
		/**
		 * Texto de búsqueda por número de factura AFIP en el listado de ventas.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {string} value Número o fragmento ingresado por el usuario.
		 * @returns {void}
		 */
		set_afip_ticket_cbte_numero_search(state, value) {
			state.afip_ticket_cbte_numero_search = value
		},
		/**
		 * Filtro visual por método de pago.
		 */
		set_payment_method_show_option(state, value) {
			state.payment_method_show_option = value
		},
		/**
		 * Guarda el array de descripciones del precio de la venta seleccionada para mostrar en el modal.
		 * Se llama desde PriceDescriptionBtn al hacer click en el botón de una fila de ventas.
		 * @param {Array} value - Array de strings con las líneas descriptivas del cálculo
		 */
		set_sale_price_description(state, value) {
			state.sale_price_description = value
		},
		/**
		 * Alterna la visibilidad de ventas contenedoras de facturación en el listado.
		 */
		toggleMostrarConsolidadas(state) {
			state.mostrar_consolidadas = !state.mostrar_consolidadas
		},
		/**
		 * Marca si el último listado vino paginado por la API (ver doc del state).
		 */
		set_paginado_por_fecha(state, value) {
			state.paginado_por_fecha = !!value
		},
		/**
		 * Guarda (o limpia, con null) los totales del día que manda la API en modo paginado.
		 */
		set_totales_del_dia(state, value) {
			state.totales_del_dia = value ? value : null
		},
		/**
		 * Prende o apaga la marca de "los totales del navegador pueden estar viejos".
		 */
		set_totales_desactualizados(state, value) {
			state.totales_desactualizados = !!value
		},
		/**
		 * Reemplaza el alcance de la pantalla (solapa de sucursal / empleado resuelta a ids).
		 * Se reconstruye el objeto entero y siempre con las tres claves, así ningún consumidor
		 * tiene que preguntar si existen.
		 *
		 * @param {Object} state
		 * @param {{address_id: (number|null), employee_id: (number|null), only_owner: boolean}} value
		 */
		set_alcance_de_pantalla(state, value) {
			let alcance = value || {}
			state.alcance_de_pantalla = {
				address_id: typeof alcance.address_id != 'undefined' ? alcance.address_id : null,
				employee_id: typeof alcance.employee_id != 'undefined' ? alcance.employee_id : null,
				only_owner: !!alcance.only_owner,
			}
		},
		/**
		 * Guarda (o limpia, con null) el pedido del listado que está en vuelo.
		 */
		set_pedido_en_curso(state, value) {
			state.pedido_en_curso = value ? value : null
		},
		/**
		 * Un pedido más del listado: el número nuevo es el único vigente desde ahora.
		 */
		incrementar_secuencia_de_carga(state) {
			state.secuencia_de_carga++
		},
		/**
		 * Mantiene el log de actualización de venta que ya tenía el store original.
		 */
		add(state, value) {
			let index = state.models.findIndex(item => {
				return item.id == value.id
			})
			if (index == -1) {
				state.models.unshift(value)
			} else {
				console.log('se actualizo esta venta:')
				console.log(value)
				state.models.splice(index, 1, value)
			}

			index = state.filtered.findIndex(item => {
				return item.id == value.id
			})
			if (index != -1) {
				state.filtered.splice(index, 1, value)
			}

			// Una venta agregada o editada desde un modal (facturar, cerrar, entregar unidades...)
			// puede cambiar los totales del día, y en modo paginado el navegador ya no los
			// recalcula: se avisa para que Ventas.vue los vuelva a pedir.
			state.totales_desactualizados = true
		},
		/**
		 * La mutation `delete` del factory, envuelta para marcar los totales como viejos.
		 *
		 * Va en la MUTATION y no solo en la action `delete` porque la eliminación masiva desde el
		 * dropdown de selección (common-vue/.../opciones-filtrados-seleccion) commitea
		 * `sale/delete` directo, sin pasar por la action; si la marca viviera solo en la action,
		 * borrar tres ventas tildadas dejaría los chips con los números de antes.
		 */
		delete(state) {
			base_delete(state)
			state.totales_desactualizados = true
		},
	},
	actions: {
		/**
		 * Busca ventas en API por N° de comprobante AFIP (cbte_numero), sin depender del rango de fechas cargado.
		 *
		 * @param {Object} context commit, state, dispatch
		 * @param {string} value Texto ingresado en el buscador del nav.
		 * @returns {Promise|void}
		 */
		search_by_afip_ticket_cbte_numero({ commit, state, dispatch }, value) {
			const cbte_numero = typeof value === 'string' ? value.trim() : ''
			commit('set_afip_ticket_cbte_numero_search', cbte_numero)

			let filters = state.filters ? state.filters.slice() : []
			const filter_index = filters.findIndex(filter => {
				return filter.key === 'afip_ticket_cbte_numero'
			})

			if (cbte_numero === '') {
				if (filter_index !== -1) {
					filters.splice(filter_index, 1)
				}
				commit('setFilters', filters)
				if (sale_filters_have_active_criteria_except_afip(filters)) {
					commit('setFilterPage', 1)
					return dispatch('runFilter', { page: 1 })
				}
				commit('setIsFiltered', false)
				commit('setFiltered', [])
				commit('setFilterPage', 1)
				commit('setTotalFilterPages', null)
				commit('setTotalFilterResults', 0)
				// En modo paginado por fecha no alcanza con volver a mostrar `models`: es UNA página
				// del día, y la barra de paginación perdió sus números (runFilter los pisó con los
				// de la búsqueda). Se vuelve a pedir el día desde la página 1. Con la API vieja
				// `models` sigue siendo el día entero y basta con volver a mostrarlo, como siempre.
				if (state.paginado_por_fecha) {
					return dispatch('getModels')
				}
				return
			}

			const afip_filter = {
				key: 'afip_ticket_cbte_numero',
				type: 'afip_ticket_cbte_numero',
				text: 'N° de factura',
				que_contenga: cbte_numero,
			}
			if (filter_index === -1) {
				filters.unshift(afip_filter)
			} else {
				filters.splice(filter_index, 1, afip_filter)
			}
			commit('setFilters', filters)
			commit('setFilterPage', 1)
			return dispatch('runFilter', { page: 1 })
		},
		/**
		 * Elimina venta en API, opcionalmente pidiendo compensación en caja (`compensar_caja`).
		 *
		 * @param {Object} context commit, state
		 * @returns {Promise}
		 */
		delete({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/${state.delete.id}`, {
				params: {
					compensar_caja: state.compensar_caja_delete ? 1 : 0,
				},
			})
				.then(() => {
					// La mutation `delete` de este store ya marca `totales_desactualizados`.
					commit('delete')
				})
				.catch((err) => {
					console.log(err)
					return Promise.reject(err)
				})
		},
		/**
		 * Override de carga para ventas:
		 * arma URL `/api/sale/from-date/{modulo}/{from_date}/{until_date?}`.
		 *
		 * Con `modulo == 'ventas'` pide el listado PAGINADO (contrato api ↔ spa del 14/9/2026):
		 * manda `per_page` y `page`, más el alcance de la pantalla (solapa de sucursal / empleado)
		 * y las show options, y la API devuelve una página de ventas junto con los totales del día
		 * completo calculados en SQL. Con cualquier otro `modulo` (`por_entregar`, `por_estado`,
		 * `deposito`) NO manda query string: esos módulos leen `state.models` entero y la API, sin
		 * `per_page`, responde el array completo como siempre. También es lo que pasa con la API
		 * vieja aunque se le pida `per_page`: por eso la respuesta se mira por su forma y no por lo
		 * que se pidió.
		 *
		 * Tres modos de carga, según `payload.modo`:
		 * - sin modo: carga nueva del día o rango (entrar al módulo, cambiar de día, cambiar una
		 *   solapa o una show option). Skeleton como hasta ahora y vuelve a la página pedida (1).
		 * - 'pagina': cambio de página desde la barra. Overlay global con mensaje; NO toca
		 *   `state.loading`, así los chips de totales y la barra no desaparecen y vuelven.
		 * - 'silencioso': refresco de los totales después de un cambio en una venta. Sin indicador.
		 *
		 * Dos guardas contra las carreras entre pedidos, que con un listado paginado dejan de ser
		 * inofensivas (antes, dos respuestas del mismo día eran iguales; ahora una puede ser el día
		 * entero y la otra una página):
		 * - dedupe: si hay un pedido en vuelo con la MISMA clave (URL + params), se devuelve su
		 *   promesa sin pedir de nuevo. No aplica al modo 'silencioso', que por definición quiere
		 *   datos más nuevos que los que ya están viajando.
		 * - secuencia: cada pedido toma un número y una respuesta con un número viejo se descarta,
		 *   incluidos sus indicadores de carga, que apaga la respuesta vigente (los hereda al
		 *   pedirse). La última pedida gana.
		 *
		 * @param {Object} payload
		 * @param {Number} [payload.page] Página a pedir; solo cuenta en modo paginado (default 1).
		 * @param {String} [payload.modo] 'pagina' | 'silencioso' | nada (carga nueva).
		 * @returns {Promise}
		 */
		_getModels({commit, state}, payload = {}) {
			payload = payload || {}
			/** Página pedida. Solo tiene sentido en modo paginado. */
			let page = payload.page || 1
			/** Qué indicador de carga se prende (ver doc de arriba). */
			let modo = payload.modo || 'nuevo'

			let url = '/api/' + generals.methods.routeString(state.model_name)
			if (state.plural_model_name) {
				if (state.selected_model) {
					url += '/' + state.selected_model.id
				} else {
					url += '/0'
				}
			}

			url += '/from-date/' + state.modulo

			if (state.from_dates) {
				url += '/' + state.from_date
			}

			if (state.until_date != '') {
				url += '/' + state.until_date
			}

			// Query string del modo paginado, SOLO con modulo 'ventas' (ver doc de arriba). Las
			// claves van en un orden fijo porque de acá sale la clave del dedupe. `address_id` y
			// `employee_id` viajan únicamente cuando hay solapa elegida: una clave en null llegaría
			// como el string "null".
			let params = null
			if (state.modulo == 'ventas') {
				let alcance = state.alcance_de_pantalla || {}
				params = {}
				params.per_page = state.filter_per_page
				params.page = page
				if (alcance.address_id) {
					params.address_id = alcance.address_id
				}
				if (alcance.employee_id) {
					params.employee_id = alcance.employee_id
				}
				params.only_owner = alcance.only_owner ? 1 : 0
				params.ventas_cobradas_show_option = state.ventas_cobradas_show_option
				params.afip_ticket_show_option = state.afip_ticket_show_option
				params.payment_method_show_option = state.payment_method_show_option
				params.mostrar_consolidadas = state.mostrar_consolidadas ? 1 : 0
			}

			/** Clave del pedido: la URL completa con sus params serializados en el orden de arriba. */
			let clave = url
			if (params) {
				clave += '?' + Object.keys(params).map(key => {
					return key + '=' + encodeURIComponent(params[key])
				}).join('&')
			}

			// Dedupe: el ítem del menú (toSales) y el created() de la vista piden lo mismo casi al
			// mismo tiempo, y los watchers de view y sub_view disparan los dos en una misma
			// navegación. El segundo se cuelga de la promesa del primero.
			if (modo != 'silencioso' && state.pedido_en_curso && state.pedido_en_curso.clave == clave) {
				return state.pedido_en_curso.promesa
			}

			commit('incrementar_secuencia_de_carga')
			/** Número de ESTE pedido: si al volver ya no es el vigente, la respuesta se descarta. */
			let secuencia = state.secuencia_de_carga

			let prende_loading = false
			let prende_overlay = false
			if (modo == 'pagina') {
				commit('auth/setMessage', 'Cargando ventas', {root: true})
				commit('auth/setLoading', true, {root: true})
				prende_overlay = true
			} else if (modo != 'silencioso') {
				// 🔴 El orden importa: `setLoading(true)` PRIMERO y `setFilterPage` DESPUÉS. La
				// barra de paginación está montada bajo `v-if="!loading"` y observa `filter_page`
				// (emite `filtrar` con cada cambio); con `loading` ya en true la barra se desmonta
				// en el mismo tick y su watcher no llega a pedir una segunda página. Al revés,
				// cambiar de día con la barra parada en la página 3 pedía el día dos veces.
				commit('setLoading', true)
				prende_loading = true
				if (params) {
					commit('setFilterPage', page)
				}
			}

			// Los totales que vuelvan van a estar calculados DESPUÉS de este momento: lo que se
			// desactualice de acá en adelante tiene que volver a prender la marca (ver el state).
			commit('set_totales_desactualizados', false)

			/** Pedido que estaba en vuelo (si hay), del que se heredan los indicadores pendientes. */
			let anterior = state.pedido_en_curso
			let pedido = {
				clave: clave,
				promesa: null,
				loading_pendiente: prende_loading || !!(anterior && anterior.loading_pendiente),
				overlay_pendiente: prende_overlay || !!(anterior && anterior.overlay_pendiente),
			}

			let es_respuesta_vigente = () => {
				return secuencia == state.secuencia_de_carga
			}

			// Apaga todo indicador que haya quedado prendido por este pedido o por los que este
			// pedido reemplazó. Una respuesta VIEJA no apaga nada: si apagara `loading`, la tabla
			// mostraría por un instante las ventas del día anterior debajo de la fecha nueva,
			// mientras el pedido bueno sigue viajando.
			let apagar_indicadores = () => {
				if (pedido.loading_pendiente) {
					commit('setLoading', false)
				}
				if (pedido.overlay_pendiente) {
					commit('auth/setLoading', false, {root: true})
					commit('auth/setMessage', '', {root: true})
				}
				if (state.pedido_en_curso === pedido) {
					commit('set_pedido_en_curso', null)
				}
			}

			let config = params ? {params: params} : {}
			pedido.promesa = axios.get(url, config)
				.then(res => {
					if (!es_respuesta_vigente()) {
						return
					}
					let modelos = res.data.models
					if (!modelos || Array.isArray(modelos)) {
						// Camino viejo: array entero (API sin paginar, u otro módulo del store).
						commit('setModels', modelos)
						commit('set_paginado_por_fecha', false)
						commit('set_totales_del_dia', null)
					} else {
						// Paginador de Laravel + totales del día completo.
						commit('setModels', modelos.data)
						commit('set_totales_del_dia', res.data.totales || null)
						commit('set_paginado_por_fecha', true)
						// 🔴 Los números de la barra (páginas, resultados, página actual) se escriben SOLO
						// si la pantalla sigue en modo por fecha. Si mientras este pedido viajaba el usuario
						// pasó a modo filtrado (buscador general, "Limpiar filtros", búsqueda por N° de
						// factura), la barra ya es de esa búsqueda: pisarla con los del día la dejaba
						// diciendo "N resultados" del día sobre una tabla de otra cosa, y con un día en cero
						// la hacía desaparecer. El pedido del día se dispara igual en esos flujos porque la
						// barra emite `filtrar` ante cualquier escritura de `filter_page`, también las
						// programáticas (hallazgo conocido desde el 8/9/2026).
						if (!state.is_filtered) {
							commit('setTotalFilterPages', modelos.last_page)
							commit('setTotalFilterResults', modelos.total)
							commit('setFilterPage', modelos.current_page)
						}
					}
					apagar_indicadores()
				})
				.catch(err => {
					console.log(err)
					if (!es_respuesta_vigente()) {
						return
					}
					apagar_indicadores()
				})
			commit('set_pedido_en_curso', pedido)
			return pedido.promesa
		},
		/**
		 * Cambio de página desde la barra de paginación en modo paginado por fecha: pide la página
		 * que la barra ya escribió en `filter_page`, con overlay y sin tocar `loading`.
		 *
		 * @returns {Promise}
		 */
		cambiar_pagina_por_fecha({dispatch, state}) {
			return dispatch('_getModels', {page: state.filter_page, modo: 'pagina'})
		},
		/**
		 * Refresco silencioso de la página actual y de los totales del día, después de que una
		 * venta se agregó, editó o borró (ver `totales_desactualizados` en el state).
		 *
		 * @returns {Promise}
		 */
		refrescar_totales_del_dia({dispatch, state}) {
			return dispatch('_getModels', {page: state.filter_page, modo: 'silencioso'})
		},
		/**
		 * Conserva comportamiento original: loader explícito mientras pagina resultados filtrados.
		 */
		loadMoreFiltered({state, commit}) {
			commit('setLoadingFiltered', true)
			commit('incrementFilterPage')
			return axios.post(`/api/search/${generals.methods.routeString(state.model_name)}/null/1?page=${state.filter_page}`, {
				filters: state.filters,
				per_page: state.filter_per_page,
			})
				.then(res => {
					commit('setLoadingFiltered', false)
					commit('addFiltered', res.data.data)
				})
				.catch(err => {
					console.log(err)
					commit('setLoadingFiltered', false)
				})
		},
	},
})

