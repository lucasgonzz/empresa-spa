<template>
<b-modal
:title="title"
size="xl"
hide-footer
:id="modal_id"
:data-tour="ancla_tour"
@show="onModalShow"
@hidden="onModalHidden">
	<div
	class="search-component-modal">
		<div class="header">
			<!--
				Buscador general embebido (tarea 2, prompt 08 del grupo 179): reemplaza el
				b-form-input + boton de lupa de siempre. modo="modal" hace que buscar()/limpiar()
				no toquen el store, solo emitan eventos (ver Index.vue del buscador general). El
				input_id preserva el mismo id que usaban los document.getElementById repartidos por
				este archivo y por search/Index.vue, asi ninguno se rompe.
			-->
			<buscador-general
			:model_name="model_name"
			modo="modal"
			:input_id="_id+'-search-modal-input'"
			:placeholder="_placeholder"
			@keydown.native="reset_ya_se_busco"
			@keydown.native.up="selectUp"
			@keydown.native.down="selectDown"
			@buscar="onBuscarDesdeBuscadorGeneral"
			@criterios-cambiaron="onCriteriosCambiaron"
			@limpiar="onLimpiarDesdeBuscadorGeneral"></buscador-general>

			<slot name="search_input_right"></slot>

			<button
			type="button"
			class="search-modal-columnas-btn"
			title="Elegir que propiedades se ven en los resultados"
			@click="openColumnsConfig">
				<i class="icon-eye"></i>
				<i class="icon-list"></i>
			</button>

			<btn-create-model
			v-if="show_btn_create && prop && (!prop.has_many || (prop.has_many && !prop.has_many.models_from_parent_prop))"
			@callSearchModal="callSearchModal"
			:model="model"
			:prop="prop"
			:model_name="model_name"></btn-create-model>
		</div>
		<div
		v-if="!saving_if_not_exist">
			<div
			v-if="loading || results.length">

				<div class="j-between align-center m-t-15">

					<p
					class="results-title m-0">
						<i class="icon-down"></i>
						Resultados 
						<span
						v-if="total_results > 0">
							({{ total_results }})
						</span>
					</p>

					<pagination
					:total_pages="total_pages"
					:total_results="total_results"
					:per_page="per_page"
					:current_page="current_page"
					:loading="loading"
					@setCurrentPage="setCurrentPage"></pagination>	
				</div>

				<table-component
				:properties="properties"
				:selected_index="selected_index"
				select_mode="single"
				:loading="loading"
				:models="results"
				:model_name="model_name"
				:striped="false"
				:set_model_on_row_selected="false"
				:no_hacer_seleccion="no_hacer_seleccion"
				:is_from_search_modal="true"
				@onRowSelected="onRowSelected"></table-component>	
			</div>
			<div
			v-else
			class="search-modal-estado"
			:data-testid="busqueda_realizada ? 'search-no-results' : 'search-sin-criterio'">
				<div class="search-modal-estado__icono">
					<i :class="estado_icono"></i>
				</div>
				<p class="search-modal-estado__titulo">
					{{ estado_titulo }}
				</p>
				<p class="search-modal-estado__detalle">
					{{ estado_detalle }}
				</p>
				<div
				v-if="estado_hint"
				class="search-modal-estado__hint">
					<span class="search-modal-estado__tecla">ENTER</span>
					{{ estado_hint }}
				</div>
				<div
				v-else-if="busqueda_realizada && no_exist_message"
				class="search-modal-estado__hint">
					{{ no_exist_message }}
				</div>
			</div>
		</div>
		<div
		class="all-center-md"
		v-if="saving_if_not_exist">
			<b-spinner
			variant="primary"></b-spinner>
			<span
			class="p-l-15">
				Guardando {{ singular(model_name) }}
			</span>
		</div>
	</div>

	<b-modal
	:id="modal_id + '-columns-config'"
	title="Propiedades en resultados de busqueda"
	size="lg"
	modal-class="props-to-show-modal"
	body-class="props-to-show-body"
	footer-class="props-to-show-footer">
		<columns-preferences-config-modal
		:config_rows="search_config_rows"></columns-preferences-config-modal>
		<template #modal-footer>
			<b-button
			variant="secondary"
			@click="$bvModal.hide(modal_id + '-columns-config')">
				Cancelar
			</b-button>
			<b-button
			variant="primary"
			@click="saveSearchColumnsPreference">
				Listo
			</b-button>
		</template>
	</b-modal>
