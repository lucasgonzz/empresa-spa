<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<dropdown-section-title
		title="Imágenes inteligentes"
		icon="icon-camera"></dropdown-section-title>

		<dropdown-option-item
		icon="bi bi-images"
		@click="start_batch_flow()">
			Asignar imágenes automáticamente
		</dropdown-option-item>

		<!-- Modal resumen final del procesamiento batch -->
		<b-modal
		v-model="batch_summary_visible"
		title="Resumen de asignación automática"
		ok-only
		ok-title="Entendido"
		ok-variant="primary">
			<div class="batch-summary-content">
				<div class="batch-summary-row batch-summary-success">
					<i class="bi bi-check-circle-fill m-r-10"></i>
					<span>Artículos con imagen asignada:</span>
					<strong class="m-l-10">{{ batch_result ? batch_result.processed : 0 }}</strong>
				</div>
				<div class="batch-summary-row batch-summary-skipped">
					<i class="bi bi-skip-forward-circle-fill m-r-10"></i>
					<span>Artículos sin imagen asignada:</span>
					<strong class="m-l-10">{{ batch_result ? batch_result.skipped : 0 }}</strong>
				</div>
				<div
				v-if="batch_result && batch_result.needs_review > 0"
				class="batch-summary-row batch-summary-review">
					<i class="bi bi-eye-fill m-r-10"></i>
					<div>
						<div>
							<span>Imágenes para revisar manualmente:</span>
							<strong class="m-l-10">{{ batch_result.needs_review }}</strong>
						</div>
						<small class="batch-summary-review-hint">
							Estas imágenes se asignaron pero pueden no ser las más adecuadas. Revisalas en el artículo.
						</small>
					</div>
				</div>
				<div
				v-if="batch_result && batch_result.skipped_names && batch_result.skipped_names.length"
				class="batch-summary-skipped-list">
					<p class="batch-summary-skipped-list-title">
						Artículos sin imagen:
					</p>
					<ul class="batch-summary-skipped-names">
						<li
						v-for="(article_name, index) in batch_result.skipped_names"
						:key="'skipped-'+index">
							{{ article_name }}
						</li>
					</ul>
				</div>
				<div
				v-if="batch_result && batch_result.needs_review_names && batch_result.needs_review_names.length"
				class="batch-summary-skipped-list batch-summary-review-list">
					<p class="batch-summary-skipped-list-title batch-summary-review-list-title">
						Imágenes para revisar:
					</p>
					<ul class="batch-summary-skipped-names">
						<li
						v-for="(article_name, index) in batch_result.needs_review_names"
						:key="'review-'+index">
							{{ article_name }}
						</li>
					</ul>
				</div>
			</div>
		</b-modal>

	</div>
</template>
<script>
export default {
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	computed: {
		/**
		* Artículos seleccionados por el usuario en el listado.
		*
		* @return {Array}
		*/
		selected() {
			return this.$store.state.article.selected
		},
		/**
		* Artículos actualmente cargados como resultado del filtrado activo.
		* Solo incluye los ya paginados/visibles, no los pendientes de cargar.
		*
		* @return {Array}
		*/
		filtered() {
			return this.$store.state.article.filtered
		},
	},
	data() {
		return {
			/* Controla visibilidad del modal resumen al recibir el evento Pusher. */
			batch_summary_visible: false,
			/* Payload recibido desde Pusher con el resumen del procesamiento. */
			batch_result: null,
		}
	},
	methods: {
		/**
		* Determina la fuente de artículos, llama al backend para procesar en segundo plano
		* y suscribe el listener de Pusher para recibir el resumen cuando finalice.
		*
		* @return {void}
		*/
		start_batch_flow() {
			let articles_source = []
			if (this.selected.length) {
				articles_source = this.selected
			} else if (this.filtered.length) {
				articles_source = this.filtered
			}

			if (!articles_source || !articles_source.length) {
				this.$toast.error('No hay artículos para procesar')
				return
			}

			this.$api.post('google/batch-assign-images', {
				article_ids: articles_source.map(a => a.id),
			})
			.then(() => {
				this.$toast.success('Procesando imágenes en segundo plano...')
				this.start_pusher_listener()
			})
			.catch(() => {
				this.$toast.error('No se pudo iniciar el procesamiento de imágenes')
			})
		},
		/**
		* Suscribe el canal Pusher del owner para recibir el evento de finalización del batch.
		* Al recibir el payload guarda el resultado y abre el modal resumen.
		* Se desuscribe automáticamente tras recibir el primer evento.
		*
		* @return {void}
		*/
		start_pusher_listener() {
			const channel_name = 'article_batch_images.' + this.owner.id

			this.Echo.channel(channel_name)
			.listen('.ArticleBatchImagesProcessed', (payload) => {
				this.batch_result = payload
				this.batch_summary_visible = true
				this.Echo.leaveChannel(channel_name)
			})
		},
	},
}
</script>
<style lang="sass">
.batch-summary-content
	display: flex
	flex-direction: column
	gap: 16px
	padding: 8px 0

	.batch-summary-row
		display: flex
		align-items: flex-start
		font-size: 1.05rem
		padding: 12px 16px
		border-radius: 8px

	.batch-summary-success
		background-color: rgba(40, 167, 69, 0.1)
		color: #155724

	.batch-summary-skipped
		background-color: rgba(255, 193, 7, 0.1)
		color: #856404

	.batch-summary-review
		background-color: rgba(255, 152, 0, 0.1)
		color: #7d4e00

		.batch-summary-review-hint
			display: block
			margin-top: 4px
			font-size: 0.85rem
			color: #996300

.batch-summary-skipped-list
	margin-top: 4px
	padding: 12px 16px
	border-radius: 8px
	background-color: rgba(255, 193, 7, 0.08)
	max-height: 220px
	overflow-y: auto

	.batch-summary-skipped-list-title
		margin: 0 0 8px 0
		font-weight: bold
		font-size: 0.95rem
		color: #856404

	.batch-summary-skipped-names
		margin: 0
		padding-left: 20px
		font-size: 0.9rem
		color: #664d03

		li
			margin-bottom: 4px

.batch-summary-review-list
	background-color: rgba(255, 152, 0, 0.08)

	.batch-summary-review-list-title
		color: #7d4e00

	.batch-summary-skipped-names
		color: #7d4e00
</style>
