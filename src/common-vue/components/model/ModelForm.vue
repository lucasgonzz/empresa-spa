<template>
	<div
	class="model-form">
		<!-- <images
		:model="model"
		:model_name="model_name"></images>	 -->

		<b-form-row
		class="m-b-0">
			<b-col
			v-for="(prop, index) in properties"
			v-if="showProperty(prop, model, false, true)"
			:md="getCol(prop, 6, input_full_width)"
			:lg="getCol(prop, 4, input_full_width)"
			:xl="getCol(prop, 3, input_full_width)"
			:key="'model-prop-'+index">
				<b-form-group
				:description="prop.description">
					<label
					class="form-label">
						<i 
						v-if="prop.has_many"
						class="icon-down"></i>
						<i 
						v-else
						class="icon-right"></i>
						<strong>{{ label(prop) }}</strong>
					</label>
					<div>
						<images
						v-if="prop.type == 'image' || prop.type == 'images'"
						:prop="prop"
						:model="model"
						:model_name="model_name"
						:has_many_parent_model="has_many_parent_model"
						:has_many_prop="has_many_prop"></images>
						<div
						v-else>
							<p
							v-if="prop.only_show"
							class="m-b-0 m-l-25">
								<strong 
								v-if="propertyText(model, prop) != ''">
									{{ propertyText(model, prop) }}
								</strong>
								<span
								v-else>
									No hay
								</span>
							</p>
							
							<div
							v-else-if="useSearch(prop)">
								<!-- <search-component
								class="m-b-15"
								@setSelected="setSelected"
								:model_name="modelNameFromRelationKey(prop)"
								:model="model"
								show_btn_create
								clear_query
								:save_if_not_exist="saveIfNotExist(prop)"
								:prop="prop"></search-component> -->
								<search-component
								class="m-b-15"
								:id="model_name+'-'+prop.key"
								@setSelected="setSelected"
								:model_name="modelNameFromRelationKey(prop)"
								:model="model"
								show_btn_create
								clear_query
								:save_if_not_exist="saveIfNotExist(prop)"
								:prop="prop"></search-component>
							</div>


							<belongs-to-many-checkbox
							v-else-if="prop.belongs_to_many && prop.type == 'checkbox'"
							:model="model"
							:prop="prop"></belongs-to-many-checkbox>

							<has-many
							v-else-if="prop.has_many"
							:parent_model="model"
							:parent_model_name="model_name"
							:prop="prop"></has-many>

					        <b-form-datepicker
							v-else-if="prop.type == 'date'"
					        placeholder="Fecha"
					        :disabled="isDisabled(prop)"
					        v-model="model[prop.key]"></b-form-datepicker>

							<div
							v-else-if="prop.type == 'radio'">
								<b-form-radio
								v-for="model_radio in modelsToSearch(prop, model)"
								:key="prop.key+'-'+model_radio.id"
								:value="model_radio.id"
								:name="model_name+'-'+prop.key"
								:id="prop.key+'-'+model_radio.id"
								v-model="model[prop.key]">
									<div
									v-if="prop.props_to_show_in_radio">
										<p
										v-for="prop_to_show in prop.props_to_show_in_radio">
											{{ model_radio[prop_to_show] }}
										</p>
									</div>
									<span
									v-else>
										{{ model_radio.name }}
									</span>
								</b-form-radio>
							</div>

							<b-form-input
							v-else-if="prop.type == 'text' || prop.type == 'number' || prop.type == 'password'"
					        :disabled="isDisabled(prop)"
							:placeholder="'Ingresar '+propText(prop)"
							:type="prop.type"
							@keyup.enter="clieckEnter(prop)"
							v-model="model[prop.key]"></b-form-input>

							<b-form-textarea
							v-else-if="prop.type == 'textarea'"
					        :disabled="isDisabled(prop)"
							:placeholder="'Ingresar '+propText(prop)"
							:type="prop.type"
							v-model="model[prop.key]"></b-form-textarea>

							<b-form-select
							v-else-if="prop.type == 'select'"
							@change="setChange(prop)"
					        :disabled="isDisabled(prop)"
							v-model="model[prop.key]"
							:options="getOptions(prop, model, model_name)"></b-form-select>

							<b-form-checkbox
							v-else-if="prop.type == 'checkbox'"
					        :disabled="isDisabled(prop)"
							v-model="model[prop.key]"
							:value="1"
							:unchecked-value="0">
								{{ propText(prop) }}
							</b-form-checkbox>

							<google-geocoder
							v-else-if="prop.type == 'google_geocoder'"
							:prop="prop"
							:model="model"></google-geocoder>

							<div
							v-else-if="prop.type == 'boolean'">
								<p
								v-if="model[prop.key]">
									Si
								</p>
								<p
								v-else>
									No
								</p>
							</div>

							<b-button
					    	v-else-if="prop.show_model"
					    	class="m-r-15"
					    	@click="_setModel(prop)"
							variant="primary">
								<i class="icon-plus"></i>
								{{ btnText(prop) }}
							</b-button>

							<div
					    	v-if="prop.belongs_to_many && !prop.belongs_to_many.related_with_all && (!prop.type || prop.type != 'checkbox')">
								<table-component
								:loading="false"
								:models="model[prop.key]"
								:properties="propsToShowInBelongsToMany(prop)"
								:model_name="prop.store"
								:pivot="prop.belongs_to_many"
								:pivot_model="model"
								:set_model_on_row_selected="false"
								show_pivot_created_at
								:show_btn_edit="false">
									<template v-slot:default="slotProps">
										<slot name="belongs" :model="slotProps.model"></slot>
										<b-button
										v-if="show_btn_remove_belongs_to_many"
										class="m-l-15"
										variant="danger"
										@click="removeModel(prop, slotProps.model)">
											<i class="icon-trash"></i>
										</b-button>
									</template>  
								</table-component>	
							</div>

							<p
							class="function-value"
							v-else-if="prop.function">
								{{ getFunctionValue(prop, model) }}
							</p>

							<b-button
							v-if="(prop.type == 'radio') && model[prop.key] != prop.value"
							variant="outline-primary"
							size="sm"
							@click="clear(prop)">
								Limpiar
							</b-button>
							<p
							v-if="prop.prop_info">
								{{ propInfo(prop) }}
							</p>
						</div>

						<!-- <hr> -->

					</div>

				</b-form-group>
			</b-col>
		</b-form-row>
		
		<b-form-row
		class="m-b-0"
		v-if="model.id && !from_has_many">
			<b-col
			md="6">
				<label
				class="form-label">
					<i class="icon-right"></i>
					Creado
				</label>
				<b-form-input
				disabled
				:value="date(model.created_at)+' '+since(model.created_at)"></b-form-input>
			</b-col>
			<b-col
			md="6">
				<label
				class="form-label">
					<i class="icon-right"></i>
					Actualizado
				</label>
				<b-form-input
				disabled
				:value="date(model.updated_at)+' '+since(model.updated_at)"></b-form-input>
			</b-col>
		</b-form-row>
		
		<slot :model="model"></slot>

		<slot 
		v-if="!from_has_many"
		name="buttons">
			<btn-loader
			v-if="hasPermission"
			@clicked="save"
			:loader="loading"
			text="Guardar"></btn-loader>
			
			<btn-delete
			v-if="_show_btn_delete"
			:has_many_prop="has_many_prop"
			:has_many_parent_model_name="has_many_parent_model_name"
			:model_name="model_name"
			:model="model"
			:modal="'delete-'+model_name"></btn-delete>
		</slot>
		
	</div>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import HasMany from '@/common-vue/components/model/HasMany'
