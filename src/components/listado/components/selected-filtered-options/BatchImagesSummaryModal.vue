<template>
	<b-modal
	v-model="visible_proxy"
	title="Resumen de asignación automática"
	ok-only
	ok-title="Entendido"
	ok-variant="primary"
	@ok="on_confirm">
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
			v-if="needs_review_items.length"
			class="batch-summary-review-grid-wrap">
				<p class="batch-summary-review-grid-title">
					Imágenes asignadas para revisar:
				</p>
				<div class="batch-summary-review-grid">
					<div
					v-for="(review_item, index) in needs_review_items"
					:key="'review-item-'+index"
					class="batch-summary-review-card">
						<img
						class="batch-summary-review-thumb"
						:src="review_item.image_url"
						:alt="review_item.name">
						<div class="batch-summary-review-card-info">
							<span class="batch-summary-review-article-id">
								N° {{ review_item.article_id }}
							</span>
							<span class="batch-summary-review-article-name">
								{{ review_item.name }}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</b-modal>
</template>
<script>
export default {
	props: {
		/**
		 * Controla visibilidad del modal (v-model).
		 */
		visible: {
			type: Boolean,
			default: false,
		},
		/**
		 * Payload recibido desde Pusher con el resumen del batch.
		 */
		batch_result: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Proxy para v-model del modal sin mutar la prop directamente.
		 */
		visible_proxy: {
			get() {
				return this.visible
			},
			set(value) {
				this.$emit('update:visible', value)
			},
		},
		/**
		 * Lista de artículos con imagen asignada que requieren revisión manual.
		 *
		 * @return {Array}
		 */
		needs_review_items() {
			if (!this.batch_result || !this.batch_result.needs_review_items) {
				return []
			}
			return this.batch_result.needs_review_items
		},
	},
	methods: {
		/**
		 * Emite confirmación al presionar Entendido para que el padre refresque el listado.
		 *
		 * @return {void}
		 */
		on_confirm() {
			this.$emit('confirmed')
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

.batch-summary-review-grid-wrap
	padding: 12px 16px
	border-radius: 8px
	background-color: rgba(255, 152, 0, 0.08)

	.batch-summary-review-grid-title
		margin: 0 0 12px 0
		font-weight: bold
		font-size: 0.95rem
		color: #7d4e00

.batch-summary-review-grid
	display: flex
	flex-direction: column
	gap: 10px
	max-height: 280px
	overflow-y: auto

.batch-summary-review-card
	display: flex
	align-items: center
	gap: 12px
	padding: 8px 10px
	border-radius: 8px
	background-color: rgba(255, 255, 255, 0.65)

.batch-summary-review-thumb
	width: 64px
	height: 64px
	object-fit: cover
	border-radius: 6px
	border: 1px solid rgba(0, 0, 0, 0.1)
	flex-shrink: 0

.batch-summary-review-card-info
	display: flex
	flex-direction: column
	gap: 4px
	min-width: 0

.batch-summary-review-article-id
	font-weight: bold
	font-size: 0.9rem
	color: #7d4e00

.batch-summary-review-article-name
	font-size: 0.88rem
	color: #5c3d00
	word-break: break-word
</style>