</b-modal>
</template>
<script>
import TableComponent from '@/common-vue/components/display/TableComponent'
import ColumnsPreferencesConfigModal from '@/common-vue/components/view/header/props-to-show/ColumnsPreferencesConfigModal.vue'
import {
	default_column_width_for_property,
	fallback_column_width_px,
} from '@/common-vue/config/column_preference_defaults'
export default {
	components: {
		ColumnsPreferencesConfigModal,
		TableComponent,
		BtnCreateModel: () => import('@/common-vue/components/search/BtnCreateModel'),
		Pagination: () => import('@/common-vue/components/search/Pagination'),
		BuscadorGeneral: () => import('@/common-vue/components/view/header/buscador-general/Index'),
	},
	props: {
		_id: String,
		query_value: String,
		prop: Object,
		show_btn_create: Boolean,
		model_name: String,
		model: Object,
		models_to_search: Array,
		/**
		 * Desde el 23/7/2026 (Lucas) esta prop YA NO se usa como bloqueo de la busqueda: search()
		 * y callSearch() no exigen ningun minimo de caracteres. Queda solo como umbral del
		 * debounce de tipeo de callSearch(), que hoy no esta enganchado a ningun handler del
		 * template (ver comentario en ese metodo). Se mantiene por compatibilidad con los
		 * consumidores que ya la pasan (ArticleName.vue, Combos.vue, PromocionVinoteca.vue).
		 */
		str_limint: {
			type: Number,
			default: 1,
		},
		auto_select: Boolean,
		placeholder: {
			type: String,
		},
		preview_results: {
			type: Array,
		},
		save_if_not_exist: {
			type: Boolean,
			default: true,
		},
		no_exist_message: {
			type: String,
		},
		props_to_show: {
			type: Array,
			default: null,
		},
		search_modal_extra_properties: {
			type: Array,
			default() {
				return []
			},
		},
		search_modal_omit_property_keys: {
			type: Array,
			default() {
				return []
			},
		},
		props_to_filter: {
			type: Array,
		},
		search_from_api: Boolean,
		search_function: {
			type: String,
			default: null,
		},
		limpiar_resultados_de_busqueda: {
			type: Boolean,
			default: true,
		},
		set_first_row_selected: {
			type: Boolean,
		},
		props_extras: {
			type: Array,
			default: () => {
				return  []
			}
		},
		props_to_send_to_api: Array,
		emit_selected_with_null: Boolean,
		function_props_to_send_to_api: String,
		/**
		 * Si es true y el modelo es client, con criterio solo dígitos (CUIT 11 o DNI 7–8),
		 * el segundo Enter sin resultados dispara consulta AFIP en lugar de crear cliente por nombre.
		 */
		tax_id_afip_lookup_on_second_enter: {
			type: Boolean,
			default: false,
		},
		/**
		 * Contexto del modulo que declara la busqueda (tarea 3/4, prompt 08 del grupo 179):
		 * 'vender', 'provider_order' o 'recipe'. Se manda al backend (global-search) para que
		 * aplique la logica propia de ese contexto (ej: insumos en pedido a proveedor / receta,
		 * exclusion de insumos y codigo de barras exacto en Vender). Si viene null, global-search
		 * no aplica ninguna logica especial. Ningun consumidor que sea un listado debe declararlo.
		 */
		contexto: {
			type: String,
			default: null,
		},
		/**
		 * Ambito de la preferencia de columnas de los resultados (13/8/2026).
		 *
		 * La preferencia se guarda como `table-column-preference/<modelo>/<tipo>`. Con el tipo fijo
		 * en 'search', TODOS los buscadores del mismo modelo comparten una sola configuracion: el de
		 * Vender, el de Compras y el de movimientos de deposito escriben y leen la misma fila. Eso
		 * funcionaba mientras cada uno solo podia guardar sus propias columnas declaradas, pero desde
		 * que el selector ofrece todas las propiedades del modelo, lo que uno guarda le aparece al
		 * otro.
		 *
		 * Cuando el consumidor declara sus propias `props_to_show` --o sea, cuando su conjunto de
		 * columnas NO es el del modelo-- pasa un ambito y la preferencia queda separada, con el mismo
		 * criterio que ya usa la tabla de la relacion (`btm_<modelo padre>_<relacion>`). Los
		 * buscadores que usan las columnas del modelo no pasan nada y siguen compartiendo 'search',
		 * que es lo correcto: tienen todos el mismo conjunto.
		 */
		preference_scope: {
			type: String,
			default: null,
		},
	},
	data() {
		return {
			loading: false,
			interval: 0,
			waiting_time: 1,
			searching: false,
			results: [],
			selected_index: -1,
			saving_if_not_exist: false,
			esperando: false,
			no_hacer_seleccion: false,
			// Si el b-modal esta en pantalla. Lo llevan onModalShow/onModalHidden y lo usa
			// emitSetSelected para no levantar una guarda que despues nadie podria bajar.
			modal_visible: false,

			per_page: 50,
			current_page: null,
			total_pages: null,
			total_results: 0,

			ya_se_busco: true,

			// True recien despues de una busqueda terminada. Distingue "todavia no buscaste" (modal
			// recien abierto) de "buscaste y no hubo resultados". Ojo: NO reutilizar ya_se_busco, que
			// es del flujo del doble Enter (pulso_enter / reset_ya_se_busco).
			busqueda_realizada: false,

			search_config_rows: [],
			search_preference_columns: [],

			// Ultimo payload recibido del evento 'buscar' del buscador general embebido (props/
			// relaciones tildadas, conector, extra_filters). Se reusa tal cual en las busquedas que
			// dispara la paginacion (tarea 5, prompt 08 del grupo 179), para que la pagina 2 tenga
			// las mismas props/modo/filtros que la 1.
			ultima_busqueda_buscador_general: null,
			// Evita repetir el aviso de "los filtros no se aplican sin conexion" en cada tecla
			// (tarea 3): se muestra una sola vez por instancia del modal.
			aviso_filtros_offline_mostrado: false,

			// Criterio tipeado en este modal, disponible en el MISMO tick en que se escribe. Existe
			// porque `query` es una computed sobre la prop `query_value`: su setter emite 'setQuery'
			// al padre y el valor recien vuelve como prop en el proximo ciclo de render. Cualquier
			// lectura de `query` en el mismo tick (lo que hace pulso_enter -> search) leia el valor
			// viejo, y el primer Enter no buscaba nunca (bug del 30/7/2026). `null` significa "no hay
			// nada tipeado aca, mandan las props".
			query_local: null,
		}
	},
	watch: {
		preview_results() {
			console.log('seteando con preview_results')
			this.results = this.preview_results
		},
		set_first_row_selected() {
			this.setFirstSelectedRow()
		},
		model_name() {
			this.loadSearchColumnsPreference()
		},
		preference_scope() {
			this.loadSearchColumnsPreference()
		},
		query_value() {
			// El padre ya tiene el valor: se suelta la copia local para no quedar pisando una
			// limpieza hecha desde afuera (ej. clear_query).
			this.query_local = null
		},
		query(nuevo_valor) {
			// Si el criterio queda vacio, el modal vuelve al estado inicial: no tiene sentido
			// seguir diciendo "no se encontraron resultados" de una busqueda que ya no existe.
			if (!('' + nuevo_valor).trim().length) {
				this.busqueda_realizada = false
			}
		},
	},
	async created() {
		await this.loadSearchColumnsPreference()
	},
	computed: {
		properties() {
			const base_properties = this.getBaseSearchProperties()
			return this.applySearchPreferenceToProperties(base_properties)
		},
		modal_id() {
			return this._id+'-search-modal'
		},
		/**
		 * Ancla `data-tour` del modal, para el tour guiado de la demo.
		 *
		 * 🔴 Condicionada a proposito, y con DOS gates. Este componente es el modal de busqueda de
		 * TODO el sistema —clientes, proveedores, articulos en compras, en recetas, en reportes—,
		 * asi que un valor fijo aca pondria el mismo `data-tour` en una docena de buscadores
		 * distintos y el tour terminaria senalando el primero que encuentre en el DOM.
		 *
		 * - `_id === 'search-article'` deja afuera a todos los buscadores que no son de articulos.
		 * - `contexto === 'vender'` deja afuera a los que SI son de articulos pero viven en otro
		 *   modulo: `buscador-articulos/Index.vue` manda 'provider_order' fuera de Vender, y el
		 *   buscador de rendimiento de Reportes no manda contexto ninguno.
		 *
		 * Devuelve null y no '' porque Vue omite el atributo con null, y un `data-tour=""` el
		 * validador lo cuenta como anclaje presente.
		 *
		 * @returns {String|null}
		 */
		ancla_tour() {
			if (this._id === 'search-article' && this.contexto === 'vender') {
				return 'vender.modal_buscador_articulos'
			}

			return null
		},
		/**
		 * Tipo de preferencia con el que se guardan y leen las columnas de los resultados.
		 * Ver la prop preference_scope.
		 *
		 * @returns {String}
		 */
		search_preference_type() {
			if (this.preference_scope) {
				return 'search_' + this.preference_scope
			}
			return 'search'
		},
		title() {
			if (this.prop) {
				return 'Buscar '+this.propText(this.prop)
			}
			return 'Buscar'
		},
		query: {
			get() {
				if (this.query_local !== null) {
					return this.query_local
				}
				return this.query_value
			},
			set(value) {
				this.query_local = value
				this.$emit('setQuery', value)
			}
		},
		_placeholder() {
			if (this.placeholder) {
				return this.placeholder
			} else if (this.prop) {
				return 'Buscar '+this.propText(this.prop)
			}
		},
		/**
		 * CUIT normalizado: 11 dígitos; DNI: 7 u 8 (solo se cuentan dígitos del criterio).
		 */
		query_matches_client_afip_document_pattern() {
			let digits_only = ('' + this.query).replace(/\D/g, '')
			let len = digits_only.length
			return len === 11 || (len >= 7 && len <= 8)
		},
		/**
		 * Texto de ayuda cuando el flujo de AFIP por CUIT/DNI aplica al segundo Enter.
		 */
		show_afip_second_enter_hint() {
			return this.tax_id_afip_lookup_on_second_enter
				&& this.model_name === 'client'
				&& this.query_matches_client_afip_document_pattern
		},
		prop_to_filter() {
			return this.propToFilter(this.model_name)
		},
		/**
		 * Icono del estado vacio segun el momento: lupa antes de buscar, informacion despues de una
		 * busqueda sin resultados.
		 */
		estado_icono() {
			if (!this.busqueda_realizada) {
				return 'icon-search'
			}
			return 'icon-info-o'
		},
		estado_titulo() {
			if (!this.busqueda_realizada) {
				return 'Escribi un criterio de busqueda'
			}
			return 'No se encontraron resultados'
		},
		estado_detalle() {
			if (!this.busqueda_realizada) {
				return 'Buscamos por las propiedades tildadas en el filtro del buscador.'
			}
			return 'Proba con otras palabras, o revisa las propiedades tildadas en el filtro del buscador.'
		},
		/**
		 * Texto de la accion de teclado disponible, o null si no hay ninguna. Mismas condiciones
		 * que tenia el template antes de este prompt.
		 */
		estado_hint() {
			if (!this.busqueda_realizada || !this.query.length) {
				return null
			}
			if (this.prop && this.save_if_not_exist && this.show_afip_second_enter_hint) {
				return 'para consultar en AFIP / ARCA'
			}
			if (this.prop && this.save_if_not_exist) {
				return 'para crear ' + this.singular(this.model_name)
			}
			return null
		},
	},
	methods: {
		/**
		 * Estado limpio cada vez que se abre el modal: todavia no se busco nada.
		 * No toca this.results, que puede venir precargado por preview_results.
		 */
		onModalShow() {
			this.modal_visible = true
			this.busqueda_realizada = false
			this.total_results = 0
			this.current_page = null
			this.total_pages = null
			// Un criterio tipeado en una apertura anterior no debe ganarle a lo que traiga el padre
			// en esta apertura nueva (ver query_local en data()).
			this.query_local = null
		},
		/**
		 * El modal termino de cerrarse: se libera la guarda que impide reabrirlo.
		 *
		 * Ver emitSetSelected para el motivo por el que la guarda existe y por que se baja aca y no
		 * con un temporizador.
		 */
		onModalHidden() {
			this.modal_visible = false
			this.$emit('setNotShowModel', false)
		},
		/**
		 * El usuario toco el boton de limpiar del pill (icono de deshacer). El buscador general ya
		 * vacio su input y sus filtros; acá se limpia lo del modal y se vuelve al estado inicial.
		 */
		onLimpiarDesdeBuscadorGeneral() {
			this.query = ''
			this.results = []
			this.total_results = 0
			this.current_page = null
			this.total_pages = null
			this.selected_index = -1
			this.busqueda_realizada = false
			this.ultima_busqueda_buscador_general = null
			this.foco_en_input()
		},
		getModelSearchProperties() {
			return this.propsToShowInSearchModal(this.model_name)
		},
		/**
		 * Propiedades que el consumidor (o el modelo) declara para la tabla de resultados. Son las
		 * que arrancan visibles cuando el usuario todavia no configuro nada, y mandan sobre la
		 * definicion del modelo porque pueden traer texto, function o ancho propios.
		 *
		 * @returns {Array}
		 */
		getDeclaredSearchProperties() {
			if (this.props_to_show) {
				return this.props_to_show
			}
			return this.getModelSearchProperties()
		},
		/**
		 * Universo completo de propiedades del modelo, el mismo que ofrece el listado.
		 *
		 * Existe porque hasta el 13/8/2026 la configuracion de "Propiedades en resultados de
		 * busqueda" solo listaba las props declaradas en `belongs_to_many.props_to_show` del modelo
		 * padre (en Compras eran 5), y el usuario no tenia forma de mostrar ninguna otra propiedad
		 * del articulo. Lo declarado ahora define la visibilidad por defecto, no el universo.
		 *
		 * Se descartan las props que no son columnas: separadores de grupo, botones y relaciones.
		 *
		 * @returns {Array}
		 */
		getAllModelProperties() {
			let props
			try {
				props = this.modelPropertiesFromName(this.model_name)
			} catch (error) {
				return []
			}
			props = props.filter(prop => {
				return prop
					&& typeof prop.group_title == 'undefined'
					&& typeof prop.no_mostrar_nunca == 'undefined'
					&& typeof prop.key != 'undefined'
					&& prop.key !== null
					&& prop.key !== ''
					&& !prop.button
					&& prop.type != 'button'
					// Las relaciones se declaran con las claves has_many / belongs_to_many, NO con
					// type: ningun modelo del sistema usa type: 'has_many'. Filtrar por type era
					// filtrar nada, y el selector terminaba ofreciendo columnas como "Descripciones"
					// u "Ofertas para VENDER", que el buscador ni siquiera trae.
					&& !prop.has_many
					&& !prop.belongs_to_many
			})
			return this.check_extencions(props)
		},
		/**
		 * Visibilidad por defecto de una propiedad en los resultados de busqueda.
		 *
		 * `default_hidden_in_search` lo marca getBaseSearchProperties() sobre las props que entran
		 * solo para poder elegirse: estan disponibles en la configuracion, pero apagadas, para que
		 * la tabla de resultados siga viendose igual que antes hasta que el usuario decida otra cosa.
		 *
		 * @param {Object} prop
		 * @returns {Boolean}
		 */
		defaultVisibleInSearch(prop) {
			if (prop.default_hidden_in_search) {
				return false
			}
			return typeof prop.not_show == 'undefined' ? true : !prop.not_show
		},
		appendSearchModalExtraProperties(base_properties) {
			const merged = (base_properties || []).filter(prop => prop && prop.key)
			const key_to_index = {}
			merged.forEach((prop, index) => {
				key_to_index[prop.key] = index
			})
			;(this.search_modal_extra_properties || []).forEach(extra => {
				if (!extra || !extra.key) {
					return
				}
				if (typeof key_to_index[extra.key] != 'undefined') {
					const index = key_to_index[extra.key]
					// Una prop declarada como extra por el consumidor es siempre una prop pedida:
					// aunque el modelo la haya aportado apagada, aca se prende.
					merged[index] = { ...merged[index], ...extra, default_hidden_in_search: false }
				} else {
					key_to_index[extra.key] = merged.length
					merged.push(extra)
				}
			})
			return merged
		},
		getBaseSearchProperties() {
			/* Primero lo declarado, en su orden: es lo que se ve por defecto en los resultados. */
			const merged = []
			const key_to_index = {}
			;(this.getDeclaredSearchProperties() || []).forEach(prop => {
				if (!prop || !prop.key || typeof key_to_index[prop.key] != 'undefined') {
					return
				}
				key_to_index[prop.key] = merged.length
				merged.push(prop)
			})

			/*
			 * Despues el resto del modelo, disponible para elegir pero apagado.
			 *
			 * Si la propiedad ya venia declarada NO se toca: la declaracion del modelo padre puede
			 * omitir a proposito cosas que si estan en el modelo relacionado (una `function` de
			 * display, un `not_show`, un `type` distinto), y mezclarlas cambiaria como se dibuja
			 * una columna que hoy se ve bien.
			 */
			this.getAllModelProperties().forEach(model_prop => {
				if (typeof key_to_index[model_prop.key] != 'undefined') {
					return
				}
				key_to_index[model_prop.key] = merged.length
				merged.push({ ...model_prop, default_hidden_in_search: true })
			})

			const omit = this.search_modal_omit_property_keys || []
			const filtered = omit.length
				? merged.filter(prop => prop && prop.key && !omit.includes(prop.key))
				: merged

			return this.appendSearchModalExtraProperties(filtered)
		},
		openColumnsConfig() {
			this.buildSearchConfigRows()
			this.$bvModal.show(this.modal_id + '-columns-config')
		},
		/**
		 * Ancho por defecto de una columna de resultados.
		 *
		 * Delega en el helper compartido: antes este metodo repetia la cuenta pero sin el caso de
		 * las columnas angostas (id, num), asi que el selector mostraba 100 px y la tabla dibujaba
		 * 200 para la misma columna, y el primer "Listo" guardaba el 100 que el usuario nunca eligio.
		 *
		 * @param {Object} prop
		 * @returns {Number}
		 */
		search_modal_default_width(prop) {
			return default_column_width_for_property(prop)
		},
		buildSearchConfigRows() {
			const base_properties = this.getBaseSearchProperties()
				.filter(prop => prop && prop.key)
			const defaults = base_properties.map((prop, index) => ({
				key: prop.key,
				label: this.propText(prop),
				visible: this.defaultVisibleInSearch(prop),
				order: index,
				width: default_column_width_for_property(prop),
				wrap_content: !!prop.table_wrap_content,
			}))
			this.search_config_rows = this.normalizeSearchPreferenceRows(this.search_preference_columns, defaults)
		},
		normalizeSearchPreferenceRows(rows, defaults) {
			const defaults_by_key = {}
			defaults.forEach(item => {
				defaults_by_key[item.key] = item
			})

			let normalized = []
			if (rows && rows.length) {
				normalized = rows
					.filter(item => item && item.key && defaults_by_key[item.key])
					.sort((a, b) => Number(a.order) - Number(b.order))
					.map((item, index) => ({
						key: item.key,
						label: defaults_by_key[item.key].label,
						visible: !!item.visible,
						order: index,
						width: item.width || defaults_by_key[item.key].width || fallback_column_width_px(item.key),
						wrap_content: !!item.wrap_content,
					}))
			}

			defaults.forEach(default_item => {
				const exists = normalized.find(item => item.key == default_item.key)
				if (!exists) {
					normalized.push({
						...default_item,
						order: normalized.length,
					})
				}
			})

			return normalized
		},
		applySearchPreferenceToProperties(base_properties) {
			const by_key = {}
			base_properties.forEach(prop => {
				if (prop && prop.key) {
					by_key[prop.key] = prop
				}
			})

			const defaults = base_properties
				.filter(prop => prop && prop.key)
				.map((prop, index) => ({
					key: prop.key,
					label: this.propText(prop),
					visible: this.defaultVisibleInSearch(prop),
					order: index,
					width: this.search_modal_default_width(prop),
					wrap_content: !!prop.table_wrap_content,
				}))

			const rows = this.normalizeSearchPreferenceRows(this.search_preference_columns, defaults)
			return rows
				.filter(row => row.visible)
				.sort((a, b) => Number(a.order) - Number(b.order))
				.map(row => {
					const base = by_key[row.key]
					if (!base) {
						return null
					}
					return {
						...base,
						not_show: false,
						table_width: row.width || fallback_column_width_px(row.key),
						table_wrap_content: !!row.wrap_content,
					}
				})
				.filter(Boolean)
		},
		async loadSearchColumnsPreference() {
			const store_rows = this.tableColumnPreferenceColumnsFromStore(this.model_name, this.search_preference_type)
			if (store_rows && store_rows.length) {
				this.search_preference_columns = store_rows
				return
			}
			try {
				const res = await this.$api.get('table-column-preference/' + this.model_name + '/' + this.search_preference_type)
				if (res.data && res.data.model && Array.isArray(res.data.model.columns)) {
					this.search_preference_columns = res.data.model.columns
				} else {
					this.search_preference_columns = []
				}
			} catch (error) {
				this.search_preference_columns = []
			}
		},
		/**
		 * Claves que esta preferencia tiene derecho a guardar.
		 *
		 * La preferencia de busqueda se guarda por MODELO (`table-column-preference/article/search`),
		 * asi que la comparten todos los buscadores del mismo modelo: el de Compras, el de Vender, el
		 * de movimientos de deposito. Desde que el selector ofrece TODAS las propiedades del modelo,
		 * guardar la lista entera significaria escribir `visible: false` para las ~75 propiedades que
		 * este consumidor no declara, y esos false apagarian columnas en los otros buscadores, que si
		 * las declaran. Por eso solo se persiste lo que este consumidor declara, lo que el usuario
		 * dejo prendido, y lo que ya estaba guardado de antes: el resto simplemente no existe en la
		 * preferencia y cada buscador le sigue aplicando su propio default.
		 *
		 * @returns {Object} Mapa key -> true.
		 */
		savableSearchPreferenceKeys() {
			const keys = {}
			;(this.getDeclaredSearchProperties() || []).forEach(prop => {
				if (prop && prop.key) {
					keys[prop.key] = true
				}
			})
			;(this.search_modal_extra_properties || []).forEach(prop => {
				if (prop && prop.key) {
					keys[prop.key] = true
				}
			})
			;(this.search_preference_columns || []).forEach(row => {
				if (row && row.key) {
					keys[row.key] = true
				}
			})
			return keys
		},
		async saveSearchColumnsPreference() {
			const savable_keys = this.savableSearchPreferenceKeys()
			const rows_to_save = this.search_config_rows
				.filter(row => row.key)
				.filter(row => row.visible || savable_keys[row.key])
				.map((row, index) => ({
					key: row.key,
					visible: !!row.visible,
					order: index,
					width: row.width ? Number(row.width) : null,
					wrap_content: !!row.wrap_content,
				}))
			try {
				await this.$api.put('table-column-preference/' + this.model_name + '/' + this.search_preference_type, {
					columns: rows_to_save,
				})
				this.search_preference_columns = rows_to_save
				this.$toast.success('Configuracion de busqueda guardada')
				this.$bvModal.hide(this.modal_id + '-columns-config')
				this.$store.dispatch('table_column_preference/getModels')
			} catch (error) {
				this.$toast.error('No se pudo guardar la configuracion de busqueda')
			}
		},
		setCurrentPage(page) {
			this.current_page = page 
			this.search(true)
			this.foco_en_input()
		},
		foco_en_input() {
			let input_name = this._id+'-search-modal-input'
			let input = document.getElementById(input_name)
			
			if (input) {

				setTimeout(() => {
					input.focus()
				}, 500)
			}
		},
		callSearchModal() {
			this.$emit('callSearchModal')
		},
		callSearch(e) {
			if (e.key != 'ArrowDown' && e.key != 'ArrowUp' && e.key != 'Enter') {
				this.loading = true 
				this.esperando = false 
				if (this.interval) {
		            window.clearInterval(this.interval)
					this.interval = null
				}
				// Sin minimo de caracteres (Lucas, 23/7/2026): antes exigia str_limint. Este
				// metodo hoy no lo llama nadie desde el template (quedo de antes del buscador
				// general embebido, ver comentario de onBuscarDesdeBuscadorGeneral); se actualiza
				// igual para no dejar escrita una regla que ya no rige.
				if (this.query.length > 0) {
					this.waiting_time = 1
					this.interval = window.setInterval(() => {
						if (this.waiting_time == 0) {
		                    window.clearInterval(this.interval)
							this.search()
						} else {
							this.waiting_time--
						}		
					}, 500)
				} else {
					// console.log('VIENE POR ACA')
					// this.esperando = true 
					// setTimeout(() => {
					// 	if (this.esperando && this.query.length) {
					// 		this.search(true)
					// 	} else {
					// 		console.log('paso el tiempo pero esperando ya estaba en false')
					// 	}
					// }, 2000)
					this.loading = false 
				}
			}
		},
		async search(from_pagination = false) {
			console.log('BUSCANDO, str_limint: '+this.str_limint)
			this.results = []

			if (this.loading) {
				this.$toast.error('Espere a que finalice la busqueda, por favor')
				return
			} 

			// Sin minimo de caracteres (Lucas, 23/7/2026). Se busca con lo que haya: alcanza con que
			// exista criterio de texto, o con que el buscador general haya mandado filtros fijos
			// (extra_filters), que es la busqueda "solo por categoria" del grupo 179. El filtrado
			// offline si necesita texto: filtra en memoria comparando strings, no puede aplicar filtros.
			let tiene_texto = ('' + this.query).trim().length > 0
			let tiene_filtros_fijos = !!(
				this.ultima_busqueda_buscador_general
				&& this.ultima_busqueda_buscador_general.extra_filters
				&& this.ultima_busqueda_buscador_general.extra_filters.length
			)

			if (tiene_texto || (tiene_filtros_fijos && this.searchFromApi())) {
				this.loading = true
				let _results = []
				this.searching = true

				this.foco_en_input()

				if (this.searchFromApi()) {
					console.log('enviando api')

					if (!from_pagination || typeof from_pagination == 'object') {
						this.current_page = 1
					}

					// Valvula de escape (tarea 3, prompt 08 del grupo 179): si el consumidor declaro
					// su propia route_to_search y NO declaro contexto, se sigue respetando esa ruta
					// vieja tal cual (ej: road_map, production_batch, pedido a proveedor/receta que
					// todavia no migraron). En cualquier otro caso se va por global-search.
					let usa_route_to_search_propio = !!(this.prop && this.prop.route_to_search && !this.contexto)

					let route
					let info

					if (usa_route_to_search_propio) {
						route = this.prop.route_to_search+'?page='+this.current_page
						info = this.get_info_param()
					} else {
						route = 'global-search/'+this.model_name+'?page='+this.current_page
						info = this.get_global_search_info_param()
					}

					if (this.props_to_send_to_api) {
						this.props_to_send_to_api.forEach(prop_to_send => {
							info[prop_to_send.key] = prop_to_send.value
							// route += '?'+prop_to_send.key+'='+prop_to_send.value
						})
					}

					if (this.function_props_to_send_to_api) {
						
						info = this[this.function_props_to_send_to_api](info)

					}

					this.$api.post(route, info)
					.then(res => {
						
						let response = res.data.models 
						if (!res.data.models) {
							response = res.data
						}

						console.log('response')
						console.log(response)

						this.results = response.data 
						this.total_pages = response.last_page
						this.total_results = response.total

						this.finishSearch()
					})
					.catch(err => {
						this.loading = false
						console.log(err)
						this.$toast.error('Error al buscar')
						this.$toast.error(err)
					})
				} else {
					// Offline con filtros fijos configurados (tarea 3, prompt 08 del grupo 179): los
					// filtros fijos del buscador general no se aplican al filtrado en memoria, se
					// avisa una sola vez y se sigue filtrando por texto como siempre.
					if (
						this.ultima_busqueda_buscador_general
						&& this.ultima_busqueda_buscador_general.extra_filters
						&& this.ultima_busqueda_buscador_general.extra_filters.length
						&& !this.aviso_filtros_offline_mostrado
					) {
						this.$toast.info('Los filtros no se aplican sin conexión')
						this.aviso_filtros_offline_mostrado = true
					}

					let results = []

					if (this.search_function) {
						console.log('BUSCANDO OFFLINE')
						results = await this[this.search_function](this.query)
						console.log('Listo')
					} else {

						let models_to_search = this.models_to_search
						
						console.log('models_to_search')
						console.log(models_to_search)

						_results = models_to_search.filter(model => {

							let value = ''+model[this.prop_to_filter.key]
							let query_array = this.query.toLowerCase().split(' ')

							let coincide = query_array.every((palabra) =>
								value.toLowerCase().includes(palabra)
							)

							if (this.props_to_filter.length && !coincide) {
								this.props_to_filter.forEach(prop_to_filter => {
									if (!coincide) {
										value = ''+model[prop_to_filter]
										coincide = query_array.every((palabra) =>
											value.toLowerCase().includes(palabra)
										)
										// coincide = value && value.toLowerCase().includes(this.query.toLowerCase())
									}
								})
							}

							if (this.props_extras.length) {

								this.props_extras.forEach(prop_extra => {

									console.log('tiene que tener '+prop_extra.key+' igual a '+prop_extra.value)

									if (model[prop_extra.key]
										&& model[prop_extra.key] != prop_extra.value) {

										coincide = false  
									}
								})
							}

							
							return coincide
						})
						
						console.log('resultados:')
						console.log(_results)

						// Eliminar duplicados por ID (en el nuevo array resultante)
						const seen_ids = new Set()

						_results.forEach(item => {
						    if (!seen_ids.has(item.id)) {
						    	console.log('agregando item no repetido:')
						    	console.log(item)
						        seen_ids.add(item.id)
						        results.push(item)
						    } else {
						    	console.log('ya estaba el item:')
						    	console.log(item)
						    }
						})
					}
					

					this.results = results

					console.log('luego:')
					console.log(results)

					this.total_results = this.results.length
					
					this.finishSearch()
				}
			} else {
				// Sin criterio y sin filtros: no se busca y no se molesta con un toast rojo. El modal
				// muestra el estado "Escribi un criterio de busqueda" (prompt 02 de este grupo).
				this.results = []
				this.total_results = 0
				this.loading = false
			}
		},
		get_info_param() {
			let info = {
				query_value: this.query,
			}

			let props_to_filter = []

			if (this.props_to_filter.length) {
				this.props_to_filter.forEach(prop_to_filter => {
					props_to_filter.push(prop_to_filter)
				})
			} else {
				props_to_filter.push(this.prop_to_filter.key)
			}

			info.props_to_filter = props_to_filter

			if (this.prop && this.prop.depends_on) {
				info.depends_on_key = this.prop.depends_on
				info.depends_on_value = this.model[this.prop.depends_on]
			}

			return info
		},
		/**
		 * Arma el cuerpo del POST para global-search (tarea 3, prompt 08 del grupo 179): toma el
		 * ultimo payload emitido por el buscador general embebido (props/relaciones tildadas,
		 * conector, extra_filters) y le suma contexto, per_page y depends_on. Fallback obligatorio:
		 * si el buscador general no mando ninguna prop (usuario sin configuracion guardada, o
		 * modelo sin props buscables), usa props_to_filter para nunca mandar una busqueda sin
		 * ninguna propiedad.
		 *
		 * @returns {Object}
		 */
		get_global_search_info_param() {
			let buscador_payload = this.ultima_busqueda_buscador_general || {}

			let props = buscador_payload.props

			if (!props || !props.length) {
				props = []
				if (this.props_to_filter && this.props_to_filter.length) {
					this.props_to_filter.forEach(prop_to_filter => {
						props.push(prop_to_filter)
					})
				} else if (this.prop_to_filter) {
					props.push(this.prop_to_filter.key)
				}
			}

			let info = {
				query_value: typeof buscador_payload.query_value != 'undefined' ? buscador_payload.query_value : this.query,
				props: props,
				relation_props: buscador_payload.relation_props || [],
				// Conector a nivel modelo ('or'/'and'), ver buscador-general/Index.vue.
				conector: buscador_payload.conector || 'or',
				extra_filters: buscador_payload.extra_filters || [],
				per_page: this.per_page,
			}

			// Contexto del modulo (tarea 3/4): solo se manda cuando el consumidor lo declaro.
			if (this.contexto) {
				info.contexto = this.contexto
			}

			if (this.prop && this.prop.depends_on) {
				info.depends_on_key = this.prop.depends_on
				info.depends_on_value = this.model[this.prop.depends_on]
			}

			return info
		},
		searchFromApi() {
			if (this.search_from_api) {
				return true
			}
			if (this.prop && this.prop.search_from_api_function) {
				return this[this.prop.search_from_api_function]()
			}
			if (this.prop && (this.prop.search_from_api || this.prop.search_depends_on_from_api)) {
				return true 
			}
			if (this.is_mobile && !this.downloadOnMobile(this.model_name) && !this.$store.state[this.model_name].models.length) {
				return true 
			}
			if (this.$store.state[this.model_name].loading) {
				return true 
			}
			return false
		},
		finishSearch() {
			console.log('finishSearch')
			this.orderAlpabethic()
			this.searching = false
			this.interval = null
			this.loading = false 
			this.setFirstSelectedRow()
			this.ya_se_busco = true
			this.busqueda_realizada = true
		},
		/**
		 * Ordena los resultados alfabeticamente por la propiedad de filtro.
		 *
		 * 🔴 Los parentesis de abajo son el arreglo, no un detalle de estilo. Estaba escrito
		 * `a[key]+''.localeCompare(b[key])`, y por precedencia de operadores eso NO es
		 * "(a[key]+'').localeCompare(...)": primero se evalua `''.localeCompare(b[key])`, que da
		 * -1, y despues se concatena con a[key]. O sea que el comparador devolvia un string tipo
		 * "Martillo acero-1"; sort() lo convierte a numero, da NaN, lo trata como 0 y NO REORDENA
		 * NADA. La lista quedaba en el orden en que la mando la API.
		 *
		 * Se veia asi: buscando "Martillo" con dos articulos que empiezan igual --"Martillo acero"
		 * (id 1) y "Martillo" (id 10)-- el primer resultado era "Martillo acero", el mas largo,
		 * porque venia primero por id. Quien busca el nombre exacto y toca el primer resultado se
		 * lleva otro articulo.
		 *
		 * Las dos puntas se fuerzan a string: un valor null o un numero no tienen localeCompare y
		 * romperian el sort entero.
		 */
		orderAlpabethic() {
			if (this.prop_to_filter && this.prop_to_filter.key) {

				let key = this.prop_to_filter.key

				this.results = this.results.sort((a, b) => {
					return (a[key] + '').localeCompare(b[key] + '')
				})
			}
		},
		/**
		 * Autoselecciona la primera fila del resultado.
		 *
		 * no_hacer_seleccion tapa esa autoseleccion para que no se lea como una eleccion del
		 * usuario. Ojo con el camino de auto_select = false: antes se prendia la guarda y no la
		 * bajaba NADIE, asi que un campo declarado con auto_select: false dejaba a su modal sin
		 * poder seleccionar nada en toda su vida (TableComponent::onRowSelected descarta el evento
		 * mientras la guarda este arriba). Si no hay autoseleccion no hay nada que tapar.
		 */
		setFirstSelectedRow() {
			console.log('-> setFirstSelectedRow')
			if (!this.auto_select) {
				this.no_hacer_seleccion = false
				return
			}
			this.no_hacer_seleccion = true
			setTimeout(() => {
				console.log('this.selected_index = -1')
				this.selected_index = -1
				setTimeout(() => {
					this.selected_index = 0
					console.log('se autoselecciono la primer fila')
					this.no_hacer_seleccion = false
				}, 100)
			}, 100)
		},
		reset_ya_se_busco(event) {
			console.log('reset_ya_se_busco')
			const keys = ["Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
			if (!keys.includes(event.key)) {
				this.ya_se_busco = false
			}
		},
		pulso_enter() {
			if (!this.ya_se_busco) {
				this.search()
			} else {
				this.seleccionar_resultado()
			}
		},
		/**
		 * Handler del evento 'buscar' del buscador general embebido (tarea 2, prompt 08 del grupo
		 * 179). El Enter ahora lo maneja el buscador general (su propio @keyup.enter interno), asi
		 * que este metodo reemplaza al @keydown.enter="pulso_enter" que tenia el b-form-input
		 * viejo: guarda el payload para search()/la paginacion (tarea 5), sincroniza this.query
		 * (que search()/pulso_enter siguen leyendo) con lo tipeado, y delega en pulso_enter la
		 * MISMA logica de siempre (crear el modelo al vuelo, consultar AFIP en el segundo Enter).
		 *
		 * @param {Object} payload { query_value, props, relation_props, extra_filters, conector }
		 * @return {void}
		 */
		onBuscarDesdeBuscadorGeneral(payload) {
			this.ultima_busqueda_buscador_general = payload
			this.query = payload.query_value

			// La lupa busca siempre. El atajo del segundo Enter --que en vez de buscar selecciona el
			// resultado-- es del teclado y solo del teclado: un boton que dice "Buscar" y a veces
			// elige un resultado es un boton que hace dos cosas distintas segun un estado que el
			// usuario no ve. Lucas lo reporto como parte del mismo problema, el 12/8/2026.
			//
			// El flujo de AFIP no se toca: vive en seleccionar_resultado() y se dispara con el
			// SEGUNDO Enter (tax_id_afip_lookup_on_second_enter), que sigue pasando por pulso_enter.
			if (payload.origen === 'lupa') {
				this.search()
				return
			}

			this.pulso_enter()
		},

		/**
		 * El buscador general avisa que cambiaron los criterios --un filtro fijo, una propiedad
		 * tildada, el conector--. Eso invalida la busqueda anterior: el proximo Enter tiene que
		 * volver a buscar, no seleccionar el resultado que se calculo sin ese criterio.
		 *
		 * Es el mismo efecto que `reset_ya_se_busco` produce al tipear, para los cambios que no
		 * pasan por el teclado del input, que eran justamente los que quedaban afuera.
		 *
		 * @return {void}
		 */
		onCriteriosCambiaron() {
			this.ya_se_busco = false
		},
		seleccionar_resultado() { 
			if (!this.loading) {
				if (this.selected_index != -1 && this.results.length) {
					// this.$emit('setSelected', this.results[this.selected_index])
					this.emitSetSelected(this.results[this.selected_index])
				} else if (this.save_if_not_exist) {
					if (
						this.tax_id_afip_lookup_on_second_enter
						&& this.model_name === 'client'
						&& this.query_matches_client_afip_document_pattern
					) {
						let normalized_digits = ('' + this.query).replace(/\D/g, '')
						this.$emit('requestClientAfipLookup', {
							query: this.query,
							normalized_digits: normalized_digits,
						})
						return
					}
					this.saveIfNotExist()
				} else if (this.emit_selected_with_null) {
					this.emitSetSelected(null)
				} else {
					this.$toast.error('No hay resultados seleccionados')
					// this.emitSetSelected(null)
				}
			} else {
				this.$toast.error('Espere a que termine la busqueda, por favor')
			}
		},
		saveIfNotExist() {
			this.saving_if_not_exist = true
			let properties_to_set = [] 
			let property_to_send = this.prop_to_filter.key 
			if (this.prop && this.prop.belongs_to_many && this.prop.belongs_to_many.save_if_not_exist && this.prop.belongs_to_many.save_if_not_exist.properties_to_send) {
				this.prop.belongs_to_many.save_if_not_exist.properties_to_send.forEach(prop => {
					properties_to_set.push({
						key: prop.key,
						value: prop.value,
					})
				})
			}
			if (this.prop && this.prop.depends_on) {
				properties_to_set.push({
					key: this.prop.depends_on,
					value: this.model[this.prop.depends_on],
				})
			}
			if (this.prop && this.prop.is_between) {
				properties_to_set.push({
					key: this.prop.is_between.parent_model_prop+'_id',
					value: this.model[this.prop.is_between.parent_model_prop+'_id'],
				})
			}
			this.$api.post(`search/save-if-not-exist/${this.model_name}/${property_to_send}/${this.query}`, {
				properties_to_set
			})
			.then(res => {
				this.saving_if_not_exist = false
				this.$toast.success(this.singular(this.model_name)+' creado')
				this.$emit('setSelected', res.data.model)
				if (this.prop && this.prop.belongs_to_many && this.prop.belongs_to_many.save_if_not_exist && this.prop.belongs_to_many.save_if_not_exist.not_add_to_store_models) {
				} else {
					this.$store.commit(this.model_name+'/add', res.data.model)
				}
				this.$bvModal.hide(this.modal_id)
			})
			.catch(err => {
				this.saving_if_not_exist = false
				console.log(err)
				this.$toast.error('Error al guardar '+this.singular(this.model_name))
			})
		},
		selectUp() {
			this.scroll_up()
			if (this.selected_index > 0) {
				this.selected_index--
			} else {
				this.selected_index = this.results.length-1
			}
		},	
		selectDown() {
			this.scroll_down()
			if (this.selected_index < this.results.length-1) {
				this.selected_index++
			} else {
				this.selected_index = 0
			}
		},	
		scroll_down() {
			let modal = document.getElementById(this.modal_id)
			modal.scrollTop += 200
		},
		scroll_up() {
			let modal = document.getElementById(this.modal_id)
			modal.scrollTop -= 200
		},
		onRowSelected(model) {
			console.log('onRowSelected para SEARCH MODAL')
			this.emitSetSelected(model)
			// this.$emit('setNotShowModel', true)
			// this.$emit('setSelected', model)
			// this.results = []
			// this.$bvModal.hide(this.modal_id)
		},
		/**
		 * Cierra el modal con el resultado elegido y avisa al padre.
		 *
		 * 🔴 La guarda not_show_modal se baja en el evento `hidden` del b-modal (ver
		 * onModalHidden) y NO con un setTimeout de 500 ms. Es el mismo arreglo, y por el mismo
		 * motivo, que el de is_from_keydown en display/TableComponent.vue.
		 *
		 * Que hace la guarda: mientras esta arriba, callSearchModal() de search/Index.vue no abre
		 * nada. Existe porque el input del campo abre el modal con su propio @click, y al cerrarse
		 * el modal el foco vuelve al input: sin la guarda, el cierre podia encadenarse con una
		 * reapertura inmediata y el modal quedaba rebotando.
		 *
		 * Por que 500 ms estaba mal: el cierre del modal tarda lo que tarda su transicion, no 500
		 * ms. El resto de esa ventana quedaba tapando el clic REAL del usuario sobre el campo, y
		 * ese clic no se encola en ningun lado: se pierde y no pasa nada. Al cargar una compra,
		 * donde se eligen articulos uno atras del otro, es exactamente el momento en que se
		 * vuelve a clickear. Medido el 15/8/2026 en el slot 1: despues de elegir un articulo y
		 * completar cantidad, costo y recibida, el primer clic en el campo no abria el modal y
		 * hacia falta un segundo (847 ms).
		 *
		 * La guarda se levanta solo si hay un cierre real por venir. Si el modal no estaba
		 * visible no habria evento `hidden` que la baje, y el campo quedaria muerto para siempre.
		 */
		emitSetSelected(model) {
			if (this.modal_visible) {
				this.$emit('setNotShowModel', true)
			}

			this.$emit('setSelected', model, this.results)

			if (this.limpiar_resultados_de_busqueda) {

				this.results = []
			}
			this.$bvModal.hide(this.modal_id)
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.search-component-modal
	width: 100%
	display: flex
	flex-direction: column
	.header
		display: flex
		flex-direction: row
		align-items: center
		// El buscador general trae width:100% propio (pensado para el encabezado del listado):
		// dentro del header del modal tiene que achicarse para dejar lugar al slot y los botones.
		.buscador-general
			flex: 1 1 auto
			min-width: 0
			width: auto

		// Boton de propiedades de la tabla de resultados: mismo lenguaje visual que el pill
		// del buscador general (blanco, 40px de alto, esquinas redondeadas, sombra suave).
		// La sombra se declara explicita porque _inputs.sass le pone un relieve gris a todo
		// button y no combina con el pill.
		.search-modal-columnas-btn
			display: flex
			align-items: center
			justify-content: center
			gap: 8px
			flex: 0 0 auto
			height: 40px
			padding: 0 14px
			margin-left: 10px
			border: 1px solid #e2e4e7
			border-radius: 22px
			background: #fff
			color: #86868b
			cursor: pointer
			transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease
			box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px

			&:hover
				background: #f7f8f9
				color: #1d1d1f

			&:focus
				outline: none
				border-color: #007bff
				box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px, 0 0 0 3px rgba(0, 123, 255, 0.15)

			i
				font-size: 0.95rem
	.results-title
		font-size: 1.2em
		font-weight: bold
		margin: 1em 0

	// Estado vacio del modal (antes de buscar, o busqueda sin resultados). No usa la clase
	// global .text-with-icon a proposito: esa clase pone el icono en 4em y la usan ~30
	// pantallas del sistema, no se puede tocar desde aca.
	.search-modal-estado
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		text-align: center
		padding: 48px 16px

		.search-modal-estado__icono
			display: flex
			align-items: center
			justify-content: center
			width: 56px
			height: 56px
			border-radius: 50%
			background: #f5f6f7
			color: #86868b
			margin-bottom: 14px

			i
				font-size: 1.4rem

		.search-modal-estado__titulo
			margin: 0
			font-size: 1rem
			font-weight: 500
			color: #1d1d1f

		.search-modal-estado__detalle
			margin: 6px 0 0
			max-width: 420px
			font-size: 0.85rem
			color: #86868b

		.search-modal-estado__hint
			display: flex
			align-items: center
			gap: 8px
			margin-top: 18px
			font-size: 0.85rem
			color: #6e6e73

			.search-modal-estado__tecla
				border: 1px solid #e2e4e7
				border-radius: 6px
				padding: 2px 8px
				font-size: 0.75rem
				background: #fff
				box-shadow: none

.props-to-show-modal .modal-content
	max-height: 85vh
.props-to-show-modal .props-to-show-body
	max-height: calc(85vh - 130px)
	overflow-y: auto
.props-to-show-modal .props-to-show-footer
	position: sticky
	bottom: 0
	background: inherit
	z-index: 2
	border-top: 1px solid rgba(0,0,0,.1)
</style>