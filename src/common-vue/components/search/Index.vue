<template>
	<div>
    	<model
    	v-if="show_btn_create"
    	@modelSaved="modelSaved"
    	:model_name="model_name"></model>

		<search-modal
		:_id="_id"
		:set_first_row_selected="set_first_row_selected"
		:limpiar_resultados_de_busqueda="limpiar_resultados_de_busqueda"
		:query_value="query"
		:prop="prop"
		:auto_select="auto_select"
		:model_name="model_name"
		:placeholder="_placeholder"
		:str_limint="str_limint"
		:preview_results="preview_results"
		:model="model"
		:models_to_search="models_to_search"
		:save_if_not_exist="save_if_not_exist"
		:show_btn_create="show_btn_create"
		:search_from_api="search_from_api"
		:props_to_show="props_to_show"
		:props_to_filter="props_to_filter"
		:search_function="search_function"
		:props_extras="props_extras"
		:emit_selected_with_null="emit_selected_with_null"
		@callSearchModal="callSearchModal"
		@setQuery="setQuery"
		@setNotShowModel="setNotShowModel"
		@setSelected="setSelected"></search-modal>

		<div
		class="search-component">
			<div class="cont-search-input-btn">
				<div class="cont-search">
					<div 
					:class="is_disabled ? 'bg-gray' : 'bg-withe'"
					class="icon">
						<i class="icon-search"></i>
					</div>
					<b-form-input
					:disabled="is_disabled"
					class="input-search"
					:id="_id"
					@click="callSearchModal"
					@keyup="callSearchModal"
					v-model="query"
					:placeholder="_placeholder"></b-form-input>
				</div>
				<div 
				v-if="prop && prop.search_on_models_by"
				class="cont-search-on-models">
					<div
					class="m-r-10 icon"
					v-if="on_models_searched"
					@click="resetModels">
						<i class="icon-redo"></i>
					</div>
					<div 
					v-else
					:class="is_disabled ? 'bg-gray' : 'bg-withe'"
					class="icon">
						<i class="icon-search"></i>
					</div>
					<b-form-input
					class="input-search"
					@keyup.enter="searchOnModels"
					@keyup="limpiar_busqueda_por_borrar"
					v-model="search_query"
					:placeholder="_placeholder_search"></b-form-input>
				</div>
			</div>
		</div>
		<selected-info
		:is_disabled="is_disabled"
		:model_name="model_name"
		:prop="prop"
		:show_selected="show_selected"
		:selected_model="selected_model"
		@clearSelected="clearSelected"></selected-info>
	</div>
</template>
<script>
import SearchModal from '@/common-vue/components/search/Modal'

