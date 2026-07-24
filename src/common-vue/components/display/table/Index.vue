<template>
	<div>
		<!--
			Paginación fuera de .cont-table: ese contenedor tiene overflow y thead sticky (top: 0).
			Si la barra va dentro, sticky se superpone al header; aquí queda fija arriba de la zona scrolleable.
		-->
		<pagination
		v-if="!loading && !pivot"
		@filtrar="filtrar"
		:papelera="papelera"
		:model_name="model_name"></pagination>
		<div
		:id="id"
		class="cont-table"
		:class="{ 'cont-table--loading': loading }">
			<table
			:id="'table-'+model_name"
			class="common-table">
				<thead>
					<tr>
						<th
						v-for="field in fields"
						:key="field.key"
						:class="header_column_classes(field)"
						:style="column_style(field)"
						@mouseenter="on_header_th_mouseenter(field, $event)">

							<div class="cont-th">
								<span v-html="field.label"></span>

								<div
								v-if="!pivot && usar_filtros && !is_from_has_many"
								class="cont-filter-buttons"
								:class="{ 'force-show': filter_is_used(field.key) }">
									
									<ordenar
									class="m-l-10"
									@filtrar="filtrar"
									:model_name="model_name"
									:key="field.key"
									:field="field"></ordenar>	

									<!-- Boton de la lupa con el boton de borrar -->
									<btn-filter
									:model_name="model_name"
									@toggleFilter="toggleFilter"
									:field="field"></btn-filter>
								</div>

							</div>	
						</th>
					</tr>
				</thead>
				<!-- Filas skeleton: una barra por celda, reutilizando column_style() para que el ancho coincida con la tabla real. -->
				<tbody
				v-if="loading">
					<tr
					v-for="skeleton_row in skeleton_rows_count"
					:key="'skeleton-row-' + skeleton_row"
					class="skeleton-row">
						<td
						v-for="field in fields"
						:key="field.key"
						:style="column_style(field)">
							<!-- Mismo wrapper que usa la fila real (Tr.vue): hereda el padding y alto de celda real. -->
							<div class="cont-tr cont-tr-skeleton">
								<!-- Columna de imagen: recuadro cuadrado animado, no una barrita fina. -->
								<b-skeleton
								v-if="field.is_image"
								class="skeleton-thumb"
								width="44px"
								height="44px"
								animation="wave"></b-skeleton>
								<!-- Columnas de opciones (izq/der): simulan el grupo de botones con 3 cuadraditos. -->
								<div
								v-else-if="is_options_column(field)"
								class="skeleton-options">
									<b-skeleton
									v-for="n in 3"
									:key="n"
									width="24px"
									height="24px"
									animation="wave"></b-skeleton>
								</div>
								<!-- Resto de columnas: barrita simple, como antes. -->
								<b-skeleton
								v-else
								animation="wave"></b-skeleton>
							</div>
						</td>
					</tr>
				</tbody>
				<tbody
				v-else-if="models.length">
					<template
					v-if="order_list_by">
						<template
						v-for="list in lists">
							<tr
							:key="'list-title-' + list.name"
							class="list-title">
								<td
								:colspan="props.length + 2">
									{{ list.name }} 
									<b-badge
									v-if="list.models.length"
									variant="danger"
									class="m-l-10">
										{{ list.models.length }}
									</b-badge>
								</td>
							</tr>	
							<tr-component
							v-for="model in list.models"
							:key="model.id"
							@onRowSelected="onRowSelected"
							:pivot_parent_model="pivot_parent_model"
							:model="model"
							:pivot="pivot"
							:select_mode="_select_mode"
							:model_name="model_name"
							:props="props"
							:set_model_on_row_selected="set_model_on_row_selected"
							:disable_cell_fade="disable_cell_fade">
								<template v-slot:table_left_options>
									<slot name="table_left_options" :model="model"></slot>
								</template>

								<template v-slot:table_right_options>
									<slot name="table_right_options" :model="model"></slot>
								</template>
								
								<template
								v-for="prop in properties"
								v-slot:[prop.key]>
									<slot :model="model" :name="'table-prop-'+prop.key"></slot>
								</template>
							</tr-component>
						</template>
					</template>
					<template
					v-else>

						<tr-component
						v-for="(model, i) in models"
						:pivot_parent_model="pivot_parent_model"
						:key="i"
						:model="model"
						:pivot="pivot"
						:select_mode="_select_mode"
						:model_name="model_name"
						:props="props"
						@onRowSelected="onRowSelected"
						:set_model_on_row_selected="set_model_on_row_selected"
						:disable_cell_fade="disable_cell_fade"
						:cont_table_id="id">
							<template v-slot:table_left_options>
								<slot name="table_left_options" :model="model"></slot>
							</template>
							<template v-slot:table_right_options>
								<slot name="table_right_options" :model="model"></slot>
							</template>
							<template
							v-for="prop in properties"
							v-slot:[prop.key]>
								<slot :model="model" :name="'table-prop-'+prop.key"></slot>
							</template>
						</tr-component>

						<!-- <div 
						v-if="busy">
							Cargando...
						</div>

						<div v-infinite-scroll="loadMore" infinite-scroll-disabled="busy" infinite-scroll-distance="10"></div> -->
					</template>
				</tbody>
				<slot name="btn_add_to_show"></slot>
			</table>
			<p
			v-if="!loading && !models.length && show_empty_text"
			class="text-with-icon">
				<i class="icon-eye-slash"></i>
				No hay {{ plural(model_name) }}
			</p>
			<!-- <div 
			v-if="models.length && show_buttons_scroll"
			class="scroll-buttons">
				<div 
				@click="scrollLeft"
				class="scroll-button">
					<i class="icon-left"></i>
				</div>
				<div 
				@click="scrollRight"
				class="scroll-button">
					<i class="icon-right"></i>
				</div>
			</div> -->
		</div>

		<!-- Modal de filtros por columna (un solo modal por tabla) -->
		<filter-modal
		v-if="!pivot && usar_filtros"
		:field="filter_modal_field"
		:model_name="model_name"
		:modal_id="filter_modal_id"
		@filtrar="filtrar"
		@agregar_filtro="on_agregar_filtro"
		@closed="close_filter_modal"></filter-modal>
	</div>
