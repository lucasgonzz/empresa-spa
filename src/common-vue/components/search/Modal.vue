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
</b-modal>
</template>
<script>
import TableComponent from '@/common-vue/components/display/TableComponent'
export default {
	components: {
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
			default: null
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
		emit_selected_with_null: Boolean,
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
		}
	},
	watch: {
		preview_results() {
			console.log('seteando con preview_results')
			this.results = this.preview_results
		},
		set_first_row_selected() {
			this.setFirstSelectedRow()
		}
	},
	computed: {
		properties() {
			if (this.props_to_show) {
				return this.props_to_show 
			}
			return this.propsToShowInSearchModal(this.model_name)
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
			if (this.selected_index > 0) {
				this.selected_index--
			} else {
				this.selected_index = this.results.length-1
			}
		},	
		selectDown() {
			if (this.selected_index < this.results.length-1) {
				this.selected_index++
			} else {
				this.selected_index = 0
			}
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
</style>