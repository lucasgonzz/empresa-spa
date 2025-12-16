<template>
	<div
	:id="id"
	class="model-form">
		<b-form-row
		class="m-b-0">
			<b-col
			v-for="(prop, index) in properties"
			v-if="showProperty(prop, model, false, true)"
			:md="getCol(prop, 6, input_full_width)"
			:lg="getCol(prop, 4, input_full_width)"
			:xl="getCol(prop, 3, input_full_width)"
			:key="'model-prop-'+index">
				<div
				v-if="prop.group_title">
					<hr>
					<h4>
						{{ prop.group_title }}
					</h4>
				</div>
				<div
				v-else>
					
					<b-form-group
					:class="colorLabel(prop)"
					:id="'form-group-'+prop.key">
						<label
						class="form-label">
							<i 
							v-if="prop.has_many"
							class="icon-down"></i>
							<i 
							v-else
							class="icon-right"></i>
							<strong>{{ getLabel(prop) }}</strong>
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
								<slot :name="prop.key">
									<p
									v-if="prop.only_show || prop.from_pre_view"
									:class="prop.class"
									class="m-b-0 m-l-25 text-only-show">
										<strong 
										:class="colorLabel(prop)"
										v-html="propertyText(model, prop, false, !prop.from_pre_view)"
										v-if="propertyText(model, prop) != '' || propertyText(model, prop) == 0">
										</strong>
										<span
										v-else>
											No hay
										</span>
									</p>
									
									<div
									v-else-if="useSearch(prop)">
										<search-component
										class="m-b-15"
									    :disabled="isDisabled(prop, form_to_filter)"
										:id="model_name+'-'+prop.key"
										:search_from_api="search_from_api(prop)"
										@setSelected="setSelected"
										:props_to_filter="props_to_filter(prop)"
										:model_name="modelNameFromRelationKey(prop)"
										:model="model"
										show_btn_create
										:props_to_show="props_to_show(prop)"
										:str_limint="str_limint(prop)"
										:model_name_for_search_on_models="model_name"
										:search_function="prop.search_function_for_model_form"
										:clear_query="clearQuery(prop)" 
										:save_if_not_exist="saveIfNotExist(prop)"
										:auto_select="autoSelect(prop)"
										:limpiar_resultados_de_busqueda="prop.limpiar_resultados_de_busqueda"
										:prop="prop"></search-component>
									</div>


									<belongs-to-many-checkbox
									v-else-if="prop.belongs_to_many && prop.type == 'checkbox'"
									:model="model"
									:prop="prop"></belongs-to-many-checkbox>

							       <!--  <b-form-datepicker
									v-else-if="prop.type == 'date'"
							        placeholder="Fecha"
							        :disabled="isDisabled(prop, form_to_filter)"
							        v-model="model[prop.key]"></b-form-datepicker> -->

							        <date-picker
							        @setDate="setDate"
							        :model_name="model_name"
							        :prop="prop"
							        :value="model[prop.key]"
									v-else-if="prop.type == 'date'"></date-picker>

									<b-time 
									v-else-if="prop.type == 'time'"
									:id="model_name+'-'+prop.key"
							        :disabled="isDisabled(prop, form_to_filter)"
									:placeholder="'Ingresar '+propText(prop)"
									type="time"
									@keyup.enter="clickEnter(prop)"
									v-model="model[prop.key]"></b-time>

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

									<div
									v-else-if="prop.type == 'text' || prop.type == 'number' || prop.type == 'password'">

										<div class="d-flex w-100">
											<b-form-input
											autocomplete="off"
											:id="model_name+'-'+prop.key"
									        :disabled="isDisabled(prop, form_to_filter)"
											:placeholder="'Ingresar '+propText(prop)"
											:type="prop.type"
											@keyup.enter="prop.key == 'cuit' ? searchCUIT() : clickEnter(prop)"
											v-model="model[prop.key]"></b-form-input>
											<!-- FUNCIONALIDAD DE SEARCH POR CUIT PARA CLIENTES Y PODER CREAR CLIENTE CON LOS DATOS DE CUIT -->
											<b-button
											v-if="prop.key == 'cuit'"
											@click="searchCUIT"
											class="m-l-5"
											variant="primary">
												<i class="icon-search"></i>
											</b-button>

											<bar-code-scanner
											class="m-l-5"
											v-if="prop.use_bar_code_scanner && hasExtencion('bar_code_scanner')"
											@setBarCode="setBarCode"></bar-code-scanner>
										</div>

										<div
										class="m-t-10"
										v-if="prop.is_price">
											{{ price(model[prop.key]) }}
										</div>
									</div>

									<b-form-textarea
									autocomplete="off"
									:id="model_name+'-'+prop.key"
									v-else-if="prop.type == 'textarea'"
							        :disabled="isDisabled(prop, form_to_filter)"
									:placeholder="'Ingresar '+propText(prop)"
									:rows="10"
									:type="prop.type"
									v-model="model[prop.key]"></b-form-textarea>

									<text-editor
									:id="model_name+'-'+prop.key"
									v-else-if="prop.type == 'texteditor'"
									v-model="model[prop.key]"></text-editor>


									<div
									v-else-if="prop.type == 'select'">
								    	<model-component
								    	v-if="typeof prop.options == 'undefined'"
								    	:model_name="modelNameFromRelationKey(prop)"></model-component>

										<b-form-select
										:id="model_name+'-'+prop.key"
										@input="setChange(prop)"
								        :disabled="isDisabled(prop, form_to_filter)"
										v-model="model[prop.key]"
										:options="getOptions(prop, model, model_name)"></b-form-select>
									</div>		

									<b-form-checkbox
									:id="model_name+'-'+prop.key"
									v-else-if="prop.type == 'checkbox'"
							        :disabled="isDisabled(prop, form_to_filter)"
									v-model="model[prop.key]"
									:value="1"
									:unchecked-value="0">
										{{ propText(prop) }}
									</b-form-checkbox>

									<google-geocoder
									v-else-if="prop.type == 'google_geocoder'"
									:model_name="model_name"
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
									
									<b-button
									v-else-if="prop.button"
									:variant="prop.button.variant"
									@click="callMethod(prop, model)">
										<i
										v-if="prop.button.icon"
										:class="'icon-'+prop.button.icon"></i>
										<span
										v-if="prop.button.button_text">
											{{ prop.button.button_text }}
										</span>
										<span
										v-else>
											{{ propertyText(model, prop) }}
										</span>
										<b-badge
										v-if="prop.button.badge && getBadgeValue(prop.button, model) > 0"
										class="m-l-5"
										:variant="prop.button.badge.variant">
											{{ getBadgeValue(prop.button, model) }}
										</b-badge>
									</b-button>
									
									<p
									class="function-value"
									v-else-if="prop.function">
										{{ getFunctionValue(prop, model) }}
									</p>

									<div v-else-if="prop.type == 'display' && prop.key == 'payment_methods_table' && model_name == 'expense'">
										<payment-methods-table
										:items="model.payment_methods"></payment-methods-table>
									</div>


									<!-- en pivot_parent_model le paso el model padre, para que por ejemplo en el model Sale, en la tabla de articles, tenga acceso al Sale model (el parent_model) -->
									<div
									class="m-l-15"
							    	v-if="prop.belongs_to_many && !prop.belongs_to_many.related_with_all && (!prop.type || prop.type != 'checkbox')">
										<table-component
										:pivot_parent_model="model"
										:loading="false"
										:models="model[prop.key]"
										:model_name="prop.store"
										:pivot="prop.belongs_to_many"
										:order_list_by="prop.belongs_to_many.order_list_by"
										:order_list_from_pivot="true"
										:set_model_on_row_selected="false"
										show_pivot_created_at
										:show_btn_edit="false">
											<template v-slot:table_right_options="slotProps">
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

									<has-many
									v-else-if="prop.has_many"
									:parent_model="model"
									:parent_model_name="model_name"
									:prop="prop"></has-many>

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
								</slot>
							</div>

							<!-- <hr> -->

						</div>

						<div
						class="m-t-15 m-b-10"
						v-if="prop.description">
							<strong>{{ prop.description }}</strong>
						</div>

						<div
						v-for="description in prop.descriptions">
							<p>{{ description }}</p>
						</div>

					</b-form-group>
				</div>
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

		<cuit-result
		@use-data="useAfipData"
		:afip_data="afip_result_data"
		:model="afip_result_model"
		:model_name="model_name"></cuit-result>

		<select-expense-payment-methods-modal
		v-if="model_name == 'expense'"></select-expense-payment-methods-modal>

		<!-- <slot 
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
		</slot> -->
		
	</div>
