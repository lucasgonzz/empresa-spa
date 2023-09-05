<template>
	<div>
		<update
		@update="update"
		:loading="loading"
		:model_name="model_name"></update>	

		<confirm
		:id="model_name+'-delete-models'"
		:text="delete_text"
		emit="deleteModels"
		@deleteModels="deleteModels"></confirm>	

		<options-dropdown
		@setUpdate="setUpdate"
		@setDelete="setDelete"
		:model_name="model_name">
			<template #options_drop_down>
				<slot name="options_drop_down"></slot>
			</template>
		</options-dropdown>

		<options-dropdown
		@setUpdate="setUpdate"
		@setDelete="setDelete"
		from_filter
		:model_name="model_name">
			<template #options_drop_down>
				<slot name="options_drop_down"></slot>
			</template>
		</options-dropdown>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	components: {
		Update: () => import('@/common-vue/components/horizontal-nav/options-dropdown/Update'),
		Confirm: () => import('@/common-vue/components/Confirm'),
		OptionsDropdown: () => import('@/common-vue/components/horizontal-nav/options-dropdown/OptionsDropdown'),
	},
	computed: {
		delete_text() {
			if (this.from_filter) {
				return this.$store.state[this.model_name].filtered.length+' '+this.plural(this.model_name)
			}
			return this.$store.state[this.model_name].selected.length+' '+this.plural(this.model_name)
		},
		selecteds_id() {
			return this.$store.state[this.model_name].selected.map(model => {
				return model.id 
			})
		},
	},
	data() {
		return {
			is_from: '',
			from_filter: false,
			loading: false,
		}
	},
	methods: {
		setUpdate(from_filter) {
			this.from_filter = from_filter
			this.$bvModal.show(this.model_name+'-update-models')
		},
		setDelete(from_filter) {
			this.from_filter = from_filter
			this.$bvModal.show(this.model_name+'-delete-models')
		},
		update(form) {
			console.log(form)
			console.log(this.$store.state[this.model_name].filters[4])
			this.loading = true
			this.$api.put('update/'+this.model_name, {
				from_filter: this.from_filter,
				filter_form: this.$store.state[this.model_name].filters,
				update_form: form,
				models_id: this.selecteds_id,
			})
			.then(res => {
				this.loading = false 
				res.data.models.forEach(model => {
					this.$store.commit(this.model_name+'/add', model)
				})
				this.$toast.success('Actualizado')
				this.$bvModal.hide(this.model_name+'-update-models')
			})
			.catch(err => {
				this.loading = false 
				console.log(err)
				this.$toast.error('Error al actualizar')
			})
		},
		deleteModels() {
			this.$store.commit('auth/setMessage', 'Eliminando '+this.plural(this.model_name))
			this.$store.commit('auth/setLoading', true)
			this.$api.put('delete/'+this.model_name, {
				from_filter: this.from_filter,
				filter_form: this.$store.state[this.model_name].filters,
				models_id: this.selecteds_id
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				res.data.models.forEach(model => {
					this.$store.commit(this.model_name+'/setDelete', model)
					this.$store.commit(this.model_name+'/delete')
				})
				this.$toast.success(this.plural(this.model_name)+' eliminados')
				this.$store.commit(this.model_name+'/setSelected', [])
				this.$bvModal.hide('update-props')
			})
			.catch(err => {
				this.$toast.error('Error al eliminar '+this.plural(this.model_name))
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
			})
		},
	}
}
</script>