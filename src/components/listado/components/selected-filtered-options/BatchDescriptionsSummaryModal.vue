<template>
	<b-modal
	v-model="visible_proxy"
	title="Resumen de generación automática de descripciones"
	ok-only
	ok-title="Entendido"
	ok-variant="primary"
	@ok="on_confirm">
		<div class="batch-summary-content">
			<!-- 1. Cuota agotada: prioridad visual máxima, comparte cuota diaria con imágenes inteligentes -->
			<div
			v-if="batch_result && batch_result.quota_reached"
			class="batch-summary-row batch-summary-quota">
				<i class="bi bi-exclamation-triangle-fill m-r-10"></i>
				<div>
					<div>
						<span>Se alcanzó el límite diario de búsquedas de Google.</span>
					</div>
					<small class="batch-summary-quota-hint">
						{{ batch_result.skipped_by_quota }} artículo(s) quedaron sin procesar por este motivo. Podés retomar mañana cuando se renueve la cuota.
					</small>
					<small class="batch-summary-quota-hint">
						Esta cuota diaria de búsquedas de Google es compartida entre las descripciones y las imágenes inteligentes: si no te quedan búsquedas acá, tampoco te van a quedar para asignar imágenes.
					</small>
				</div>
			</div>

			<!-- 2. Para revisar: descripciones de baja confianza, todavía NO publicadas en la tienda -->
			<div
			v-if="batch_result && batch_result.needs_review > 0"
			class="batch-summary-row batch-summary-review">
				<i class="bi bi-eye-fill m-r-10"></i>
				<div class="batch-summary-review-body">
					<div>
						<span>{{ batch_result.needs_review }} artículo(s) tienen una descripción generada con poca información confiable.</span>
						<strong class="m-l-10">No se publicaron en la tienda</strong>
						<span> hasta que las revises.</span>
					</div>
					<button
					type="button"
					class="btn btn-sm btn-warning batch-summary-review-btn"
					@click="on_review_click">
						Revisar ahora
					</button>
				</div>
			</div>

			<!-- 3. Generadas y publicadas -->
			<div class="batch-summary-row batch-summary-success">
				<i class="bi bi-check-circle-fill m-r-10"></i>
				<span>Artículo(s) con descripción generada y publicada:</span>
				<strong class="m-l-10">{{ batch_result ? batch_result.processed : 0 }}</strong>
			</div>

			<!-- 4. Ya tenían descripción cargada a mano: nunca se pisan -->
			<div
			v-if="batch_result && batch_result.skipped_existing > 0"
			class="batch-summary-row batch-summary-skipped-existing">
				<i class="bi bi-person-check-fill m-r-10"></i>
				<span>Artículo(s) que se saltearon porque ya tenían descripciones cargadas:</span>
				<strong class="m-l-10">{{ batch_result.skipped_existing }}</strong>
			</div>
			<div
			v-if="batch_result && batch_result.skipped_existing_names && batch_result.skipped_existing_names.length"
			class="batch-summary-skipped-existing-list">
				<p class="batch-summary-skipped-existing-list-title">
					Artículos que ya tenían descripción:
				</p>
				<ul class="batch-summary-skipped-existing-names">
					<li
					v-for="(article_name, index) in batch_result.skipped_existing_names"
					:key="'skipped-existing-'+index">
						{{ article_name }}
					</li>
				</ul>
			</div>

			<!-- 5. Sin información suficiente: comportamiento correcto, no es un error -->
			<div class="batch-summary-row batch-summary-skipped">
				<i class="bi bi-skip-forward-circle-fill m-r-10"></i>
				<span>Artículo(s) sin información suficiente en internet para describirlos:</span>
				<strong class="m-l-10">{{ batch_result ? batch_result.skipped : 0 }}</strong>
			</div>
			<div
			v-if="batch_result && batch_result.skipped_names && batch_result.skipped_names.length"
			class="batch-summary-skipped-list">
				<p class="batch-summary-skipped-list-title">
					Artículos sin descripción:
				</p>
				<ul class="batch-summary-skipped-names">
					<li
					v-for="(article_name, index) in batch_result.skipped_names"
					:key="'skipped-'+index">
						{{ article_name }}
					</li>
				</ul>
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
		 * Payload recibido desde Pusher con el resumen del batch de descripciones.
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
		/**
		 * Cierra este modal y le pide al padre que abra la bandeja de revisión con los
		 * items de baja confianza que vinieron en el payload del batch.
		 *
		 * @return {void}
		 */
		on_review_click() {
			this.visible_proxy = false
			this.$emit('review', this.batch_result ? this.batch_result.needs_review_items : [])
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

	.batch-summary-skipped-existing
		background-color: rgba(108, 117, 125, 0.1)
		color: #41464b

	.batch-summary-review
		background-color: rgba(255, 152, 0, 0.1)
		color: #7d4e00

		.batch-summary-review-body
			display: flex
			flex-direction: column
			gap: 8px

		.batch-summary-review-btn
			align-self: flex-start

.batch-summary-quota
	background-color: rgba(220, 53, 69, 0.1)
	color: #842029

	.batch-summary-quota-hint
		display: block
		margin-top: 4px
		font-size: 0.85rem
		color: #a83240

.batch-summary-skipped-list,
.batch-summary-skipped-existing-list
	margin-top: 4px
	padding: 12px 16px
	border-radius: 8px
	background-color: rgba(255, 193, 7, 0.08)
	max-height: 220px
	overflow-y: auto

	.batch-summary-skipped-list-title,
	.batch-summary-skipped-existing-list-title
		margin: 0 0 8px 0
		font-weight: bold
		font-size: 0.95rem
		color: #856404

	.batch-summary-skipped-names,
	.batch-summary-skipped-existing-names
		margin: 0
		padding-left: 20px
		font-size: 0.9rem
		color: #664d03

		li
			margin-bottom: 4px

.batch-summary-skipped-existing-list
	background-color: rgba(108, 117, 125, 0.08)

	.batch-summary-skipped-existing-list-title
		color: #41464b

	.batch-summary-skipped-existing-names
		color: #41464b
</style>
