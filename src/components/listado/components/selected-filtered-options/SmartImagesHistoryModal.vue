<template>
<div>
	<b-modal
	hide-footer
	size="lg"
	title="Historial de imágenes inteligentes"
	id="smart-images-history"
	@show="get_batches">

		<div
		v-if="loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<history-empty-state
		v-else-if="!models.length"
		icon_class="bi bi-images"
		title="Todavía no hiciste ninguna búsqueda de imágenes"
		hint="Cuando asignes imágenes automáticamente desde el listado, cada búsqueda va a quedar guardada acá."></history-empty-state>

		<div v-else>
			<b-table
			responsive
			head-variant="dark"
			:fields="fields"
			:items="items">

				<template #cell(created_at)="data">
					{{ data.value }}
					<!-- Aviso de cuota: caso poco frecuente, por eso no tiene columna propia. -->
					<div
					v-if="models[data.index].quota_count > 0"
					class="smart-images-history-quota-hint">
						{{ models[data.index].quota_count }} sin procesar por límite de cuota
					</div>
				</template>

				<template #cell(needs_review_count)="data">
					{{ data.value > 0 ? data.value : '—' }}
				</template>

				<template #cell(actions)="data">
					<b-button
					size="sm"
					variant="outline-primary"
					@click="open_detail(models[data.index])">
						Ver detalle
					</b-button>
				</template>
			</b-table>

			<p
			v-if="retention_days"
			class="smart-images-history-retention">
				Se guardan las búsquedas de los últimos {{ retention_days }} días.
			</p>
		</div>
	</b-modal>

	<b-modal
	hide-footer
	size="xl"
	scrollable
	body-class="batch-summary-modal-body"
	:title="detail_title"
	id="smart-images-history-detail"
	@hidden="clear_detail">

		<div
		v-if="detail_loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>

		<p
		v-else-if="detail_error"
		class="text-danger">
			No se pudo cargar el detalle de esta búsqueda.
		</p>

		<batch-images-summary-content
		v-else
		:batch_result="selected_batch_result"></batch-images-summary-content>
	</b-modal>
</div>
</template>
<script>
export default {
	components: {
		HistoryEmptyState: () => import('@/common-vue/components/horizontal-nav/HistoryEmptyState'),
		BatchImagesSummaryContent: () => import('@/components/listado/components/selected-filtered-options/BatchImagesSummaryContent'),
	},
	data() {
		return {
			/* Indica si se está cargando el listado de corridas recientes. */
			loading: false,
			/* Corridas recientes devueltas por article-image-search-attempts/recent. */
			models: [],
			/* Cantidad de días que el backend retiene el historial (viene del endpoint, no se hardcodea). */
			retention_days: null,
			/* Indica si se está cargando el resumen de la corrida seleccionada. */
			detail_loading: false,
			/* Indica si falló la carga del resumen de la corrida seleccionada. */
			detail_error: false,
			/* Resumen de la corrida seleccionada, mismo shape que el evento Pusher. */
			selected_batch_result: null,
			/* Fecha de la corrida seleccionada, para el título del modal de detalle. */
			selected_created_at: null,
		}
	},
	computed: {
		/**
		 * Columnas de la tabla de corridas recientes.
		 *
		 * @return {Array}
		 */
		fields() {
			return [
				{ key: 'created_at', label: 'Fecha' },
				{ key: 'articles_count', label: 'Artículos' },
				{ key: 'assigned_count', label: 'Con imagen' },
				{ key: 'skipped_count', label: 'Sin imagen' },
				{ key: 'needs_review_count', label: 'Para revisar' },
				{ key: 'actions', label: '' },
			]
		},
		/**
		 * Filas de la tabla, con la fecha ya formateada.
		 *
		 * @return {Array}
		 */
		items() {
			let items = []
			this.models.forEach(model => {
				items.push({
					created_at: this.date(model.created_at, true),
					articles_count: model.articles_count,
					assigned_count: model.assigned_count,
					skipped_count: model.skipped_count,
					needs_review_count: model.needs_review_count,
					actions: null,
				})
			})
			return items
		},
		/**
		 * Título dinámico del modal de detalle con la fecha de la corrida seleccionada.
		 *
		 * @return {String}
		 */
		detail_title() {
			if (!this.selected_created_at) {
				return 'Búsqueda'
			}
			return 'Búsqueda del ' + this.date(this.selected_created_at, true)
		},
	},
	methods: {
		/**
		 * Pide el listado de corridas recientes de asignación automática de imágenes.
		 *
		 * @return {void}
		 */
		get_batches() {
			this.loading = true
			this.$api.get('article-image-search-attempts/recent')
			.then(res => {
				this.loading = false
				this.models = res.data.models || []
				this.retention_days = res.data.retention_days || null
			})
			.catch(() => {
				this.loading = false
				this.$toast.error('No se pudo cargar el historial de imágenes inteligentes', {
					duration: 4000,
				})
			})
		},
		/**
		 * Abre el detalle de una corrida. El modal se abre antes de que responda el endpoint
		 * (muestra el spinner) para dar respuesta inmediata al click.
		 *
		 * @param {Object} model Corrida seleccionada (fila de models, no de items).
		 * @return {void}
		 */
		open_detail(model) {
			this.selected_batch_result = null
			this.selected_created_at = model.created_at
			this.detail_error = false
			this.detail_loading = true
			this.$bvModal.show('smart-images-history-detail')

			this.$api.get('article-image-search-attempts/summary/' + model.batch_uuid)
			.then(res => {
				this.detail_loading = false
				this.selected_batch_result = res.data
			})
			.catch(() => {
				this.detail_loading = false
				this.detail_error = true
			})
		},
		/**
		 * Limpia el detalle seleccionado al cerrar el modal, para que al abrir otra corrida no se
		 * vea por un instante la anterior.
		 *
		 * @return {void}
		 */
		clear_detail() {
			this.selected_batch_result = null
			this.detail_error = false
		},
	},
}
</script>
<style scoped lang="sass">
.smart-images-history-quota-hint
	font-size: 0.78rem
	color: #6c757d

.smart-images-history-retention
	margin: 10px 0 0 0
	font-size: 0.8rem
	color: #6c757d
</style>
