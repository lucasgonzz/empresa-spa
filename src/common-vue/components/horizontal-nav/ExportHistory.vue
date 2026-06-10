<template>
<div>
	<b-modal
	hide-footer
	size="lg"
	title="Historial de exportaciones"
	id="export-history"
	@show="get_models">

		<div
		v-if="loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<history-empty-state
		v-else-if="!models.length"
		icon_class="icon-upload"
		title="Aún no hay exportaciones"
		hint="Cuando generes una exportación desde el menú, aparecerá aquí su historial."></history-empty-state>

		<b-table
		responsive
		head-variant="dark"
		v-else
		:fields="fields"
		:items="items">

			<template #cell(status)="data">
				{{ status_label(models[data.index].status) }}
			</template>

			<template #cell(employee_name)="data">
				{{ employee_label(models[data.index]) }}
			</template>

			<template #cell(download)="data">
				<b-button
				v-if="models[data.index].status === 'completed' && models[data.index].excel_url"
				variant="success"
				size="sm"
				@click="download_excel(models[data.index])">
					Descargar
				</b-button>
				<span
				v-else-if="models[data.index].status === 'pending'"
				class="text-muted">
					En proceso...
				</span>
				<span
				v-else
				class="text-muted">
					—
				</span>
			</template>

			<template #cell(error_message)="data">
				<small
				v-if="models[data.index].error_message"
				class="text-danger">
					{{ models[data.index].error_message }}
				</small>
			</template>

		</b-table>
	</b-modal>
</div>
</template>
<script>
export default {
	components: {
		HistoryEmptyState: () => import('@/common-vue/components/horizontal-nav/HistoryEmptyState'),
	},
	props: {
		model_name: String,
	},
	data() {
		return {
			loading: false,
			models: [],
		}
	},
	computed: {
		fields() {
			return [
				{
					key: 'created_at',
					label: 'Fecha',
				},
				{
					key: 'employee_name',
					label: 'Realizado por',
				},
				{
					key: 'status',
					label: 'Estado',
				},
				{
					key: 'exported_count',
					label: 'Registros',
				},
				{
					key: 'download',
					label: 'Archivo',
				},
				{
					key: 'error_message',
					label: 'Error',
				},
			]
		},
		items() {
			let items = []
			this.models.forEach(model => {
				items.push({
					created_at: this.date(model.created_at, true),
					employee_name: null,
					status: model.status,
					exported_count: model.exported_count,
					download: null,
					error_message: model.error_message,
				})
			})
			return items
		},
	},
	methods: {
		status_label(status) {
			if (status === 'completed') {
				return 'Completado'
			}
			if (status === 'failed') {
				return 'Error'
			}
			return 'En proceso'
		},
		employee_label(model) {
			if (model.user_id == model.employee_id) {
				return this.user.name
			}
			let employee = this.getModelFromId('employee', model.employee_id)
			if (employee && employee.name) {
				return employee.name
			}
			if (model.employee && model.employee.name) {
				return model.employee.name
			}
			return '—'
		},
		download_excel(model) {
			if (model.excel_url) {
				window.open(model.excel_url)
			}
		},
		get_models() {
			this.loading = true
			this.$api.get('export-history/' + this.model_name)
			.then(res => {
				this.loading = false
				this.models = res.data.models
			})
			.catch(() => {
				this.loading = false
				this.$toast.error('No se pudo cargar el historial de exportaciones', {
					duration: 4000,
				})
			})
		},
	},
}
</script>
