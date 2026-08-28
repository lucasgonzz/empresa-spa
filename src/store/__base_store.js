import axios from 'axios'
axios.defaults.withCredentials = true
axios.defaults.baseURL = process.env.VUE_APP_API_URL

import moment from 'moment'
import generals from '@/common-vue/mixins/generals'
import filters_mixin from '@/common-vue/mixins/filters'

/**
 * Tope de iteraciones del encadenado de páginas por store, por corrida. Un `last_page`
 * disparatado del backend dejaría al front pidiendo páginas para siempre; este número es
 * generoso (cientos de páginas) para no cortar catálogos grandes en uso real.
 */
const TOPE_PAGINAS_SEGURIDAD = 500

/**
 * Factory de módulo base Vuex para stores de modelos.
 *
 * Objetivo:
 * - Evitar duplicación (la mayoría de stores comparten state/mutations/actions).
 * - Permitir override total (Opción A): cualquier store puede agregar o reescribir state/mutations/actions.
 * - Evitar state compartido entre módulos: el state se construye por función (nuevo objeto por store).
 *
 * Notas:
 * - Mantiene el estilo del proyecto (promesas .then/.catch, sin async/await).
 * - Pensado para stores "CRUD + filtros + selección" usados por la tabla común.
 *
 * @param {Object} options Configuración/overrides del store concreto.
 * @param {Object|Function} options.state Estado extra u override. Si es función, se invoca al construir state.
 * @param {Object} options.mutations Mutations extra u override.
 * @param {Object} options.actions Actions extra u override.
 * @param {Object} options.getters Getters extra u override.
 * @param {Object} options.modules Submódulos Vuex.
 * @returns {Object} Módulo Vuex namespaced listo para registrar.
 */