import BelongsToManyCheckbox from '@/common-vue/components/model/BelongsToManyCheckbox'
import Cards from '@/common-vue/components/display/cards/Index'
import TableComponent from '@/common-vue/components/display/TableComponent'
import Images from '@/common-vue/components/model/images/Index'
import BtnLoader from '@/common-vue/components/BtnLoader'
import BtnDelete from '@/common-vue/components/BtnDelete'
import Model from '@/common-vue/components/model/Index'

import model_functions from '@/common-vue/mixins/model_functions'
export default {
	mixins: [model_functions],
	props: {
		model: Object,
		properties: Array,
		model_name: String,
		has_many_parent_model: Object,
		has_many_parent_model_name: String,
		has_many_prop: Object,
		check_can_delete: {
			type: Boolean,
			default: false,
		},
		check_permissions: {
			type: Boolean,
			default: false,
		},
		show_btn_delete: {
			type: Boolean,
			default: true,
		},
		form_to_filter: {
			type: Boolean,
			default: false,
		},
		from_has_many: {
			type: Boolean,
			default: false,
		},
		parent_model: {
			type: Object,
			default: null,
		},
		input_full_width: {
			type: Boolean,
			default: false,
		},
		show_btn_remove_belongs_to_many: {
			type: Boolean,
			default: true,
		},
		actions_after_save: {
			type: Array,
			default: () => []
		},
		hasPermission: {
			type: Boolean,
			default: true,
		},
	},
	created() {
		// console.log('se creo modelForm')
		this.setPropsToShowInBelongsToMany()
	},
	data() {
		return {
			loading: false,
			saving_belongs_to_many: false,
			props_to_show_in_belongs_to_many: [],
		}
	},
	computed: {
		_show_btn_delete() {
			if (this.show_btn_delete && (this.check_can_delete || this.check_permissions)) {
				return this.can(this.model_name+'.delete')
			}
			return this.show_btn_delete
		},
	},
	methods: {
		propInfo(prop) {
			let array = prop.prop_info.model_prop.split('.')
			if (this.model[array[0]] && this.model[array[0]][array[1]]) {
				return prop.prop_info.text+' '+this.model[array[0]][array[1]]
			}
		},
		useSearch(prop) {
			return prop.type == 'search'
			return prop.type == 'search' || (prop.belongs_to_many && !prop.belongs_to_many.related_with_all && !prop.type == 'checkbox' && !prop.belongs_to_many.can_not_modify)
		},
		removeModel(prop, model) {
			let index = this.model[prop.key].findIndex(_model => {
				return _model.id == model.id 
			})
			this.model[prop.key].splice(index, 1)
		},
		setPropsToShowInBelongsToMany() {
			console.log('setPropsToShowInBelongsToMany')
			this.properties.forEach(prop => {
				if (prop.belongs_to_many && !prop.belongs_to_many.related_with_all && (!prop.type || prop.type != 'checkbox')) {
					let to_show 
					if (prop.belongs_to_many.props_to_show) {
						to_show = prop.belongs_to_many.props_to_show
					} else {
						to_show = this.modelPropertiesFromName(prop.store)
					}
					if (prop.belongs_to_many.pivot_props_to_show) {
						let map = prop.belongs_to_many.pivot_props_to_show.map(_prop => {
							return {
								..._prop,
								from_pivot: true,
							}
						})
						to_show = to_show.concat(map)
					}
					this.props_to_show_in_belongs_to_many.push({
						prop_key: prop.key,
						to_show,
					}) 
				}
			})
			console.log('props_to_show_in_belongs_to_many')
			console.log(this.props_to_show_in_belongs_to_many)
		},
		propsToShowInBelongsToMany(prop) {
			return this.props_to_show_in_belongs_to_many.find(_prop => {
				return _prop.prop_key == prop.key 
			}).to_show
		},
		// propsToShowInBelongsToMany(prop) {
		// 	let to_show 
		// 	if (prop.belongs_to_many.props_to_show) {
		// 		to_show = prop.belongs_to_many.props_to_show
		// 	} else {
		// 		to_show = this.modelPropertiesFromName(prop.store)
		// 	}
		// 	if (prop.belongs_to_many.pivot_props_to_show) {
		// 		let map = prop.belongs_to_many.pivot_props_to_show.map(_prop => {
		// 			return {
		// 				..._prop,
		// 				from_pivot: true,
		// 			}
		// 		})
		// 		to_show = to_show.concat(map)
		// 	}
		// 	console.log('to_show')
		// 	console.log(to_show)
		// 	return to_show
		// },
		isDisabled(prop) {
			if (prop.disabled && !this.form_to_filter) {
				return true 
			}
			return false
		},
		clear(prop) {
			this.model[prop.key] = prop.value 
			if (this.isRelationKey(prop)) {
				this.model[this.modelNameFromRelationKey(prop, false, false)] = null
			}
		},
		setChange(prop) {
			if (prop.on_change) {
				this[prop.on_change](prop)
			}
		},
		setPivotProps(prop) {
			if (this.model[prop.key] && this.model[prop.key] != 0) {
				prop.properties_to_set_on_change.forEach(prop_to_set => {
					if (prop_to_set.relation_to_set) {
						console.log(prop_to_set.relation_to_set)
						this.model[prop_to_set.relation_to_set].forEach(model => {
							let selected_relationship = model[prop_to_set.find_on].find(relationship => {
								return relationship.id == this.model[prop.key]
							})
							let array = prop_to_set.set.split('.')
							if (array[1]) {
								model[array[0]][array[1]] = selected_relationship[array[0]][array[1]]
							}
						})
					} else if (prop_to_set.search_on_models) {
						let models_to_search = this.modelsStoreFromName(prop_to_set.search_on_models)
						let finded = models_to_search.find(model_to_search => {
							return model_to_search.id == this.model[prop.key]
						})
						this.model[prop_to_set.set] = finded[prop_to_set.set]
					}
				})
				// this.model['packages'].forEach(model => {
				// 	let selected_relationship = model['locations'].find(relationship => {
				// 		return relationship.id == this.model['location_id']
				// 	})
				// 	model.pivot['price'] = selected_relationship.pivot['price']
				// })
			}
		},
		pivotModels(prop) {
			return this.model[this.modelPlural(prop.store)]
		},
		btnText(prop) {
			if (prop.btn_model_text) {
				return 'Agregar '+prop.btn_model_text
			}
			return 'Agregar '+this.propText(prop)
		},
		_setModel(prop) {
			let properties = []
			prop.properties.forEach(_prop => {
				properties.push({
					key: _prop,
					value: this.model[_prop]
				})
			})
			console.log(properties)
			this.$store.commit(prop.store+'/setModel', {model: null, properties: properties})
			this.$bvModal.show(this.routeString(this.modelNameFromRelationKey(prop)))
		},
		label(prop) {
			return this.capitalize(this.propText(prop))
		},
		setSelected(result) {
			console.log(result)
			let prop = result.prop
			if (prop.belongs_to_many) {
				let model_to_add = result.model 
				this.setBelongsToManyPivotProps(prop, model_to_add, result)
			} else if (prop.has_many && prop.has_many.models_from_parent_prop) {
				this.model[prop.key].unshift(result.model)
			} else {
				this.$set(this.model, result.prop.key, result.model.id)
				this.$set(this.model, this.modelNameFromRelationKey(result.prop), result.model)
			}
		},
		setBelongsToManyPivotProps(prop, model_to_add, result) {
			if (prop.belongs_to_many.properties_to_set) {
				model_to_add.pivot = {}
				prop.belongs_to_many.properties_to_set.forEach(prop_to_set => {
					if (prop_to_set.from_store) {
						let models = this.modelsStoreFromName(prop_to_set.store)
						models.forEach(model => {
							model_to_add.pivot[prop_to_set.store+'_'+model.id] = ''
						})
					} else if (typeof prop_to_set.value === 'object') {
						if (model_to_add[prop_to_set.value.key]) {
							model_to_add.pivot[prop_to_set.key] = model_to_add[prop_to_set.value.key] 
						} else {
							model_to_add.pivot[prop_to_set.key] = prop_to_set.value.value_if_undefined
						}
					} else {
						model_to_add.pivot[prop_to_set.key] = prop_to_set.value 
					}
				})
			}
			this.$set(this.model, prop.key, this.model[prop.key].concat([model_to_add]))
			// this.model[prop.key].unshift(model_to_add)
			console.log('se agrego')
		},
		clieckEnter(prop) {
			if (prop.use_to_check_if_is_repeat) {
				this.checkIsRepeat(prop)
			} else {
				this.save()
			}
		},
		save() {
			if (this.check() && !this.loading) {
				this.loading = true 
				let route = this.routeString(this.model_name)
				let model_to_send = this.getModelToSend()
				if (this.model.id) {
					this.$api.put(route+'/'+this.model.id, model_to_send)
					.then(res => {
						this.loading = false 
						this.$toast.success('Actualizado')
						if (this.has_many_parent_model) {
							let index = this.has_many_parent_model[this.has_many_prop.key].findIndex(model => {
								return model.id == this.model.id 
							})
							if (index != -1) {
								this.has_many_parent_model[this.has_many_prop.key].splice(index, 1, res.data.model)
							}
						} else {
							if (this.model_name == 'user') {
								this.$store.commit('auth/setUser', res.data.model)
							} else {
								this.$store.commit(this.replaceGuion(this.model_name)+'/add', res.data.model)
							}
						}
						this.$bvModal.hide(this.model_name)
						this.callActions(res.data.model)
					})
					.catch(err => {
						console.log(err)
						this.$toast.error('Hubo un Error')
						this.loading = false
					})
				} else {
					this.$api.post(route, model_to_send)
					.then(res => {
						this.loading = false 
						this.$toast.success('Guardado')
						if (this.has_many_parent_model) {
							this.$set(this.has_many_parent_model, this.has_many_prop.key, this.has_many_parent_model[this.has_many_prop.key].concat([res.data.model]))
						} else {
							this.$store.commit(this.replaceGuion(this.model_name)+'/add', res.data.model)
						}
						this.$bvModal.hide(this.model_name)
						this.callActions(res.data.model)
					})
					.catch(err => {
						console.log(err)
						this.$toast.error('Hubo un error')
						this.loading = false
					})
				}
			}
		},
		// hasPermission() {
		// 	console.log('check_permissions: '+this.check_permissions)
		// 	if (this.check_permissions) {
		// 		if (!this.model.id) {
		// 			return this.can(this.model_name+'.store')
		// 		} else if (this.model.id) {
		// 			return this.can(this.model_name+'.update')
		// 		}
		// 	}
		// 	return true 
		// },
		getModelToSend() {
			let model_to_send = {
				...this.model
			}
			let store = this.$store.state[this.model_name]
			if (typeof store != 'undefined') {
				let selected_model = this.$store.state[this.model_name].selected_model 
				if (typeof selected_model != 'undefined') {
					model_to_send.model_id = selected_model.id 
				}
			}
			return model_to_send
		},
		check() {
			let ok = true
			this.properties.forEach(prop => {
				if (prop.required) {
					if (ok && prop.type == 'select' && this.model[prop.key] == 0) {
						this.$toast.error('Ingrese '+this.propText(prop))
						ok = false
					} else if (ok && this.model[prop.key] == '') {
						this.$toast.error('Ingrese '+this.propText(prop))
						ok = false
					}
				} 
			})
			return ok
		},
		checkIsRepeat(prop) {
			if (prop.use_to_check_if_is_repeat) {
				let finded = this.modelsStoreFromName(this.model_name).find(model => {
					return model[prop.key] && model[prop.key].toLowerCase() == this.model[prop.key].toLowerCase()
				})
				if (typeof finded != 'undefined' && (!this.model.id || this.model.id != finded.id)) {
					this.$toast.warning('Ya hay un '+this.singular(this.model_name)+' con este '+this.propText(prop))
					this.setModel(finded, this.model_name)
				}
			} 
		},
		callActions(model) {
			this.actions_after_save.forEach(action => {
				this.$store.dispatch(action)
			})
			this.$emit('modelSaved', model)
		}
	},
	components: {
		ModelComponent: () => import('@/common-vue/components/model/Index'),
		GoogleGeocoder: () => import('@/common-vue/components/model/google-geocoder/Index'),
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		HasMany,
		BelongsToManyCheckbox,
		Cards,
		TableComponent,
		Images,
		BtnLoader,
		BtnDelete,
	}
}
</script>
<style lang="sass">
.model-form 
	[class^='col-']
		padding-bottom: 15px
		margin-bottom: 15px
		border-bottom: 1px solid rgba(0,0,0,.1)
	.custom-radio 
		margin-bottom: 1em 
		p 
			margin-bottom: 0
			text-align: left
	label 
		text-align: left
		width: 100%
	.form-group
		margin-bottom: 0 !important
	hr 
		width: 100%
	.function-value
		font-size: 1.5em
		font-weight: bold
</style>