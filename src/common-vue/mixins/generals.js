import moment from 'moment'
moment.locale('es')
import numeral from 'numeral'
import VueScreenSize from 'vue-screen-size'
export default {
	mixins: [VueScreenSize.VueScreenSizeMixin],
	computed: {
		user() {
			return this.$store.state.auth.user
		},
		authenticated() {
			return this.$store.state.auth.authenticated
		},
		is_owner() {
			return this.user && !this.user.owner_id
		},
		is_admin() {
			return this.user && (this.is_owner || this.user.admin_access)
		},
        owner_id() {
        	if (this.user.owner_id) {
        		return this.user.owner_id
        	}
        	return this.user.id
        },
        owner() {
        	if (this.is_owner) {
        		return this.user 
        	}
        	return this.user.owner
        },
		view() {
			return this.$route.params.view
		},
		sub_view() {
			return this.$route.params.sub_view
		},
        today() {
        	return moment().format('YYYY-MM-DD')
        },
        route_name() {
            return this.$route.name
        },
        testing_dusk() {
            return process.env.VUE_APP_TESTING_DUSK
        },
        idiom() {
            return process.env.VUE_APP_IDIOM
        },
        app_name() {
            return process.env.VUE_APP_APP_NAME
        },
        attempt_prop() {
            return process.env.VUE_APP_ATTEMPT_PROP
        },
        attempt_text() {
            return process.env.VUE_APP_ATTEMPT_TEXT
        },
		is_local() {
			return process.env.VUE_APP_API_URL.substring(process.env.VUE_APP_API_URL.length-5) == ':8000'
		},
		route_index() {
            return process.env.VUE_APP_ROUTE_INDEX
		},
		route_to_redirect_if_unauthenticated() {
            return process.env.VUE_APP_ROUTE_TO_REDIRECT_IF_UNAUTHENTICATED
		},
		inputs_full_size() {
            return typeof process.env.VUE_APP_INPUTS_FULL_SIZE != 'undefined' && process.env.VUE_APP_INPUTS_FULL_SIZE
		},
		aspect_ratio_disabled() {
            return typeof process.env.VUE_APP_ASPECT_RATIO_DISABLED != 'undefined' && process.env.VUE_APP_ASPECT_RATIO_DISABLED
		},
		theme_dark() {
            return typeof process.env.VUE_APP_THEME_DARK != 'undefined' && process.env.VUE_APP_THEME_DARK
		},
		app_theme() {
			if (typeof process.env.VUE_APP_APP_THEME != 'undefined') {
				return process.env.VUE_APP_APP_THEME
			}
			return 'light'
		},
		image_url_prop_name() {
			if (process.env.VUE_APP_IMAGE_URL_PROP_NAME) {
				return process.env.VUE_APP_IMAGE_URL_PROP_NAME
			}
			return 'image_url'
		},
		custom_configuration_page() {
			if (typeof process.env.VUE_APP_CUSTOM_CONFIGURATION_PAGE != 'undefined' && process.env.VUE_APP_CUSTOM_CONFIGURATION_PAGE) {
				return true
			}
			return false
		},
		use_home_page() {
			if (typeof process.env.VUE_APP_USE_HOME_PAGE != 'undefined' && process.env.VUE_APP_USE_HOME_PAGE) {
				return true
			}
			return false
		},
		use_help_dropdown() {
			if (typeof process.env.VUE_APP_USE_HELP_DROPDOWN != 'undefined' && process.env.VUE_APP_USE_HELP_DROPDOWN) {
				return true
			}
			return false
		},
		has_extra_config() {
			if (typeof process.env.VUE_APP_HAS_EXTRA_CONFIG != 'undefined' && process.env.VUE_APP_HAS_EXTRA_CONFIG) {
				return true
			}
			return false
		},
		user_last_activity_minutes() {
			if (typeof process.env.VUE_APP_USER_LAST_ACTIVITY_MINUTES != 'undefined') {
				return process.env.VUE_APP_USER_LAST_ACTIVITY_MINUTES
			}
			return false
		},
		// cant_models_to_show() {
		// 	if (typeof process.env.VUE_APP_CANT_MODELS_TO_SHOW != 'undefined') {
		// 		return process.env.VUE_APP_CANT_MODELS_TO_SHOW
		// 	}
		// 	return 40
		// },
		is_mobile() {
			if (this.$vssWidth < '700') {
				return true
			}
			return false
		},
		extra_config() {
			if (this.has_extra_config) {
				return require('@/mixins/extra_config').default
			}
		},  
	},
	methods: {
		html_text(text) {
			return text.replace(/\n/g, '<br>');
		},
		get_models_by_id(model_name, models_id) {

			let models = []

			models_id.forEach(model_id => {
				let store_model = this.$store.state[model_name].models.find(model => {
					return model.id == model_id
				})
				if (typeof store_model != 'undefined') {
					models.push(store_model)
				}
			})

			return models
		},
		show_model(model_name, model_id) {
            this.$store.commit('auth/setMessage', 'Cargando '+this.singular(model_name))
            this.$store.commit('auth/setLoading', true)
            this.$api.get(this.routeString(model_name)+'/'+model_id)
            .then(res => {
                this.setModel(res.data.model, model_name)
            })
            .catch(err => {
                console.log(err)
            })
		},
		get_properties_to_show(model_name) {
			let props = require(`@/models/${model_name}`).default.properties

			props = this.check_extencions(props)

			return props
		},
		get_properties_to_show_ordenadas(model_name) {

			let props = this.$store.state[model_name].props_to_show

			if (typeof props == 'undefined') {
				props = require(`@/models/${model_name}`).default.properties

			}

			props = this.check_extencions(props)

			let props_ordenadas = props.filter(prop => prop.table_position)
			if (props_ordenadas.length) {
				return props_ordenadas.sort((a, b) => a.table_position - b.table_position)
			} 
			return props
		},
		check_extencions(props) {
			let props_result = []

			props.forEach(prop => {

				if (prop.if_has_extencion) {

					if (this.hasExtencion(prop.if_has_extencion)) {

						props_result.push(prop)
					}

				} else if (prop.if_has_not_extencions) {

					if (this.check_has_not_extencions(prop)) {
						props_result.push(prop)
					}

				} else {
					props_result.push(prop)
				}
			})

			return props_result
		},	
		store_use_from_dates(model_name) { 
			model_name = model_name.toLowerCase()
			let from_dates = this.$store.state[model_name].from_dates

			if (typeof from_dates == 'undefined' || !from_dates) {
				return false
			}
			return true
		},
		get_from_date(model_name) {
			model_name = model_name.toLowerCase()
			let date = this.$store.state[model_name].from_date

			console.log('from_date de '+model_name+': '+date)

			return moment(date).format('YYYY-MM-DD')
		},
		get_table_prop_slot_name(prop) {
			return 'table-prop-'+prop.key
		},
		prop_to_show_in_modal_title(model_name) {
			let prop_to_show_in_modal_title = require('@/models/'+model_name).default.prop_to_show_in_modal_title
			return typeof prop_to_show_in_modal_title != 'undefined' ? prop_to_show_in_modal_title : null
		},
		checkButton(prop, model) {
			return (prop.type == 'radio') && model[prop.key] != prop.value
		},
		getLabel(prop) {
			return this.capitalize(this.propText(prop))
		},
		usePreView(model_name) {
			return typeof require('@/models/'+model_name).default.pre_view != 'undefined'
		},
		form_disabled_to_edit(model_name) {
			return typeof require('@/models/'+model_name).default.form_disabled_to_edit != 'undefined'
		},
		form_disabled_to_edit_function(model_name) {
			return typeof require('@/models/'+model_name).default.form_disabled_to_edit_function != 'undefined'
		},
		getOriginalModel(model_name, model){
			return this.$store.state[model_name].models.find(model_ => {
				return model_.id == model.id 
			}) 
		},
		get_store_model(model_name, id){
			return this.$store.state[model_name].models.find(model_ => {
				return model_.id == id 
			}) 
		},
		removeRelationFiltered(model_name, model, nombre_relacion) {


			// original_model tiene la relacion como estaba un un principio
			let original_model = this.getOriginalModel(model_name, model)

			// Se guardan las relaciones ya filtradas
			let modelos_filtrados = model[nombre_relacion]

			// Aca se setea la relacion del modelo a como estaba en un principio
			model[nombre_relacion] = original_model[nombre_relacion]




			modelos_filtrados.forEach(modelo_filtrado => {
				let index = model[nombre_relacion].findIndex(modelo_original => {
					return modelo_original.id == modelo_filtrado.id 
				})
				
				if (index != -1) {
					/* 
						Aca se actauliza el modelo de la relacion con los datos del modelo filtrado
						En caso de que cuando se filtro se le alla cambiado alguna propiedad,
					 	Entonces se reemplaza en la relacion original
					 */
					if (modelo_filtrado.name) {
					}
					model[nombre_relacion].splice(index, 1, modelo_filtrado)
				} else {
					if (modelo_filtrado.name) {
					}
					model[nombre_relacion].splice(index, 1)
				}
			})

			this.quitar_modelos_eliminados_de_las_relaciones_filtradas(model_name, model)

			this.setModel(model, model_name, [], false)
			this.$store.commit(model_name+'/removeRelationFiltered', nombre_relacion)
		},


		// Aca se ve si hay modelos eliminados en los resultados de busqueda dentro de la relacion, 
		// y si los hay los elimina de la relacion original del modelo
		quitar_modelos_eliminados_de_las_relaciones_filtradas(model_name, model) {
			let deleted_models = this.$store.state[model_name].deleted_models_from_relations_filtered
			if (typeof deleted_models != 'undefined') {
				deleted_models.forEach(deleted_model => {
					let index = model[deleted_model.relation].findIndex(relation_model => {
						return relation_model.id == deleted_model.id 
					})
					if (index != -1) {
						model[deleted_model.relation].splice(index, 1)
						if (typeof model[deleted_model.relation][index] != 'undefined') {
						}
					}
				})
			}
		},
		show_all_models_on_display(model_name) {
			let show_all_models_on_display = require('@/models/'+model_name).default.show_all_models_on_display
			if (typeof show_all_models_on_display != 'undefined' && !show_all_models_on_display) {
				return false 
			}
			return true
		},
		hasFullReactivity(model_name) {
			return typeof require('@/models/'+model_name).default.full_reactivity != 'undefined'
		},
		hasColor(model_name) {
			return typeof require('@/models/'+model_name).default.color_display_function != 'undefined'
		},
		downloadOnMobile(model_name) {
			return typeof this.$store.state[model_name].not_download_on_mobile == 'undefined' || !this.$store.state[model_name].not_download_on_mobile
		},
		getInputSize(prop) {
			let _class = 'input-'
			if (prop.size) {
				if (prop.size == 'sm') {
					_class += 'sm'
				} else if (prop.size == 'md') {
					_class += 'md'
				} else if (prop.size == 'lg') {
					_class += 'lg'
				}
			} else {
				_class += 'md'
			}
			return _class
		},
		propType(prop, model) {
			if (prop.type_if) {
				let array = prop.type_if.condition.split('.')
				let prop_to_check
				let model_prop = array[0]
				let sub_prop = null
				if (array[1]) {
					sub_prop = array[1]
				}
				
				if (sub_prop) {
					prop_to_check = model[model_prop][sub_prop]
				} else {
					prop_to_check = model[model_prop]
				}
				let result 
				if (prop_to_check) {
					prop_to_check = prop_to_check.toLowerCase()
				}
				if (prop.type_if.operator == '=') {
					result = prop_to_check == prop.type_if.value
				} else if (prop.type_if.operator == '<') {
					result = prop_to_check < prop.type_if.value
				} else if (prop.type_if.operator == '>') {
					result = prop_to_check > prop.type_if.value
				} else if (prop.type_if.operator == '!=') {
					result = prop_to_check != prop.type_if.value
				}
				if (result) {
					return prop.type_if.then
				} else {
					return prop.type_if.else
				}
			}
			return prop.type 
		},
		getBarCodeProp(model_name) {
			let prop = this.modelPropertiesFromName(model_name).find(_prop => {
				return _prop.use_bar_code_scanner
			})
			if (typeof prop != 'undefined') {
				return prop 
			}
			return null
		},
		callMethod(prop, item) {
			if (prop.commit) {
				this.$store.commit(prop.commit, item)
			}
			if (prop.modal) {
				this.$bvModal.show(prop.modal)
			}
			if (prop.button && prop.button.emit) {
				this.$emit(prop.button.emit, item)
			}
			if (prop.button && prop.button.function) {
				this.getFunctionValue(prop.button, item)
			}
		},
		getModelFromId(model_name, model_id) {
			let model = this.modelsStoreFromName(model_name).find(model => {
				return model.id == model_id
			})
			if (typeof model != 'undefined') {
				return model 
			}
			return null
		},
		getImageUploadUrl(prop) {
			let url = process.env.VUE_APP_API_URL+'/api/set-image/'
			if (prop.type == 'images') {
				url += 'has_many'
			} else {
				url += prop.key 
			}
			return url
		},
        scrollBottom(el) {
            setTimeout(() => {
                let container = document.getElementById(el)
                if (container) {
                    container.scrollTop = container.scrollHeight
                }
            }, 200)
        },
		propertiesToUpdate(model_name) {
			let props = this.modelPropertiesFromName(model_name).filter(prop => {
				return prop.use_to_update 
			})
			if (props.length) {
				return props
			}
			return this.modelPropertiesFromName(model_name)
		},
		propText(prop, capitalize = true, from_table = false) {
			let text 

			if (
				prop.key == 'table_right_options'
				|| prop.key == 'table_left_options'
			) {
				return '&nbsp'
			}

			if (from_table && prop.table_text) {
				return prop.table_text
			}
			if (prop.text) {
				text = prop.text 
			} else if (prop.key) {
				text = prop.key.replaceAll('_', ' ')
			}
			if (capitalize) {
				return this.capitalize(text) 
			}
			return text 
		},
		saveIfNotExist(prop) {
			if (prop.save_if_not_exist == false) {
				return false 
			}
			return true
		},
		autoSelect(prop) {
			if (prop.auto_select == false) {
				return false 
			}
			return true
		},
		clearQuery(prop) {
			if (prop.clear_query == false) {
				return false  
			}
			return true
		},
		getCol(prop, size, input_full_width = false) {
			if (prop.group_title || this.inputs_full_size || input_full_width || prop.has_many || prop.belongs_to_many || prop.type == 'images' || prop.input_full_width) {
				return 12
			} 
			return size
		},
		marginBtn(model_name) {
			if (this.$store.state[model_name].display == 'cards') {
				return 'm-l-15 m-r-15 m-b-15'
			}
			return 'm-l-10'
		},
		getBorderColorProperty(model_name) {
			let prop = this.modelPropertiesFromName(model_name).find(prop => {
				return prop.use_to_set_border_color
			})
			if (typeof prop != 'undefined') {
				return prop 
			}
			return null
		},
		loadModel(model_name, id, param_url = '/') {
			return this.$api.get(this.routeString(model_name)+param_url+id)
			.then(res => {
				this.$store.commit(model_name+'/add', res.data.model)
				this.$toast.success(this.singular(model_name)+' actualizado')
			})
			.catch(err => {
				console.log(err)
			})
		},
		addModel(model_name, model) {
			this.$store.commit(model_name+'/add', model)
			// this.$store.commit(model_name+'/setToShow')
		},
		plural(model_name) {
			return require('@/models/'+model_name+'.js').default.plural_model_name_spanish
		},
		singular(model_name) {
			return require('@/models/'+model_name).default.singular_model_name_spanish
		},
		create_spanish(model_name) {
			let text = require('@/models/'+model_name).default.create_model_name_spanish
			if (text.split(' ').length == 1) {
				return text + ' ' + this.singular(model_name).toLowerCase()
			}
			return text
		},
		text_delete(model_name) {
			return require('@/models/'+model_name).default.text_delete
		},

		// --------------------------------- Model ---------------------------------

		showProperty(property, model, check_if_is_empty, check_show_on_form = false) {
			if (property.v_if_function) {
				return this[property.v_if_function](property, model)
			}
			if (check_show_on_form && property.not_show_on_form) {
				return false
			}
			if (property.show_only_if_is_created && !model.id) {
				return false
			}
			if (check_if_is_empty && ((!model[property.key] || model[property.key] == '') && !property.function )) {
				return false
			}
			if (property.is_image || property.is_images) {
				return false
			}
			if (property.if_has_extencion) {
				return this.hasExtencion(property.if_has_extencion)
			}
			if (property.if_has_not_extencion) {
				return this.check_has_not_extencions(property)
			}

			if (property.v_if_prop_not_length) {
				return !model[property.v_if_prop_not_length].length
			}
			if (property.v_if_prop_length) {
				return model[property.v_if_prop_length].length
			}
			if (property.v_if) {
				let array = property.v_if[0].split('.')
				let prop_to_check
				let prop = array[0]
				let sub_prop = null
				if (array[1]) {
					sub_prop = array[1]
				}
				if (property.v_if_not_check_if_null || model[prop] || property.v_if_from_models_store) {
					// if (sub_prop && model[prop][sub_prop]) {
					if (property.v_if_from_models_store) {
						if (sub_prop) {
							let model_from_store = this.getModelFromId(prop, model[prop+'_id'])
							if (model_from_store) {
								prop_to_check =  model_from_store[sub_prop]
							}
						} 
					} else {
						if (sub_prop) {
							prop_to_check = model[prop][sub_prop]
						} else {
							prop_to_check = model[prop]
						}
					} 
					if (typeof prop_to_check == 'String') {
						prop_to_check = prop_to_check.toLowerCase()
					}
					if (property.v_if[1] == '=') {
						return prop_to_check == property.v_if[2] 
					} else if (property.v_if[1] == '<') {
						return prop_to_check < property.v_if[2]
					} else if (property.v_if[1] == '>') {
						return prop_to_check > property.v_if[2]
					} else if (property.v_if[1] == '!=') {
						return prop_to_check != property.v_if[2]
					}
				} else {
					return false
				}
			}
			return true 
		},
		check_has_not_extencions(prop) {
			let ok = true

			prop.if_has_not_extencions.forEach(extencion => {

				if (this.hasExtencion(extencion)) {

					ok = false
				}
			})

			return ok 
		},
		propToFilter(model_name) {
			let prop = this.modelPropertiesFromName(model_name).find(prop => {
				return prop.use_in_search_modal
			})
			if (typeof prop != 'undefined') {
				return prop
			} else {
				if (this.idiom == 'en') {
					return {
						key: 'name',
						text: 'Nombre',
					}
				} else if (this.idiom == 'es') {
					return {
						key: 'nombre',
						text: 'Nombre',
					}
				}
			}
		},
		propsToShowInSearchModal(model_name) {
			let props = this.modelPropertiesFromName(model_name)
			let to_show = props.filter(prop => {
				return prop.use_to_show_in_search_modal
			})
			if (to_show.length) {
				return to_show
			}
			return props
		},
		propsToFilterInModal(model_name) {
			let props = this.modelPropertiesFromName(model_name)
			let to_filter = props.filter(prop => {
				return prop.filter_modal_position
			})
			if (to_filter.length) {
				return to_filter.sort((a, b) => {
					return a.filter_modal_position - b.filter_modal_position
				})
			}
			return props
		},
		modelsToSearch(prop, model) {
			let store 
			if (prop.store) {
				store = prop.store
			} else {
				store = this.modelNameFromRelationKey(prop)
			}
			let models = this.$store.state[store].models 
			if (prop.combine_with) {
				let models_to_combine = this.$store.state[prop.combine_with.store][prop.combine_with.prop]
				models = models.concat(models_to_combine)
			}
			if (prop.belongs_to) {
				return models.filter(_model => {
					return _model[prop.belongs_to+'_id'] == model[prop.belongs_to+'_id'] 
				})
			}
			return models 
		},
		relationshipNameFromKey(key) {
			return key+'_id'
		},
		modelNameFromRelationKey(prop, in_plural = false, from_store = true) {
			let model_name
			if (prop.store && from_store) {
				model_name = prop.store
			} else {
				model_name = prop.key.substring(0, prop.key.length-3)
			}
			if (in_plural) {
				return this.modelPlural(model_name)
			} 
			return model_name 
		},
		modelPropertiesFromRelationKey(prop) {
			if (prop.store) {
				return require('@/models/'+prop.store).default.properties
			} 
			return require('@/models/'+this.modelNameFromRelationKey(prop)).default.properties
		},
		modelPropertiesFromName(model_name) {
			return require('@/models/'+model_name).default.properties
		},
		modelStoreFromName(model_name) {
			return this.$store.state[model_name].model 
		},
		modelsStoreFromName(model_name) {
			return this.$store.state[model_name].models
		},
		propertyText(model, prop, from_pivot = false) {
			// console.log('propertyText para '+prop.key)
			if (prop.type == 'images' || prop.type == 'image') {
				return null
			}
			if (prop.function) {
				let value = this.getFunctionValue(prop, model)
				if (prop.is_price) {
					return this.price(value)
				}
				return value
			}
			if (prop.belongs_to_many) {
				return model[prop.key].length
			}
			if (this.isRelationKey(prop)) {
				// console.log('isRelationKey')
				let relationship = this.modelNameFromRelationKey(prop, false, true)

				// Creo que me la mande, lo comente porque me daba error al obtener el nombre
				// para la relacion from_address en deposit_movements
				// let relationship = this.modelNameFromRelationKey(prop, false, false)
				let prop_name = 'name'
				if (prop.relation_prop_name) {
					prop_name = prop.relation_prop_name
				} else if (this.idiom == 'es') {
					prop_name = 'nombre'
				}
				// console.log('prop_name: '+prop_name)
				if (model[prop.key]) {
					if (prop.use_store_models) {
						let finded_model = this.$store.state[relationship].models.find(_model => {
							return _model.id == model[prop.key]
						})
						if (typeof finded_model != 'undefined') {
							// console.log('encontro: ')
							// console.log(finded_model)
							return finded_model[prop_name]	
						}
						// console.log('no se encontro la relacion para '+relationship)
						return null
					} else if (model[relationship] && model[relationship][prop_name]) {
						return model[relationship][prop_name] 
					}
					// let _model = this.$store.state[relationship].models.find(model_ => {
					// 	return model_.id == model[prop.key]
					// })
					// return _model[prop_name]
				} else {
					return 'S/A'
				}
			}
			if (from_pivot) {
				model = model.pivot 
			} 
			if (prop.is_boolean) {
				if (model[prop.key]) {
					return 'Si'
				}
				return 'No'
			}
			if (prop.type == 'checkbox') {
				if (model[prop.key]) {
					return 'Si'
				}
				return 'No'
			}
			if (prop.is_date) {
				if (prop.show_full_date) {

					return this.date(model[prop.key], true)
				}
				return this.date(model[prop.key])
			}
			// if (prop.button && prop.button.icon) {
			// 	return '<i class="icon-'+prop.button.icon+'"></i>'
			// } 
			if (prop.is_hour) {
				return this.hour(model[prop.key]) 
			}
			if (prop.is_since) {
				return this.since(model[prop.key] )
			}
			let array = prop.key.split('.')
			if (model && model[array[0]] && array[1]) {
				return model[array[0]][array[1]]
			}
			if (prop.is_price) {
				return this.price(model[prop.key]) 
			}
			if (prop.type == 'search') {
				if (typeof model[prop.key] == 'array') {
					return model[prop.key].length 
				} else if (typeof model[prop.key] == 'object' && model[prop.key]) {
					if (this.idiom == 'es') {
						return model[prop.key].nombre
					} else {
						return model[prop.key].name
					}
				} 
			}
			if (prop.belongs_to_many && typeof model[prop.key] != 'undefined') {
				return model[prop.key].length
			}
			if (prop.has_many) {
				return model[prop.key].length
			} 
			if (prop.key.includes('.')) {
				let array = prop.key.split('.')
				if (model[array[0]]) {
					return model[array[0][1]]
				} else {
					return ''
				}
			}
			return model[prop.key]
			// return model[prop.key].replace(/\n/g, '<br>')
		},
		isRelationKey(prop) {
			let last = ''
			if (prop.key) {
				last = prop.key.substring(prop.key.length-3, prop.key.length)
			}
			return last == '_id'
		},
		propertiesToShow(props, with_title_and_images = true) {
			if (with_title_and_images) {
				return props.filter(prop => {
					return typeof prop.group_title == 'undefined' && this.canProp(prop) && (typeof prop.not_show == 'undefined' || !prop.not_show || prop.is_title)
					// return this.canProp(prop) && prop.type != 'search' && (typeof prop.not_show == 'undefined' || prop.is_title)
				})
			} else {
				return props.filter(prop => {
					return typeof prop.group_title == 'undefined' && this.canProp(prop) && prop.type != 'search' && (typeof prop.not_show == 'undefined') && !prop.is_title && prop.type != 'image' && prop.type != 'images' 
				})
			}
		},
		canProp(prop) {
			return typeof prop.can == 'undefined' || this.can(prop.can)
		},
		modelPlural(model, replace_guion = false) {
			let plural  
			if (model.charAt(model.length-1) == 'y') {
				plural = model.substring(0, model.length-1)+'ies'
			} else if (model.charAt(model.length-1) == 's') {
				plural = model+'es'
			} else {
				plural = model +'s'
			}
			if (replace_guion) {
				plural = plural.replace('-', '_')
			}
			return plural
		},
		getPropToUseInSelect(model_name) {
			let prop = this.modelPropertiesFromName(model_name).find(_prop => {
				return _prop.use_in_select
			})
			if (typeof prop != 'undefined') {
				return prop 
			}
			return null
		},
		getOptions(prop, model = null, model_name = null, add_opcion_0 = true) {
			let store 

			if (prop.get_options_function) {
				return this[prop.get_options_function](prop, model)
			}

			if (prop.store) {
				store = prop.store
			} else {
				store = prop.key.substring(0, prop.key.length-3)
			}
			let models = this.$store.state[store].models
			let prop_name
			let prop_to_use_in_select = this.getPropToUseInSelect(store)
			if (prop_to_use_in_select) {
				prop_name = prop_to_use_in_select.key 
			} else if (this.idiom == 'en') {
				prop_name = 'name'
			} else {
				prop_name = 'nombre'
			}
			if (prop.select_prop_name) {
				prop_name = prop.select_prop_name
			} 

			let options = []

			if (add_opcion_0) {
				options.push({
					value: 0, text: 'Seleccione '+this.propText(prop) 
				})
			}

			if (prop.options_from_selected_model_prop) {
				let selected_model = this.$store.state[model_name].selected_model
				if (selected_model) {
					models = selected_model[prop.options_from_selected_model_prop]
				} else if (prop.options_from_prop) {
					let _model_name = prop.options_from_prop.split('.')[0]
					let _prop = prop.options_from_prop.split('.')[1]
					let _model = this.$store.state[_model_name].models.find(_model => {
						return _model.id == model[_model_name+'_id']
					})
					models = _model[_prop]
				}
			}
			if (prop.depends_on && model) {
				models = models.filter(_model => {
					return _model[prop.depends_on] == model[prop.depends_on]
				})
			} 
			models.forEach(item => {
				let text = '' 
				if (prop.select_start_text_prop_to_add) {
					text += item[prop.select_start_text_prop_to_add] + ' '
				}
				text += item[prop_name]  
				if (prop.select_text_to_add) {
					text += prop.select_text_to_add
				}
				if (prop.select_text_prop_to_add) {
					text += item[prop.select_text_prop_to_add]
				}
				options.push({value: item.id, text})
			})
			// if (model_name) {
			// 	options.push({
			// 		value: -10,
			// 		text: this.create_spanish(this.modelNameFromRelationKey(prop))
			// 	})
			// }
			return options
		},
		booleanOptions(prop, model = null) {
			let options = []
			options.push({
				value: -1, text: 'Seleccione '+this.propText(prop) 
			})
			options.push({value: 1, text: 'Si'})
			options.push({value: 0, text: 'No'})
			return options
		},

		// --------------------------------- Generals ---------------------------------

		replaceGuion(string) {
			return string.replaceAll('-', '_')
		},
		routeString(string, in_plural = false, replace_guion_bajo = true) {
			let result 
			string = ''+string
			if (in_plural) {
				result = this.modelPlural(string.toLowerCase().replaceAll(' ', '-'))
			} else {
				result = string.toLowerCase().replaceAll(' ', '-')
			}
			if (replace_guion_bajo) {
				return result.replaceAll('_', '-')
			}
			return result
		},
		routeToString(route) {
			return route.replaceAll('-', ' ')
		},
		capitalize(str) {
			return str.charAt(0).toUpperCase() + str.slice(1)
		},
		date(d, complete = false) {
			if (d) {
				if (complete) {
					return moment(d).format('DD/MM/YY h:mm:ss')
				}
				return moment(d).format('DD/MM/YY')
			}
			return '-'
		},
		hour(d) {
			return moment(d).format('HH:mm')
		},
		hour_from_time(d) {
			return moment(d, 'HH:mm:ss').format('HH:mm')
		},
		price(p, with_decimals = true, quitar_decimales_solo_si_no_es_00 = true) {
			if (p) {
				let price = numeral(p).format('$0,0.00')
				if (with_decimals) {
					return price
				} else {
					if (!quitar_decimales_solo_si_no_es_00 || price.substr(price.length-2, price.length) == '00') {
						return price.substr(0, price.length-3)
					} else {
						return price 
					}
				}
			}
			return '-'
		},
		getMonth(d) {
			return moment(d).format('MMM')
		},
		getDay(d) {
			return moment(d).format('dd')
		},
		since(date, fisrt_upp = false) {
			if (date) {
				if (fisrt_upp) {
					return this.capitalize(moment(date).fromNow())
				} else {
					return moment(date).fromNow()
				}
			}
			return '-'
		},
	}
}