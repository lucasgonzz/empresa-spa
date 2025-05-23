export default {
	methods: {
		create(model_name, selected_model = null) {
			this.setModel(null, model_name)
			if (selected_model) {
				this.$store.commit(model_name+'/setSelectedModel', selected_model)
			}
		},
		setModel(model, model_name, properties_to_override = [], show_modal = true, show_pre_view = true) {
			if (this.usePreView(model_name) && show_pre_view) {
				this.$store.commit(model_name+'/setModel', {
					model, 
					properties: [],
				})
				this.$bvModal.show(model_name+'-pre-view')
			} else {
				this.$bvModal.hide(model_name+'-pre-view')

				let properties = this.getSelectAndCheckboxProps(model, model_name)
				properties = properties.concat(this.getPivotProperties(model, model_name))
				properties = this.overrideProperties(properties, properties_to_override)
				
				properties = this.funcion_personalizada(properties)

				if (show_modal) {
					this.$store.commit('auth/setMessage', 'Cargando formulario')
					this.$store.commit('auth/setLoading', true)
				}			
				setTimeout(() => {
					this.$store.commit(model_name+'/setModel', {
						model, 
						properties
					})
					if (show_modal) {
						this.$bvModal.show(model_name)
						setTimeout(() => {
							this.$store.commit('auth/setLoading', false)
							this.$store.commit('auth/setMessage', '')
						}, 30)
					}
				}, 30)
			}
		},
		funcion_personalizada(properties) {
			console.log('funcion_personalizada props:')
			console.log(properties)
			
			return properties.map(prop => {
				if (prop.funcion_personalizada) {
					return this[prop.funcion_personalizada](prop)
				}
				return prop
			})
		},
		getSelectAndCheckboxProps(model, model_name) {
			let properties = []
			if (!model) {
				this.modelPropertiesFromName(model_name).forEach(prop => {
					if (prop.type == 'select' && !prop.value) {
						properties.push({
							...prop,
							value: 0,
						})
					} else if (prop.type == 'checkbox' && !prop.value && !prop.belongs_to_many) {
						properties.push({
							...prop,
							value: 0,
						})
					}
				})
			}
			return properties 
		},
		overrideProperties(properties, properties_to_override) {
			let index  
			properties_to_override.forEach(prop_to_override => {
				index = properties.findIndex(prop => {
					return prop.key == prop_to_override.key 
				}) 
				if (index != -1) {
					properties.splice(index, 1, prop_to_override)
				} else {
					properties.push(prop_to_override)
				}
			})
			return properties
		},
		getPivotProperties(model, model_name) {
			let properties_to_add = []
			this.modelPropertiesFromName(model_name).forEach(prop => {
				if (prop.belongs_to_many && !prop.belongs_to_many.related_with_all && prop.type != 'checkbox') {
					if (!model) {
						properties_to_add.push({
							key: prop.key,
							value: [],
						})
					}
				} else if (prop.belongs_to_many && prop.type == 'checkbox') {
					if (!model) {

						// Esta de abajo no se si deberia ir
						// properties_to_add.push({
						// 	key: prop.key+'_id',
						// 	value: []
						// })


						properties_to_add.push({
							key: prop.key,
							value: []
						})
					} else {
						let ids_to_add = []
						model[prop.key].forEach(relation => {
							ids_to_add.push(relation.id)
						})
						model[prop.key+'_id'] = ids_to_add
					}
				} else if (prop.has_many) {
					if (!model) {
						properties_to_add.push({
							key: prop.key,
							value: [],
						})
					}
				} else if (prop.belongs_to_many && prop.belongs_to_many.related_with_all) {
					if (!model) {
						let all_models_for_relation = this.modelsStoreFromName(prop.store)
						let propertye_to_add = {
							key: prop.key,
							funcion_personalizada: prop.funcion_personalizada,
							value: [], 
						}
						all_models_for_relation.forEach(model_to_relation => {
							propertye_to_add.value.push(this.getRelationToAdd(model, prop, model_to_relation))
						})
						properties_to_add.push(propertye_to_add)
					}
				} else if (prop.type == 'images') {
					if (!model) {
						let propertye_to_add = {
							key: prop.key,
							value: [], 
						}
						properties_to_add.push(propertye_to_add)
					}
				}
			})
			// properties_to_add.forEach(prop => {
			// })
			return properties_to_add
		},
		getRelationToAdd(model, prop, model_to_relation) {
			let model_relation_to_add = {
				...model_to_relation,
			}
			if (model && model[prop.key]) {
				let pivot_to_set = model[prop.key].find(r => {
					return r.id == model_to_relation.id 
				})
				if (typeof pivot_to_set != 'undefined') {
					model_relation_to_add.pivot = pivot_to_set.pivot
				} else {
					this.setPivot(prop, model, model_relation_to_add, model_to_relation)
				}
			} else {
				this.setPivot(prop, model, model_relation_to_add, model_to_relation)
			}
			return model_relation_to_add
		},
		setPivot(prop, model, model_relation_to_add, model_to_relation) {
			let finded = undefined
			if (model) {
				finded = model_to_relation[prop.belongs_to_many.relations_with].find(_model => {
					return _model.id == model[prop.belongs_to_many.related_by]
				})
			}
			model_relation_to_add.pivot = {}
			if (typeof finded != 'undefined') {
				prop.belongs_to_many.properties_to_set.forEach(prop_to_set => {
					if (finded.pivot[prop_to_set.key]) {
						model_relation_to_add.pivot[prop_to_set.key] = finded.pivot[prop_to_set.key]
					} else {
						model_relation_to_add.pivot[prop_to_set.key] = prop_to_set.value
					}
				})
				model_relation_to_add.pivot = finded.pivot
			} else {
				prop.belongs_to_many.properties_to_set.forEach(prop_to_set => {
					model_relation_to_add.pivot[prop_to_set.key] = prop_to_set.value
				})
			}
		},
	}
}