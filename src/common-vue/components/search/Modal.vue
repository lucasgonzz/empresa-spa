<template>
<b-modal
:title="title"
size="xl"
hide-footer
:id="modal_id">
	<div
	class="search-component-modal">
		<div class="header">
			<b-form-input
			autocomplete="off"
			@keydown="reset_ya_se_busco"
			@keydown.enter="pulso_enter"
			@keydown.up="selectUp"
			@keydown.down="selectDown"
			class="input-search-modal"
			v-model="query"
			:id="_id+'-search-modal-input'"
			:placeholder="_placeholder"></b-form-input>

			<slot name="search_input_right"></slot>
			
			<b-button
			@click="search"
			dusk="btn_search"
			class="m-l-10"
			variant="primary">
				<div
				class="j-center">
					<i class="icon-search p-r-5"></i>
					(Enter)
				</div>
			</b-button>

			<b-button
			class="m-l-10"
			variant="outline-primary"
			@click="openColumnsConfig">
				<i class="icon-eye"></i>
				<i class="icon-list p-l-10"></i>
			</b-button>

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
			v-else>
				<div class="text-with-icon">
					<i class="icon-eye-slash"></i>
					No se encontraron resultados
				</div>
				<div 
				v-if="prop && save_if_not_exist && query.length"
				class="text-with-icon">
					<i class="icon-check"></i>
					ENTER para crear {{ singular(model_name) }}
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
	},
	props: {
		_id: String,
		query_value: String,
		prop: Object,
		show_btn_create: Boolean,
		model_name: String,
		model: Object,
		models_to_search: Array,
		str_limint: {
			type: Number,
			default: 2,
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

			per_page: 50,
			current_page: null,
			total_pages: null,
			total_results: 0,

			ya_se_busco: true,
			search_config_rows: [],
			search_preference_columns: [],
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
		title() {
			if (this.prop) {
				return 'Buscar '+this.propText(this.prop)
			}
			return 'Buscar'
		},
		query: {
			get() {
				return this.query_value 
			},
			set(value) {
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
		prop_to_filter() {
			return this.propToFilter(this.model_name)
		},
	},
	methods: {
		getModelSearchProperties() {
			let props = this.propsToShowInSearchModal(this.model_name)
			const omit = this.search_modal_omit_property_keys || []
			if (omit.length) {
				props = props.filter(prop => prop && prop.key && !omit.includes(prop.key))
			}
			return props
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
					merged[index] = { ...merged[index], ...extra }
				} else {
					key_to_index[extra.key] = merged.length
					merged.push(extra)
				}
			})
			return merged
		},
		getBaseSearchProperties() {
			let base
			if (this.props_to_show) {
				base = this.props_to_show
			} else {
				base = this.getModelSearchProperties()
			}
			return this.appendSearchModalExtraProperties(base)
		},
		openColumnsConfig() {
			this.buildSearchConfigRows()
			this.$bvModal.show(this.modal_id + '-columns-config')
		},
		search_modal_default_width(prop) {
			if (prop.table_width && Number(prop.table_width) > 0) {
				return Number(prop.table_width)
			}
			if (prop.table_width === 'lg') {
				return 300
			}
			return 200
		},
		buildSearchConfigRows() {
			const base_properties = this.getBaseSearchProperties()
				.filter(prop => prop && prop.key)
			const defaults = base_properties.map((prop, index) => ({
				key: prop.key,
				label: this.propText(prop),
				visible: typeof prop.not_show == 'undefined' ? true : !prop.not_show,
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
					visible: typeof prop.not_show == 'undefined' ? true : !prop.not_show,
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
			const store_rows = this.tableColumnPreferenceColumnsFromStore(this.model_name, 'search')
			if (store_rows && store_rows.length) {
				this.search_preference_columns = store_rows
				return
			}
			try {
				const res = await this.$api.get('table-column-preference/' + this.model_name + '/search')
				if (res.data && res.data.model && Array.isArray(res.data.model.columns)) {
					this.search_preference_columns = res.data.model.columns
				} else {
					this.search_preference_columns = []
				}
			} catch (error) {
				this.search_preference_columns = []
			}
		},
		async saveSearchColumnsPreference() {
			const rows_to_save = this.search_config_rows
				.filter(row => row.key)
				.map((row, index) => ({
					key: row.key,
					visible: !!row.visible,
					order: index,
					width: row.width ? Number(row.width) : null,
					wrap_content: !!row.wrap_content,
				}))
			try {
				await this.$api.put('table-column-preference/' + this.model_name + '/search', {
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
				if (this.query.length >= this.str_limint) {
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

			if (this.query.length >= this.str_limint) {
				this.loading = true 
				let _results = []
				this.searching = true

				this.foco_en_input()

				if (this.searchFromApi()) {
					console.log('enviando api')

					if (!from_pagination || typeof from_pagination == 'object') {
						this.current_page = 1
					}

					let info = this.get_info_param()

					let route = 'search-from-modal/'+this.model_name+'?page='+this.current_page

					if (this.prop && this.prop.route_to_search) {
						route = this.prop.route_to_search+'?page='+this.current_page
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
				this.$toast.error('Ingrese al menos '+this.str_limint+' letras')
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
		},
		orderAlpabethic() {
			if (this.prop_to_filter && this.prop_to_filter.key) {

				console.log('orderAlpabethic')
				console.log(this.prop_to_filter)
				console.log('results')
				console.log(this.results)
				this.results = this.results.sort((a, b) => {
					return a[this.prop_to_filter.key]+''.localeCompare(b[this.prop_to_filter.key])
				})
			}
		},
		setFirstSelectedRow() {
			this.no_hacer_seleccion = true
			console.log('-> setFirstSelectedRow')
			if (this.auto_select) {
				setTimeout(() => {
					console.log('this.selected_index = -1')
					this.selected_index = -1
					setTimeout(() => {
						this.selected_index = 0
						console.log('se autoselecciono la primer fila')
						this.no_hacer_seleccion = false
					}, 100)
				}, 100)
			}
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
		seleccionar_resultado() { 
			if (!this.loading) {
				if (this.selected_index != -1 && this.results.length) {
					// this.$emit('setSelected', this.results[this.selected_index])
					this.emitSetSelected(this.results[this.selected_index])
				} else if (this.save_if_not_exist) {
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
		emitSetSelected(model) {
			this.$emit('setNotShowModel', true)
			this.$emit('setSelected', model, this.results)

			if (this.limpiar_resultados_de_busqueda) {

				this.results = []
			}
			this.$bvModal.hide(this.modal_id)
			setTimeout(() => {
				this.$emit('setNotShowModel', false)
			}, 500)
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
	.results-title
		font-size: 1.2em
		font-weight: bold
		margin: 1em 0

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