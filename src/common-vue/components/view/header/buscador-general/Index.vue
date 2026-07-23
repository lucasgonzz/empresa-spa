<template>
	<!--
		Buscador general: input unico estilo Apple (pill blanco, bordes redondeados). A la izquierda,
		dentro del mismo pill, el icono que abre el desplegable de propiedades a incluir en la busqueda;
		a la derecha, el icono de lupa. La busqueda se dispara con Enter (la lupa es un atajo opcional).
		Las props tildadas se persisten por usuario y por modelo al buscar (preference_type global_search)
		y se recargan como default en cada montaje. Los filtros fijos que el usuario configura desde el
		desplegable (preference_type global_search_filters) se renderizan a la par del pill (ver
		FiltrosFijos.vue). Los filtros propios del modulo (slot search_extra) van fuera del pill para no
		romper su diseno.
	-->
	<div class="buscador-general">
		<div class="buscador-general__row">

			<!-- Pill unico: icono de propiedades + input + limpiar + lupa -->
			<div class="buscador-general__pill">
				<properties-dropdown
				class="buscador-general__props"
				:ordered_props="ordered_props"
				:selected_props="selected_props"
				:selected_relations="selected_relations"
				:filtros_fijos_activos="filtros_fijos_activos"
				:keyword_modes="keyword_modes"
				:conector="conector"
				:mostrar_conector="mostrar_conector"
				@toggle="onToggle"
				@select-all="selectAll"
				@deselect-all="deselectAll"
				@configure="onConfigure"
				@set-keyword-mode="onSetKeywordMode"
				@set-preset="onSetPreset"
				@set-conector="onSetConector"></properties-dropdown>

				<input
				class="buscador-general__input"
				type="text"
				autocomplete="off"
				v-model="query_value"
				:id="input_id"
				:data-testid="input_id"
				:placeholder="placeholder"
				@keyup.enter="buscar">

				<!-- Limpiar: solo cuando hay una busqueda del buscador general activa -->
				<button
				v-if="is_filtered_by_buscador"
				type="button"
				class="buscador-general__icon-btn"
				title="Limpiar busqueda"
				@click="limpiar">
					<i class="icon-undo"></i>
				</button>

				<!-- Lupa: la busqueda se dispara con Enter; el click es un atajo opcional -->
				<button
				type="button"
				class="buscador-general__icon-btn buscador-general__search"
				title="Buscar"
				@click="buscar">
					<i class="icon-search"></i>
				</button>
			</div>

			<!--
				Filtros fijos configurados por el usuario (prompt 06 del grupo 179): un control por
				cada uno (relacion / comparacion numerica / presencia de valor), entre el pill y los
				filtros propios del modulo. Si no hay ninguno configurado no ocupa lugar (ver
				`v-if` interno de FiltrosFijos.vue).
			-->
			<filtros-fijos
			:filtros="filtros_fijos"
			:values="filtros_values"
			@input="onInputFiltroFijo"
			@quitar="onQuitarFiltroFijo"
			@enter="buscar"></filtros-fijos>

			<!-- Filtros propios del modulo (ej: categoria / stock del listado). Fuera del pill. -->
			<div class="buscador-general__extra">
				<slot name="search_extra"></slot>
			</div>
		</div>

		<!--
			Modal de configuracion de filtro fijo (prompt 05 del grupo 179): se abre al hacer clic en
			el NOMBRE de una propiedad del desplegable. Emite 'agregar'/'quitar' con la config
			elegida; Index.vue la persiste (preference_type global_search_filters, prompt 06) y
			renderiza el control correspondiente en la barra de FiltrosFijos.vue.
		-->
		<filtro-fijo-modal
		:model_name="model_name"
		:property="property_en_configuracion"
		:config_actual="config_actual_en_edicion"
		@agregar="onAgregarFiltroFijo"
		@quitar="onQuitarFiltroFijo"></filtro-fijo-modal>
	</div>
