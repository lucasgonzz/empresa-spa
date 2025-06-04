<template>
	<div
	v-if="model">
	    <confirm
	    @confimed="deleted"
	    :not_show_delete_text="not_show_delete_text"
	    :text="delete_text"
	    :model_name="model_name"
	    :actions="[model_name+'/delete']"
	    :id="'delete-'+model_name"></confirm>

		<b-modal
		@hidden="onModalClosed"
		:size="size"
		scrollable
		:id="model_name">

			<template #modal-title>
				<slot name="model_modal_title">
					{{ title }}
				</slot>
			</template>
			
			<slot 
			name="model_modal_header"
			:model="model"></slot>

			<model-form
			@save="save"
			:show_btn_remove_belongs_to_many="show_btn_remove_belongs_to_many"
			:has_many_parent_model="has_many_parent_model"
			:has_many_parent_model_name="has_many_parent_model_name"
			:has_many_prop="has_many_prop"
			:model="model"
			:model_name="model_name"
			:properties="properties"
			:actions_after_save="actions_after_save"
			:show_btn_delete="show_btn_delete"
			:check_permissions="check_permissions"
			:check_can_delete="check_can_delete">
				<template v-slot:belongs="slotProps">
					<slot name="belongs" :model="slotProps.model"></slot>
				</template> 
				<template v-slot:default="slotProps">
					<slot :model="slotProps.model"></slot>

	    			<btn-pdf
	    			v-if="show_btn_pdf"
	    			:model_name="model_name"
	    			:model="slotProps.model"></btn-pdf>

				</template>

				<template
				v-for="prop in properties"
				v-slot:[prop.key]="props">
					<slot :name="prop.key" :model="props.model"></slot>
				</template>

			</model-form>

			<div
			v-if="show_limpiar_formulario">
				<b-form-checkbox
				:value="1"
				:uncheked-value="0"
				v-model="clear_model">
					Limpiar formulario
				</b-form-checkbox>
				<div
				class="p-l-20"
				v-if="!clear_model">
					<h5
					class="m-t-15">
						Se mantendran las siguientes propiedades:
					</h5>
					<p
					class="m-b-0"
					v-for="prop in props_to_keep_after_create">
						{{ prop.text }}
					</p>
				</div>
			</div>

			<template v-slot:modal-footer>
				<slot 
				v-if="!from_has_many"
				name="buttons">
					<b-btn-group
					class="w-100">
						<btn-delete
						v-if="!papelera && _show_btn_delete"
						:solo_emitir_delete="solo_emitir_delete"
						@press_delete_btn="press_delete_btn"
						:has_many_prop="has_many_prop"
						:has_many_parent_model_name="has_many_parent_model_name"
						:model_name="model_name" 
						:model="model"
						:dusk="'btn_eliminar_'+model_name"
						:modal="'delete-'+model_name"></btn-delete>

						<btn-loader
						class="m-l-10"
						:block="false"
						v-if="!papelera && can_save && show_only_guardar"
						@clicked="save"
						:prop_to_send_on_emit="{close: false}"
						:loader="loading"
						variant="outline-primary"
						text="Guardar"></btn-loader>

						<btn-loader
						:block="false"
						v-if="!papelera && can_save"
						@clicked="save"
						:dusk="'btn_guardar_'+model_name"
						:prop_to_send_on_emit="{close: true}"
						:loader="loading"
						text="Guardar y cerrar"></btn-loader>

						<btn-loader
						:block="false"
						v-if="papelera && show_btn_restaurar"
						variant="success"
						@clicked="restaurar"
						:prop_to_send_on_emit="{close: true}"
						:loader="restaurando"
						text="Restaurar"></btn-loader>
					</b-btn-group>
				</slot>
			</template>
		</b-modal>

	</div>
</template>
<script>
import Confirm from '@/common-vue/components/Confirm'
import BtnLoader from '@/common-vue/components/BtnLoader'
import BtnDelete from '@/common-vue/components/BtnDelete'
import BtnPdf from '@/common-vue/components/BtnPdf'