</template>
<script>
import infiniteScroll from 'vue-infinite-scroll'
import filters from '@/common-vue/mixins/filters'

export default {
	mixins: [filters],
	directives: {infiniteScroll},
	components: {
		TrComponent: () => import('@/common-vue/components/display/table/Tr'),
		FilterModal: () => import('@/common-vue/components/display/table/filter/FilterModal'),
		Ordenar: () => import('@/common-vue/components/display/table/Ordenar'),
		BtnFilter: () => import('@/common-vue/components/display/table/BtnFilter'),
		Pagination: () => import('@/common-vue/components/display/table/pagination/Index'),
	},
	props: {
		properties: {
			type: Array,
			default: () => {
				return []
			}
		},
		order_list_by: {
			type: String,
			default: null
		},
		is_from_has_many: {
			type: Boolean,
			default: false,
		},
		order_list_from_pivot: {
			type: Boolean,
			default: false,
		},
		select_mode: {
			type: String,
			default: 'single',
		},
		set_model_on_row_selected: {
			type: Boolean,
			default: true,
		},
		pivot: {
			type: Object,
			default: null
		},
		table_height_para_restar: {
			type: Number,
			default: null
		},
		set_table_height: {
			type: Boolean,
			default: true,
		},
		show_actualizado: {
			type: Boolean,
			default: true,
		},
		models: Array,
		loading: Boolean,
		model_name: String,
		set_model_on_click: Boolean,
		on_click_set_property: String,
		show_empty_text: {
			type: Boolean,
			default: true,
		},
		usar_filtros: {
			type: Boolean,
			default: true,
		},
		add_created_at: {
			type: Boolean,
			default: false,
		},
		papelera: {
			type: Boolean,
			default: false,
		},
		pivot_parent_model: {
			type: Object,
			default: null,
		},
		disable_scroll: {
			type: Boolean,
			default: false,
		},
		disable_cell_fade: {
			type: Boolean,
			default: false,
		},
	},
	mounted() {
		let that = this
		that.update_all_header_filter_fit()
		setTimeout(() => {

			this.scroll_margenes()

		}, 1000)
	},
	created() {
		// console.log('se creo tabla')
		this.setHeight()
		// Primer cálculo de filas del skeleton contra el alto real disponible.
		this.update_skeleton_rows_count()
		let that = this
		window.addEventListener('resize', function(event) {
			that.setHeight()
			that.update_all_header_filter_fit()
			// El alto disponible cambió: recalcular cuántas filas de skeleton entran.
			that.update_skeleton_rows_count()
		}, true);

		this.set_fields()
	},
	beforeDestroy() {
		// Evita leaks de listeners de mousemove/mouseleave si el componente se destruye con la tabla enganchada.
		this.unbind_scroll_margenes()
	},
	data() {
		return {
			index_to_show: 1,
			busy: false,
			show_buttons_scroll: false,
			intentos: 0,
			fields: [],
			// Columna cuyo filtro se edita en el modal; null si el modal está cerrado.
			filter_modal_field: null,
			/**
			 * Por key de columna: true si el ancho actual del th ya alcanza para los botones de filtro
			 * sin necesidad de ensanchar la celda al hacer hover.
			 */
			header_filter_fits_by_key: {},
			// Elemento .cont-table al que están enganchados actualmente los listeners de scroll_margenes.
			scroll_bound_el: null,
			// Handler de mousemove enganchado a scroll_bound_el (para poder removerlo).
			scroll_move_handler: null,
			// Handler de mouseleave enganchado a scroll_bound_el (para poder removerlo).
			scroll_leave_handler: null,
			// Cantidad de filas placeholder del skeleton. Arranca en 12 como fallback del primer frame
			// (antes de poder medir el DOM); update_skeleton_rows_count() la recalcula contra el alto real.
			skeleton_rows_count: 12,
			// Alto aproximado (px) de una fila real con botones de opciones: padding del td (5px arriba
			// y abajo) + alto del .cont-tr con los botones (~44px). Debe coincidir con el min-height
			// de .cont-tr-skeleton en el bloque de estilos de más abajo.
			skeleton_row_height_px: 54,
		}
	},
	computed: {
		// models_to_show() {
		// 	let to_show = this.models.slice(0, (this.cant_models_to_show * this.index_to_show))
		// 	return to_show
		// },
		_select_mode() {
			if (this.model_name) {
				let is_selecteable = this.$store.state[this.model_name].is_selecteable
				if (typeof is_selecteable != 'undefined' && is_selecteable) {
					return 'multi'
				}
				return 'single'
			}
			return this.select_mode
		},
		id() {
			return Math.random()+'-'+this.model_name
		},
		/**
		 * Id único del modal de filtros de esta tabla.
		 *
		 * @returns {string}
		 */
		filter_modal_id() {
			return 'filter-modal-' + this.model_name
		},
		props() {
			// console.log('calculando props')
			let props = []

			 if (this.properties.length) {

				props = this.propertiesToShow(this.properties, true)

				// console.log('1:')
				// console.log(props)

				if (this.papelera) {
					props.splice(1, 0, {
						text: 'Eliminado',
						key: 'deleted_at',
						type: 'date',
						is_date: true,
					})
				}

			} else if (
				!this.pivot 
				|| (this.pivot && !this.pivot.props_to_show)
				) {
			 	props = this.propertiesToShow(this.modelPropertiesFromName(this.model_name), true)

				// console.log('propertiesToShow:')
				// console.log(props)
				if (this.add_created_at) {

					props.push({
						key: 'created_at',
						text: 'Creado',
						type: 'date',
						is_date: true,
					})
					props.push({
						key: 'updated_at',
						text: 'Actualizado',
						type: 'date',
						is_date: true,
					})
				}
			}
			if (this.pivot) {
				if (this.pivot.props_to_show) {
					this.pivot.props_to_show.forEach(prop_to_show => {

						// Entrada de columnas dinámicas: se expande en una columna
						// por cada ítem único de la relación indicada, tomando los datos
						// de this.models para construir los headers y las keys de celda
						if (prop_to_show.type == 'relation_columns') {

							// Recolectar todos los ítems únicos de la relación
							// a través de todos los modelos de la tabla
							let unique_related_items = []
							this.models.forEach(model => {
								let related_items = model[prop_to_show.relation]
								if (related_items && related_items.length) {
									related_items.forEach(related_item => {
										// Agregar solo si no fue agregado antes (por id)
										let already_added = unique_related_items.find(item => item.id == related_item.id)
										if (!already_added) {
											unique_related_items.push(related_item)
										}
									})
								}
							})

							// Generar una prop de columna por cada ítem relacionado único
							unique_related_items.forEach(related_item => {
								props.push({
									key: 'relation_col_' + prop_to_show.relation + '_' + related_item.id,
									text: related_item[prop_to_show.header_prop],
									is_relation_column: true,
									relation: prop_to_show.relation,
									pivot_value_prop: prop_to_show.pivot_value_prop,
									related_model_id: related_item.id,
								})
							})

						} else if (prop_to_show.if_has_extencion) {

							if (this.hasExtencion(prop_to_show.if_has_extencion)) {

								props.push(prop_to_show)
							}
						} else {

							props.push(prop_to_show)
						}
					})
				}
				if (this.pivot.pivot_props_to_show) {
					this.pivot.pivot_props_to_show.forEach(prop_to_show => {
						props.push({
							...prop_to_show,
							is_pivot_prop: true,
							only_show: true,
						})
					})
				}
				if (this.pivot.properties_to_set) {
					this.pivot.properties_to_set.forEach(prop_to_set => {


						if (prop_to_set.if_has_extencion) {

							if (this.hasExtencion(prop_to_set.if_has_extencion)) {

								props.push({
									...prop_to_set,
									table_width: prop_to_set.table_width ? prop_to_set.table_width : 150,
									is_pivot_prop: true,
								})
							}
						} else {

							props.push({
								...prop_to_set,
								table_width: prop_to_set.table_width ? prop_to_set.table_width : 300,
								is_pivot_prop: true,
							})
						}
						
					})
				}
			} 

			// console.log(props)

			
			props.splice(0, 0, {
				key: 'table_left_options',
				text: '',
				no_usar_en_filtros: true,
			})

			props.push({
				key: 'table_right_options',
				text: '',
				no_usar_en_filtros: true,
			})
			
			return props 
		},
		// fields() {
		// 	let fields = []
		// 	this.props.forEach(prop => {
		// 		fields.push({
		// 			key: prop.key,
		// 			label: this.propText(prop, true, true),
		// 			sortable: prop.sortable,
		// 			type: prop.type_to_update ? prop.type_to_update : prop.type
		// 		})
		// 	})

		// 	return fields 
		// },
		/**
		 * Pendiente de armar filtros + búsqueda inicial en papelera vía POST search.
		 */
		pending_papelera_search_flag() {
			if (!this.papelera || !this.model_name) {
				return false
			}
			return this.$store.state.papelera[this.model_name].pending_default_papelera_search
		},
		lists() {
			if (this.order_list_by) {
				let models_from_order_by = this.$store.state[this.order_list_by].models
				let lists = []
				let list
				models_from_order_by.forEach(model => {
					list = {}
					if (this.idiom == 'es') {
						list.name = model.nombre
					} else {
						list.name = model.name
					}
					list.models = this.models.filter(_model => {
						if (this.order_list_from_pivot) {
							return _model.pivot[this.order_list_by+'_id'] == model.id 
						} else {
							return _model[this.order_list_by+'_id'] == model.id 
						}
					})
					lists.push(list)
				})

				// Sin asignar
				list = {}
				list.name = 'Sin asignar'
				list.models = this.models.filter(_model => {
					if (this.order_list_from_pivot) {
						return _model.pivot[this.order_list_by+'_id'] == null || _model.pivot[this.order_list_by+'_id'] == 0
					} else {
						return _model[this.order_list_by+'_id'] == null || _model[this.order_list_by+'_id'] == 0 
					}
				})
				if (list.models.length) {
					lists.push(list)
				}
				return lists
			} 
		},
		/**
		 * Firma de columnas con filtro activo; al cambiar, el ancho de botones (p. ej. borrar) puede variar.
		 *
		 * @returns {string}
		 */
		table_filters_signature() {
			if (!this.model_name || !this.$store.state[this.model_name]) {
				return ''
			}
			let filters = this.$store.state[this.model_name].filters || []
			let used_keys = []
			let idx = 0
			for (idx = 0; idx < filters.length; idx++) {
				if (this.filter_is_used(filters[idx].key)) {
					used_keys.push(filters[idx].key)
				}
			}
			return used_keys.join(',')
		},
	},
	watch: {
		fields() {
			this.update_all_header_filter_fit()
		},
		table_filters_signature() {
			this.update_all_header_filter_fit()
		},
		loading() {
			this.setHeight()
			if (this.loading) {
				// Vuelve a mostrarse el skeleton: recalcular filas contra el alto real actual.
				this.update_skeleton_rows_count()
			}
			if (!this.loading) {
				this.update_all_header_filter_fit()
				// El elemento .cont-table se recreó (estaba detrás de v-if="!loading"): re-enganchar el auto-scroll de márgenes.
				this.$nextTick(() => {
					this.scroll_margenes()
				})
			}
		},
		model_name() {
			this.set_fields()
		},
		props() {
			this.set_fields(true)
		},
		models() {
			this.setHeight()
		},
		/**
		 * getModels en papelera solo marca pending; si la tabla ya estaba montada (p. ej. tras restaurar), disparamos el bootstrap aquí.
		 */
		pending_papelera_search_flag(val) {
			if (val && this.papelera && this.model_name) {
				let that = this
				this.$nextTick(function () {
					if (that.$store.state.papelera[that.model_name].pending_default_papelera_search) {
						that.bootstrap_papelera_default_search_from_props()
					}
				})
			}
		},
	},
	methods: {
		/**
		 * Determina si una columna corresponde a slots de opciones laterales.
		 *
		 * @param {Object} field - Definición del field del header.
		 * @returns {Boolean} true cuando la columna es table_left_options o table_right_options.
		 */
		is_options_column(field) {
			return field
				&& (
					field.key === 'table_left_options'
					|| field.key === 'table_right_options'
				)
		},
		/**
		 * Devuelve clases CSS para controlar columnas especiales del header.
		 *
		 * @param {Object} field - Definición del field del header.
		 * @returns {Array} Clases a aplicar en el <th>.
		 */
		header_column_classes(field) {
			/**
			 * Clases de estado para columnas con ancho especial.
			 */
			let classes = []
			if (this.is_options_column(field)) {
				classes.push('th-options-column')
			}
			if (this.header_filter_fits_by_key[field.key]) {
				classes.push('th-filter-fits')
			}
			return classes
		},
		/**
		 * Recalcula en todos los th si los botones de filtro caben sin ensanchar la columna.
		 */
		update_all_header_filter_fit() {
			let that = this
			if (that.pivot || !that.usar_filtros || that.is_from_has_many) {
				return
			}
			that.$nextTick(function () {
				let table = document.getElementById('table-' + that.model_name)
				if (!table) {
					return
				}
				let th_list = table.querySelectorAll('thead tr th')
				let idx = 0
				for (idx = 0; idx < th_list.length; idx++) {
					let field = that.fields[idx]
					if (!field) {
						continue
					}
					that.measure_and_set_header_filter_fit(field, th_list[idx])
				}
			})
		},
		/**
		 * Al entrar con el mouse, mide el th concreto (por si el layout cambió desde el último batch).
		 *
		 * @param {Object} field - Field del header.
		 * @param {Event} event - mouseenter del th.
		 */
		on_header_th_mouseenter(field, event) {
			if (!field || !event || !event.currentTarget) {
				return
			}
			this.measure_and_set_header_filter_fit(field, event.currentTarget)
		},
		/**
		 * Mide si el ancho actual del th deja lugar para los controles de filtro y guarda el resultado.
		 *
		 * @param {Object} field - Field del header.
		 * @param {HTMLElement} th_element - Celda thead.
		 */
		measure_and_set_header_filter_fit(field, th_element) {
			if (
				!field
				|| !th_element
				|| this.pivot
				|| !this.usar_filtros
				|| this.is_from_has_many
				|| this.is_options_column(field)
			) {
				return
			}
			let cont_th = th_element.querySelector('.cont-th')
			let filter_cont = th_element.querySelector('.cont-filter-buttons')
			if (!cont_th || !filter_cont) {
				return
			}
			let label_el = cont_th.querySelector('span')
			let label_width = label_el ? label_el.offsetWidth : 0
			let cont_th_style = window.getComputedStyle(cont_th)
			let padding_horizontal = parseFloat(cont_th_style.paddingLeft) + parseFloat(cont_th_style.paddingRight)
			let buttons_width = this.measure_filter_buttons_width(filter_cont)
			/**
			 * Margen de tolerancia por redondeos de subpíxeles en flex/table layout.
			 */
			let fit_tolerance_px = 2
			let available_width = th_element.clientWidth - label_width - padding_horizontal
			let fits = available_width + fit_tolerance_px >= buttons_width
			this.$set(this.header_filter_fits_by_key, field.key, fits)
			if (fits) {
				th_element.classList.add('th-filter-fits')
			} else {
				th_element.classList.remove('th-filter-fits')
			}
		},
		/**
		 * Ancho natural de .cont-filter-buttons (ordenar + lupa + borrar si aplica).
		 *
		 * @param {HTMLElement} filter_cont - Contenedor de botones del header.
		 * @returns {number}
		 */
		measure_filter_buttons_width(filter_cont) {
			let saved_max_width = filter_cont.style.maxWidth
			let saved_overflow = filter_cont.style.overflow
			let saved_visibility = filter_cont.style.visibility
			let saved_position = filter_cont.style.position
			let saved_opacity = filter_cont.style.opacity
			let saved_pointer_events = filter_cont.style.pointerEvents

			filter_cont.style.maxWidth = 'none'
			filter_cont.style.overflow = 'visible'
			filter_cont.style.visibility = 'hidden'
			filter_cont.style.position = 'absolute'
			filter_cont.style.opacity = '1'
			filter_cont.style.pointerEvents = 'none'

			let width = filter_cont.scrollWidth

			filter_cont.style.maxWidth = saved_max_width
			filter_cont.style.overflow = saved_overflow
			filter_cont.style.visibility = saved_visibility
			filter_cont.style.position = saved_position
			filter_cont.style.opacity = saved_opacity
			filter_cont.style.pointerEvents = saved_pointer_events

			return width
		},
		filtrar() {
			/**
			 * Ejecuta (o re-ejecuta) el filtrado usando una única fuente de verdad (store).
			 * Esto permite refrescar luego de operaciones masivas (ej: eliminar) sin duplicar requests en componentes.
			 */
			this.close_filter_modal()

			// En papelera, el store es específico y ya tiene una acción dedicada.
			if (this.papelera) {
				return this.$store.dispatch('papelera/' + this.model_name + '/run_papelera_search_from_store')
			}

			// En listado normal, delegamos en el store base del módulo.
			return this.$store.dispatch(this.model_name + '/runFilter')
		},
		/**
		 * Abre el modal de filtro para la columna indicada por la lupa.
		 *
		 * @param {string} field_key
		 */
		toggleFilter(field_key) {
			let field = this.fields.find(_field => _field.key == field_key)
			if (!field) {
				return
			}
			this.filter_modal_field = field
			this.$bvModal.show(this.filter_modal_id)
		},
		/**
		 * Cierra el modal sin ejecutar búsqueda; el filtro queda guardado en store.
		 */
		on_agregar_filtro() {
			this.close_filter_modal()
		},
		/**
		 * Limpia la columna activa del modal (al cerrar o tras filtrar).
		 */
		close_filter_modal() {
			if (this.filter_modal_id) {
				this.$bvModal.hide(this.filter_modal_id)
			}
			this.filter_modal_field = null
		},
		/**
		 * Indica si la columna tiene algún filtro activo en el store.
		 *
		 * @param {string} field_key
		 * @returns {boolean}
		 */
		filter_is_used(field_key) {
			let filters = (this.$store.state[this.model_name] && this.$store.state[this.model_name].filters) ? this.$store.state[this.model_name].filters : []
			let has_active = false

			filters.forEach(filter => {
				if (!has_active && filter.key === field_key && this.filter_has_active_values(filter)) {
					has_active = true
				}
			})

			return has_active
		},
		/**
		 * Copia criterios activos de filtros existentes sobre la plantilla nueva de columna.
		 *
		 * @param {Object} template_filter Plantilla vacía generada desde props.
		 * @param {Array}  existing_filters  Filtros previos con la misma key.
		 * @returns {Object}
		 */
		apply_active_filter_values_to_template(template_filter, existing_filters) {
			let merged_filter = Object.assign({}, template_filter)

			existing_filters.forEach(existing_filter => {
				if (!this.filter_has_active_values(existing_filter)) {
					return
				}

				let fields_to_copy = ['que_contenga', 'igual_que', 'menor_que', 'mayor_que', 'checkbox', 'en_blanco', 'no_en_blanco', 'ordenar_de']
				fields_to_copy.forEach(field_key => {
					if (typeof existing_filter[field_key] !== 'undefined') {
						merged_filter[field_key] = existing_filter[field_key]
					}
				})

				/* Compatibilidad con filtros del modal horizontal (value / number_type). */
				if (typeof existing_filter.value !== 'undefined' && existing_filter.value !== '' && existing_filter.value !== null) {
					if (existing_filter.type === 'text' || existing_filter.type === 'textarea') {
						merged_filter.que_contenga = existing_filter.value
					} else if (existing_filter.type === 'select' || existing_filter.type === 'search') {
						if (existing_filter.value !== 0) {
							merged_filter.igual_que = existing_filter.value
						}
					} else if (existing_filter.type === 'number') {
						if (existing_filter.number_type === 'min') {
							merged_filter.menor_que = existing_filter.value
						} else if (existing_filter.number_type === 'equal') {
							merged_filter.igual_que = existing_filter.value
						} else if (existing_filter.number_type === 'max') {
							merged_filter.mayor_que = existing_filter.value
						}
					} else if (existing_filter.type === 'boolean' && existing_filter.value !== -1) {
						merged_filter.checkbox = existing_filter.value
					}
				}
			})

			return merged_filter
		},
		/**
		 * Reconstruye la plantilla de filtros conservando criterios activos del store.
		 *
		 * @param {Array} new_filters      Plantilla según columnas visibles.
		 * @param {Array} existing_filters Filtros actuales del módulo.
		 * @returns {Array}
		 */
		merge_table_filters_preserving_active_values(new_filters, existing_filters) {
			let merged_filters = []

			new_filters.forEach(new_filter => {
				let same_key_filters = []
				existing_filters.forEach(existing_filter => {
					if (existing_filter.key === new_filter.key) {
						same_key_filters.push(existing_filter)
					}
				})

				if (!same_key_filters.length) {
					merged_filters.push(new_filter)
					return
				}

				merged_filters.push(this.apply_active_filter_values_to_template(new_filter, same_key_filters))
			})

			return merged_filters
		},
		set_fields(cambiaron_las_props = false) {

			// console.log('set_fields:')

			this.fields = []
			/**
			 * Registro de keys ya agregadas al header.
			 * Evita columnas duplicadas (ej: created_at) que disparan warnings de Vue
			 * y pueden provocar inconsistencias al actualizar el DOM.
			 */
			let used_field_keys = {}
			this.props.forEach(prop => {
				if (this.showProperty(prop)) {
					if (used_field_keys[prop.key]) {
						return
					}
					used_field_keys[prop.key] = true

					this.fields.push({
						key: prop.key,
						label: this.propText(prop, true, true),
						sortable: prop.sortable,
						type: prop.type_to_update ? prop.type_to_update : prop.type,
						width: prop.table_width ? Number(prop.table_width) : null,
						// Si true, el filtro date no muestra hora (solo día calendario).
						filter_date_only: prop.filter_date_only === true,
						// Calculado desde la prop original (no desde field.type, que puede venir
						// pisado por type_to_update) para saber si el skeleton de esta columna
						// debe mostrar el recuadro cuadrado de imagen en vez de una barrita.
						is_image: this.isImageProp(prop),
					})
				}
			})
			// console.log('fields:')
			// console.log(this.fields)

			this.set_filters(cambiaron_las_props)

			this.update_all_header_filter_fit()

			// this.restart_filtereds()
		},
		restart_filtereds() {
			this.$store.commit(this.model_name+'/setIsFiltered', false)
			this.$store.commit(this.model_name+'/setFiltered', [])
			this.$store.commit(this.model_name+'/setFilterPage', 1)
			this.$store.commit(this.model_name+'/setTotalFilterPages', 1)
		},
		filtros_ya_iniciados() {
			return this.$store.state[this.model_name].filters && this.$store.state[this.model_name].filters.length
		},
		set_filters(cambiaron_las_props) {

			if (this.pivot) {
				return
			}

			if (this.papelera && this.model_name && this.$store.state.papelera[this.model_name].pending_default_papelera_search) {
				this.bootstrap_papelera_default_search_from_props()
				return
			}

			let new_filters = this.build_table_filters_from_props(this.props)

			let existing_filters = this.$store.state[this.model_name].filters || []
			let new_keys = new_filters.map(filter => filter.key).sort()
			let existing_keys = existing_filters.map(filter => filter.key).sort()

			// Reconstruimos si:
			// - no hay filtros inicializados
			// - cambiaron las props (columns)
			// - cambiaron las keys incluidas
			let should_rebuild =
				!existing_filters.length
				|| cambiaron_las_props
				|| existing_filters.length !== new_filters.length
				|| existing_keys.join('|') !== new_keys.join('|')

			if (!should_rebuild) {
				return
			}

			/* Al cambiar columnas (p. ej. depósitos o listas de precio al iniciar), no perder criterios activos. */
			let merged_filters = this.merge_table_filters_preserving_active_values(new_filters, existing_filters)
			this.$store.commit(this.model_name+'/setFilters', merged_filters)
		},
		/**
		 * Entrada a papelera: reconstruye filtros desde columnas, orden único deleted_at DESC y POST search+papelera.
		 */
		bootstrap_papelera_default_search_from_props() {
			if (!this.papelera || !this.model_name) {
				return
			}
			if (!this.$store.state.papelera[this.model_name].pending_default_papelera_search) {
				return
			}
			this.$store.commit('papelera/' + this.model_name + '/setPendingDefaultPapeleraSearch', false)
			let new_filters = this.build_table_filters_from_props(this.props)
			let idx = 0
			for (idx = 0; idx < new_filters.length; idx++) {
				new_filters[idx].ordenar_de = null
			}
			let deleted_filter = null
			for (idx = 0; idx < new_filters.length; idx++) {
				if (new_filters[idx].key === 'deleted_at') {
					deleted_filter = new_filters[idx]
					break
				}
			}
			if (deleted_filter) {
				deleted_filter.ordenar_de = 'DESC'
			} else {
				new_filters.push({
					key: 'deleted_at',
					type: 'date',
					label: 'Eliminado',
					text: 'Eliminado',
					checkbox: -1,
					en_blanco: 0,
					no_en_blanco: 0,
					que_contenga: '',
					igual_que: '',
					menor_que: '',
					mayor_que: '',
					ordenar_de: 'DESC',
				})
			}
			this.$store.commit(this.model_name + '/setFilters', new_filters)
			this.$store.dispatch('papelera/' + this.model_name + '/run_papelera_search_from_store')
		},
		onRowSelected(model) {
			this.$emit('onRowSelected', model)
		},
		column_style(field) {
			// Las columnas de acciones laterales no deben forzar ancho mínimo.
			if (this.is_options_column(field)) {
				return {
					width: '1%',
					minWidth: 'auto',
					whiteSpace: 'nowrap',
				}
			}
			if (field.width && Number(field.width) > 0) {
				return {
					minWidth: Number(field.width) + 'px',
				}
			}
			return {}
		},
		// scrollLeft() {
		// 	if (!this.disable_scroll) {
		// 		let table = document.getElementById(this.id)
		// 		table.scrollLeft -= 300
		// 	}
		// },
		// scrollRight() {
		// 	if (!this.disable_scroll) {
		// 		let table = document.getElementById(this.id)
		// 		table.scrollLeft += 300
		// 	}
		// },
		loadMore($state) {
			if (this.models_to_show.length < this.models.length) {
				this.busy = true;

				setTimeout(() => {
					this.index_to_show++
					this.busy = false;
				}, 300);
			}
		},
		setHeight() {
			// Se aplica también mientras loading es true: así el bloque skeleton ocupa el mismo alto
			// que ocuparía la tabla real y no hay salto de tamaño al terminar de cargar.
			if (this.set_table_height) {
				let table = document.getElementById(this.id)
				if (table) {
					setTimeout(() => {
						// Margen de seguridad para que el redondeo de subpíxeles nunca genere scroll vertical de página.
						let bottom_safety = 12
						let height = window.innerHeight - Number(table.offsetTop) - bottom_safety
						if (this.table_height_para_restar) {
							height -= this.table_height_para_restar
						}
						// Piso de 500px: si el espacio disponible calculado es menor, igual garantizamos
						// un alto minimo razonable para la zona de la tabla.
						if (height < 500) {
							height = 500
						}
						// Antes se aplicaba como 'height' fijo, asi que el contenedor siempre ocupaba
						// TODO el alto disponible aunque tuviera pocas filas (quedaba espacio vacio abajo,
						// con la sombra/bordes redondeados al final de ese espacio vacio en vez de al
						// final de la ultima fila real). Ahora se aplica como TOPE (max-height) + height
						// auto: el contenedor se ajusta al contenido real y solo llega a este tope (y
						// scrollea, gracias al overflow-y:auto que ya tiene .cont-table) cuando las filas
						// no entran en ese espacio.
						table.style.maxHeight = height + 'px'
						table.style.height = 'auto'

						this.setShowButtonsScroll()
					}, 500)
				} else {
					this.volver_a_llamar_set_height()
				}
			}
		},
		volver_a_llamar_set_height() {

			setTimeout(() => {
				if (this.intentos < 5) {
					this.intentos++
					this.setHeight()
				}
			}, 300)
		},
		/**
		 * Calcula cuántas filas de skeleton hacen falta para llenar el alto real disponible de la
		 * tabla, y lo guarda en skeleton_rows_count. Reusa la misma formula de alto que setHeight()
		 * (sin modificar setHeight ni depender de ella) para que ambos cálculos no se desincronicen.
		 */
		update_skeleton_rows_count() {
			// Margen de seguridad, igual al que usa setHeight().
			let bottom_safety = 12
			// Alto disponible calculado desde window.innerHeight, igual que en setHeight().
			let available_height
			let table = document.getElementById(this.id)
			if (table) {
				available_height = window.innerHeight - Number(table.offsetTop) - bottom_safety
				if (this.table_height_para_restar) {
					available_height -= this.table_height_para_restar
				}
				// Mismo piso de 500px que aplica setHeight().
				if (available_height < 500) {
					available_height = 500
				}
			} else {
				// El elemento todavía no está en el DOM (el skeleton se dibuja antes que nada):
				// no podemos abortar, así que estimamos con un porcentaje del alto de la ventana.
				available_height = window.innerHeight * 0.7
			}

			// El thead es sticky y no scrollea: no cuenta como espacio disponible para filas.
			// Se busca dentro de "table" (ya resuelto por getElementById arriba) en vez de armar un
			// selector con this.id, porque ese id puede contener un punto (viene de Math.random()) y
			// un punto en un selector CSS se interpreta como clase, no como parte del id.
			let thead_height = 47
			if (table) {
				let thead_el = table.querySelector('thead')
				if (thead_el && thead_el.offsetHeight) {
					thead_height = thead_el.offsetHeight
				}
			}
			let usable_height = available_height - thead_height

			// Redondear para arriba y sumar 3 filas de sobra: quedarse corto se ve mal (queda un
			// hueco vacío abajo), pasarse es seguro porque .cont-table--loading recorta el sobrante
			// con overflow-y: hidden contra el borde inferior redondeado.
			let rows = Math.ceil(usable_height / this.skeleton_row_height_px) + 3

			// Clamp para que pantallas muy chicas o muy grandes (4K) no generen una cantidad
			// absurda (o insuficiente) de nodos de skeleton.
			if (rows < 8) {
				rows = 8
			}
			if (rows > 60) {
				rows = 60
			}

			this.skeleton_rows_count = rows
		},
		setShowButtonsScroll() {
			let cont_table =  document.getElementById(this.id)
			if (cont_table) {
				let table = cont_table.firstChild
				if (cont_table.offsetWidth < table.offsetWidth) {
					this.show_buttons_scroll = true 
				} else {
					this.show_buttons_scroll = false
				}
			}
		},
		/**
		 * Engancha el auto-scroll horizontal de márgenes sobre .cont-table.
		 * Idempotente: si ya está enganchado al mismo elemento no vuelve a enganchar; si el elemento
		 * se recreó (v-if="!loading" lo destruye/recrea), limpia los listeners viejos antes de re-enganchar.
		 */
		scroll_margenes() {
			if (
				this.is_mobile
				|| !this.owner.scroll_en_tablas
				|| this.disable_scroll
			) {
				// console.log('scroll_en_tablas:')
				// console.log(this.owner.scroll_en_tablas)
				return
			}
		    const contTable = document.getElementById(this.id);
		    if (!contTable) return;

		    // Ya enganchado a este mismo elemento: no duplicar listeners.
		    if (this.scroll_bound_el === contTable) return;
		    // Elemento viejo (tabla recreada por el v-if de loading): limpiar antes de re-enganchar.
		    this.unbind_scroll_margenes();

		    const MARGIN = 70;      // Ancho de la zona de scroll de los márgenes (NO cambia).
		    const MAX_SPEED = 20;   // Velocidad máxima (la actual), al borde de la zona útil.

		    let scrollDirection = null;
		    let scrollSpeed = 0;
		    let isScrolling = false;

		    const startScroll = () => {
		        if (isScrolling) return; // Evita duplicar la animación

		        isScrolling = true;
		        const scroll = () => {
		            if (!scrollDirection || scrollSpeed <= 0) {
		                isScrolling = false;
		                return; // Detiene si no hay dirección o velocidad
		            }
		            contTable.scrollLeft += scrollDirection === 'right' ? scrollSpeed : -scrollSpeed;
		            requestAnimationFrame(scroll);
		        };
		        scroll();
		    };

		    const stopScroll = () => {
		        scrollDirection = null;
		        scrollSpeed = 0;
		    };

		    const handleMouseMove = (e) => {
		        const rect = contTable.getBoundingClientRect();
		        const left = rect.left;
		        const right = rect.right;
		        const x = e.clientX;
		        // Ancho real de la scrollbar vertical (a la derecha). 0 si no hay.
		        const scrollbar_width = contTable.offsetWidth - contTable.clientWidth;

		        // Sobre la barra de scroll vertical: no auto-scroll (para poder usar la barra).
		        if (scrollbar_width > 0 && x > right - scrollbar_width) {
		            stopScroll();
		            return;
		        }

		        if (x < left + MARGIN) {
		            // Margen izquierdo: cuanto más cerca del borde, más rápido.
		            let distance = x - left;                    // 0 en el borde, MARGIN en el límite interno
		            let proximity = (MARGIN - distance) / MARGIN;
		            if (proximity < 0) proximity = 0;
		            if (proximity > 1) proximity = 1;
		            scrollDirection = 'left';
		            scrollSpeed = MAX_SPEED * proximity;
		            startScroll();
		        } else if (x > right - MARGIN) {
		            // Margen derecho (excluyendo la scrollbar): cuanto más cerca del borde usable, más rápido.
		            let distance = right - x;                   // pequeño cerca del borde
		            let usable = MARGIN - scrollbar_width;      // zona útil sin la scrollbar
		            if (usable <= 0) usable = MARGIN;
		            // proximity = 1 justo al lado de la scrollbar (máxima velocidad), 0 en el límite interno.
		            let proximity = (MARGIN - distance) / usable;
		            if (proximity < 0) proximity = 0;
		            if (proximity > 1) proximity = 1;
		            scrollDirection = 'right';
		            scrollSpeed = MAX_SPEED * proximity;
		            startScroll();
		        } else {
		            stopScroll();
		        }
		    };

		    contTable.addEventListener('mousemove', handleMouseMove);
		    contTable.addEventListener('mouseleave', stopScroll);

		    this.scroll_bound_el = contTable;
		    this.scroll_move_handler = handleMouseMove;
		    this.scroll_leave_handler = stopScroll;
		},
		/**
		 * Remueve los listeners de scroll_margenes del elemento al que estén enganchados actualmente.
		 */
		unbind_scroll_margenes() {
			if (this.scroll_bound_el) {
				if (this.scroll_move_handler) {
					this.scroll_bound_el.removeEventListener('mousemove', this.scroll_move_handler);
				}
				if (this.scroll_leave_handler) {
					this.scroll_bound_el.removeEventListener('mouseleave', this.scroll_leave_handler);
				}
			}
			this.scroll_bound_el = null;
			this.scroll_move_handler = null;
			this.scroll_leave_handler = null;
		},
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.form-group
	.cont-table

		th, td 
			min-width: 150px

.cont-table
	box-sizing: border-box
	width: 100%
	overflow-x: auto
	overflow-y: auto
	margin-left: 0
	margin-right: 0
	margin-top: 15px
	position: relative
	/* Esquinas redondeadas arriba y abajo (el overflow auto recorta el contenido a este radio). */
	border-radius: 12px
	/* Sombra sutil para que la tabla se despegue un poco del fondo (estilo Apple: discreta). */
	box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px

	/* Mientras carga (skeleton con cantidad fija de filas) se oculta el scroll vertical: si sobran */
	/* filas respecto al alto visible, quedan recortadas prolijamente por el borde inferior redondeado. */
	&.cont-table--loading
		overflow-y: hidden

	/* Scrollbar de ancho normal para la tabla (el global _scroll_bar.sass la deja en 8px, muy fina). */
	&::-webkit-scrollbar
		width: 15px
		height: 15px

	&::before,
	&::after 
		content: ''
		position: absolute
		// top: 0
		// height: calc(100% + 30px)
		width: 70px /* Ancho de los márgenes */
		z-index: 1000
		background: rgba(0,0,0,.3)
	

	&::before 
		left: 50px
		cursor: w-resize
	

	&::after 
		right: 0
		cursor: e-resize
	

	.b-skeleton-table
		@if ($theme == 'dark')
			background: rgba(0,0,0,.8)
		@else 
			background: rgba(255,255,255,.8)
	
	.common-table
		// El redondeo (arriba y abajo) lo recorta .cont-table, que es el que scrollea de verdad.
		// OJO: nunca poner "overflow" (hidden/auto/scroll) acá. Por spec, position:sticky se ancla
		// al ancestro scrolleable más cercano, y overflow en la propia <table> la convierte a ELLA
		// en ese ancestro (aunque nunca llegue a scrollear). Resultado: el header sticky del th deja
		// de estar anclado a .cont-table y se pierde apenas se hace scroll vertical. Bug real, 16/7/2026.
		border-radius: 0 0 12px 12px
		position: relative
		border-spacing: 0px
		width: 100%

		thead 
			position: relative
			z-index: 900

		thead, tbody 
			min-width: 100%

		tr 
			@if ($theme == 'dark')
				color: #f1f3f4
			@else
				color: #000

			&:hover  
				// font-weight: bold
				td 
					background: rgba(0, 0, 0, .2)

		th, td 
			// white-space: nowrap
			text-align: left
			// min-width: 150px

		th.th-options-column
			min-width: auto
			width: 1%

		th  
			position: sticky
			top: 0px
			/* Fondo en el th sticky (no solo en .cont-th): evita que se vea tbody al scrollear por el padding nativo del th. */
			padding: 0
			background: #2C2C2C
			/* Sombra hacia arriba: tapa el hueco de 1–2px por redondeo de subpíxeles al componer capas sticky. */
			box-shadow: 0 -2px 0 0 #2C2C2C

			&:first-child
				border-top-left-radius: 12px
				overflow: hidden
				.cont-th
					border-top-left-radius: 12px

			&:last-child
				border-top-right-radius: 12px
				overflow: hidden
				.cont-th
					border-top-right-radius: 12px

			&:hover
				.cont-filter-buttons
					opacity: 1
					pointer-events: auto

			// Solo ensanchamos la columna en hover si no hay espacio libre suficiente en el th actual.
			&:not(.th-filter-fits):hover
				.cont-filter-buttons
					max-width: 220px

			&.th-filter-fits:hover
				.cont-filter-buttons
					max-width: fit-content

			.cont-th

				position: relative
				display: flex  
				flex-direction: row
				justify-content: space-between
				white-space: nowrap
				padding: 10px 15px
				font-size: 17px
				font-weight: bold
				background: #2C2C2C
				color: #f1f3f4
				
				@if ($theme == 'dark')
					border-left: 1px solid rgba(255,255,255,.2)
					border-bottom: 1px solid rgba(255,255,255,.2)
					&:first-child
						border-left: 0 !important
					&:last-child
						border-left: 0 !important
				@else 
					border-bottom: 1px solid rgba(0,0,0,.6)


				&.hovered .filter-component
					opacity: 1
					pointer-events: auto

		td
			padding: 5px 15px
			line-height: 25px
			font-size: 1em
			width: 800px
			max-width: 800px
			overflow-wrap: break-word
			&:last-child
				white-space: nowrap
				max-width: 2000px
			@if ($theme == 'dark')
				background: #1d1d1d
				border-bottom: 1px solid rgba(255,255,255,.2)
				font-weight: bold
			@else
				border-bottom: 1px solid rgba(0,0,0,.2)
				// background: #f1f3f4
				background: #FFF

		tbody
			tr:last-child
				td:first-child
					/* Esquina inferior izquierda de la última fila de datos. */
					border-bottom-left-radius: 12px
					overflow: hidden
				td:last-child
					/* Esquina inferior derecha de la última fila de datos. */
					border-bottom-right-radius: 12px
					overflow: hidden

			tr.skeleton-row
				td
					.cont-tr-skeleton
						/* Sube la fila de ~36px (una barrita sola) a ~54px, para que se parezca a la */
						/* fila real con botones. Este min-height tiene que coincidir con */
						/* skeleton_row_height_px del script: si se cambia uno, cambiar el otro. */
						display: flex
						flex-direction: row
						align-items: center
						min-height: 44px
					/* bootstrap-vue le pone margin-bottom por default al b-skeleton; lo sacamos */
					/* para que no infle la altura calculada por skeleton_row_height_px. */
					.cont-tr-skeleton .b-skeleton
						margin-bottom: 0

		.skeleton-thumb
			/* Mismo radio que va a tener la miniatura real (prompt 02 de este grupo). */
			border-radius: 10px
			flex: 0 0 auto

		.skeleton-options
			display: flex
			flex-direction: row
			align-items: center
			/* Separación entre los 3 cuadraditos: margin-right en vez de gap, para no depender */
			/* del soporte de flex-gap del navegador target. */
			.b-skeleton
				margin-right: 6px
				&:last-child
					margin-right: 0

		.cont-filter-buttons
			display: flex  
			flex-direction: row 
			margin: -3px 0
			// Colapsamos el ancho por defecto para que el `th` muestre solo el título.
			// Al hacer hover, expandimos el contenedor para que quepan los botones.
			max-width: 0
			opacity: 0
			overflow: hidden
			pointer-events: none
			transition: max-width 0.2s ease, opacity 0.2s ease

		.cont-filter-buttons.force-show
			max-width: 220px
			opacity: 1
			pointer-events: auto

		th.th-filter-fits .cont-filter-buttons.force-show
			max-width: fit-content



		.list-title td
			position: sticky
			top: 46.5px
			text-align: left
			font-weight: bold
			margin-top: 15px
			z-index: 300
			@if ($theme == 'dark') 
				color: rgba(255,255,255,.9)
				background: #2C2C2C 
			@media screen and (max-width: 768px)
				padding-left: 15px	

		img 
			width: 100px

	.scroll-buttons
		position: relative 
		bottom: 40px
		right: 40px
		display: flex 
		flex-direction: row 
		justify-content: center 
		z-index: 2000
		.scroll-button	
			width: 30px
			height: 30px
			background: $blue 
			border-radius: 50%
			margin-right: 10px
			color: #FFF
			display: flex 
			flex-direction: row 
			justify-content: center 
			align-items: center 



.modal-content
	.cont-table
		width: 98% 
		min-height: 300px
		max-height: 50vh
		// margin-left: -15px
		margin-top: 15px



</style>