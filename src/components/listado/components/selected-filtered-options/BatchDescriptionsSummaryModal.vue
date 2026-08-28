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
				<p
				v-if="skipped_existing_names_ocultos"
				class="batch-summary-truncado">
					y {{ skipped_existing_names_ocultos }} artículo(s) más.
				</p>
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
				<p
				v-if="skipped_names_ocultos"
				class="batch-summary-truncado">
					y {{ skipped_names_ocultos }} artículo(s) más.
				</p>
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
		/**
		 * Cuántos nombres de "sin información suficiente" quedaron afuera de la lista.
		 *
		 * 🔴 Existe porque el payload de Pusher ya NO manda la lista entera: Pusher corta el
		 * evento en 10240 bytes y con un lote grande el job moría en BroadcastException al
		 * final de todo, con la cuota de Google ya gastada. Ahora el backend manda los primeros
		 * nombres que entran en un presupuesto de bytes y el total al lado
		 * (`skipped_names_total`, ver `broadcastWith()` de ArticleBatchDescriptionsProcessed).
		 * Mostrar una lista más corta sin decirlo sería mentirle al usuario sobre cuántos
		 * artículos quedaron sin descripción.
		 *
		 * @return {Number} 0 si no falta ninguno o si el backend todavía no manda el total.
		 */
		skipped_names_ocultos() {
			return this.nombres_ocultos('skipped_names', 'skipped_names_total')
		},
		/**
		 * Lo mismo que skipped_names_ocultos, para los salteados por descripción ya existente.
		 *
		 * @return {Number}
		 */
		skipped_existing_names_ocultos() {
			return this.nombres_ocultos('skipped_existing_names', 'skipped_existing_names_total')
		},
	},
	methods: {
		/**
		 * Diferencia entre el total que informa el backend y los nombres que efectivamente
		 * llegaron en el payload.
		 *
		 * Devuelve 0 si el backend no mandó el total: contra una API vieja, que manda la lista
		 * completa y ningún `*_total`, no falta ningún nombre y no hay nada que aclarar.
		 *
		 * @param {String} clave_lista  Nombre del campo con los nombres que sí llegaron.
		 * @param {String} clave_total  Nombre del campo con el total real.
		 * @return {Number}
		 */
		nombres_ocultos(clave_lista, clave_total) {
			if (!this.batch_result) {
				return 0
			}

			let total = this.batch_result[clave_total]
			if (typeof total !== 'number') {
				return 0
			}

			let mostrados = this.batch_result[clave_lista] ? this.batch_result[clave_lista].length : 0
			let ocultos = total - mostrados

			return ocultos > 0 ? ocultos : 0
		},
		/**
		 * Emite confirmación al presionar Entendido para que el padre refresque el listado.
		 *
		 * @return {void}
		 */
		on_confirm() {
			this.$emit('confirmed')
		},
		/**
		 * Cierra este modal y le pide al padre que abra la bandeja de revisión.
		 *
		 * Hoy `needs_review_items` viene `undefined`: se sacó del payload de Pusher porque el
		 * detalle por artículo no entra en el límite de 10240 bytes con lotes grandes. No se
		 * pierde nada visible — `AiDescriptionsReviewModal` nunca leyó esos items: al abrirse
		 * pide la bandeja completa a `GET article-description-ai/pending-review`, que es la
		 * única fuente que tiene el título, el contenido y las fuentes editables.
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
<style lang="sass" scoped>
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

	/* Aclaración de "y N más" cuando la lista de nombres viajó recortada por el límite de Pusher */
	.batch-summary-truncado
		margin: 8px 0 0 0
		font-size: 0.85rem
		font-style: italic
		color: #856404

.batch-summary-skipped-existing-list
	background-color: rgba(108, 117, 125, 0.08)

	.batch-summary-skipped-existing-list-title
		color: #41464b

	.batch-summary-skipped-existing-names
		color: #41464b

	// Este bloque es gris, no ámbar: el "y N más" tiene que acompañar a su lista
	.batch-summary-truncado
		color: #41464b
</style>
