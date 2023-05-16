<template>
	<div
	v-if="model">
	    <confirm
	    :model_name="model_name"
	    :actions="[model_name+'/delete']"
	    :id="'delete-'+model_name"></confirm>

		<b-modal
		:size="size"
		:title="title"
		scrollable
		:id="model_name">

			<slot 
			name="model_modal_header"
			:model="model"></slot>

			<model-form
			@modelSaved="modelSaved"
			@save="save"
			:hasPermission="hasPermission"
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

			</model-form>

			<template v-slot:modal-footer>
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
		from_has_many: {
			type: Boolean,
			default: false,
		},
		model_name: {
			type: String,
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
		check_can_delete: Boolean,
		check_permissions: {
			type: Boolean,
			default: false,
		},
		show_btn_remove_belongs_to_many: {
			type: Boolean,
			default: true,
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
			loading: false,
		}
	},
	computed: {
		_show_btn_delete() {
			if (this.show_btn_delete && (this.check_can_delete || this.check_permissions)) {
				return this.can(this.model_name+'.delete')
			}
			return this.show_btn_delete
		},
		hasPermission() {
			console.log('check_permissions: '+this.check_permissions)
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
			return this.modelStoreFromName(this.model_name)
		},
		properties() {
			return this.modelPropertiesFromName(this.model_name)
		},
		title() {
			if (this.model.id) {
				let text = 'Actualizar '+this.singular(this.model_name).toLowerCase()
				if (this.model.num) {
					text += ' N° '+this.model.num
				}
				return text
			}
			return this.create_spanish(this.model_name)
		},
	},
	methods: {
		modelSaved(model) {
			this.$emit('modelSaved', model)
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
						let created_model = res.data.model 
						if (this.has_many_parent_model) {
							this.$set(this.has_many_parent_model, this.has_many_prop.key, this.has_many_parent_model[this.has_many_prop.key].concat([created_model]))
							if (!this.has_many_parent_model.id) {
								if (this.has_many_parent_model.childrens) {
									this.has_many_parent_model.childrens.push({
										model_name: this.has_many_prop.has_many.model_name,
										temporal_id: created_model.temporal_id
									})
									console.log('se agrego el id '+created_model.temporal_id)
								} else {
									this.has_many_parent_model.childrens = []
									console.log('se creo la prop childrens')
									this.has_many_parent_model.childrens.push({
										model_name: this.has_many_prop.has_many.model_name,
										temporal_id: created_model.temporal_id
									})
									console.log('se agrego el id '+created_model.temporal_id)
								}
							}
						} else {
							this.$store.commit(this.replaceGuion(this.model_name)+'/add', created_model)
						}
						this.$bvModal.hide(this.model_name)
						this.callActions(created_model)
					})
					.catch(err => {
						console.log(err)
						this.$toast.error('Hubo un error')
						this.loading = false
					})
				}
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
			return model_to_send
		},
		check() {
			let ok = true
			this.properties.forEach(prop => {
				if (prop.required) {
					if (ok && this.propType(prop, this.model) == 'select' && this.model[prop.key] == 0) {
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
		callActions(model) {
			this.actions_after_save.forEach(action => {
				this.$store.dispatch(action)
			})
			this.$emit('modelSaved', model)
		}
	},
}
</script>