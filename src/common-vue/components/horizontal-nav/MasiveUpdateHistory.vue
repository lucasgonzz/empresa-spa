<template>
<div>
	<b-modal
	hide-footer
	size="lg"
	title="Historial de actualizaciones masivas"
	id="masive-update-history"
	@show="get_models">

		<div
		v-if="loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<history-empty-state
		v-else-if="!models.length"
		icon_class="icon-history"
		title="Aún no hay actualizaciones masivas"
		hint="Cuando realices una actualización masiva, aparecerá aquí su historial."></history-empty-state>

		<b-table
		responsive
		head-variant="dark"
		v-else
		:fields="fields"
		:items="items">

			<template #cell(action)="data">
				{{ action_label(models[data.index].action) }}
			</template>

			<template #cell(status)="data">
				{{ status_label(models[data.index].status) }}
			</template>

			<template #cell(employee_name)="data">
				{{ employee_label(models[data.index]) }}
			</template>

			<template #cell(actions)="data">
				<b-button
				size="sm"
				variant="outline-primary"
				class="m-r-5"
				@click="open_detail(models[data.index])">
					Detalle
				</b-button>
				<b-button
				v-if="models[data.index].can_revert"
				size="sm"
				variant="outline-danger"
				:disabled="revert_loading_id == models[data.index].id"
				@click="confirm_revert(models[data.index])">
					Revertir
				</b-button>
			</template>
		</b-table>
	</b-modal>

	<b-modal
	hide-footer
	size="xl"
	scrollable
	title="Detalle de actualización masiva"
	id="masive-update-detail"
	@hidden="clear_detail">

		<div
		v-if="detail_loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<div
		v-else-if="detail_model">
			<p class="m-b-10">
				<strong>Estado:</strong> {{ status_label(detail_model.status) }}
				<span class="m-l-15">
					<strong>Acción:</strong> {{ action_label(detail_model.action) }}
				</span>
			</p>
			<p class="m-b-10">
				<strong>Registros afectados:</strong> {{ detail_model.affected_count }}
				<span class="m-l-15">
					<strong>Cambios:</strong> {{ detail_model.changes_count }}
				</span>
			</p>

			<h6 class="m-t-15 m-b-10">Criterios utilizados</h6>
			<pre class="masive-update-criteria">{{ criteria_summary }}</pre>

			<h6
			v-if="detail_articles.length"
			class="m-t-15 m-b-10">
				Artículos modificados ({{ detail_articles.length }})
			</h6>

			<div
			v-for="article in detail_articles"
			:key="'masive-upd-art-'+article.id"
			class="masive-update-article-block m-b-15">
				<p class="m-b-5">
					<strong>#{{ article.num }}</strong> — {{ article.name }}
				</p>
				<b-table
				small
				responsive
				:fields="change_fields"
				:items="article.change_rows"
				empty-text="Sin cambios registrados"></b-table>
			</div>

			<p
			v-if="detail_model.error_message"
			class="text-danger m-t-10">
				{{ detail_model.error_message }}
			</p>
		</div>
	</b-modal>

	<confirm
	@confirmed="revert_masive_update"
	text="¿Seguro que quiere revertir esta actualización masiva? Los valores guardados volverán al estado anterior."
	btn_text="Revertir"
	id="confirm-revert-masive-update"></confirm>
