<template>
<b-modal
hide-footer
size="lg"
title="Historial de importaciones"
id="import-history">
	<div 
	v-if="loading"
	class="all-center-md">
		<b-spinner
		variant="primary"></b-spinner>
	</div>
	<b-table
	head-variant="dark"
	v-else
	:fields="fields"
	:items="items">
		<template #cell(observations)="data">
			<b-form-textarea
			:column="15"
			v-model="models[data.index].observations"></b-form-textarea>
		</template>
	</b-table>
</b-modal>
</template>
<script>
export default {
	props: {
		show_history: Boolean,
		model_name: String,
	},
	watch: {
		show_history() {
			this.getModels()
		}
	},
	data() {
		return {
			loading: false,
			models: [],
		}
	},
	computed: {
		items() {
			let items = []
			this.models.forEach(model => {
				items.push({
					created_at: this.date(model.created_at)+' '+this.hour(model.created_at),
					created_models: model.created_models,
					updated_models: model.updated_models,
					error_message: model.error_message,
					provider_id: model.provider_id ? this.getProvider(model) : null,
					employee_id: model.user_id == model.employee_id ? this.user.name : this.getModelFromId('employee', model.employee_id).name,
				})
			})
			return items 
		},
		fields() {
			return [
				{
					key: 'created_at',
					label: 'Fecha',
				},
				{
					key: 'created_models',
					label: 'Creados',
				},
				{
					key: 'updated_models',
					label: 'Actualizados',
				},
				{
					key: 'provider_id',
					label: 'Proveedor',
				},
				{
					key: 'error_message',
					label: 'Errores',
				},
				{
					key: 'employee_id',
					label: 'Realizado por',
				},
				{
					key: 'observations',
					label: 'Observaciones',
				},
			]
		}
	},
	methods: {
		getProvider(model) {
			let provider = this.getModelFromId('provider', model.provider_id)
			if (typeof provider != 'undefined' && provider !== null && provider.name) {
				return provider.name
			} 
			return null
		},
		getModels() {
			this.loading = true 
			this.$api.get('import-history/'+this.model_name)
			.then(res => {
				console.log(res)
				this.loading = false
				this.models = res.data.models 
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		}
	}
}
</script>