</template>
<script>
import SearchComponent from '@/common-vue/components/search/Index'
import HasMany from '@/common-vue/components/model/HasMany'
import BelongsToManyCheckbox from '@/common-vue/components/model/BelongsToManyCheckbox'
import Cards from '@/common-vue/components/display/cards/Index'
import TableComponent from '@/common-vue/components/display/table/Index'
import Images from '@/common-vue/components/model/images/Index'
import BtnLoader from '@/common-vue/components/BtnLoader'
import PaymentMethodsTable from '@/components/expenses/components/PaymentMethodsTable'

// import BtnDelete from '@/common-vue/components/BtnDelete'
// import Model from '@/common-vue/components/model/Index'

import model_functions from '@/common-vue/mixins/model_functions'

export default {
	components: {
		CuitResult: () => import('@/components/common/CuitResult'),
		ModelComponent: () => import('@/common-vue/components/model/Index'),
		GoogleGeocoder: () => import('@/common-vue/components/model/google-geocoder/Index'),
		SearchComponent: () => import('@/common-vue/components/search/Index'),
		TextEditor: () => import('@/common-vue/components/model/form/TextEditor'),	
		SelectExpensePaymentMethodsModal: () =>  import('@/components/expenses/modals/select-payment-methods/Index'),
		PaymentMethodsTable,
		HasMany,
		BelongsToManyCheckbox,
		Cards,
		TableComponent,
		Images,
		BtnLoader,
		// BtnDelete,
		BarCodeScanner: () => import('@/common-vue/components/bar-code-scanner/Index'),
		DatePicker: () => import('@/common-vue/components/model/form/DatePicker'),
	},

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
	},
	mounted() {
		this.setFocus()
	},
	data() {
		return {
			loading: false,
			saving_belongs_to_many: false,
			props_to_show_in_belongs_to_many: [],

			afip_result_data: null,
			afip_result_model: null,
		}
	},
	computed: {
		iva_conditions() {
			return this.$store.state.iva_condition.models
		},
		_show_btn_delete() {
			if (this.show_btn_delete && (this.check_can_delete || this.check_permissions)) {
				return this.can(this.model_name+'.delete')
			}
			return this.show_btn_delete
		},
		id() {
			return Math.random()+Date.now()
		},
	},
	methods: {
		searchCUIT() {
			this.$store.dispatch('search_by_cuit/searchByCUIT', {
				cuit: this.model.cuit,
				model_name: this.model_name,
			})
			.then(data => {
				if (data.hubo_un_error) {
					this.$toast.error('Afip dice: '+data.error)
				} else {
					this.afip_result_data = data.afip_data
					this.afip_result_model = data.model
					this.$bvModal.show('cuit-result-modal-'+this.model_name)
				}
			})
			.catch(err => {
				console.log(err)
				this.$toast.error('Error al buscar CUIT')
			})
		},
		        async useAfipData(afip_data) {
					console.log('afip_Data', afip_data);
		            let new_model = { ...this.model };
		            new_model.name = afip_data.nombre
		            new_model.razon_social = afip_data.razonSocial
		            new_model.address = afip_data.direccion
		
		            if (afip_data.provincia) {
		                new_model.provincia_id = await this.findOrCreateRelation('provincia', afip_data.provincia);
		            }
		            console.log('afip_data', afip_data);
		            if (afip_data.localidad) {
		                new_model.location_id = await this.findOrCreateRelation('location', afip_data.localidad);
		            }
		
		            
					new_model.iva_condition_id = afip_data.condicion_iva == 'RESPONSABLE INSCRIPTO' ? 1 : afip_data.condicion_iva == 'MONOTRIBUTO' ? 2 : 3
					
		            this.setModel(new_model, this.model_name, [], false);
		        },
		        async findOrCreateRelation(modelName, name) {
		            if (!name) {
		                return null;
		            }
		
		            let modelInStore = this.$store.state[modelName].models.find(m => m.name.toLowerCase() == name.toLowerCase());
		
		            if (modelInStore) {
		                return modelInStore.id;
		            } else {
		                try {
		                    const res = await this.$api.post(`/${modelName}`, { name: name });
		                    this.$store.commit(`${modelName}/add`, res.data.model);
		                    this.$toast.success(`${this.capitalize(modelName)} "${name}" se ha creado`);
		                    return res.data.model.id;
		                } catch (err) {
		                    console.error(`Error creating ${modelName}:`, err);
		                    this.$toast.error(`Error al crear ${modelName}`);
		                    return null;
		                }
		            }
		        },		search_from_api(prop) {
			if (prop.search_from_api) {
				return true
			}
			return false
		},
		str_limint(prop) {
			if (prop.belongs_to_many && prop.belongs_to_many.str_limint) {
				return prop.belongs_to_many.str_limint
			}
			return null
		},
		props_to_show(prop) {
			if (prop.belongs_to_many && prop.belongs_to_many.props_to_show) {
				return prop.belongs_to_many.props_to_show
			}
			return null
		},
		props_to_filter(prop) {
			if (
				prop.belongs_to_many
				&& prop.belongs_to_many.props_to_filter
			) {
				return prop.belongs_to_many.props_to_filter
			}
			return []
		},	
		colorLabel(prop) {
			if (prop.color_function) {
				return this[prop.color_function](this.model)
			}
		},
		isDisabled(prop, form_to_filter = false) {
			if (prop.disabled && !form_to_filter) {
				return true 
			}
			if (this.form_disabled_to_edit(this.model_name) && this.model.id) {
				return true
			}
			if (prop.disabled_to_edit && this.model.id) {
				return true
			}
			if (this.form_disabled_to_edit_function(this.model_name) && this.model.id) {
				console.log('entro a form_disabled_to_edit_function')
				let function_name = require('@/models/'+this.model_name).default.form_disabled_to_edit_function
				console.log('function_name:')
				console.log(function_name)
				return this[function_name](this.model)
			}
			if (prop.type == 'select' && prop.disabled_if_not_0 && this.model[prop.key] != 0) {
				return true
			}
			return false
		},
		setFocus() {
			setTimeout(() => {
				let ok = false 
				this.properties.forEach(prop => {
					if (!ok) {
						let element = document.getElementById(this.model_name+'-'+prop.key)
						if (element && prop.type == 'text') {
							setTimeout(() => {
								element.focus()
							}, 200)
							ok = true 
						}
					}
				})
			}, 300)
		},
		setDate(result) {
			this.model[result.prop.key] = result.value 
		},
		setBarCode(bar_code) {
			let prop = this.getBarCodeProp(this.model_name)
			this.model[prop.key] = bar_code 
		},
		propInfo(prop) {
			let array = prop.prop_info.model_prop.split('.')
			if (this.model[array[0]] && this.model[array[0]][array[1]]) {
				return prop.prop_info.text+' '+this.model[array[0]][array[1]]
			}
		},
		useSearch(prop) {
			if (prop.no_editar_una_vez_creado_el_modelo) {
				if (this.model.id) {
					return false 
				}
			} 
			return prop.type == 'search'
		},
		removeModel(prop, model) {
			let index = this.model[prop.key].findIndex(_model => {
				return _model.id == model.id 
			})
			this.model[prop.key].splice(index, 1)
			this.check_relations_filtered(prop, model)
		},
		check_relations_filtered(prop, deleted_model) {
			let relations_filtered = this.$store.state[this.model_name].relations_filtered
			if (typeof relations_filtered != 'undefined') {
				let relation_filtered = relations_filtered.find(relation => {
					return relation == prop.key 
				})
				if (typeof relation_filtered != 'undefined') {
					deleted_model.relation = prop.key
					this.$store.commit(this.model_name+'/addDeletedModelsFromRelationFiltered', deleted_model)
				}
			}
		},
		propsToShowInBelongsToMany(prop) {
			let props = []
			if (prop.belongs_to_many.props_to_show) {
				props = props.concat(prop.belongs_to_many.props_to_show)
			} else {
				if (prop.store) {
					props = this.modelPropertiesFromName(prop.store)
				} else {
					props = this.modelPropertiesFromName(prop.belongs_to_many.model_name)
				}
			}
			if (prop.belongs_to_many.properties_to_set) {
				prop.belongs_to_many.properties_to_set.forEach(prop_to_set => {
					props.push({
						...prop_to_set,
						is_pivot_prop: true,
					})
				})
			}
			return props
		},
		clear(prop) {
			this.model[prop.key] = prop.value 
			if (this.isRelationKey(prop)) {
				this.model[this.modelNameFromRelationKey(prop, false, false)] = null
			}
		},
		setChange(prop) {
			this.$nextTick(() => {
				if (prop.on_change) {
					this[prop.on_change](prop, this.model)
				}
				if (this.model[prop.key] == -10) {
					this.create(this.modelNameFromRelationKey(prop))
				}
				// this.$set(this.model, prop.key, this.model[prop.key])
			})
		},
		setPivotProps(prop) {
			if (this.model[prop.key] && this.model[prop.key] != 0) {
				prop.properties_to_set_on_change.forEach(prop_to_set => {
					if (prop_to_set.relation_to_set) {
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
			this.$store.commit(prop.store+'/setModel', {model: null, properties: properties})
			this.$bvModal.show(this.routeString(this.modelNameFromRelationKey(prop)))
		},
		setSelected(result) {

			let prop = result.prop

			if (prop.toast_function) {
				this[prop.toast_function](result)
			}

			if (prop.belongs_to_many) {
				let model_to_add = result.model 
				if (this.checkBelongsToManyExist(prop, model_to_add, result)) {

					this.setBelongsToManyPivotProps(prop, model_to_add, result)

				}
			} else if (prop.has_many && prop.has_many.models_from_parent_prop) {
				this.model[prop.key].unshift(result.model)
				this.setModel(this.model, this.model_name, [], false)
			} else if (prop.set_model_on_click_or_prop_with_query_if_null) {
				if (result.model) {
					this.setModel(result.model, this.model_name, [], false)
				} else {
					this.model[prop.key] = result.query 
					this.setModel(this.model, this.model_name, [], false)
				}
			} else {
				this.$set(this.model, result.prop.key, result.model.id)
				this.$set(this.model, this.modelNameFromRelationKey(result.prop), result.model)

				this.setModel(this.model, this.model_name, [], false)
			}
		},
		checkBelongsToManyExist(prop, model_to_add) {
			console.log('checkBelongsToManyExist')
			console.log(this.model)
			if (
				typeof prop.belongs_to_many.check_ya_esta_agregado == 'undefined'
				|| prop.belongs_to_many.check_ya_esta_agregado
			) {
				
				let finded = this.model[prop.key].find(model => {
					return model.id == model_to_add.id 
				})
				if (typeof finded != 'undefined') {
					this.$toast.error('El articulo YA HABIA SIDO AGREGADO')
					return false
				}
			}
			return true
		},
		setBelongsToManyPivotProps(prop, model_to_add, result) {
			if (prop.belongs_to_many.properties_to_set) {
				model_to_add.pivot = {}
				prop.belongs_to_many.properties_to_set.forEach(prop_to_set => {
					if (prop_to_set.set_with_function) {
						model_to_add.pivot[prop_to_set.key] = this[prop_to_set.set_with_function](this.model, model_to_add)
					} else if (prop_to_set.from_store) {
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
			console.log('*********************')
			console.log('asi estaba antes de agregar '+prop.key)
			console.log(this.model)

			this.model[prop.key].push(model_to_add)
			// this.$set(this.model, prop.key, this.model[prop.key])

			this.setTableFocus(prop, model_to_add)

			this.$store.commit(this.model_name+'/setModel', {
				model: {
					...this.model
				},
				properties: []
			})

			console.log('asi quedo despues de agregar '+prop.key)
			console.log(this.model)
			console.log('*********************')

		},
		setTableFocus(prop, model_to_add) {
			if (prop.belongs_to_many.properties_to_set && prop.belongs_to_many.properties_to_set.length) {
				setTimeout(() => {
					let class_name = prop.belongs_to_many.model_name+'-'+prop.belongs_to_many.properties_to_set[0].key+'-'+model_to_add.id
					let elements = document.getElementsByClassName(class_name) 
					if (elements.length) {
						elements[elements.length-1].focus()
					}
				}, 300)
			}
		},
		clickEnter(prop) {
			if (prop.use_to_check_if_is_repeat) {
				this.checkIsRepeat(prop)
			} else {
				this.$emit('save', {close: true})
				// this.$emit('save')
			}
		},
		async checkIsRepeat(prop) {
		    if (prop.use_to_check_if_is_repeat) {
		        let finded = undefined;

		        if (prop.chequear_buscando_desde_api) {
		            // Construir los filtros
		            let filters = [
		                {
		                    type: 'text',
		                    igual_que: this.model[prop.key].toLowerCase(),
		                    key: prop.key
		                }
		            ];

		            // Mostrar mensaje y activar loading
		            this.$store.commit('auth/setMessage', 'Chequeando ' + prop.text);
		            this.$store.commit('auth/setLoading', true);

		            try {
		                // Llamada a la API y esperar la respuesta
		                const res = await this.$api.post('search/' + this.model_name, {
		                    filters
		                });

		                this.$store.commit('auth/setLoading', false);

		                let models = res.data.models;
		                if (models.length) {
		                    console.log('Hay finded:');
		                    finded = models[0];
		                    console.log(models[0]);
		                }
		            } catch (err) {
		                this.$store.commit('auth/setLoading', false);
		                this.$toast.error('Error al chequear ' + prop.text);
		                console.log(err);
		            }
		        } else {
		            // Buscar localmente
		            finded = this.modelsStoreFromName(this.model_name).find(model => {
		                return model[prop.key] && model[prop.key].toLowerCase() == this.model[prop.key].toLowerCase();
		            });
		        }

		        console.log('finded:');
		        console.log(finded);

		        // Validar si se encontró un modelo repetido
		        if (typeof finded != 'undefined' && (!this.model.id || this.model.id != finded.id)) {
		            this.$toast.warning('Ya hay un ' + this.singular(this.model_name) + ' con este ' + this.propText(prop));
		            this.setModel(finded, this.model_name, [], false);
		        } else {
		        	this.foco_input_siguiente(prop)
		        }
		    }
		},
		foco_input_siguiente(prop) {
			console.log('foco_input_siguiente')
			let index = this.properties.findIndex(_prop => {
				return _prop.key == prop.key
			})
			console.log('index: '+index)
			if (index != -1) {

				let prop_siguiente = this.properties[index+1]
				console.log('prop_siguiente: '+prop_siguiente.key)
				let input = document.getElementById(this.model_name+'-'+prop_siguiente.key)
				console.log('input: ')
				console.log(input)
				if (input) {
					setTimeout(() => {
						input.focus()
					}, 200)
				} 
			}
		}

	},
	
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.model-form 
	[class^='col-']
		padding-bottom: 7px
		margin-bottom: 45px

		padding-left: 20px !important
		padding-right: 20px !important
		// @if ($theme == 'dark')
		// 	border-bottom: 1px solid rgba(255,255,255,.2)
		// @else
		// 	border-bottom: 1px solid rgba(0,0,0,.1)
		&:nth-last-child(-n+2)
			border-bottom: none
	.custom-radio 
		margin-bottom: 1em 
		p 
			margin-bottom: 0
			text-align: left
	label 
		text-align: left
		width: 100%


	/* Estilos generales para labels de formularios */
	.form-label 
		font-weight: 600 /* un poco más grueso que normal */
		color: #333 /* color primario para resaltar */
		font-size: 1rem
		margin-bottom: 6px
		display: inline-block
		letter-spacing: 0.3px
		transition: color 0.2s ease

	// input, select
	// 	border-radius: 5px
	// 	border: 2px solid #ced4da /* un poco más grueso que el default */

	// input:focus, select:focus 
	// 	// border: 4px solid red !important
		
	// 	border: 3px solid #007bff  /* azul primario */
	// 	box-shadow: 0 0 8px rgba(0, 123, 255, 0.8) /* halo azul brillante */
	// 	outline: none /* quitar borde por defecto del navegador */
	// 	background-color: #f8fbff /* leve fondo para resaltar */


	



	.form-group
		margin-bottom: 0 !important
	hr 
		width: 100%
		@if ($theme == 'dark')
			border-top: 1px solid red !important 
	.function-value
		// font-size: 1.5em
		font-weight: bold
		margin-left: 25px
</style>
