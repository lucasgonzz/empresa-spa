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
		cant_models_to_show() {
			if (typeof process.env.VUE_APP_CANT_MODELS_TO_SHOW != 'undefined') {
				return process.env.VUE_APP_CANT_MODELS_TO_SHOW
			}
			return 40
		},
		is_mobile() {
			if (this.$vssWidth < '992') {
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
			if (from_table && prop.table_text) {
				return prop.table_text
			}
			if (prop.text) {
				text = prop.text 
			} else {
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
			// if (this.input_full_width || this.useSearch(prop) || prop.has_many || (prop.belongs_to_many && prop.belongs_to_many.can_not_modify) || prop.type == 'image' || prop.type == 'images') {
			if (this.inputs_full_size || input_full_width || prop.has_many || prop.belongs_to_many || prop.type == 'images') {
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
		loadModel(model_name, id) {
			this.$api.get(model_name+'/'+id)
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
			return require('@/models/'+model_name).default.plural_model_name_spanish
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
				let relationship = this.modelNameFromRelationKey(prop, false, false)
				let prop_name = 'name'
				if (prop.relation_prop_name) {
					prop_name = prop.relation_prop_name
				} else if (this.idiom == 'es') {
					prop_name = 'nombre'
				}
				if (model[prop.key]) {
					if (prop.use_store_models) {
						let finded_model = this.$store.state[relationship].models.find(_model => {
							return _model.id == model[prop.key]
						})
						if (typeof finded_model != 'undefined') {
							return finded_model[prop_name]	
						}
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
				return this.date(model[prop.key] )
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
			if (model[array[0]] && array[1]) {
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
					return this.canProp(prop) && (typeof prop.not_show == 'undefined' || prop.is_title)
					// return this.canProp(prop) && prop.type != 'search' && (typeof prop.not_show == 'undefined' || prop.is_title)
				})
			} else {
				return props.filter(prop => {
					return this.canProp(prop) && prop.type != 'search' && (typeof prop.not_show == 'undefined') && !prop.is_title && prop.type != 'image' && prop.type != 'images' 
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
		getOptions(prop, model = null, model_name = null) {
			let store 
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
			options.push({
				value: 0, text: 'Seleccione '+this.propText(prop) 
			})
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
				let text = item[prop_name] 
				if (prop.select_text_to_add) {
					text += prop.select_text_to_add
				}
				if (prop.select_text_prop_to_add) {
					text += item[prop.select_text_prop_to_add]
				}
				options.push({value: item.id, text})
			})
			if (model_name) {
				options.push({
					value: -10,
					text: this.create_spanish(this.modelNameFromRelationKey(prop))
				})
			}
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
		price(p, with_decimals = true) {
			if (p) {
				let price = numeral(p).format('$0,0.00')
				if (with_decimals) {
					return price
				} else {
					if (price.substr(price.length-2, price.length) == '00') {
						return price.substr(0, price.length-3)
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