export default function __base_store(options = {}) {
	/** Estado custom del store concreto (puede ser objeto o función). */
	let custom_state = options.state
	/** Features opcionales del store (apagadas por default). */
	let features = options.features || {}
	/** Mutations custom del store concreto (se mergean, y pueden pisar las base). */
	let custom_mutations = options.mutations || {}
	/** Actions custom del store concreto (se mergean, y pueden pisar las base). */
	let custom_actions = options.actions || {}
	/** Getters custom del store concreto (se mergean, y pueden pisar las base). */
	let custom_getters = options.getters || {}
	/** Submódulos custom del store concreto (ej: article tiene modules internos). */
	let custom_modules = options.modules || {}

	/**
	 * Construye el state base del módulo.
	 * Se retorna como función para que cada módulo tenga su propio state (no compartido).
	 */
	function base_state() {
		/** Estado base compartido por la mayoría de modelos (tabla, filtros, selección, etc). */
		let base = {
			model_name: '',
			route_prefix: '',
			from_dates: false,
			is_selecteable: false,

			use_per_page: false,

			from_date: moment().format('YYYY-MM-DD'),
			until_date: '',

			page: 1,
			per_page: 50,
			total_pages: 1,

			models: [],
			model: {},
			selected: [],
			filters: [],
			filtered: [],
			is_filtered: false,
			filter_page: 1,
			total_filter_pages: null,
			total_filter_results: 0,
			filter_per_page: 50,
			loading_filtered: false,

			delete: null,
			delete_image_prop: null,
			delete_image_model: null,

			prop_model_to_delete: null,

			display: 'table',

			loading: false,

			props_to_show: [],

			// Flag que indica si el estado filtered fue cargado por un buscador rápido sin usar el FilterForm (ej. el buscador general).
			// Permite distinguir entre "filtrado por formulario" y "filtrado por buscador rápido".
			filtered_without_filter_form: false,

			// Payload completo (query_value, props, relation_props, extra_filters) de la última búsqueda
			// disparada por el buscador general (BuscadorGeneral). Se persiste para que la paginación
			// pueda repetir la misma búsqueda solo cambiando la página, sin volver a armar el payload.
			global_search_payload: null,

			// Filtros extra que vienen de un control SIEMPRE VISIBLE de la barra del módulo (hoy: el
			// select de sucursal del Listado de artículos), en la forma { key, operator, value } que
			// entiende ExtraFiltersHelper del backend.
			//
			// 🔴 Vive acá y NO adentro de global_search_payload, por la misma razón que state.filters:
			// el payload se persiste para que la paginación repita la búsqueda, así que un criterio
			// guardado ahí adentro seguiría aplicándose después de que el usuario lo sacó. Los
			// criterios que el usuario puede cambiar en cualquier momento se leen del state EN CADA
			// request; el payload persistido solo describe la búsqueda de texto.
			//
			// Arranca vacío y ningún módulo lo escribe salvo el que lo necesita: para todos los demás
			// stores construidos con este factory, esto no cambia absolutamente nada.
			extra_filters_de_barra: [],

			// Desglose de coincidencias de la ultima busqueda del buscador general (grupo 274): que
			// propiedad aporto cada resultado de la pagina que se esta viendo. null cuando la respuesta
			// no lo trae (listado por defecto, o busqueda sin criterio de texto).
			global_search_matches: null,

			// Contador que se incrementa SOLO cuando el usuario dispara una busqueda nueva (no en los
			// cambios de pagina). El componente de notificacion lo observa para saber cuando mostrarse:
			// sin esto, la notificacion reaparecia en cada clic de la paginacion, que es la clase de
			// insistencia que hace que un cartel util se vuelva molesto.
			global_search_matches_nonce: 0,

			// Flag que distingue "listado por defecto" (filtered poblado por la carga automática al
			// entrar al módulo, con todos los registros paginados) de una búsqueda real escrita por el
			// usuario. La UI lo usa para no mostrar carteles de "filtro activo" (título "con filtro",
			// botón de limpiar búsqueda, botón de quitar filtros) cuando en realidad no hay ningún
			// criterio puesto, solo el listado inicial.
			listado_por_defecto: false,

			/**
			 * Origen del último dropdown masivo (filtrados vs seleccionados).
			 * Lo usan modales globales fuera del árbol del menú desplegable.
			 */
			options_from_filter: false,

			/**
			 * Lista liviana (id + name, y lo que agregue cada endpoint /options) para selectores y
			 * acumuladores que necesitan el catálogo entero, sin descargar el modelo completo con
			 * withAll() al iniciar sesión (grupo 332, 4/8/2026). Ver acción `getOptions`.
			 */
			options: [],
			// Si ya se pidió una vez en esta sesión: evita re-pedir en cada `created()` que la use.
			options_loaded: false,
			loading_options: false,
		}

		/**
		 * Feature: cache en localStorage para stores con endpoints preparados.
		 * Apagado por default. Pensado para `article` (usa updated_at param + endpoint deleted-models).
		 */
		if (features.local_storage) {
			// Flag que activa el cache en localStorage para el módulo.
			base.use_local_storage = false
			// Flag para cortar el uso de localStorage cuando el dataset es demasiado grande.
			base.local_storage_canceled = false
		}

		/** Estado adicional u override del store concreto. */
		let extra = {}
		if (typeof custom_state === 'function') {
			extra = custom_state() || {}
		} else if (custom_state && typeof custom_state === 'object') {
			extra = custom_state
		}

		return Object.assign({}, base, extra)
	}

	/** Mutations base (copiadas de `src/store/__base.js` y usadas por la mayoría de stores). */
	let base_mutations = {
		set_props_to_show(state, value) {
			state.props_to_show = value
		},
		set_route_prefix(state, value) {
			state.route_prefix = value
		},
		setLoading(state, value) {
			state.loading = value
		},
		setModel(state, value) {
			if (value.model) {
				state.model = value.model
				if (value.properties.length) {
					value.properties.forEach(prop => {
						state.model[prop.key] = prop.value
					})
				}
			} else {
				let obj = {
					id: null
				}
				require(`@/models/${state.model_name}`).default.properties.forEach(prop => {
					obj[prop.key] = prop.value
				})
				if (value.properties.length) {
					value.properties.forEach(prop => {
						obj[prop.key] = prop.value
					})
				}
				state.model = obj
			}
		},
		addModels(state, value) {
			state.models = state.models.concat(value)
		},
		incrementPage(state) {
			state.page++
		},
		setPage(state, value) {
			state.page = value
		},
		setTotalPages(state, value) {
			state.total_pages = value
		},
		setModels(state, value) {
			if (value) {
				state.models = value
			} else {
				state.models = []
			}
		},
		setSelectedModel(state, value) {
			state.selected_model = value
		},
		setSelected(state, value) {
			state.selected = value
		},
		addSelected(state, value) {
			let index = state.selected.findIndex(selected_model => {
				return selected_model.id == value.id
			})
			if (index != -1) {
				state.selected.splice(index, 1)
			} else {
				state.selected.push(value)
			}
		},
		setFiltered(state, value) {
			state.filtered = value
		},
		setFilters(state, value) {
			state.filters = value
		},
		addFilter(state, filter_to_add) {
			let index = state.filters.findIndex(filter => {
				return filter.key == filter_to_add.key
			})

			if (index == -1) {
				state.filters.unshift(filter_to_add)
			} else {
				state.filters.splice(index, 1, filter_to_add)
			}
		},
		/**
		 * Borra los criterios de VALOR de todos los filtros de columna, dejando los filtros en pie.
		 *
		 * La usa la exclusión mutua entre el buscador general y los filtros de columna (Lucas,
		 * 28/8/2026): "o busca por el buscador general o busca por las columnas, no se deben de
		 * poder combinar". El motivo de fondo es que los dos criterios NO viajan por el mismo
		 * camino: runGlobalSearch manda texto + filtros de columna + extra_filters juntos, pero la
		 * actualización/eliminación masiva manda SOLO `filter_form: state.filters`. Con los dos
		 * puestos, la tabla muestra la intersección y la masiva toca MÁS registros de los que se
		 * ven, en silencio.
		 *
		 * 🔴 Limpia EN EL LUGAR, mutando las propiedades que ya existen en cada filtro (que en Vue 2
		 * es reactivo porque fueron declaradas al construir el filtro). Es lo mismo que hace
		 * limpiar_filtros() de BtnRestartFilter.vue, y NO es un capricho:
		 * - `setFilters([])` vaciaría el array y con eso se cae el resaltado de la lupa
		 *   (filter_is_used() de display/table/Index.vue recorre state.filters), y las plantillas de
		 *   filtros se reconstruirían de cero en el próximo build_table_filters_from_props.
		 * - Reemplazar cada filtro por un objeto nuevo perdería las claves propias que le agrega
		 *   cada módulo.
		 *
		 * 🔴 `ordenar_de` NO se toca: ordenar no es filtrar. Es la misma doctrina que separa
		 * filter_has_active_values() de filter_has_value_criteria() en common-vue/mixins/filters.js:
		 * si acá se limpiara el orden, elegir una búsqueda en el buscador general dejaría la tabla
		 * sin la flecha de orden que el usuario había puesto (y sin el orden en sí).
		 *
		 * @param {Object} state Estado del módulo.
		 */
		limpiar_criterios_de_columna(state) {
			state.filters.forEach(filter => {
				// select y search guardan el "sin elección" como 0, no como '': con '' el control
				// del modal no vuelve a la opción neutra y filter_has_value_criteria lo seguiría
				// contando como criterio puesto.
				filter.igual_que = (filter.type == 'select' || filter.type == 'search') ? 0 : ''
				filter.mayor_que = ''
				filter.menor_que = ''
				filter.que_contenga = ''
				filter.checkbox = -1
				filter.en_blanco = false
				filter.no_en_blanco = false

				// `value` solo existe en algunos tipos de filtro; se limpia únicamente si ya estaba
				// declarada, porque agregarla acá con asignación directa no sería reactiva en Vue 2
				// y encima le inventaría una propiedad a filtros que no la usan.
				if (typeof filter.value !== 'undefined') {
					filter.value = (filter.type == 'select' || filter.type == 'search') ? 0 : ''
				}
			})
		},
		setIsFiltered(state, value) {
			state.is_filtered = value
		},
		add(state, value) {
			let index = state.models.findIndex(item => {
				return item.id == value.id
			})
			if (index == -1) {
				state.models.unshift(value)
			} else {
				state.models.splice(index, 1, value)
			}

			index = state.filtered.findIndex(item => {
				return item.id == value.id
			})
			if (index != -1) {
				state.filtered.splice(index, 1, value)
			}

			// Si options ya está cargado, insertar o reemplazar también ahí una version
			// reducida del modelo, o el selector no lo va a ofrecer hasta recargar la
			// pagina (grupo 332, 4/8/2026). Las claves se toman de un elemento ya
			// existente en options (las que devuelve el endpoint /options de cada
			// modelo), asi el factory no necesita saber de antemano que columnas trae
			// cada uno.
			if (state.options_loaded) {
				let claves = state.options.length ? Object.keys(state.options[0]) : ['id', 'name']
				let reducido = {}
				claves.forEach(clave => {
					reducido[clave] = value[clave]
				})

				let index_options = state.options.findIndex(item => {
					return item.id == reducido.id
				})
				if (index_options == -1) {
					state.options.unshift(reducido)
				} else {
					state.options.splice(index_options, 1, reducido)
				}
			}
		},
		setDelete(state, value) {
			state.delete = value
		},
		delete(state) {
			// Models
			let index = state.models.findIndex(model => {
				return model.id == state.delete.id
			})
			state.models.splice(index, 1)

			// Filtereds
			index = state.filtered.findIndex(model => {
				return model.id == state.delete.id
			})
			if (index != -1) {
				state.filtered.splice(index, 1)
			}

			if (state.selected_model && state.selected_model[state.plural_model_name]) {
				index = state.selected_model[state.plural_model_name].findIndex(model => {
					return model.id == state.delete.id
				})
				state.selected_model[state.plural_model_name].splice(index, 1)
			}
		},
		setDeleteImageProp(state, value) {
			state.delete_image_prop = value
		},
		setDeleteImageModel(state, value) {
			state.delete_image_model = value
		},
		deleteImage(state, value) {
			let index = state.models.images.findIndex(model => {
				return model.id == state.delete_image.id
			})
			if (index != -1) {
				state.model.images.splice(index, 1)
			}
		},
		setPropModelToDelete(state, value) {
			state.prop_model_to_delete = value
		},
		deletePropModel(state) {
			let index = state.model[state.prop_model_to_delete.key].findIndex(model => {
				return model.id == state.prop_model_to_delete.id
			})
			state.model[state.prop_model_to_delete.key].splice(index, 1)
		},
		setDisplay(state, value) {
			state.display = value
		},
		setFromDate(state, value) {
			state.from_date = value
		},
		setUntilDate(state, value) {
			state.until_date = value
		},
		setIsSelecteable(state, value) {
			state.is_selecteable = value
		},
		setFromDates(state, value) {
			state.from_dates = value
		},
		incrementFilterPage(state) {
			state.filter_page++
		},
		setFilterPage(state, value) {
			state.filter_page = value
		},
		setFilterPerPage(state, value) {
			let n = parseInt(value, 10)
			if (isNaN(n) || n < 1) {
				n = 5
			}
			if (n > 200) {
				n = 200
			}
			state.filter_per_page = n
		},
		setTotalFilterPages(state, value) {
			state.total_filter_pages = value
		},
		setTotalFilterResults(state, value) {
			state.total_filter_results = value
		},
		addFiltered(state, value) {
			state.filtered = state.filtered.concat(value)
		},
		setLoadingFiltered(state, value) {
			state.loading_filtered = value
		},

		/**
		 * Activa o desactiva el flag que indica que filtered fue cargado
		 * por un buscador rápido sin pasar por el formulario de filtros (ej. el buscador general).
		 *
		 * @param {Object} state  Estado del módulo.
		 * @param {Boolean} value true cuando viene del buscador rápido, false en cualquier reset.
		 */
		set_filtered_without_filter_form(state, value) {
			state.filtered_without_filter_form = value
		},
		/**
		 * Persiste (o limpia, con `null`) el payload completo de la última búsqueda del buscador general,
		 * para que la paginación pueda repetirla cambiando solo la página.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Object|null} value Payload completo (query_value, props, relation_props, extra_filters) o null.
		 */
		setGlobalSearchPayload(state, value) {
			state.global_search_payload = value
		},
		/**
		 * Reemplaza los filtros extra que aporta la barra del módulo (ver doc del state).
		 *
		 * Reemplaza y no acumula: el control de la barra es la única fuente de verdad de su propio
		 * criterio, así que mandar el array entero es lo que garantiza que sacar el filtro lo saque
		 * de verdad. Un push dejaría el criterio viejo adentro para siempre.
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Array} value Filtros en la forma { key, operator, value }.
		 */
		set_extra_filters_de_barra(state, value) {
			state.extra_filters_de_barra = value
		},
		/**
		 * Guarda el desglose de coincidencias de la ultima busqueda, o lo limpia con null.
		 * Incrementa el nonce solo cuando `es_busqueda_nueva` es true (ver doc del state).
		 *
		 * @param {Object} state Estado del modulo.
		 * @param {Object} payload
		 * @param {Object|null} payload.matches Desglose devuelto por el backend, o null.
		 * @param {Boolean} payload.es_busqueda_nueva true cuando la disparo el usuario, false en paginacion.
		 */
		setGlobalSearchMatches(state, payload) {
			state.global_search_matches = (payload && payload.matches) ? payload.matches : null
			if (payload && payload.es_busqueda_nueva) {
				state.global_search_matches_nonce++
			}
		},
		/**
		 * Activa o desactiva el flag que indica que `filtered` viene de la carga automática
		 * del listado por defecto (no de una búsqueda escrita por el usuario).
		 *
		 * @param {Object} state Estado del módulo.
		 * @param {Boolean} value true cuando el listado activo es el "por defecto", false en cualquier
		 *   búsqueda o filtro real del usuario.
		 */
		set_listado_por_defecto(state, value) {
			state.listado_por_defecto = value
		},
		/**
		 * Guarda si la acción masiva se originó en el dropdown de filtrados.
		 *
		 * @param {Object}  state
		 * @param {boolean} value
		 */
		set_options_from_filter(state, value) {
			state.options_from_filter = !!value
		},
		/**
		 * Setea la lista liviana traída por `getOptions`.
		 *
		 * @param {Object} state
		 * @param {Array} value
		 */
		setOptions(state, value) {
			state.options = value
		},
		/**
		 * Marca si `options` ya se pidió con éxito en esta sesión.
		 *
		 * @param {Object} state
		 * @param {Boolean} value
		 */
		setOptionsLoaded(state, value) {
			state.options_loaded = value
		},
		/**
		 * Estado de carga de `getOptions`, para que la UI pueda mostrar un loader.
		 *
		 * @param {Object} state
		 * @param {Boolean} value
		 */
		setLoadingOptions(state, value) {
			state.loading_options = value
		},
	}

	/**
	 * Feature: cache localStorage (mutations extras + wrappers).
	 * Se agrega solo si está habilitada para evitar afectar a otros módulos.
	 */
	if (features.local_storage) {
		/** Mutation para activar/desactivar localStorage desde el store concreto. */
		base_mutations.setLocalStorage = function (state, value) {
			state.use_local_storage = value
		}
		/** Mutation para marcar cancelación del uso de localStorage por volumen de datos. */
		base_mutations.setLocalStorageCanceled = function (state, value) {
			state.local_storage_canceled = value
		}

		// Wrapper de add: mantiene funcionalidad base + sincroniza localStorage si corresponde.
		let base_add = base_mutations.add
		base_mutations.add = function (state, value) {
			base_add(state, value)
			if (state.use_local_storage && typeof value.update_local_storage == 'undefined') {
				window.localStorage.setItem(
					state.model_name + '_user_id_' + window.localStorage.getItem('user_id'),
					JSON.stringify(state.models)
				)
				window.localStorage.setItem(
					state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'),
					moment().format('YYYY-MM-DD HH:mm:ss')
				)
			}
		}

		// Wrapper de delete: mantiene funcionalidad base + sincroniza localStorage si corresponde.
		let base_delete = base_mutations.delete
		base_mutations.delete = function (state) {
			base_delete(state)
			if (state.use_local_storage) {
				window.localStorage.setItem(
					state.model_name + '_user_id_' + window.localStorage.getItem('user_id'),
					JSON.stringify(state.models)
				)
				window.localStorage.setItem(
					state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'),
					moment().format('YYYY-MM-DD HH:mm:ss')
				)
			}
		}
	}

	/** Actions base (copiadas de `src/store/__base.js` y usadas por la mayoría de stores). */
	let base_actions = {
		getModels({commit, state, dispatch}) {
			commit('setSelected', [])
			commit('setFiltered', [])
			commit('setIsFiltered', false)
			// Resetear el flag de buscador rápido al recargar modelos desde el servidor.
			commit('set_filtered_without_filter_form', false)
			// Limpiar el payload persistido del buscador general para no dejarlo colgado de una búsqueda vieja.
			commit('setGlobalSearchPayload', null)
			// Esta carga ya no es el "listado por defecto" armado por runListadoPorDefecto.
			commit('set_listado_por_defecto', false)
			if (state.use_per_page) {
				commit('setPage', 1)
				commit('setModels', [])
			}
			return dispatch('_getModels')
		},
		_getModels({commit, state, dispatch}, payload = {}) {
			/** Cuántas páginas ya se pidieron en esta corrida del encadenado (arranca en 1). */
			let intentos = payload.intentos || 1
			commit('setLoading', true)
			let url = '/api/' + generals.methods.routeString(state.model_name)
			if (state.plural_model_name) {
				if (state.selected_model) {
					url += '/' + state.selected_model.id
				} else {
					url += '/0'
				}
			}
			if (state.route_prefix != '' || state.route_prefix === 0) {
				url += '/' + state.route_prefix
			}
			if (state.from_dates) {
				url += '/from-date/' + state.from_date
			}
			if (state.until_date != '') {
				url += '/' + state.until_date
			}
			if (state.use_per_page) {
				url += '?page=' + state.page + '&per_page=' + state.per_page
			}
			return axios.get(url)
			.then(res => {
				if (state.use_per_page) {
					let loaded_models = res.data.models.data
					if (res.data.models.current_page == 1) {
						commit('setTotalPages', res.data.models.last_page)
					}
					console.log('se cargo ' + state.model_name + ' page: ' + state.page)
					commit('incrementPage')
					commit('addModels', loaded_models)

					// Pongo esto momentaneamente para que funcione la paginacion en display/table/pagination
					commit('setTotalFilterPages', res.data.models.last_page)
					commit('setTotalFilterResults', res.data.models.total)

					/*
						La condición es current_page < last_page, no comparar la cantidad de filas
						recibidas contra el per_page del store. Esa comparación asumía que el front y
						el backend usaban el mismo tamaño de página sin que nadie lo verificara: el
						store de article decía 200, el controller paginaba de a 500, la igualdad nunca
						daba verdadero y el listado se cortaba en la primera página (4/8/2026). El
						backend ya devuelve current_page y last_page en la misma respuesta.
					*/
					if (res.data.models.current_page < res.data.models.last_page) {
						if (intentos >= TOPE_PAGINAS_SEGURIDAD) {
							console.log('se corto la descarga de ' + state.model_name + ' por alcanzar el tope de seguridad de ' + TOPE_PAGINAS_SEGURIDAD + ' paginas (revisar last_page del backend)')
							commit('setLoading', false)
							commit('setPage', 1)
						} else {
							dispatch('_getModels', {intentos: intentos + 1})
						}
					} else {
						commit('setLoading', false)
						commit('setPage', 1)
					}
				} else {
					commit('setLoading', false)
					commit('setModels', res.data.models)
				}
			})
			.catch(err => {
				commit('setLoading', false)
				console.log(err)
			})
		},
		/**
		 * Trae la lista liviana (id + name, y lo que agregue cada endpoint) para selectores y
		 * acumuladores que necesitan el catálogo entero. No usa `getModels`/paginación a propósito:
		 * ese camino trae el modelo completo con withAll() y solo la primera página (grupo 332,
		 * 4/8/2026).
		 *
		 * @param {Object} context commit, state
		 * @param {Boolean} force Si es true, vuelve a pedir aunque ya esté cargado.
		 * @returns {Promise}
		 */
		getOptions({commit, state}, force = false) {
			// Si ya se cargó y no se pide forzar, no vuelve a pedir: esto es lo que permite
			// llamarla desde el created() de varias pantallas sin generar una ráfaga de requests.
			if (state.options_loaded && !force) {
				return Promise.resolve()
			}
			commit('setLoadingOptions', true)
			let url = '/api/' + generals.methods.routeString(state.model_name) + '/options'
			return axios.get(url)
			.then(res => {
				commit('setOptions', res.data.models)
				commit('setOptionsLoaded', true)
				commit('setLoadingOptions', false)
			})
			.catch(err => {
				// Punto critico: NO marcar options_loaded en true acá. Si la request falla y
				// igual quedara marcada, la sesión entera se queda con una lista vacía o parcial
				// que nunca se vuelve a pedir (exactamente el modo de falla que corrige este
				// grupo). Dejar options_loaded en false para que el próximo intento reintente.
				commit('setLoadingOptions', false)
				console.log(err)
			})
		},
		loadMoreFiltered({state, commit}) {
			commit('incrementFilterPage')
			return axios.post(`/api/search/${generals.methods.routeString(state.model_name)}/null/1?page=${state.filter_page}`, {
				filters: state.filters,
				per_page: state.filter_per_page,
			})
			.then(res => {
				commit('addFiltered', res.data.data)
			})
			.catch(err => {
				console.log(err)
			})
		},
		delete({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.model_name)}/${state.delete.id}`)
			.then(() => {
				commit('delete')
			})
			.catch((err) => {
				console.log(err)
				return Promise.reject(err)
			})
		},
		deleteImageProp({ commit, state }) {
			return axios.delete(`/api/delete-image-prop/${generals.methods.routeString(state.model_name)}/${state.model.id}/${state.delete_image_prop}`)
			.then((res) => {
				commit('add', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deleteImageModel({ commit, state }) {
			return axios.delete(`/api/delete-image-model/${generals.methods.routeString(state.model_name)}/${state.model.id}/${state.delete_image_model.id}`)
			.then((res) => {
				commit('add', res.data.model)
			})
			.catch((err) => {
				console.log(err)
			})
		},
		deletePropModel({ commit, state }) {
			return axios.delete(`/api/${generals.methods.routeString(state.prop_model_to_delete.has_many.model_name)}/${state.prop_model_to_delete.id}`)
			.then(res => {
				commit('deletePropModel')
			})
			.catch(err => {
				console.log(err)
			})
		},

		/**
		 * Ejecuta búsqueda filtrada (POST search) con los criterios actuales del store.
		 * Esto permite re-ejecutar el filtro luego de operaciones masivas (ej: eliminar seleccionados).
		 *
		 * @param {Object} context commit, state
		 * @param {Object} payload
		 * @param {Number|null} payload.page Página a consultar (si no viene, usa state.filter_page).
		 * @returns {Promise}
		 */
		runFilter({commit, state}, payload = {}) {
			/** Página objetivo: por defecto, la actual del store. */
			let page = (payload && payload.page) ? payload.page : state.filter_page
			/** Cantidad por página para resultados filtrados (alineado con backend search). */
			let per_page = state.filter_per_page || 5
			/** Nombre plural en español del modelo para el mensaje de feedback al usuario. */
			let plural_model_name = generals.methods.plural(state.model_name)

			commit('auth/setMessage', 'Filtrando ' + plural_model_name, {root: true})
			commit('auth/setLoading', true, {root: true})

			return axios.post('/api/search/' + generals.methods.routeString(state.model_name) + '/null/1?page=' + page, {
				filters: state.filters,
				papelera: false,
				per_page: per_page,
			})
				.then(res => {
					commit('auth/setLoading', false, {root: true})
					commit('auth/setMessage', '', {root: true})

					/** Filas devueltas por la búsqueda (puede ser vacío y sigue siendo filtrado activo). */
					let rows = res.data.data || []
					commit('setIsFiltered', true)
					commit('setFiltered', rows)
					commit('setTotalFilterPages', res.data.last_page)
					commit('setTotalFilterResults', res.data.total)
					// Un filtro real del formulario de filtros nunca es el listado por defecto.
					commit('set_listado_por_defecto', false)
				})
				.catch(err => {
					commit('auth/setLoading', false, {root: true})
					commit('auth/setMessage', '', {root: true})
					console.log(err)
				})
		},

		/**
		 * Ejecuta el buscador general (POST global-search/{model_name}) contra props propias
		 * (OR + AND de keywords) y relaciones (whereHas), más AND de extra_filters propios del módulo.
		 * Persiste el payload completo en el store para que la paginación pueda repetir la misma
		 * búsqueda solo pisando la página, sin volver a armar props/relation_props/extra_filters.
		 *
		 * @param {Object} context commit, state
		 * @param {Object} payload
		 * @param {Number} [payload.page] Página a consultar (si no viene, usa state.filter_page).
		 * @param {String} [payload.query_value] Criterio de texto. Si el payload no trae `props`
		 *   (caso paginación: llega solo `{ page }`), se asume que es un cambio de página y se
		 *   reusa el payload persistido en `state.global_search_payload`.
		 * @param {Array} [payload.props] Props propias del modelo a buscar (OR).
		 * @param {Array} [payload.relation_props] Relaciones a buscar, cada una `{ relation, props }`.
		 * @param {Array} [payload.extra_filters] Filtros extra propios del módulo (AND).
		 * @param {String} [payload.order_by] Columna de orden. Viaja dentro del payload persistido en
		 *   `state.global_search_payload` para que la paginación (que solo manda `{ page }`) repita el
		 *   mismo orden en vez de caer al orden por defecto del backend (created_at DESC).
		 * @param {String} [payload.order_direction] Dirección del orden ('ASC'/'DESC'), misma lógica
		 *   de persistencia que `order_by`.
		 * @param {Boolean} [payload.silencioso] Si es true, no muestra el overlay global de carga
		 *   (`auth/setLoading` / `auth/setMessage`). Pensado para el listado por defecto, que se
		 *   dispara solo al entrar al módulo y no debería sentirse como una búsqueda del usuario.
		 * @returns {Promise}
		 */
		runGlobalSearch({commit, state}, payload = {}) {
			/**
			 * Payload completo a enviar: si viene con `props` es una búsqueda nueva (se persiste,
			 * incluyendo `order_by`/`order_direction` si vinieron, ya que se persiste el payload entero);
			 * si no (solo `{ page }`), es un cambio de página y se reusa el payload persistido.
			 */
			let search_payload = payload
			/** true cuando esta llamada es una búsqueda nueva del usuario (trae `props`), false cuando es un cambio de página (solo `{ page }`, reusa el payload persistido). */
			let es_busqueda_nueva = !!(payload && payload.props)
			if (es_busqueda_nueva) {
				commit('setGlobalSearchPayload', payload)
				// Es una búsqueda real del usuario: a partir de ahora deja de ser el listado por defecto.
				commit('set_listado_por_defecto', false)
			} else {
				search_payload = state.global_search_payload || {}
			}

			/** Página objetivo: la que viene en el payload de paginación, o la actual del store. */
			let page = (payload && payload.page) ? payload.page : state.filter_page
			/** Cantidad por página, alineada con el resto de búsquedas filtradas. */
			let per_page = state.filter_per_page || 5
			/** Nombre plural en español del modelo para el mensaje de feedback al usuario. */
			let plural_model_name = generals.methods.plural(state.model_name)
			/** Modo silencioso: no muestra el overlay global de carga (ver doc de la action). */
			let silencioso = !!(payload && payload.silencioso)

			if (!silencioso) {
				commit('auth/setMessage', 'Buscando ' + plural_model_name, {root: true})
				commit('auth/setLoading', true, {root: true})
			}

			// Filtros de columna vigentes (los de la lupa de cada header). Se leen del store EN CADA
			// request y NUNCA se guardan dentro de global_search_payload: ese payload se persiste para
			// que la paginacion repita la misma busqueda, y si los filtros viajaran adentro, un filtro
			// que el usuario borro seguiria aplicandose al cambiar de pagina. state.filters es la unica
			// fuente de verdad de los filtros; el payload persistido solo describe la busqueda de texto.
			let column_filters = []
			state.filters.forEach(filter => {
				if (filters_mixin.methods.filter_has_active_values(filter)) {
					column_filters.push(filter)
				}
			})

			// Con filtros de columna activos, lo que se ve NO es el listado por defecto, aunque la
			// llamada no traiga `props`. El caso: filtrar desde la lupa de una columna termina en
			// filtrar() de display/table/Index.vue, que dispatchea { page: 1 } sin props; con eso
			// `es_busqueda_nueva` queda en false, el commit de arriba no corre, y el flag se queda
			// en el true que le dejo runListadoPorDefecto al entrar al modulo. Resultado: el boton
			// de limpiar filtros (v-if de BtnRestartFilter) no se monta nunca por ese camino, y el
			// tooltip del dropdown de acciones dice "Acciones sobre todos" con un filtro puesto.
			//
			// Va aca y no en filtrar() porque este es el punto por donde pasan TODOS los caminos que
			// aplican filtros de columna, incluida la paginacion, que tambien entra sin `props`.
			//
			// 🔴 Se cuentan los filtros con criterio de VALOR, no los que viajan al backend.
			// column_filters incluye los que solo tienen `ordenar_de`, porque sin ellos la columna
			// no se ordenaria; pero ordenar NO es filtrar. Contarlos aca hacia que ordenar una
			// columna prendiera el cartel de "N filtrados" sin que el usuario filtrara nada, y que
			// la exportacion creyera que habia filtros. Es la misma clase de mentira que este flag
			// vino a arreglar, en el sentido contrario.
			let filtros_con_valor = 0

			state.filters.forEach(filter => {
				if (filters_mixin.methods.filter_has_value_criteria(filter)) {
					filtros_con_valor++
				}
			})

			// Los filtros de barra cuentan igual que los de columna para este flag, y no es un
			// detalle: entran por el MISMO agujero que describe el comentario de arriba. El control
			// de barra dispatchea `{ page: 1 }` sin `props`, con lo cual `es_busqueda_nueva` queda
			// en false, el commit de mas arriba no corre, y el flag se queda en el true que le dejo
			// runListadoPorDefecto al entrar al modulo.
			//
			// Sin esto, con una sucursal elegida el sistema entero cree que esta mostrando el
			// listado COMPLETO mientras la tabla esta filtrada: el boton de limpiar filtros no se
			// monta (su v-if pide !listado_por_defecto) y el tooltip del dropdown de acciones
			// masivas dice "Acciones sobre todos (N)" sobre un conjunto recortado.
			if (filtros_con_valor > 0 || state.extra_filters_de_barra.length) {
				commit('set_listado_por_defecto', false)
			}

			// Filtros extra que viajan al backend: los de la búsqueda persistida (los que arma el
			// buscador general con sus filtros fijos) MÁS los del control de barra del módulo.
			//
			// Se concatenan y no se pisan: son dos criterios distintos que el usuario puede tener
			// puestos a la vez (ej: "categoría Bebidas" en el buscador y "Sucursal Centro" en la
			// barra), y quedarse con uno solo haría desaparecer el otro sin que nada lo muestre.
			//
			// Los de barra se leen del state EN CADA request, igual que column_filters y por el
			// mismo motivo (ver la doc de extra_filters_de_barra en el state).
			let extra_filters_del_payload = (search_payload && search_payload.extra_filters) ? search_payload.extra_filters : []
			let extra_filters_request = extra_filters_del_payload.concat(state.extra_filters_de_barra)

			return axios.post(
				'/api/global-search/' + generals.methods.routeString(state.model_name) + '?page=' + page,
				Object.assign({}, search_payload, {per_page: per_page, filters: column_filters, extra_filters: extra_filters_request})
			)
				.then(res => {
					if (!silencioso) {
						commit('auth/setLoading', false, {root: true})
						commit('auth/setMessage', '', {root: true})
					}

					/** Filas devueltas: el endpoint responde envuelto en `models` (paginador Laravel). */
					let rows = (res.data.models && res.data.models.data) ? res.data.models.data : []
					commit('setSelected', [])
					commit('setFilterPage', page)
					commit('setFiltered', rows)
					commit('setIsFiltered', true)
					commit('setTotalFilterPages', res.data.models ? res.data.models.last_page : null)
					commit('setTotalFilterResults', res.data.models ? res.data.models.total : 0)
					// Marca que lo que se ve salio del buscador general de texto libre y NO de un filtro
					// estructurado. El dropdown del embudo lo lee para deshabilitar Actualizar/Eliminar masivos
					// (OptionsDropdown.vue, ocultar_actualizar_eliminar_por_filtro).
					//
					// Va condicionado y no fijo en true porque por aca pasan los DOS caminos: filtrar() de
					// display/table/Index.vue dispatchea runGlobalSearch({ page: 1 }) tanto si el usuario escribio
					// en el buscador general como si uso la lupa de una columna. Con el true fijo, filtrar la
					// columna "N°" y despues pedir una actualizacion masiva por filtro devolvia "No disponible
					// para resultados del buscador general" con un filtro de columna puesto (Lucas, 28/8/2026).
					//
					// El corte es filtros_con_valor y no otra cosa porque es EXACTAMENTE lo que viaja en la masiva:
					// opciones-filtrados-seleccion/Index.vue arma el request con `filter_form: state.filters`, sin
					// el texto del buscador ni extra_filters_de_barra. Con filtros_con_valor > 0 el backend
					// reconstruye el mismo recorte que filtro la tabla; con 0 recibiria un filter_form vacio y
					// tocaria el listado ENTERO, asi que ahi el flag tiene que seguir en true.
					//
					// 🔴 Y los extra_filters_de_barra (hoy: el select de sucursal del Listado) fuerzan el
					// flag en true aunque haya filtros de columna puestos. No es una precaucion de mas:
					// la sucursal recorta con un whereHas del lado del backend (ExtraFiltersHelper), pero
					// el endpoint de la masiva solo aplica ColumnFiltersHelper sobre el `filter_form` que
					// recibe, y ese filter_form NO lleva la sucursal. O sea que con una sucursal elegida
					// la masiva tocaria articulos de OTRAS sucursales, que no estan en la tabla que el
					// usuario esta mirando. Es exactamente la mentira silenciosa que este flag existe
					// para evitar.
					//
					// Por eso la sucursal quedo afuera de la exclusion mutua entre buscador general y
					// filtros de columna (decision de Lucas, 28/8/2026): en vez de limpiarla, se
					// deshabilita la masiva mientras este puesta. Cualquier criterio nuevo que recorte
					// la tabla sin viajar en `filter_form` tiene que sumarse a esta condicion.
					commit('set_filtered_without_filter_form', filtros_con_valor == 0 || state.extra_filters_de_barra.length > 0)

					commit('setGlobalSearchMatches', {
						matches: res.data.matches ? res.data.matches : null,
						es_busqueda_nueva: es_busqueda_nueva,
					})
				})
				.catch(err => {
					if (!silencioso) {
						commit('auth/setLoading', false, {root: true})
						commit('auth/setMessage', '', {root: true})
					}
					console.log(err)
				})
		},

		/**
		 * Búsqueda del buscador general con exclusión mutua: primero borra los criterios de las
		 * columnas y recién después dispara la búsqueda.
		 *
		 * Es una de las dos mitades de la regla que dictó Lucas el 28/8/2026: "El usuario o busca
		 * por el buscador general o busca por las columnas. Si busca por el buscador general, se
		 * limpian los filtros de las columnas. Y si va a buscar por las columnas, se limpia el
		 * buscador general. No se deben de poder combinar." La otra mitad es
		 * `aplicar_filtros_de_columna_exclusivos`.
		 *
		 * 🔴 El ORDEN de las dos líneas de abajo es lo único que hace que esto funcione:
		 * runGlobalSearch NO recibe los filtros de columna por payload, los lee de `state.filters`
		 * en vivo mientras arma el request. Limpiar DESPUÉS del dispatch mandaría el request con
		 * los filtros viejos adentro y la pantalla mostraría la intersección igual, con la
		 * agravante de que los controles ya se verían vacíos.
		 *
		 * 🔴 Acá NO se toca `extra_filters_de_barra` (el select de sucursal): por decisión de Lucas
		 * ese criterio queda fuera de la exclusión mutua y convive con las dos búsquedas. Lo que
		 * lo cubre es el flag `set_filtered_without_filter_form`, que con sucursal puesta deshabilita
		 * la masiva (ver el comentario en el `.then()` de runGlobalSearch).
		 *
		 * @param {Object} context commit, dispatch
		 * @param {Object} payload Mismo payload que espera runGlobalSearch.
		 * @returns {Promise}
		 */
		aplicar_busqueda_general_exclusiva({commit, dispatch}, payload = {}) {
			commit('limpiar_criterios_de_columna')
			return dispatch('runGlobalSearch', payload)
		},

		/**
		 * Otra mitad de la exclusión mutua: al confirmar un filtro de columna, apaga la búsqueda
		 * del buscador general (texto + filtros fijos) que hubiera quedado puesta.
		 *
		 * 🔴 Está CONDICIONADA a que haya al menos un filtro de columna con criterio de VALOR. Sin
		 * esa guarda, abrir la lupa de una columna y apretar "Filtrar" sin tipear nada borraría la
		 * búsqueda general que el usuario acababa de hacer, que es justo lo contrario de lo que
		 * espera. Se mira `filter_has_value_criteria` y no `filter_has_active_values` porque la
		 * segunda cuenta el orden, y ordenar no es filtrar (el mismo criterio que usa el flag de
		 * más arriba).
		 *
		 * 🔴 NO commitea `set_filtered_without_filter_form`: de ese flag se encarga runGlobalSearch
		 * en su `.then()`, que es el único lugar que sabe cuántos filtros con valor terminaron
		 * viajando. Dos escritores del mismo flag se pisan y el resultado depende del orden en que
		 * resuelva la promesa.
		 *
		 * 🔴 NO toca `extra_filters_de_barra`, por la misma decisión de Lucas que en la action de
		 * arriba: la sucursal no entra en la exclusión mutua.
		 *
		 * @param {Object} context commit, state
		 * @returns {void}
		 */
		aplicar_filtros_de_columna_exclusivos({commit, state}) {
			let hay_criterio_de_valor = false

			state.filters.forEach(filter => {
				if (filters_mixin.methods.filter_has_value_criteria(filter)) {
					hay_criterio_de_valor = true
				}
			})

			if (!hay_criterio_de_valor) {
				return
			}

			commit('setGlobalSearchPayload', null)
			commit('setGlobalSearchMatches', {matches: null, es_busqueda_nueva: false})
		},

		/**
		 * Carga automática de la tabla al entrar a un módulo: pide "todos los registros" (sin ningún
		 * criterio) contra el mismo endpoint que usa el buscador general (`global-search`), en vez del
		 * `index` de siempre, porque el `index` no pagina ni devuelve el total de resultados y este
		 * listado necesita ambas cosas para la barra de paginación.
		 *
		 * Delega en `runGlobalSearch` en modo silencioso (sin overlay de carga) para que abrir el
		 * módulo no se sienta más lento que hoy, y deja marcado `listado_por_defecto` en true para que
		 * la UI no muestre carteles de "filtro activo" sobre este listado.
		 *
		 * @param {Object} context commit, dispatch
		 * @param {Object} payload
		 * @param {Number} [payload.page] Página a consultar (por defecto, 1).
		 * @returns {Promise}
		 */
		runListadoPorDefecto({commit, dispatch, state}, payload = {}) {
			/** Página a pedir: la que venga en el payload, o la primera. */
			let page = (payload && payload.page) ? payload.page : 1

			return dispatch('runGlobalSearch', {
				query_value: '',
				props: [],
				relation_props: [],
				extra_filters: [],
				order_by: 'id',
				order_direction: 'DESC',
				page: page,
				silencioso: true,
			})
				.then(res => {
					// Confirma que lo que se ve es el listado por defecto, no una búsqueda del usuario.
					//
					// Salvo que haya filtros de columna activos: ahí lo que se ve está filtrado, y
					// marcarlo como listado por defecto volvería a esconder el botón de limpiar
					// filtros. Pasa al volver a un módulo que quedó con filtros puestos en el store.
					//
					// Criterios de VALOR, no de orden: un listado ordenado por una columna sigue
					// siendo el listado por defecto. Si contara el orden, volver a un modulo que
					// quedo ordenado -o apretar "Quitar filtros", que deja el orden por defecto-
					// dejaria el flag en false y el cartel de "N filtrados" prendido sin filtros.
					let hay_filtros_de_columna = false
					state.filters.forEach(filter => {
						if (filters_mixin.methods.filter_has_value_criteria(filter)) {
							hay_filtros_de_columna = true
						}
					})

					if (!hay_filtros_de_columna) {
						commit('set_listado_por_defecto', true)
					}

					return res
				})
		},
	}

	/**
	 * Feature: cache localStorage (actions extras + wrappers).
	 * Se agrega solo si está habilitada.
	 */
	if (features.local_storage) {
		let base_get_models = base_actions.getModels
		base_actions.getModels = function ({commit, state, dispatch}) {
			/**
			 * Si usa paginación, opcionalmente precarga modelos desde localStorage.
			 * Esto reduce el tiempo de primera renderización mientras llega el request al server.
			 */
			commit('setSelected', [])
			commit('setFiltered', [])
			commit('setIsFiltered', false)
			// Resetear el flag de buscador rápido al recargar modelos desde el servidor.
			commit('set_filtered_without_filter_form', false)
			// Limpiar el payload persistido del buscador general para no dejarlo colgado de una búsqueda vieja.
			commit('setGlobalSearchPayload', null)
			// Esta carga ya no es el "listado por defecto" armado por runListadoPorDefecto.
			commit('set_listado_por_defecto', false)
			if (state.use_per_page) {
				commit('setPage', 1)
				commit('setModels', [])
				if (state.use_local_storage) {
					let local_storage_models = window.localStorage.getItem(state.model_name + '_user_id_' + window.localStorage.getItem('user_id'))
					if (local_storage_models) {
						commit('setModels', JSON.parse(local_storage_models))
					}
				}
			}
			return dispatch('_getModels')
		}

		let base__get_models = base_actions._getModels
		base_actions._getModels = function ({commit, state, dispatch}, payload = {}) {
			/**
			 * Este wrapper mantiene el flujo base y agrega los parámetros esperados por endpoints con localStorage.
			 * IMPORTANTE: está pensado para `article` (contrato de API existente).
			 */
			/** Cuántas páginas ya se pidieron en esta corrida del encadenado (arranca en 1). */
			let intentos = payload.intentos || 1
			commit('setLoading', true)
			let url = '/api/' + generals.methods.routeString(state.model_name)
			if (state.plural_model_name) {
				if (state.selected_model) {
					url += '/' + state.selected_model.id
				} else {
					url += '/0'
				}
			}
			if (state.route_prefix != '' || state.route_prefix === 0) {
				url += '/' + state.route_prefix
			}
			if (state.from_dates) {
				url += '/from-date/' + state.from_date
			}
			if (state.until_date != '') {
				url += '/' + state.until_date
			}
			if (state.use_local_storage) {
				url += '/' + window.localStorage.getItem(state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'))
			}
			if (state.local_storage_canceled) {
				url += '/null'
			}
			if (state.use_per_page) {
				url += '?page=' + state.page + '&per_page=' + state.per_page
			}
			return axios.get(url)
				.then(res => {
					if (state.use_per_page) {
						let loaded_models = res.data.models.data
						if (res.data.models.current_page == 1) {
							commit('setTotalPages', res.data.models.last_page)
							// Si hay demasiadas páginas, desactivamos localStorage para evitar peso excesivo.
							if (res.data.models.last_page > 15 && state.use_local_storage) {
								commit('setLocalStorage', false)
								commit('setLocalStorageCanceled', true)
								console.log('se cancelo localStorage porque hay ' + state.total_pages + ' paginas')
							}
						}
						console.log('se cargo ' + state.model_name + ' page: ' + state.page)
						commit('incrementPage')
						if (state.use_local_storage) {
							loaded_models.forEach(model => {
								model.update_local_storage = false
								commit('add', model)
							})
						} else {
							commit('addModels', loaded_models)
						}
						/*
							La condición es current_page < last_page, no comparar la cantidad de filas
							recibidas contra el per_page del store. Esa comparación asumía que el front y
							el backend usaban el mismo tamaño de página sin que nadie lo verificara: el
							store de article decía 200, el controller paginaba de a 500, la igualdad nunca
							daba verdadero y el listado se cortaba en la primera página (4/8/2026). El
							backend ya devuelve current_page y last_page en la misma respuesta.
						*/
						if (res.data.models.current_page < res.data.models.last_page && intentos < TOPE_PAGINAS_SEGURIDAD) {
							dispatch('_getModels', {intentos: intentos + 1})
						} else {
							if (res.data.models.current_page < res.data.models.last_page) {
								console.log('se corto la descarga de ' + state.model_name + ' por alcanzar el tope de seguridad de ' + TOPE_PAGINAS_SEGURIDAD + ' paginas (revisar last_page del backend)')
							}
							commit('setLoading', false)
							commit('setPage', 1)
							if (state.use_local_storage) {
								if (state.models.length && state.models[0].id < state.models[state.models.length - 1].id) {
									state.models = state.models.reverse()
								}
								window.localStorage.setItem(state.model_name + '_user_id_' + window.localStorage.getItem('user_id'), JSON.stringify(state.models))
								window.localStorage.setItem(state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'), moment().format('YYYY-MM-DD HH:mm:ss'))
								dispatch('getDeletedModels')
							}
						}
					} else {
						commit('setLoading', false)
						commit('setModels', res.data.models)
					}
				})
				.catch(err => {
					commit('setLoading', false)
					console.log(err)
				})
		}

		/**
		 * Trae modelos eliminados desde la última marca (timestamp) guardada en localStorage.
		 * Solo aplica a endpoints que implementen `deleted-models/{updated_at}`.
		 */
		base_actions.getDeletedModels = function ({state, commit}) {
			return axios.get(`/api/${generals.methods.routeString(state.model_name)}/deleted-models/${window.localStorage.getItem(state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'))}`)
				.then(res => {
					res.data.models.forEach(model => {
						commit('setDelete', model)
						commit('delete')
					})
					window.localStorage.setItem(state.model_name + '_updated_user_id_' + window.localStorage.getItem('user_id'), moment().format('YYYY-MM-DD HH:mm:ss'))
				})
				.catch(err => {
					console.log(err)
				})
		}
	}

	return {
		namespaced: true,
		state: base_state,
		mutations: Object.assign({}, base_mutations, custom_mutations),
		actions: Object.assign({}, base_actions, custom_actions),
		getters: Object.assign({}, custom_getters),
		modules: Object.assign({}, custom_modules),
	}
}

