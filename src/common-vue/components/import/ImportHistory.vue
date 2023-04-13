<template>
<b-modal
hide-footer
title="Historial de importaciones"
id="import-history">
	<div 
	v-if="loading"
	class="all-center-md">
		<b-spinner
		variant="primary"></b-spinner>
	</div>
	<b-table
	v-else
	:fields="fields"
	:items="items">
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
				console.log(model)
				items.push({
					created_at: this.date(model.created_at)+' '+this.hour(model.created_at),
					created_models: model.created_models,
					updated_models: model.updated_models,
					employee_id: model.user_id == model.employee_id ? this.user.name : this.getModelFromId('employee', model.employee_id),
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
					key: 'employee_id',
					label: 'Realizado por',
				},
			]
		}
	},
	methods: {
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