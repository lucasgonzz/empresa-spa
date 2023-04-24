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
			@keyup="callSearch"
			@keydown.enter="enterSelect"
			@keydown.up="selectUp"
			@keydown.down="selectDown"
			class="input-search-modal"
			v-model="query"
			:id="_id+'-search-modal-input'"
			:placeholder="_placeholder"></b-form-input>
			<btn-create-model
			v-if="show_btn_create && (!prop.has_many || (prop.has_many && !prop.has_many.models_from_parent_prop))"
			@callSearchModal="callSearchModal"
			:model="model"
			:prop="prop"
			:model_name="model_name"></btn-create-model>
		</div>
		<div>
			<div
			v-if="loading || results.length">
				<p
				class="results-title">
					<i class="icon-down"></i>
					Resultados
				</p>
				<table-component
				:properties="properties"
				:selected_index="selected_index"
				select_mode="single"
				:loading="loading"
				:models="results"
				:model_name="model_name"
				:set_model_on_row_selected="false"
				:striped="false"
				@onRowSelected="onRowSelected"></table-component>	
			</div>
			<div
			v-else>
				<div class="text-with-icon">
					<i class="icon-search"></i>
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
		v-if="saving_if_not_exist">
			Guardando
		</div>
	</div>
</b-modal>
</template>
<script>
import TableComponent from '@/common-vue/components/display/TableComponent'
export default {
	components: {
		TableComponent,
		BtnCreateModel: () => import('@/common-vue/components/search/BtnCreateModel')
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
		}
	},
	watch: {
		preview_results() {
			console.log('seteando con preview_results')
			this.results = this.preview_results
			this.setFirstSelectedRow()
		},
	},
	computed: {
		properties() {
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
		callSearchModal() {
			this.$emit('callSearchModal')
		},
		callSearch(e) {
			if (e.key != 'ArrowDown' && e.key != 'ArrowUp') {
				this.loading = true 
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
					this.loading = false 
				}
			}
		},
		search() {
			console.log('BUSCANDO')
			this.results = []
			if (this.query.length >= this.str_limint) {
				let results = []
				this.searching = true

				if (this.prop.search_depends_on_from_api) {
					console.log('enviando api')
					this.$api.post('search-from-modal/'+this.model_name, {
						prop_to_filter: this.prop_to_filter,
						depends_on_key: this.prop.depends_on,
						depends_on_value: this.model[this.prop.depends_on],
						query_value: this.query,
					})
					.then(res => {
						console.log('llego desde api:')
						console.log(res.data.models)
						this.results = res.data.models 
						this.finishSearch()
					})
					.catch(err => {
						console.log(err)
					})
				} else {
					results = this.models_to_search.filter(model => {
						let value = ''+model[this.prop_to_filter.key]
						return value && value.toLowerCase().includes(this.query.toLowerCase())
					})
					results = results.filter(model => {
						let index = this.results.findIndex(result => {
							return result.id == model.id 
						})
						return index == -1
					})

					this.results = this.results.concat(results)
					this.finishSearch()
				}
			}
		},
		finishSearch() {
			console.log('continua')
			this.orderAlpabethic()
			this.searching = false
			this.interval = null
			this.loading = false 
			this.setFirstSelectedRow()
		},
		orderAlpabethic() {
			this.results = this.results.sort((a, b) => {
				console.log(a[this.prop_to_filter.key])
				console.log(b[this.prop_to_filter.key])
				return a[this.prop_to_filter.key].localeCompare(b[this.prop_to_filter.key])
			})
		},
		setFirstSelectedRow() {
			if (this.auto_select) {
				setTimeout(() => {
					this.selected_index = -1
					setTimeout(() => {
						this.selected_index = 0
						console.log('se autoselecciono la primer fila')
					}, 100)
				}, 100)
			}
		},
		enterSelect() { 
			if (!this.loading) {
				if (this.selected_index != -1 && this.results.length) {
					this.$emit('setSelected', this.results[this.selected_index])
				} else if (this.save_if_not_exist) {
					this.saveIfNotExist()
				} else {
					this.$emit('setSelected', null)
				}
				this.results = []
				this.$bvModal.hide(this.modal_id)
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
				if (this.prop.belongs_to_many && this.prop.belongs_to_many.save_if_not_exist && this.prop.belongs_to_many.save_if_not_exist.not_add_to_store_models) {
				} else {
					this.$store.commit(this.model_name+'/add', res.data.model)
				}
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
			console.log('onRowSelected')
			this.$emit('setSelected', model)
			this.results = []
			this.$bvModal.hide(this.modal_id)
		}
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