</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	components: {
		Confirm: () => import('@/common-vue/components/Confirm'),
		HistoryEmptyState: () => import('@/common-vue/components/horizontal-nav/HistoryEmptyState'),
	},
	data() {
		return {
			loading: false,
			models: [],
			detail_loading: false,
			detail_model: null,
			detail_articles: [],
			revert_loading_id: null,
			pending_revert_id: null,
		}
	},
	computed: {
		fields() {
			return [
				{ key: 'created_at', label: 'Fecha' },
				{ key: 'action', label: 'Tipo' },
				{ key: 'employee_name', label: 'Realizado por' },
				{ key: 'status', label: 'Estado' },
				{ key: 'affected_count', label: 'Afectados' },
				{ key: 'changes_count', label: 'Cambios' },
				{ key: 'actions', label: '' },
			]
		},
		change_fields() {
			return [
				{ key: 'prop_label', label: 'Propiedad' },
				{ key: 'operation', label: 'Operación' },
				{ key: 'old_value', label: 'Valor anterior' },
				{ key: 'new_value', label: 'Valor nuevo' },
			]
		},
		/**
		 * Propiedades del modelo para resolver labels en español en el detalle.
		 *
		 * @returns {Array}
		 */
		model_properties_for_labels() {
			if (this.model_name !== 'article') {
				return []
			}
			return require('@/models/article').default.properties || []
		},
		items() {
			let items = []
			this.models.forEach(model => {
				items.push({
					created_at: this.date(model.created_at, true),
					action: model.action,
					employee_name: null,
					status: model.status,
					affected_count: model.affected_count,
					changes_count: model.changes_count,
					actions: null,
				})
			})
			return items
		},
		criteria_summary() {
			if (!this.detail_model || !this.detail_model.criteria) {
				return '—'
			}
			try {
				return JSON.stringify(this.detail_model.criteria, null, 2)
			} catch (e) {
				return '—'
			}
		},
	},
	methods: {
		status_label(status) {
			if (status === 'completed') {
				return 'Completado'
			}
			if (status === 'reverted') {
				return 'Revertido'
			}
			if (status === 'failed') {
				return 'Error'
			}
			if (status === 'processing') {
				return 'Procesando'
			}
			return 'En proceso'
		},
		action_label(action) {
			if (action === 'revert') {
				return 'Reversión'
			}
			return 'Actualización'
		},
		employee_label(model) {
			if (model.user_id == model.employee_id) {
				return this.user.name
			}
			if (model.employee && model.employee.name) {
				return model.employee.name
			}
			return '—'
		},
		get_models() {
			this.loading = true
			this.$api.get('masive-update/' + this.model_name)
			.then(res => {
				this.loading = false
				this.models = res.data.models || []
			})
			.catch(() => {
				this.loading = false
				this.$toast.error('No se pudo cargar el historial de actualizaciones masivas', {
					duration: 4000,
				})
			})
		},
		open_detail(model) {
			this.detail_loading = true
			this.detail_model = null
			this.detail_articles = []
			this.$bvModal.show('masive-update-detail')

			this.$api.get('masive-update/detail/' + model.id)
			.then(res => {
				this.detail_loading = false
				this.detail_model = res.data.model
				this.build_detail_articles()
			})
			.catch(() => {
				this.detail_loading = false
				this.$toast.error('No se pudo cargar el detalle', { duration: 4000 })
			})
		},
		/**
		 * Label en español de una propiedad del modelo según su key.
		 *
		 * @param {String} prop_key
		 * @returns {String}
		 */
		get_prop_label(prop_key) {
			let prop = this.model_properties_for_labels.find(model_prop => {
				return model_prop && model_prop.key == prop_key
			})
			if (prop) {
				return this.propText(prop)
			}
			return this.capitalize(String(prop_key).replaceAll('_', ' '))
		},
		/**
		 * Texto legible de la operación aplicada en la actualización masiva.
		 *
		 * @param {String} operation
		 * @returns {String}
		 */
		operation_label_for_change(operation) {
			if (operation == 'decrement') {
				return 'Disminuir %'
			}
			if (operation == 'increment') {
				return 'Aumentar %'
			}
			if (operation == 'set') {
				return 'Setear'
			}
			if (operation == 'revert') {
				return 'Revertir'
			}
			return operation || '—'
		},
		build_detail_articles() {
			let articles = []
			let articles_detail = this.detail_model.articles_detail || []

			articles_detail.forEach(article => {
				let change_rows = []
				let changes = article.changes || {}
				Object.keys(changes).forEach(prop_key => {
					let change = changes[prop_key]
					change_rows.push({
						prop_label: this.get_prop_label(prop_key),
						operation: this.operation_label_for_change(change.operation),
						old_value: this.format_change_value(change.old),
						new_value: this.format_change_value(change.new),
					})
				})
				articles.push({
					id: article.id,
					name: article.name,
					num: article.num,
					change_rows: change_rows,
				})
			})

			this.detail_articles = articles
		},
		format_change_value(value) {
			if (value === null || typeof value === 'undefined') {
				return '—'
			}
			return String(value)
		},
		clear_detail() {
			this.detail_model = null
			this.detail_articles = []
		},
		confirm_revert(model) {
			this.pending_revert_id = model.id
			this.$bvModal.show('confirm-revert-masive-update')
		},
		revert_masive_update() {
			if (!this.pending_revert_id) {
				return
			}
			let masive_update_id = this.pending_revert_id
			this.revert_loading_id = masive_update_id
			this.pending_revert_id = null

			this.$api.post('masive-update/' + masive_update_id + '/revert')
			.then(() => {
				this.revert_loading_id = null
				this.$toast.success('La reversión se está procesando en segundo plano. Te avisaremos cuando termine.', {
					duration: 5000,
				})
				this.get_models()
			})
			.catch(err => {
				this.revert_loading_id = null
				let message = 'No se pudo iniciar la reversión'
				if (err.response && err.response.data && err.response.data.message) {
					message = err.response.data.message
				}
				this.$toast.error(message, { duration: 4000 })
			})
		},
	},
}
</script>
<style scoped lang="sass">
.masive-update-criteria
	max-height: 200px
	overflow: auto
	font-size: 0.8rem
	background: #f5f7fa
	padding: 10px
	border-radius: 6px

.masive-update-article-block
	border: 1px solid #e8ecf0
	border-radius: 6px
	padding: 10px
</style>