export default {
	components: {
		SearchModal,
		SelectedInfo: () => import('@/common-vue/components/search/SelectedInfo'),
		Model: () => import('@/common-vue/components/model/Index'),
	},
	props: {
		id: {
			type: String,
			default: null,
		},
		model: {
			type: Object,
			default: null,
		},
		model_name: {
			type: String,
			default: null,
		},
		prop: {
			type: Object,
			default: null,
		},
		str_limint: {
			type: Number,
			default: 2,
		},
		auto_select: {
			type: Boolean,
			default: true,
		},
		clear_query: {
			type: Boolean,
			default: false,
		},
		show_btn_create: {
			type: Boolean,
			default: false,
		},
		search_from_api: {
			type: Boolean,
			default: false,
		},
		props_to_show: {
			type: Array,
			default: null,
		},
		show_selected: {
			type: Boolean,
			default: true,
		},
		placeholder: {
			type: String,
			default: null,
		},
		show_preview_results: {
			type: Boolean,
			default: true,
		},
		save_if_not_exist: {
			type: Boolean,
			default: true,
		},
		clear_query_on_model_change: {
			type: Boolean,
			default: false,
		},
		set_selected_model_with_model_prop: {
			type: Boolean,
			default: false,
		},
		model_name_for_search_on_models: {
			type: String,
			default: null,
		},
		props_to_filter: {
			type: Array,
			default: () => {
				return []
			}
		},
		search_function: {
			type: String,
			default: null,
		},
		limpiar_resultados_de_busqueda: {
			type: Boolean,
			default: true,
		},
		props_extras: {
			type: Array,
			default: () => {
				return  []
			}
		},
		emit_selected_with_null: {
			type: Boolean,
			default: false,
		},
		init_query: {
			type: String,
			default: null,
		},
	},
	data() {
		return {
			query: '',
			search_query: '',
			models_to_search: [],
			preview_results: [],
			selected_model: null,
			not_show_modal: false,
			set_first_row_selected: false,
		}
	},
	computed: {
		_id() {
			if (this.id) {
				return this.id 
			}
			return this.model_name
		},
		_placeholder() {
			if (this.placeholder) {
				return this.placeholder
			}
			return 'Agregar '+this.singular(this.model_name)
		},
		_placeholder_search() {
			return 'Buscar dentro de '+this.plural(this.model_name)
		},
		is_disabled() {
			if (this.prop && this.prop.only_show) {
				return true 
			}
			return false
		},
		on_models_searched() {
			let relations_filtered = this.$store.state[this.model_name_for_search_on_models].relations_filtered
			if (typeof relations_filtered != 'undefined') {
				let finded = relations_filtered.find(relation => {
					return relation == this.prop.key
				})
				return typeof finded != 'undefined'
			}			
			return false
		}
	},
	watch: {
		model() {
			this.setSelectedModelProp()
		},
		index_to_update() {
			this.setSelectedModelProp()
		}
	},
	created() {
		this.setSelectedModelProp()
		this.$parent.$on('updateSearch', this.updateSearch())
		if (this.init_query) {
			this.query = this.init_query
		}
	},
	methods: {
		searchOnModels() {
			if (this.prop && this.search_query.length > 1) {
				this.resetModels(false)
				let results = this.getOriginalModel(this.model_name_for_search_on_models, this.model)[this.prop.key].filter(model => {
					return model[this.prop.search_on_models_by].toLowerCase().includes(this.search_query.toLowerCase())
				})
				this.$set(this.model, this.prop.key, results)
				this.setModel(this.model, this.model_name_for_search_on_models, [], false)
				this.$store.commit(this.model_name_for_search_on_models+'/addRelationFiltered', this.prop.key)
			}
		},
		limpiar_busqueda_por_borrar() {
			if (this.prop && this.search_query.length == 0) {
				this.resetModels()
			}
		},
		resetModels(clear_query = true) {
			this.removeRelationFiltered(this.model_name_for_search_on_models, this.model, this.prop.key)
			if (clear_query) {
				this.search_query = ''
			}
		},
		updateSearch() {
			this.setSelectedModelProp()
		},
		setNotShowModel(value) {
			this.not_show_modal = value
		},
		modelSaved(model) {
			if (this.prop.is_between) {
				if (this.prop.is_between.parent_model_prop) {
					let index = this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop].findIndex(_model => {
						return _model.id == model.id 
					})
					if (index == -1) {
						this.$set(this.model[this.prop.is_between.parent_model_prop], this.prop.is_between.model_prop, this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop].concat([model]))
					} else {
						let models = this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop]
						models.splice(index, 1, model)
						this.$set(this.model[this.prop.is_between.parent_model_prop], this.prop.is_between.model_prop, models)
					}
				} else if (this.prop.is_between.store) {
					let index = this.$store.state[this.prop.is_between.store].models.findIndex(_model => {
						return _model.id == this.model[this.prop.is_between.store+'_id'] 
					})
					if (index == -1) {
						this.$set(this.$store.state[this.prop.is_between.store].models[index], this.prop.is_between.model_prop, this.$store.state[this.prop.is_between.store].models[index][this.prop.is_between.model_prop].concat([model]))
					} else {
						let models = this.$store.state[this.prop.is_between.store].models[index][this.prop.is_between.model_prop].splice(index, 1, model)
						this.$set(this.model[this.prop.is_between.parent_model_prop], this.prop.is_between.model_prop, models)
					}
				}
			}
			this.callSearchModal()
			setTimeout(() => {
				document.getElementsByClassName('input-search-modal')[0].focus()
			}, 200)
		},
		clearSelected() {
			if (this.model && this.prop && !this.set_selected_model_with_model_prop) {
				this.model[this.prop.store] = null
				this.model[this.prop.key] = null
			} 
			this.selected_model = null
			this.query = ''
			this.$emit('clearSelected')
		},
		setPreviewResults() {
			if (this.show_preview_results) {
				if (this.limpiar_resultados_de_busqueda) {

					this.preview_results = this.models_to_search.slice(0, 20)
				} 
			}
		},
		setModelsToSearch() {
			let models = []		
			if (this.search_function && typeof this.search_function != 'undefined') {
			// if (this.prop && this.prop.search_function) {
				models = this[this.search_function]()
			} else if (this.prop && this.prop.depends_on && this.model) {
				if (!this.prop.search_depends_on_from_api) {
				 	models = this.modelsStoreFromName(this.model_name)
					models = models.filter(_model => {
						return _model[this.prop.depends_on] == this.model[this.prop.depends_on]
					})
				}
			} else if (this.prop && this.prop.is_between) {
				if (this.prop.is_between.parent_model_prop) {
					if (this.model[this.prop.is_between.parent_model_prop] && this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop].length) {
						models = this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop]
					} 
				} else if (this.prop.is_between.store && this.model[this.prop.is_between.store+'_id']) {
					let model = this.$store.state[this.prop.is_between.store].models.find(_model => {
						return _model.id == this.model[this.prop.is_between.store+'_id']
					})
					models = model[this.prop.is_between.model_prop]
				}
			} else if (this.prop && this.prop.has_many && this.prop.has_many.models_from_parent_prop) {
				let model = this.$store.state[this.prop.has_many.models_from_parent_prop.parent_model_name].model 
				models = model[this.prop.has_many.models_from_parent_prop.models_prop_name]
			} else {
				models = this.modelsStoreFromName(this.model_name)
			}
			this.models_to_search = models 
		},
		setSelectedModelProp() {
			if (this.show_selected) {
				if (this.prop && this.prop.set_model_on_click_or_prop_with_query_if_null) {
					this.query = this.model[this.prop.key]
					this.selected_model = null
				} else if (this.model && this.prop && this.model[this.prop.key]) {
					if (this.prop.use_store_models) {
						let model = this.$store.state[this.modelNameFromRelationKey(this.prop)].models.find(_model => {
							return _model.id == this.model[this.prop.key]
						})
						this.selected_model = model
					} else {
						this.selected_model = this.model[this.modelNameFromRelationKey(this.prop)]
					}
				} else if (this.set_selected_model_with_model_prop && this.model) {
					this.selected_model = this.model 
				} else if (this.set_selected_model_with_model_prop) {
					this.selected_model = null
				}
			} 
			if (this.clear_query_on_model_change) {
				this.query = ''
			}
		},
		setQuery(value) {
			this.query = value 
		},
		callSearchModal() {
			if (!this.not_show_modal) {

				this.set_first_row_selected = !this.set_first_row_selected

				this.setModelsToSearch()
				this.setPreviewResults()
				this.$bvModal.show(this._id+'-search-modal')
				setTimeout(() => {
					document.getElementById(this._id+'-search-modal-input').focus()
				}, 100)
			}
		},
		setSelected(model, results) {
			console.log('se va a emitir setSelected con results:')
			console.log(results)
			this.selected_model = model 
			this.$emit('setSelected', {
				model,
				prop: this.prop,
				query: this.query,				
				received_model: this.model,				
				results: results,				
			})
			if (this.clear_query) {
				this.query = ''
			}
			this.setInputValue()
		},
		setInputValue() {
			if (this.selected_model) {
				let input = document.getElementById(this._id)
				input.setAttribute('model_id', this.selected_model.id)
			}
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.search-component
	width: 100%
	// display: flex
.cont-search-input-btn
	display: flex
	width: 100%
.cont-search
	width: 100%
	position: relative
	display: flex
	flex-direction: row
	box-shadow: 0 2px 4px rgb(0 0 0 / 15%) !important
	border: 1px solid #ced4da
	border-radius: 0.25rem 

.cont-search-on-models
	width: 40%
	position: relative
	display: flex
	flex-direction: row
	box-shadow: 0 2px 4px rgb(0 0 0 / 15%) !important
	border: 1px solid #ced4da
	border-radius: 0.25rem 
	margin-left: 15px

.icon 
	background: #FFF
	width: 40px
	display: flex
	flex-direction: row
	align-items: center
	font-size: 1.2em
	justify-content: flex-end
	border-radius: 0.25rem 0 0 0.25rem
	i
		color: rgba(0, 0, 0, .6)
	@if ($theme == 'dark') 
		background: #333 !important
		i
			color: #FFF
.bg-gray 
	background: #e9ecef !important
.input-search
	border-radius: 0 0.25rem 0.25rem 0 
	box-shadow: none !important
	border: none !important
</style>