import ModelForm from '@/common-vue/components/model/ModelForm'
export default {
	name: 'ModelIndex',
	props: {
		model_name: {
			type: String,
		},
		model_prop: {
			type: Object,
			default: null,
		},
		from_has_many: {
			type: Boolean,
			default: false,
		},
		has_many_parent_model: {
			type: Object,
			default: null,
		},
		has_many_parent_model_name: {
			type: String,
			default: null,
		},
		has_many_prop: {
			type: Object,
			default: null
		},
		show_btn_pdf: {
			type: Boolean,
			default: false,
		},
		size: {
			type: String,
			default: 'lg',
		},
		actions_after_save: {
			type: Array,
			default: () => []
		},
		show_btn_delete: {
			type: Boolean,
			default: true,
		},
		show_btn_save: {
			type: Boolean,
			default: true,
		},
		check_can_delete: Boolean,
		check_permissions: {
			type: Boolean,
			default: false,
		},
		show_btn_remove_belongs_to_many: {
			type: Boolean,
			default: true,
		},
		prop_to_send_on_save: {
			type: Object,
			default: null,
		},
		props_to_send_on_save: {
			type: Array,
			default: () => []
		},
		emit_on_saved_instead_continue: {
			type: Boolean,
			default: false,
		},
		not_show_delete_text: {
			type: Boolean,
			default: false,
		},
		delete_text: {
			type: String,
			default: null,
		},
		save_check_function: {
			type: String,
			default: null,
		},
		show_only_guardar: {
			type: Boolean,
			default: true,
		},
		properties_to_show: {
			type: Array,
			default: () => null
		},
		papelera: {
			type: Boolean,
			default: false,
		},
		show_btn_restaurar: {
			type: Boolean,
			default: true,
		},
		solo_emitir_delete: {
			type: Boolean,
			default: null,
		},
	},
	components: {
		Confirm,
		BtnPdf,

		ModelForm,
		BtnLoader,
		BtnDelete,
	},
	data() {
		return {
			clear_model: 1,
			restaurando: false,
		}
	},
	computed: {
		show_limpiar_formulario() {
			return this.props_to_keep_after_create.length
		},
		loading: {
			set(value) {
				this.$store.commit('auth/setLoading', value)
			},
			get() {
				return this.$store.state.auth.loading
			}
		},
		_show_btn_delete() {
			// console.log('_show_btn_delete:')
			// console.log('check_can_delete: '+this.check_can_delete)
			// console.log('check_permissions: '+this.check_permissions)
			// console.log('show_btn_delete: '+this.show_btn_delete)
			if (this.show_btn_delete && (this.check_can_delete || this.check_permissions)) {
				// console.log('Chequeando permisos para eliminar '+this.model_name)
				return this.can(this.model_name+'.delete')
			}
			// console.log('NO SE ESTAN CHEQUEANDO permisos para eliminar '+this.model_name)
			return this.show_btn_delete
		},
		can_save() {
			// console.log('check_permissions: '+this.check_permissions)
			// console.log('show_btn_save: '+this.show_btn_save)
			if (!this.show_btn_save) {
				return false 
			}
			if (this.check_permissions) {
				if (!this.model.id) {
					return this.can(this.model_name+'.store')
				} else if (this.model.id) {
					return this.can(this.model_name+'.update')
				}
			}
			return true 
		},
		model() {
			if (this.model_prop) {
				return this.model_prop 
			}
			if (this.hasFullReactivity(this.model_name)) {
				return this.modelStoreFromName(this.model_name)
			} else {
				let model = this.modelStoreFromName(this.model_name)
				return {
					...model
				}
			}
		},
		properties() {
			if (this.properties_to_show) {
				return this.properties_to_show
			}
			return this.modelPropertiesFromName(this.model_name)
		},
		title() {
			if (this.model.id) {
				let text = 'Actualizar '+this.singular(this.model_name).toLowerCase()
				let prop_title = this.prop_to_show_in_modal_title(this.model_name)
				if (prop_title) {
					text += ' '+ this.model[prop_title]
				} else if (this.model.num) {
					text += ' N° '+this.model.num
				}
				return text
			}
			return this.create_spanish(this.model_name)
		},
		props_to_keep_after_create() {
			return this.properties.filter(prop => {
				return prop.keep_after_create 
			})
		}
	},
	methods: {
		press_delete_btn() {
			this.$emit('press_delete_btn')
		},
		restaurar() {
			if (confirm('¿Seguro que quiere restaurar este elemento?')) {
				
				this.restaurando = true
				this.$api.put('papelera/restaurar/'+this.model_name+'/'+this.model.id)
				.then(res => {
					this.restaurando = false
					this.$toast.success('Restaurado') 
					this.$bvModal.hide(this.model_name)
				})
				.catch(err => {
					this.restaurando = false
					this.$toast.error('Error al restaurar')
				})
			}
		},
		onModalClosed() {
			this.$root.$emit(this.model_name+'-modal-closed');
		},
		deleted() {
			this.$emit('modelDeleted')
		},
		async save(info) {
			// this.setPropsValues()}
			console.log('se mando check')
			const isValid = await this.check();
			console.log('llego esto de check:')
			console.log(isValid)

			if (isValid && !this.loading) {
				console.log('mandando solicitud')
				this.$store.commit('auth/setMessage', 'Guardando')
				this.loading = true 
				let route = this.routeString(this.model_name)
				// let model_to_send = this.model 
				let model_to_send = this.getModelToSend()
				
				// console.log('model_to_send:')
				// console.log(model_to_send)
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
							} else {
								this.has_many_parent_model[this.has_many_prop.key].push(res.data.model)
								this.setModel(this.has_many_parent_model, this.has_many_parent_model_name)
							}
						} else {
							if (this.model_name == 'user') {
								this.$store.commit('auth/setUser', res.data.model)
							} else {
								this.$store.commit(this.replaceGuion(this.model_name)+'/add', res.data.model)
								// console.log('se agrego este '+this.model_name+': ')
								// console.log(res.data.model)
							}
						}
						this.closeModal(info)
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
						let created_model = res.data.model 
						if (!this.emit_on_saved_instead_continue) {
							if (this.has_many_parent_model) {
								
								this.$set(this.has_many_parent_model, this.has_many_prop.key, this.has_many_parent_model[this.has_many_prop.key].concat([created_model]))
									
								console.log('Se agrego al parent model '+this.has_many_prop.key)
								
								console.log('has_many_parent_model:')
								console.log(this.has_many_parent_model)
								
								if (!this.has_many_parent_model.id) {
									if (this.has_many_parent_model.childrens) {
										this.has_many_parent_model.childrens.push({
											model_name: this.has_many_prop.has_many.model_name,
											temporal_id: created_model.temporal_id
										})
										console.log('se agrego el temporal id '+created_model.temporal_id)
									} else {
										this.has_many_parent_model.childrens = []
										console.log('se creo la prop childrens')
										this.has_many_parent_model.childrens.push({
											model_name: this.has_many_prop.has_many.model_name,
											temporal_id: created_model.temporal_id
										})
										// console.log('se agrego el id '+created_model.temporal_id)
									}
								} 
								this.setModel(this.has_many_parent_model, this.has_many_parent_model_name)

							} else {
								this.$store.commit(this.replaceGuion(this.model_name)+'/add', created_model)
							}
						}	
						this.closeModal(info)
						this.callActions(created_model)
						this.clearModel(info)
					})
					.catch(err => {
						console.log(err)
						this.$toast.error('Hubo un error')
						this.loading = false
					})
				}
			}
		},
		closeModal(info) {
			if (info.close) {
				setTimeout(() => {
					this.$bvModal.hide(this.model_name)
				}, 100)
			}
		},
		clearModel(info) {
			if (!info.close) {
				let properties_to_override = []
				if (!this.clear_model) {
					this.props_to_keep_after_create.forEach(prop => {
						properties_to_override.push({
							key: prop.key,
							value: this.model[prop.key],
						})
					})
					// console.log('propiedades para mantener')
					// console.log(properties_to_override)
				} 
				this.setModel(null, this.model_name, properties_to_override, false)
			}
		},
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

			if (this.prop_to_send_on_save) {
				model_to_send[this.prop_to_send_on_save.key] = this.prop_to_send_on_save.value
			}

			if (this.props_to_send_on_save.length) {
				// console.log('agregando props_to_send_on_save:')
				// console.log(this.props_to_send_on_save)
				this.props_to_send_on_save.forEach(prop_to_send => {

					model_to_send[prop_to_send.key] = prop_to_send.value
				}) 
			}
			return model_to_send
		},
		setPropsValues() {
			this.properties.forEach(prop => {
				if (
					(prop.type == 'text' 
					|| prop.type == 'textarea' 
					|| prop.type == 'date' 
					// || prop.type == 'checkbox' 
					|| prop.type == 'select')

					&& typeof prop.not_show_on_form == 'undefined' && typeof prop.show_only_if_is_created == 'undefined') {
				
					let input = document.getElementById(this.model_name+'-'+prop.key)

					if (input) {
						this.model[prop.key] = input.value
					} 

				}
			})
		},
		async check() {
		    return new Promise((resolve) => {
		        let ok = true;
		        let numero = null;

		        this.properties.forEach(prop => {
		            if (prop.required) {
		            	if (
		            		typeof prop.required_if_models_length != 'undefined'
		            		&& !this.modelsStoreFromName(prop.required_if_models_length).length
		            	) {

		            	} else {

			                if (ok && this.propType(prop, this.model) == 'select' && this.model[prop.key] == 0) {
			                    this.$toast.error('Ingrese ' + this.propText(prop));
			                    ok = false;
			                } else if (ok && this.model[prop.key] == '') {
			                    this.$toast.error('Ingrese ' + this.propText(prop));
			                    ok = false;
			                }
		            	}
		            }

		            if ((prop.type == 'number' || prop.filter_type == 'number') && this.model[prop.key]) {
		                numero = '' + this.model[prop.key];
		                if (numero.includes(',')) {
		                    numero = numero.replace(',', '.');
		                    this.model[prop.key] = numero;
		                }
		            }
		        });

		        this.checkRelationsFiltered();
		        if (this.save_check_function) {
		        	console.log('save_check_function:')
		        	console.log(this.save_check_function)
		            ok = this[this.save_check_function]();
		        }

		        console.log('termino check: ')
		        console.log(ok)
		        resolve(ok); // Retorna true o false
		    });
		},
		checkRelationsFiltered() {
			let relations_filtered = this.$store.state[this.model_name].relations_filtered
			if (typeof relations_filtered != 'undefined' && relations_filtered.length) {
				relations_filtered.forEach(relation_filtered => {
					this.removeRelationFiltered(this.model_name, this.model, relation_filtered)
				})
				this.$store.commit(this.model_name+'/setDeletedModelsFromRelationsFiltered', [])
			}
		},
		callActions(model) {
			this.actions_after_save.forEach(action => {
				this.$store.dispatch(action)
			})
			this.$emit('modelSaved', model)
		}
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
@if ($theme == 'dark') 
	.modal-content
		background: #1d1d1d !important
	.modal-header, .modal-header > .close
		color: rgba(255, 255, 255, .9) !important
@else 
	.modal-content
		color: rgba(0, 0, 0, .6) !important
.modal-body
	.b-form-datepicker 
		// margin-bottom: 250px
	// min-height: 500px
</style>