</template>
<script>
export default {
	/**
	 * BuscadorGeneral — buscador unico por modelo, derivado de la definicion declarativa
	 * (src/models/<model_name>.js). Las props propias del modelo (text/textarea/number) y las
	 * relaciones (props type 'search' con key terminada en "_id") se muestran en una sola lista
	 * ordenada como props_to_show, cada una con un toggle. La seleccion se persiste por usuario y
	 * modelo (preference_type global_search) al buscar, y se recarga como default al montar.
	 *
	 * Uso minimo:
	 *   <buscador-general model_name="article"></buscador-general>
	 */
	components: {
		PropertiesDropdown: () => import('@/common-vue/components/view/header/buscador-general/PropertiesDropdown'),
		FiltroFijoModal: () => import('@/common-vue/components/view/header/buscador-general/FiltroFijoModal'),
		FiltrosFijos: () => import('@/common-vue/components/view/header/buscador-general/FiltrosFijos'),
	},
	props: {
		/**
		 * Nombre del modelo en el store, en la ruta del endpoint y en src/models.
		 */
		model_name: {
			type: String,
			required: true,
		},

		/**
		 * Texto de placeholder del input de busqueda.
		 */
		placeholder: {
			type: String,
			default: 'Buscar...',
		},

		/**
		 * Filtros extra propios del modulo (ej: categoria, con/sin stock del Listado de articulos).
		 * Formato esperado por el backend: [{ key, operator, value }].
		 */
		extra_filters: {
			type: Array,
			default: function () {
				return []
			},
		},

		/**
		 * Keys de props propias que se suman a 'name' en la seleccion por defecto (sin preferencia
		 * guardada). Pensada para modulos donde conviene buscar tambien por otros campos frecuentes
		 * (ej: el Listado de articulos suma codigo de barras, SKU, codigo de proveedor y N°). Si una
		 * key no existe en own_props para este modelo, se ignora sin error.
		 */
		default_extra_props: {
			type: Array,
			default: function () {
				return []
			},
		},

		/**
		 * Modo de despacho de la busqueda (prompt 08 del grupo 179). 'header' (default): el de
		 * siempre, buscar() dispara runGlobalSearch contra el store y limpiar() hace los commits
		 * de siempre. 'modal': se usa embebido dentro del encabezado del modal de busqueda
		 * (common-vue/components/search/Modal.vue): buscar() y limpiar() NO tocan el store, solo
		 * emiten el evento correspondiente para que el consumidor (el modal) decida que hacer. El
		 * desplegable, los filtros fijos, la persistencia de la seleccion y los estilos son
		 * identicos en los dos modos: es el mismo componente leyendo la misma configuracion.
		 */
		modo: {
			type: String,
			default: 'header',
		},

		/**
		 * Id del input interno del buscador. Si viene, se aplica al <input> (y a su data-testid)
		 * para que los document.getElementById(...) que ya usan otros componentes (Modal.vue,
		 * search/Index.vue) sigan funcionando sin migrarlos a $refs.
		 */
		input_id: {
			type: String,
			default: null,
		},

		/**
		 * Filtros fijos por defecto (prompt 09 del grupo 179): configuracion que el modulo quiere
		 * que quede sembrada la PRIMERA vez que un usuario usa el buscador general de este modelo
		 * (sin preferencia guardada todavia, ni en cache ni en el backend). Misma forma que las
		 * columnas persistidas: [{ key, filter_kind, operator, default_value }]. Se aplica una
		 * sola vez y se persiste de inmediato como si el usuario la hubiera elegido, para que a
		 * partir de ahi sea una preferencia normal que puede modificar o borrar sin que se vuelva
		 * a sembrar. Si el usuario ya tiene una preferencia guardada (aunque sea vacia, con todo
		 * en visible:false), no se siembra nada. Ej: categoria/stock del Listado de articulos para
		 * clientes con la extension buscar_por_categoria_en_vender.
		 */
		filtros_fijos_por_defecto: {
			type: Array,
			default: function () {
				return []
			},
		},
	},
	data() {
		return {
			// Texto ingresado por el usuario en el buscador.
			query_value: '',
			// Keys de own_props tildadas para la busqueda.
			selected_props: [],
			// Keys de relation_props tildadas para la busqueda.
			selected_relations: [],
			// True apenas el usuario toca la seleccion a mano: evita que la carga async del backend
			// pise una eleccion que el usuario ya empezo a hacer mientras se resolvia el GET.
			selection_touched: false,
			// Modo de coincidencia por propiedad (prompt 07 del grupo 179): mapa key -> 'alguna' o
			// 'todas'. Toda key sin entrada se interpreta como 'alguna' (ver keywordModeDe()): ese
			// es el punto del prompt, el buscador general pasa a comportarse como el de Vender
			// (distribuida) salvo que el usuario elija lo contrario.
			keyword_modes: {},
			// Conector a nivel modelo ('or'/'and') que une el grupo de props en 'todas' con el
			// grupo en 'alguna'. Default 'or' (menos restrictivo), igual que valida el backend.
			conector: 'or',
			// Propiedad que se esta configurando como filtro fijo en FiltroFijoModal.vue (null si
			// el modal esta cerrado o no hay ninguna en edicion).
			property_en_configuracion: null,
			// Filtros fijos agregados hasta ahora, ya reconstruidos desde la preferencia guardada
			// (o desde lo que el usuario agrego a mano en esta sesion):
			// [{ key, text, type, filter_kind, operator, default_value }].
			filtros_fijos: [],
			// Valor actual elegido para cada filtro fijo, keyeado por `key`. Se inicializa con el
			// default_value (o el valor neutro) al cargar/agregar cada filtro.
			filtros_values: {},
			// True apenas el usuario toca algun filtro fijo (agregar/quitar/elegir un valor): evita
			// que la carga async de la preferencia pise una configuracion que ya se empezo a tocar
			// mientras se resolvia el GET (mismo rol que selection_touched).
			filtros_touched: false,
			// Ultima version conocida (cargada o persistida) de CADA columna de filtro fijo, tanto
			// las activas como las que el usuario desactivo, keyeada por `key`. Se usa solo para
			// armar el PUT de persistFiltrosFijos() sin perder la configuracion de una columna que
			// se quito (visible: false), no se usa para el render.
			filtros_historial: {},
		}
	},
	computed: {
		/**
		 * Props propias del modelo, buscables por texto/numero: type en text/textarea/number,
		 * que no tengan el flag `not_use_in_global_search`, y que tengan `text` (etiqueta). Se
		 * pide `text` en vez de excluir `not_show`: `not_show` solo significa "no se muestra como
		 * columna de la tabla", no "no se busca" — hay props ocultas (categoria, sub categoria,
		 * marca, PLU, etc.) que si tienen `text` y son perfectamente buscables. Lo que de verdad
		 * rompia el render (prompt 547) eran las props SIN `text`, por eso el criterio correcto es
		 * exigirlo directamente en vez de usar `not_show` como proxy.
		 *
		 * @returns {Array} [{ key, text, ... }]
		 */
		own_props() {
			let model_properties = require('@/models/' + this.model_name).default.properties
			// Filtra por extension activa del cliente: sin esto, props gateadas por distintas
			// extensiones que comparten `key` generan keys duplicadas en el v-for y clientes ven
			// props de extensiones que no tienen.
			model_properties = this.check_extencions(model_properties)
			return model_properties.filter(function (property) {
				return property.key
					&& ['text', 'textarea', 'number'].indexOf(property.type) !== -1
					&& !property.not_use_in_global_search
					&& !!property.text
			})
		},

		/**
		 * Relaciones buscables del modelo: props con type "search" o "select" y key terminada en
		 * "_id" (misma equivalencia que ya usa `props_filtrables` para los filtros fijos). Para
		 * cada una se deriva la relacion Eloquent (sin el sufijo "_id") y las props por las que se
		 * busca dentro de esa relacion.
		 *
		 * @returns {Array} [{ key, text, relation, props }]
		 */
		relation_props() {
			let model_properties = require('@/models/' + this.model_name).default.properties
			// Mismo filtro por extension que en own_props, ver comentario ahi.
			model_properties = this.check_extencions(model_properties)
			let relations = []
			model_properties.forEach(function (property) {
				// Relacion: type search o select (misma equivalencia de props_filtrables) con key
				// terminada en "_id".
				let es_relacion = (property.type === 'search' || property.type === 'select')
					&& property.key.slice(-3) === '_id'

				// Mismo criterio que own_props: se exige `text` (etiqueta) en vez de excluir
				// not_show.
				if (!property.key || !es_relacion || !property.text) {
					return
				}

				relations.push({
					key: property.key,
					text: property.text,
					relation: property.key.replace('_id', ''),
					// Por que prop se busca dentro de la relacion: lo declarado explicitamente, o
					// el `relation_prop_name` que ya usa el resto del sistema para mostrar esa
					// relacion (ej: iva_id muestra 'percentage', no 'name'), o 'name' como ultimo
					// default.
					props: property.global_search_relation_props
						|| (property.relation_prop_name ? [property.relation_prop_name] : ['name']),
				})
			})
			return relations
		},

		/**
		 * Mapa key -> indice segun el orden de columnas visibles del usuario (props_to_show del
		 * store del modulo). Se usa para ordenar la lista de props del desplegable igual que las
		 * columnas de la tabla. Si el modulo no usa props_to_show, queda vacio y se cae al orden
		 * de definicion del modelo.
		 *
		 * @returns {Object}
		 */
		props_to_show_order() {
			let order_map = {}
			let module_state = this.$store.state[this.model_name]
			let props_to_show = module_state && Array.isArray(module_state.props_to_show)
				? module_state.props_to_show
				: []
			props_to_show.forEach(function (property, index) {
				if (property && property.key) {
					order_map[property.key] = index
				}
			})
			return order_map
		},

		/**
		 * Lista unica de props buscables (propias + relaciones), ordenada como props_to_show.
		 * Las props que no estan en props_to_show quedan al final, conservando el orden original
		 * (primero propias, despues relaciones). Se deduplica por `key` quedandose con la primera
		 * aparicion: algunos modelos (ej: article.js) declaran la misma key dos veces en su array
		 * de properties, y PropertiesDropdown.vue usa la key en el `:key` del v-for, asi que dos
		 * entradas repetidas rompen el render de Vue.
		 *
		 * @returns {Array} [{ key, text, kind }] con kind 'own' o 'relation'.
		 */
		ordered_props() {
			// Lista base con el tipo de cada prop.
			let items = []
			this.own_props.forEach(function (property) {
				// Fallback defensivo: segunda capa de seguridad por si en el futuro se cuela otra
				// prop sin `text` (el filtro de own_props deberia evitarlo, pero no cuesta nada
				// blindarlo aca tambien).
				items.push({ key: property.key, text: property.text || property.table_text || property.key, kind: 'own' })
			})
			this.relation_props.forEach(function (property) {
				items.push({ key: property.key, text: property.text || property.key, kind: 'relation' })
			})
			// Deduplica por key, quedandose con la PRIMERA aparicion. Se hace antes del armado de
			// entries/sort para no alterar el orden resultante. Objeto de keys ya vistas + forEach,
			// sin `filter` (para poder cortar en la primera ocurrencia sin lookahead raro).
			let keys_vistas = {}
			let items_unicos = []
			items.forEach(function (item) {
				if (keys_vistas[item.key]) {
					return
				}
				keys_vistas[item.key] = true
				items_unicos.push(item)
			})
			items = items_unicos
			// Se envuelve cada item con su clave de orden para un sort estable.
			let order_map = this.props_to_show_order
			let entries = []
			items.forEach(function (item, original_index) {
				let has_order = Object.prototype.hasOwnProperty.call(order_map, item.key)
				entries.push({
					item: item,
					// Los que estan en props_to_show ordenan por su indice; el resto va al final
					// conservando el orden original (offset grande + indice original).
					sort_key: has_order ? order_map[item.key] : (1000000 + original_index),
				})
			})
			entries.sort(function (a, b) {
				return a.sort_key - b.sort_key
			})
			let result = []
			entries.forEach(function (entry) {
				result.push(entry.item)
			})
			return result
		},

		/**
		 * Indica si hay una busqueda del buscador general activa (payload persistido en el store).
		 * Controla la visibilidad del boton limpiar.
		 *
		 * @returns {Boolean}
		 */
		is_filtered_by_buscador() {
			return !!this.$store.state[this.model_name].global_search_payload
		},

		/**
		 * Props candidatas a "filtro fijo" (control propio a la par del input del buscador). A
		 * diferencia de own_props/relation_props, esta lista NO excluye las props con
		 * `not_show: true`: esa exclusion es correcta para la busqueda por texto (evita romper el
		 * render de props sin `text`) pero descartaria justamente el caso mas pedido
		 * (category_id, que en src/models/article.js tiene not_show: true). Criterio: tiene key y
		 * text (sin text no se puede etiquetar el control), pasa check_extencions, y es relacion
		 * (type search/select con key terminada en "_id") o numerica (type number).
		 *
		 * @returns {Array} [{ key, text, type }]
		 */
		props_filtrables() {
			let model_properties = require('@/models/' + this.model_name).default.properties
			// Mismo filtro por extension que own_props/relation_props: un cliente no debe ver
			// propiedades de extensiones que no tiene habilitadas.
			model_properties = this.check_extencions(model_properties)
			let result = []
			model_properties.forEach(function (property) {
				if (!property.key || !property.text) {
					return
				}
				let es_relacion = (property.type === 'search' || property.type === 'select')
					&& property.key.slice(-3) === '_id'
				let es_numerica = property.type === 'number'
				if (!es_relacion && !es_numerica) {
					return
				}
				result.push({ key: property.key, text: property.text, type: property.type })
			})
			return result
		},

		/**
		 * Keys de los filtros fijos ya agregados, para pintar el indicador visual en el
		 * desplegable (PropertiesDropdown.vue).
		 *
		 * @returns {Array}
		 */
		filtros_fijos_activos() {
			let keys = []
			this.filtros_fijos.forEach(function (filtro) {
				keys.push(filtro.key)
			})
			return keys
		},

		/**
		 * Configuracion ya guardada de la propiedad en edicion en el modal, si ya estaba agregada
		 * como filtro fijo. null si es la primera vez que se configura.
		 *
		 * @returns {Object|null}
		 */
		config_actual_en_edicion() {
			if (!this.property_en_configuracion) {
				return null
			}
			let self = this
			let encontrado = this.filtros_fijos.find(function (filtro) {
				return filtro.key === self.property_en_configuracion.key
			})
			return encontrado || null
		},

		/**
		 * True solo si entre las props tildadas (propias + relaciones) hay al menos una en modo
		 * 'alguna' y al menos una en 'todas' (prompt 07 del grupo 179). El conector solo tiene
		 * sentido cuando hay una mezcla de los dos modos; si son todas iguales, no hay nada que
		 * conectar y el control se oculta para no ensuciar el desplegable.
		 *
		 * @returns {Boolean}
		 */
		mostrar_conector() {
			let self = this
			let hay_alguna = false
			let hay_todas = false
			this.selected_props.forEach(function (key) {
				if (self.keywordModeDe(key) === 'todas') {
					hay_todas = true
				} else {
					hay_alguna = true
				}
			})
			this.selected_relations.forEach(function (key) {
				if (self.keywordModeDe(key) === 'todas') {
					hay_todas = true
				} else {
					hay_alguna = true
				}
			})
			return hay_alguna && hay_todas
		},

		/**
		 * Combina los `extra_filters` que manda el modulo por prop (ej: categoria/stock del
		 * Listado) con los filtros fijos que el usuario configuro desde el buscador. Si el
		 * usuario activo un filtro con la misma `key` que uno del modulo, el del usuario
		 * reemplaza al del modulo (no se manda la misma columna dos veces). Los filtros fijos
		 * "sin valor" (select en la opcion neutra, comparacion sin numero cargado) no se agregan.
		 *
		 * @returns {Array} [{ key, operator, value }]
		 */
		extra_filters_finales() {
			// Arranca con una copia de los filtros del modulo, para no mutar la prop original.
			let combinados = []
			this.extra_filters.forEach(function (filtro) {
				combinados.push(filtro)
			})
			let self = this
			this.filtros_fijos.forEach(function (filtro) {
				let entrada = self.entradaDeFiltroFijo(filtro)
				if (!entrada) {
					// Filtro "sin valor": no se manda al backend.
					return
				}
				// Si el modulo ya mandaba esta misma key, la reemplaza; si no, la agrega.
				let index = -1
				combinados.forEach(function (existente, i) {
					if (existente.key === entrada.key) {
						index = i
					}
				})
				if (index === -1) {
					combinados.push(entrada)
				} else {
					combinados.splice(index, 1, entrada)
				}
			})
			return combinados
		},
	},
	created() {
		// Default inmediato (nunca queda vacio mientras carga) y despues se pisa con lo guardado.
		this.applyDefaultSelection()
		this.loadSelection()
		// Carga la configuracion de filtros fijos guardada (preference_type global_search_filters).
		this.loadFiltrosFijos()
	},
	methods: {
		/**
		 * Modo de coincidencia de una propiedad ('alguna' o 'todas'). Si no hay valor guardado
		 * para esa key, devuelve 'alguna' (default nuevo del prompt 07 del grupo 179: el buscador
		 * general pasa a comportarse como el de Vender salvo que el usuario diga lo contrario).
		 *
		 * @param {String} key
		 * @returns {String} 'alguna' o 'todas'
		 */
		keywordModeDe(key) {
			return this.keyword_modes[key] || 'alguna'
		},

		/**
		 * Seleccion por defecto (sin preferencia guardada): 'name' (si el modelo lo tiene) mas las
		 * keys de default_extra_props que existan en own_props. Ninguna relacion por defecto.
		 *
		 * @return {void}
		 */
		applyDefaultSelection() {
			// Keys disponibles entre las props propias del modelo, para validar que 'name' y las
			// default_extra_props realmente existan antes de tildarlas.
			let own_keys = []
			this.own_props.forEach(function (property) {
				own_keys.push(property.key)
			})
			let default_props = []
			if (own_keys.indexOf('name') !== -1) {
				default_props.push('name')
			}
			// Suma las keys extra del modulo (ej: bar_code/sku/provider_code/id en el Listado de
			// articulos) que existan en own_props, sin duplicar.
			this.default_extra_props.forEach(function (key) {
				if (own_keys.indexOf(key) !== -1 && default_props.indexOf(key) === -1) {
					default_props.push(key)
				}
			})
			this.selected_props = default_props
			this.selected_relations = []
		},

		/**
		 * Carga la seleccion guardada por usuario y modelo (preference_type global_search).
		 * Cache-first: si el cache global ya la trae, la aplica sincronico. Si no, la pide al
		 * backend (el show resuelve el fallback duenio->empleado). Nunca pisa una eleccion que el
		 * usuario ya empezo a tocar (selection_touched).
		 *
		 * @return {void}
		 */
		loadSelection() {
			// Cache-first tambien para el `settings.conector` a nivel modelo: se busca la fila
			// completa (no solo columns) en el cache global de table_column_preference, mismo
			// criterio que tableColumnPreferenceColumnsFromStore pero sin descartar `settings`.
			let cached_model = this.tableColumnPreferenceModelFromStore('global_search')
			if (cached_model && Array.isArray(cached_model.columns) && cached_model.columns.length) {
				this.applySelectionFromColumns(cached_model.columns)
				this.applyConectorFromSettings(cached_model.settings)
				return
			}
			this.$api.get('table-column-preference/' + this.model_name + '/global_search')
			.then(res => {
				if (this.selection_touched) {
					return
				}
				if (res.data && res.data.model && Array.isArray(res.data.model.columns) && res.data.model.columns.length) {
					this.applySelectionFromColumns(res.data.model.columns)
					this.applyConectorFromSettings(res.data.model.settings)
				} else {
					this.applyDefaultSelection()
				}
			})
			.catch(() => {
				if (!this.selection_touched) {
					this.applyDefaultSelection()
				}
			})
		},

		/**
		 * Busca la fila completa de una preferencia (no solo `columns`) en el cache global de
		 * table_column_preference. A diferencia del mixin tableColumnPreferenceColumnsFromStore
		 * (que solo devuelve `columns`), esta version local tambien expone `settings`, necesario
		 * para leer el `conector` a nivel modelo (prompt 07 del grupo 179).
		 *
		 * @param {String} preference_type
		 * @returns {Object|null}
		 */
		tableColumnPreferenceModelFromStore(preference_type) {
			let store_state = this.$store.state.table_column_preference
			if (!store_state || !Array.isArray(store_state.models) || !store_state.models.length) {
				return null
			}
			let self = this
			let found = null
			store_state.models.forEach(function (model) {
				if (model && model.model_name === self.model_name && model.preference_type === preference_type) {
					found = model
				}
			})
			return found
		},

		/**
		 * Reconstruye la seleccion desde las columnas guardadas: visible=true => tildada. Separa
		 * en props propias vs relaciones por pertenencia de la key (las relaciones terminan en
		 * "_id" y nunca colisionan con una prop propia). Ademas vuelca el `keyword_mode` de cada
		 * columna en `keyword_modes` (default 'alguna' si no vino guardado, ver keywordModeDe()).
		 *
		 * @param {Array} columns [{ key, visible, order, keyword_mode }]
		 * @return {void}
		 */
		applySelectionFromColumns(columns) {
			if (this.selection_touched) {
				return
			}
			let own_available = {}
			this.own_props.forEach(function (property) {
				own_available[property.key] = true
			})
			let relation_available = {}
			this.relation_props.forEach(function (property) {
				relation_available[property.key] = true
			})
			let own_keys = []
			let relation_keys = []
			let modes = {}
			columns.forEach(function (column) {
				if (!column || !column.key) {
					return
				}
				// keyword_mode se guarda para toda columna que lo tenga, este o no tildada hoy: asi
				// no se pierde la eleccion del usuario si destilda y vuelve a tildar la prop despues.
				if (column.keyword_mode === 'todas' || column.keyword_mode === 'alguna') {
					modes[column.key] = column.keyword_mode
				}
				if (!column.visible) {
					return
				}
				if (own_available[column.key]) {
					own_keys.push(column.key)
				} else if (relation_available[column.key]) {
					relation_keys.push(column.key)
				}
			})
			this.selected_props = own_keys
			this.selected_relations = relation_keys
			this.keyword_modes = modes
		},

		/**
		 * Vuelca el `conector` guardado a nivel modelo (fila `settings` de la preferencia) en el
		 * data local, con default 'or' si no hay nada guardado todavia. Nunca pisa lo que el
		 * usuario ya toco (mismo criterio que selection_touched para el resto de la seleccion).
		 *
		 * @param {Object|null|undefined} settings { conector }
		 * @return {void}
		 */
		applyConectorFromSettings(settings) {
			if (this.selection_touched) {
				return
			}
			if (settings && (settings.conector === 'or' || settings.conector === 'and')) {
				this.conector = settings.conector
			}
		},

		/**
		 * Handler unico del toggle emitido por el desplegable. Marca que el usuario toco la
		 * seleccion y enruta al metodo correcto segun el tipo de prop.
		 *
		 * @param {Object} payload { key, kind }
		 * @return {void}
		 */
		onToggle(payload) {
			this.selection_touched = true
			if (payload.kind === 'own') {
				this.toggleProp(payload.key)
			} else {
				this.toggleRelation(payload.key)
			}
		},

		/**
		 * Handler del click en el NOMBRE de una propiedad (evento 'configure' del desplegable).
		 * Busca la prop primero en props_filtrables (relacion/numerica); si no esta ahi (ej: una
		 * prop de texto, que no es filtrable como control fijo) cae a la definicion cruda del
		 * modelo, para que el modal igual se abra y muestre el mensaje de "no soportado" en vez de
		 * quedarse sin reaccionar al click.
		 *
		 * @param {Object} payload { key, kind }
		 * @return {void}
		 */
		onConfigure(payload) {
			let self = this
			let encontrada = this.props_filtrables.find(function (property) {
				return property.key === payload.key
			})
			if (!encontrada) {
				let model_properties = this.check_extencions(require('@/models/' + this.model_name).default.properties)
				let cruda = model_properties.find(function (property) {
					return property.key === payload.key
				})
				encontrada = cruda ? { key: cruda.key, text: cruda.text, type: cruda.type } : { key: payload.key, text: payload.key, type: null }
			}
			this.property_en_configuracion = encontrada
			this.$bvModal.show(this.model_name + '-filtro-fijo-modal')
		},

		/**
		 * Carga la configuracion de filtros fijos guardada por usuario y modelo (preference_type
		 * global_search_filters). Cache-first (mismo patron que loadSelection): si el cache global
		 * ya la trae, la aplica sincronico; si no, la pide al backend. Nunca pisa una configuracion
		 * que el usuario ya empezo a tocar (filtros_touched).
		 *
		 * @return {void}
		 */
		loadFiltrosFijos() {
			let cached = this.tableColumnPreferenceColumnsFromStore(this.model_name, 'global_search_filters')
			if (cached && cached.length) {
				this.applyFiltrosFijosFromColumns(cached)
				return
			}
			this.$api.get('table-column-preference/' + this.model_name + '/global_search_filters')
			.then(res => {
				if (this.filtros_touched) {
					return
				}
				if (res.data && res.data.model && Array.isArray(res.data.model.columns) && res.data.model.columns.length) {
					this.applyFiltrosFijosFromColumns(res.data.model.columns)
				} else {
					// No existe preferencia guardada para este usuario/modelo (ni cache ni fila en
					// el backend): se siembra la configuracion por defecto del modulo, si trajo
					// alguna (prompt 09 del grupo 179).
					this.sembrarFiltrosFijosPorDefecto()
				}
			})
			.catch(() => {
				// Error de red (no "sin preferencia guardada", eso ya devuelve 200 con model null):
				// se deja vacio, no se siembra nada para no persistir en falso ante una falla real
				// de conexion. Se vuelve a intentar en el proximo montaje del componente.
			})
		},

		/**
		 * Siembra `filtros_fijos_por_defecto` como configuracion inicial de filtros fijos, SOLO
		 * cuando este usuario/modelo nunca tuvo preferencia guardada (ver loadFiltrosFijos). Arma
		 * columnas "visible:true" con la misma forma que persistFiltrosFijos y reusa
		 * applyFiltrosFijosFromColumns para no duplicar la logica de reconstruccion (filtrado por
		 * props_filtrables disponibles hoy, completado de text/type, valor inicial de cada
		 * control). Persiste de inmediato: a partir de aca es una preferencia normal del usuario,
		 * que puede modificar o borrar sin que se vuelva a sembrar en la proxima carga.
		 *
		 * @return {void}
		 */
		sembrarFiltrosFijosPorDefecto() {
			if (this.filtros_touched || !this.filtros_fijos_por_defecto.length) {
				return
			}
			let columns = []
			this.filtros_fijos_por_defecto.forEach(function (filtro) {
				columns.push({
					key: filtro.key,
					visible: true,
					filter_kind: filtro.filter_kind,
					operator: filtro.operator,
					default_value: filtro.default_value,
				})
			})
			this.applyFiltrosFijosFromColumns(columns)
			this.persistFiltrosFijos()
		},

		/**
		 * Reconstruye `filtros_fijos` / `filtros_values` desde las columnas guardadas. Se queda
		 * solo con las columnas `visible: true` cuya key siga existiendo en `props_filtrables`
		 * (una prop que dejo de existir por una extension desactivada se ignora en silencio),
		 * respeta el `order` guardado, y completa `text`/`type` desde `props_filtrables`. Ademas
		 * guarda TODAS las columnas (activas o no) en `filtros_historial`, para no perder la
		 * configuracion de una columna desactivada al volver a persistir.
		 *
		 * @param {Array} columns [{ key, visible, order, filter_kind, operator, default_value }]
		 * @return {void}
		 */
		applyFiltrosFijosFromColumns(columns) {
			if (this.filtros_touched) {
				return
			}
			// Guarda el historial completo (visible o no) para no perderlo al persistir despues.
			let historial = {}
			columns.forEach(function (column) {
				if (column && column.key) {
					historial[column.key] = column
				}
			})
			this.filtros_historial = historial

			// Props filtrables disponibles hoy para este cliente (respeta extensiones activas).
			let disponibles = {}
			this.props_filtrables.forEach(function (property) {
				disponibles[property.key] = property
			})

			let visibles = columns.filter(function (column) {
				return column && column.visible && column.key && disponibles[column.key]
			})
			visibles.sort(function (a, b) {
				return (a.order || 0) - (b.order || 0)
			})

			let filtros = []
			let values = {}
			let self = this
			visibles.forEach(function (column) {
				let property = disponibles[column.key]
				let filtro = {
					key: column.key,
					text: property.text,
					type: property.type,
					filter_kind: column.filter_kind,
					operator: column.operator,
					default_value: column.default_value,
				}
				filtros.push(filtro)
				values[column.key] = self.valorInicialDeFiltro(filtro)
			})
			this.filtros_fijos = filtros
			this.filtros_values = values
		},

		/**
		 * Valor con el que arranca el control de un filtro fijo: el `default_value` guardado si
		 * hay uno cargado, o si no el valor neutro (sin filtro activo) segun su `filter_kind`.
		 *
		 * @param {Object} filtro
		 * @returns {*}
		 */
		valorInicialDeFiltro(filtro) {
			if (typeof filtro.default_value !== 'undefined' && filtro.default_value !== null && filtro.default_value !== '') {
				return filtro.default_value
			}
			return this.valorNeutroFiltro(filtro)
		},

		/**
		 * Valor neutro (sin filtro activo) segun el filter_kind: 0 para relacion (misma
		 * convencion que get_options_simple), string vacio para comparacion numerica, 'todos'
		 * para presencia de valor.
		 *
		 * @param {Object} filtro
		 * @returns {*}
		 */
		valorNeutroFiltro(filtro) {
			if (filtro.filter_kind === 'relation') {
				return 0
			}
			if (filtro.filter_kind === 'numeric_comparison') {
				return ''
			}
			return 'todos'
		},

		/**
		 * Handler del evento 'input' de FiltrosFijos.vue: actualiza el valor elegido para un
		 * filtro fijo puntual. No persiste (solo se persiste la configuracion, no el valor
		 * elegido en cada busqueda).
		 *
		 * @param {Object} payload { key, value }
		 * @return {void}
		 */
		onInputFiltroFijo(payload) {
			this.filtros_touched = true
			this.$set(this.filtros_values, payload.key, payload.value)
		},

		/**
		 * Arma la entrada de extra_filters que produce un filtro fijo, segun su filter_kind y el
		 * valor actual elegido. Devuelve null si el filtro esta en su valor neutro ("sin filtro"),
		 * caso en el que no debe mandarse al backend.
		 *
		 * @param {Object} filtro
		 * @returns {Object|null} { key, operator, value } o null
		 */
		entradaDeFiltroFijo(filtro) {
			let value = this.filtros_values[filtro.key]
			if (filtro.filter_kind === 'relation') {
				// 0 es la opcion "Seleccione..." de get_options_simple: no hay filtro elegido.
				if (value === 0 || value === null || value === '' || typeof value === 'undefined') {
					return null
				}
				return { key: filtro.key, operator: '=', value: value }
			}
			if (filtro.filter_kind === 'numeric_comparison') {
				// Ojo: 0 SI es un valor valido (ej: stock igual a 0), no se descarta.
				if (value === '' || value === null || typeof value === 'undefined') {
					return null
				}
				return { key: filtro.key, operator: filtro.operator, value: value }
			}
			if (filtro.filter_kind === 'numeric_presence') {
				if (value === 'todos' || value === '' || value === null || typeof value === 'undefined') {
					return null
				}
				return { key: filtro.key, operator: 'numeric_presence', value: value }
			}
			return null
		},

		/**
		 * Handler del evento 'agregar' de FiltroFijoModal.vue (o de reconfigurar uno ya existente):
		 * guarda (o actualiza) la configuracion del filtro fijo, inicializa su valor, marca que el
		 * usuario toco la configuracion y la persiste contra el backend.
		 *
		 * @param {Object} config { key, filter_kind, operator, default_value }
		 * @return {void}
		 */
		onAgregarFiltroFijo(config) {
			this.filtros_touched = true

			// Completa text/type desde props_filtrables para poder etiquetar el control.
			let property = this.props_filtrables.find(function (prop) {
				return prop.key === config.key
			})
			let filtro = {
				key: config.key,
				text: property ? property.text : config.key,
				type: property ? property.type : null,
				filter_kind: config.filter_kind,
				operator: config.operator,
				default_value: config.default_value,
			}

			let index = -1
			this.filtros_fijos.forEach(function (item, i) {
				if (item.key === filtro.key) {
					index = i
				}
			})
			if (index === -1) {
				this.filtros_fijos.push(filtro)
			} else {
				this.filtros_fijos.splice(index, 1, filtro)
			}
			this.$set(this.filtros_values, filtro.key, this.valorInicialDeFiltro(filtro))

			// Actualiza el historial (para el proximo persist) y persiste ya mismo.
			this.filtros_historial[filtro.key] = {
				key: filtro.key,
				visible: true,
				filter_kind: filtro.filter_kind,
				operator: filtro.operator,
				default_value: filtro.default_value,
			}
			this.persistFiltrosFijos()
		},

		/**
		 * Handler del evento 'quitar' de FiltroFijoModal.vue (o del boton x de la barra): saca la
		 * propiedad del estado local `filtros_fijos`/`filtros_values`, marca que el usuario toco la
		 * configuracion, y persiste contra el backend guardando la columna como visible: false
		 * (no se pierde su configuracion previa).
		 *
		 * @param {Object} payload { key }
		 * @return {void}
		 */
		onQuitarFiltroFijo(payload) {
			this.filtros_touched = true

			let index = -1
			this.filtros_fijos.forEach(function (filtro, i) {
				if (filtro.key === payload.key) {
					index = i
				}
			})
			if (index !== -1) {
				this.filtros_fijos.splice(index, 1)
			}
			this.$delete(this.filtros_values, payload.key)

			// Guarda en el historial como visible:false, conservando la configuracion previa que
			// ya tuviera (filter_kind/operator/default_value) para no perderla.
			let historial_previo = this.filtros_historial[payload.key] || {}
			this.filtros_historial[payload.key] = Object.assign({}, historial_previo, {
				key: payload.key,
				visible: false,
			})
			this.persistFiltrosFijos()
		},

		/**
		 * Handler del evento 'set-keyword-mode' del desplegable: cambia el modo de coincidencia de
		 * UNA propiedad puntual. No persiste al toque (mismo criterio que el resto de la seleccion,
		 * que se guarda al buscar): solo actualiza el estado local.
		 *
		 * @param {Object} payload { key, kind, mode } mode: 'alguna' o 'todas'
		 * @return {void}
		 */
		onSetKeywordMode(payload) {
			this.selection_touched = true
			this.$set(this.keyword_modes, payload.key, payload.mode)
		},

		/**
		 * Handler del evento 'set-preset' del desplegable: aplica 'alguna' o 'todas' a TODAS las
		 * props actualmente tildadas (propias + relaciones) de una sola vez.
		 *
		 * @param {String} preset 'distribuida' (-> 'alguna') o 'estricta' (-> 'todas')
		 * @return {void}
		 */
		onSetPreset(preset) {
			this.selection_touched = true
			let mode = preset === 'estricta' ? 'todas' : 'alguna'
			let modes = Object.assign({}, this.keyword_modes)
			this.selected_props.forEach(function (key) {
				modes[key] = mode
			})
			this.selected_relations.forEach(function (key) {
				modes[key] = mode
			})
			this.keyword_modes = modes
		},

		/**
		 * Handler del evento 'set-conector' del desplegable: cambia el conector a nivel modelo.
		 *
		 * @param {String} value 'or' o 'and'
		 * @return {void}
		 */
		onSetConector(value) {
			this.selection_touched = true
			this.conector = value
		},

		/**
		 * Tilda/destilda una prop propia de la busqueda.
		 *
		 * @param {String} key
		 * @return {void}
		 */
		toggleProp(key) {
			let index = this.selected_props.indexOf(key)
			if (index === -1) {
				this.selected_props.push(key)
			} else {
				this.selected_props.splice(index, 1)
			}
		},

		/**
		 * Tilda/destilda una relacion de la busqueda.
		 *
		 * @param {String} key
		 * @return {void}
		 */
		toggleRelation(key) {
			let index = this.selected_relations.indexOf(key)
			if (index === -1) {
				this.selected_relations.push(key)
			} else {
				this.selected_relations.splice(index, 1)
			}
		},

		/**
		 * Tilda todas las props buscables (propias + relaciones).
		 *
		 * @return {void}
		 */
		selectAll() {
			this.selection_touched = true
			let own_keys = []
			this.own_props.forEach(function (property) {
				own_keys.push(property.key)
			})
			let relation_keys = []
			this.relation_props.forEach(function (property) {
				relation_keys.push(property.key)
			})
			this.selected_props = own_keys
			this.selected_relations = relation_keys
		},

		/**
		 * Destilda todas las props buscables.
		 *
		 * @return {void}
		 */
		deselectAll() {
			this.selection_touched = true
			this.selected_props = []
			this.selected_relations = []
		},

		/**
		 * Ejecuta la busqueda general: arma el payload (props/relaciones tildadas + extra_filters)
		 * y lo despacha a `runGlobalSearch`. Requiere al menos 2 caracteres de texto, salvo que
		 * haya extra_filters activos. Ademas persiste la seleccion actual.
		 *
		 * @return {void}
		 */
		buscar() {
			// Si hay extra_filters activos (del modulo y/o filtros fijos del usuario ya
			// combinados), se permite buscar sin texto (ej: solo por categoria).
			let has_extra_filters = this.extra_filters_finales && this.extra_filters_finales.length > 0

			if (this.query_value.trim().length < 2 && !has_extra_filters) {
				this.$toast.error('Ingrese al menos 2 caracteres')
				return
			}

			// Arma relation_props con la forma que espera el backend: { relation, props, keyword_mode }.
			// keyword_mode viaja a nivel de la relacion completa (todas las props internas de esa
			// relacion comparten el modo de la propiedad "_id" tildada, ver prompt 03 del grupo 179).
			let relation_props_payload = []
			let relation_props_disponibles = this.relation_props
			let self = this
			this.selected_relations.forEach(function (relation_key) {
				let relation_prop = relation_props_disponibles.find(function (item) {
					return item.key === relation_key
				})
				if (relation_prop) {
					relation_props_payload.push({
						relation: relation_prop.relation,
						props: relation_prop.props,
						keyword_mode: self.keywordModeDe(relation_key),
					})
				}
			})

			// props pasa de ser un array de strings a un array de objetos { key, keyword_mode }
			// (prompt 07 del grupo 179): el backend acepta las dos formas (ver prompt 03), pero
			// desde este componente siempre se manda la forma nueva.
			let props_payload = []
			this.selected_props.forEach(function (key) {
				props_payload.push({ key: key, keyword_mode: self.keywordModeDe(key) })
			})

			let payload = {
				// Se llama `query_value`, no `query`: en el backend `$request->query` es el
				// InputBag de Symfony y no el input del mismo nombre.
				query_value: this.query_value,
				props: props_payload,
				relation_props: relation_props_payload,
				// Conector a nivel modelo ('or'/'and'): une el grupo de props en modo 'todas' con
				// el grupo en modo 'alguna' (ver prompt 03 del grupo 179 para la semantica exacta).
				conector: this.conector,
				extra_filters: this.extra_filters_finales,
			}

			if (this.modo === 'modal') {
				// Modo embebido (prompt 08 del grupo 179): no toca el store, el modal de busqueda
				// (Modal.vue) es quien decide que hacer con este payload (armar el POST a
				// global-search, filtrar en memoria si esta offline, etc).
				this.$emit('buscar', payload)
			} else {
				payload.page = 1
				this.$store.dispatch(this.model_name + '/runGlobalSearch', payload)
			}

			// Guarda la seleccion actual como preferencia del usuario para este modelo (identico en
			// los dos modos: es la misma configuracion de busqueda).
			this.persistSelection()
		},

		/**
		 * Persiste que props quedan tildadas para la busqueda rapida (preference_type
		 * global_search), por usuario y modelo. visible=true => tildada. Suma tambien el
		 * `keyword_mode` de cada columna y el `conector` a nivel modelo en `settings` (prompt 07
		 * del grupo 179). Fire and forget: no bloquea la busqueda. Al guardar, refresca el cache
		 * global para que la proxima vez (u otra vista) se cargue la seleccion nueva.
		 *
		 * @return {void}
		 */
		persistSelection() {
			let columns = []
			let order = 0
			let self = this
			this.ordered_props.forEach(function (item) {
				let is_selected = item.kind === 'own'
					? self.selected_props.indexOf(item.key) !== -1
					: self.selected_relations.indexOf(item.key) !== -1
				columns.push({
					key: item.key,
					visible: is_selected,
					order: order,
					// Modo de coincidencia de esta propiedad (prompt 07 del grupo 179): se manda
					// siempre, este o no tildada hoy, para no perder la eleccion del usuario si
					// destilda y vuelve a tildar la prop mas adelante.
					keyword_mode: self.keywordModeDe(item.key),
				})
				order++
			})
			this.$api.put('table-column-preference/' + this.model_name + '/global_search', {
				columns: columns,
				// Conector a nivel modelo ('or'/'and'), fuera de las columnas.
				settings: { conector: this.conector },
			})
			.then(() => {
				this.$store.dispatch('table_column_preference/getModels')
			})
			.catch(err => {
				console.log('buscador-general: no se pudo guardar la seleccion de propiedades', err)
			})
		},

		/**
		 * Persiste la configuracion de filtros fijos (preference_type global_search_filters), por
		 * usuario y modelo. Manda las columnas activas (filtros_fijos, visible:true) mas las que
		 * el usuario desactivo en algun momento (visible:false, desde filtros_historial) para no
		 * perder su configuracion previa. Fire and forget: no bloquea la busqueda. Mismo criterio
		 * exacto que persistSelection().
		 *
		 * @return {void}
		 */
		persistFiltrosFijos() {
			let columns = []
			let order = 0

			// Primero las columnas activas, en el orden en que estan agregadas.
			this.filtros_fijos.forEach(function (filtro) {
				columns.push({
					key: filtro.key,
					visible: true,
					order: order,
					filter_kind: filtro.filter_kind,
					operator: filtro.operator,
					default_value: filtro.default_value,
				})
				order++
			})

			// Despues, las que estan en el historial pero no activas ahora mismo (el usuario las
			// quito en algun momento): se mandan con visible:false para no perder su config.
			let activas = {}
			this.filtros_fijos.forEach(function (filtro) {
				activas[filtro.key] = true
			})
			let historial = this.filtros_historial
			Object.keys(historial).forEach(function (key) {
				if (activas[key]) {
					return
				}
				let previa = historial[key]
				columns.push({
					key: key,
					visible: false,
					order: order,
					filter_kind: previa.filter_kind,
					operator: previa.operator,
					default_value: previa.default_value,
				})
				order++
			})

			this.$api.put('table-column-preference/' + this.model_name + '/global_search_filters', { columns: columns })
			.then(() => {
				this.$store.dispatch('table_column_preference/getModels')
			})
			.catch(err => {
				console.log('buscador-general: no se pudo guardar la configuracion de filtros fijos', err)
			})
		},

		/**
		 * Limpia el criterio de texto, resetea el filtered del store (mismos commits que
		 * BuscadorRapido) y limpia el payload persistido del buscador general. Ademas resetea los
		 * VALORES elegidos en los filtros fijos a su estado neutro (los controles siguen ahi,
		 * vacios: la configuracion no se borra, solo se limpia lo tipeado/elegido).
		 *
		 * @return {void}
		 */
		limpiar() {
			this.query_value = ''

			let values = {}
			let self = this
			this.filtros_fijos.forEach(function (filtro) {
				values[filtro.key] = self.valorNeutroFiltro(filtro)
			})
			this.filtros_values = values

			if (this.modo === 'modal') {
				// Modo embebido (prompt 08 del grupo 179): solo resetea el estado interno (ya hecho
				// arriba) y avisa al consumidor; el modal decide que limpiar de lo suyo.
				this.$emit('limpiar')
				return
			}

			this.$store.commit(this.model_name + '/setFiltered', [])
			this.$store.commit(this.model_name + '/setIsFiltered', false)
			this.$store.commit(this.model_name + '/setSelected', [])
			this.$store.commit(this.model_name + '/setFilterPage', 1)
			this.$store.commit(this.model_name + '/setTotalFilterPages', null)
			this.$store.commit(this.model_name + '/setTotalFilterResults', 0)
			this.$store.commit(this.model_name + '/set_filtered_without_filter_form', false)
			this.$store.commit(this.model_name + '/setGlobalSearchPayload', null)
		},

		/**
		 * Enfoca el input interno del buscador (prompt 08 del grupo 179). Publico para que un
		 * consumidor externo (ej: Modal.vue) pueda forzar el foco despues de una accion propia,
		 * con el mismo criterio (document.getElementById via input_id) que ya usa el resto del
		 * sistema en vez de $refs.
		 *
		 * @return {void}
		 */
		foco() {
			if (!this.input_id) {
				return
			}
			let input = document.getElementById(this.input_id)
			if (input) {
				input.focus()
			}
		},
	},
}
</script>
<style lang="sass">
// Estetica Apple: pill blanco, minimalista, sin ancho fijo (lo define el contenedor).
.buscador-general
	width: 100%

	.buscador-general__row
		display: flex
		align-items: center
		gap: 10px
		width: 100%

	// Pill unico y blanco, todos los bordes redondeados
	.buscador-general__pill
		display: flex
		align-items: center
		flex: 1 1 auto
		min-width: 0
		background: #fff
		border: 1px solid #e2e4e7
		border-radius: 22px
		height: 40px
		padding: 0 6px 0 4px
		transition: border-color 0.15s ease, box-shadow 0.15s ease
		// Sombra sutil permanente que envuelve el pill entero (icono + input + lupa),
		// mismo criterio que la sombra de las tablas del sistema.
		box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px

		// Anillo azul al enfocar el input (color $blue de _custom.scss): se suma a la
		// sombra base, no la reemplaza
		&:focus-within
			border-color: #007bff
			box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px, 0 0 0 3px rgba(0, 123, 255, 0.15)

	// El desplegable de propiedades se integra al pill (ver PropertiesDropdown.vue)
	.buscador-general__props
		display: flex
		align-items: center

	// Input sin bordes ni fondo: el pill es el borde
	.buscador-general__input
		flex: 1 1 auto
		min-width: 0
		border: none
		outline: none
		background: transparent
		height: 100%
		padding: 0 6px
		font-size: 0.9rem
		color: #1d1d1f
		// Anula la sombra global de input en _inputs.sass: la sombra la da el pill contenedor
		box-shadow: none

		&::placeholder
			color: #9aa0a6

	// Botones de icono dentro del pill (lupa, limpiar): planos, sin fondo
	.buscador-general__icon-btn
		display: flex
		align-items: center
		justify-content: center
		width: 30px
		height: 30px
		border: none
		background: transparent
		border-radius: 50%
		color: #86868b
		cursor: pointer
		transition: background 0.15s ease, color 0.15s ease
		// Blinda los botones de icono (lupa, limpiar) contra cualquier sombra heredada
		box-shadow: none

		&:hover
			background: #f2f3f4
			color: #1d1d1f

		i
			font-size: 0.95rem

	.buscador-general__search
		color: #6e6e73

	// Contenedor de filtros del modulo; si el slot esta vacio colapsa sin dejar hueco
	.buscador-general__extra
		display: flex
		align-items: center
		gap: 8px

		&:empty
			display: none
</style>
