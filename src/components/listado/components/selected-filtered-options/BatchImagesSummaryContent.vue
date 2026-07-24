<template>
	<div class="batch-summary-content">
		<div class="batch-summary-row batch-summary-success">
			<i class="bi bi-check-circle-fill m-r-10"></i>
			<span>Artículos con imagen asignada:</span>
			<strong class="m-l-10">{{ batch_result ? batch_result.processed : 0 }}</strong>
		</div>
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
			</div>
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
		v-if="skipped_display_items.length"
		class="batch-summary-skipped-list">
			<p class="batch-summary-skipped-list-title">
				Artículos sin imagen:
			</p>

			<!-- Contador honesto: solo se muestra si el detalle por criterio se pudo cargar. -->
			<p
			v-if="diagnostic_counter_text"
			class="batch-summary-diagnostic-counter">
				{{ diagnostic_counter_text }}
			</p>

			<!-- Spinner discreto: no bloquea el resto del contenido, solo esta sección de detalle. -->
			<p v-if="detail_loading" class="batch-summary-detail-loading">
				<i class="bi bi-arrow-repeat batch-summary-spin m-r-10"></i>
				Cargando el detalle de la búsqueda...
			</p>
			<p v-else-if="detail_error" class="batch-summary-detail-error">
				No se pudo cargar el detalle de la búsqueda.
			</p>

			<ul class="batch-summary-skipped-names">
				<li
				v-for="(item, index) in skipped_display_items"
				:key="'skipped-'+index"
				class="batch-summary-skipped-item">
					<div
					class="batch-summary-skipped-item-header"
					:class="{ 'batch-summary-skipped-item-expandable': is_expandable(item) }"
					@click="toggle_expanded(item)">
						<i
						v-if="is_expandable(item)"
						class="bi m-r-10"
						:class="expanded_article_id === item.article_id ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
						<div class="batch-summary-skipped-item-texts">
							<span class="batch-summary-skipped-item-name">{{ item.name }}</span>
							<span
							v-if="summary_line(item)"
							class="batch-summary-skipped-item-summary">{{ summary_line(item) }}</span>
						</div>
					</div>

					<!-- Detalle por criterio, en el orden en que se probaron (código de barras y después nombre). -->
					<div
					v-if="is_expandable(item) && expanded_article_id === item.article_id"
					class="batch-summary-attempts">
						<div
						v-for="attempt in attempts_of(item)"
						:key="'attempt-'+item.article_id+'-'+attempt.criterion"
						class="batch-summary-attempt">
							<div class="batch-summary-attempt-header">
								<span class="batch-summary-attempt-criterion">{{ criterion_label(attempt) }}</span>
								<code
								v-if="attempt.query"
								class="batch-summary-attempt-query">{{ attempt.query }}</code>
							</div>
							<p class="batch-summary-attempt-outcome">
								{{ attempt.outcome_detail }}
							</p>

							<!-- Grilla de imágenes candidatas descartadas, con motivo y link al origen. -->
							<div
							v-if="attempt.candidates && attempt.candidates.length"
							class="batch-summary-candidates-grid">
								<div
								v-for="candidate in attempt.candidates"
								:key="'candidate-'+item.article_id+'-'+attempt.criterion+'-'+candidate.position"
								class="batch-summary-candidate-card">
									<a
									:href="candidate_link(candidate)"
									target="_blank"
									rel="noopener">
										<img
										v-if="!is_thumbnail_broken(item.article_id, attempt, candidate)"
										class="batch-summary-candidate-thumb"
										:src="candidate.thumbnail_url || candidate.image_url"
										:alt="candidate.title"
										@error="mark_thumbnail_broken(item.article_id, attempt, candidate)">
										<div
										v-else
										class="batch-summary-candidate-thumb batch-summary-candidate-thumb-broken">
											<i class="bi bi-image-fill"></i>
										</div>
									</a>
									<span
									class="batch-summary-candidate-badge"
									:class="candidate_badge_class(candidate.outcome)">
										{{ candidate.outcome }}
									</span>
									<a
									class="batch-summary-candidate-reason"
									:href="candidate_link(candidate)"
									target="_blank"
									rel="noopener">
										{{ candidate.reason }}
									</a>
								</div>
							</div>
						</div>
					</div>
				</li>
			</ul>
		</div>
		<div
		v-if="batch_result && batch_result.skipped_by_quota_names && batch_result.skipped_by_quota_names.length"
		class="batch-summary-quota-list">
			<p class="batch-summary-quota-list-title">
				Artículos sin procesar por límite de cuota:
			</p>
			<ul class="batch-summary-quota-names">
				<li
				v-for="(article_name, index) in batch_result.skipped_by_quota_names"
				:key="'quota-'+index">
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
</template>
<script>
/**
 * Cuerpo compartido del resumen de una corrida de asignación automática de imágenes.
 *
 * Lo usan dos consumidores:
 * - `BatchImagesSummaryModal.vue`: modal que aparece por Pusher cuando termina una corrida.
 * - `SmartImagesHistoryModal.vue`: modal de historial, al ver el detalle de una corrida pasada.
 *
 * En ambos casos recibe el mismo shape de `batch_result` (ya sea el payload de Pusher o la
 * respuesta de `article-image-search-attempts/summary/{batch_uuid}`) y carga por su cuenta el
 * detalle por criterio (`article-image-search-attempts/batch/{batch_uuid}`).
 */
export default {
	props: {
		/**
		 * Resumen del batch (payload de Pusher o respuesta del endpoint de summary).
		 */
		batch_result: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			/* Indica si se está cargando el detalle por criterio (article-image-search-attempts/batch/{uuid}). */
			detail_loading: false,
			/* Indica si la carga del detalle falló (no rompe el contenido, solo oculta el detalle expandible). */
			detail_error: false,
			/* Indica si el detalle se cargó exitosamente al menos una vez (aunque haya venido vacío). */
			detail_loaded: false,
			/* Modelos devueltos por el endpoint de detalle: uno por artículo, con sus attempts. */
			articles_detail: [],
			/* Id del artículo actualmente expandido en el acordeón (solo uno a la vez). */
			expanded_article_id: null,
			/* Miniaturas de candidatos que fallaron al cargar (@error), para no reintentar el <img> roto. */
			broken_thumbnails: {},
		}
	},
	computed: {
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
		/**
		 * Lista de artículos sin imagen a mostrar. Preferimos `skipped_items` (trae article_id y
		 * summary, agregado en el prompt 03 del backend). Si el payload es de una corrida vieja
		 * que todavía no lo trae (evento en vuelo), volvemos al comportamiento anterior con
		 * `skipped_names`: solo nombres, sin posibilidad de expandir detalle.
		 *
		 * @return {Array}
		 */
		skipped_display_items() {
			if (!this.batch_result) {
				return []
			}
			if (this.batch_result.skipped_items && this.batch_result.skipped_items.length) {
				return this.batch_result.skipped_items
			}
			if (this.batch_result.skipped_names && this.batch_result.skipped_names.length) {
				let legacy_items = []
				this.batch_result.skipped_names.forEach(function (article_name) {
					legacy_items.push({ article_id: null, name: article_name, summary: null })
				})
				return legacy_items
			}
			return []
		},
		/**
		 * Diccionario article_id -> modelo de detalle (con sus attempts), para acceso directo
		 * desde el template sin recorrer el array en cada fila.
		 *
		 * @return {Object}
		 */
		attempts_by_article_id() {
			let map = {}
			this.articles_detail.forEach(function (article_detail) {
				map[article_detail.article_id] = article_detail
			})
			return map
		},
		/**
		 * Línea de resumen honesta arriba de la lista, calculada a partir de los attempts reales.
		 * Si el detalle no se pudo cargar todavía (o falló), no se muestra nada: mejor ausente
		 * que un número inventado.
		 *
		 * @return {String}
		 */
		diagnostic_counter_text() {
			if (!this.detail_loaded) {
				return ''
			}

			let total = this.skipped_display_items.length
			// Artículos cuya última búsqueda no devolvió resultados utilizables de Google.
			let no_google_results = 0
			// Artículos con candidatos que Google devolvió pero no se pudieron descargar/procesar.
			let download_failed = 0
			// Artículos con candidatos descargados que la IA (o el prefiltro) descartó por no ser del producto.
			let not_product = 0
			let attempts_map = this.attempts_by_article_id

			this.skipped_display_items.forEach(function (item) {
				let article_detail = attempts_map[item.article_id]
				if (!article_detail || !article_detail.attempts || !article_detail.attempts.length) {
					return
				}

				// El último criterio probado (mayor criterion_order) es el que determina por qué quedó sin imagen.
				let last_attempt = article_detail.attempts[article_detail.attempts.length - 1]

				if (last_attempt.outcome === 'no_results' || last_attempt.outcome === 'no_query' || last_attempt.outcome === 'api_error') {
					no_google_results++
					return
				}

				if (last_attempt.outcome === 'all_candidates_rejected' && last_attempt.candidates && last_attempt.candidates.length) {
					let has_rejection_by_content = false
					last_attempt.candidates.forEach(function (candidate) {
						if (candidate.outcome === 'rejected_by_ai' || candidate.outcome === 'rejected_by_prefilter') {
							has_rejection_by_content = true
						}
					})
					if (has_rejection_by_content) {
						not_product++
					} else {
						download_failed++
					}
				}
			})

			return 'De los ' + total + ' artículos sin imagen: ' + no_google_results + ' no devolvieron resultados en Google, '
				+ download_failed + ' encontraron imágenes que no se pudieron descargar, '
				+ not_product + ' encontraron imágenes que no eran del producto.'
		},
	},
	watch: {
		/**
		 * El mismo componente se reusa para corridas distintas (modal de historial): cuando cambia
		 * la prop sin que el componente se vuelva a montar, hay que recargar el detalle.
		 *
		 * @return {void}
		 */
		batch_result() {
			this.load_detail()
		},
	},
	mounted() {
		this.load_detail()
	},
	methods: {
		/**
		 * Si el payload trae `batch_uuid` pide el detalle por criterio. El resto del contenido
		 * (contadores, listas) ya se ve con lo que trajo `batch_result`, sin esperar esta petición.
		 *
		 * @return {void}
		 */
		load_detail() {
			this.expanded_article_id = null
			this.broken_thumbnails = {}
			this.articles_detail = []
			this.detail_loaded = false
			this.detail_error = false

			if (!this.batch_result || !this.batch_result.batch_uuid) {
				return
			}

			this.detail_loading = true
			this.$api.get('article-image-search-attempts/batch/' + this.batch_result.batch_uuid)
			.then(res => {
				this.detail_loading = false
				this.detail_loaded = true
				this.articles_detail = res.data.models || []
			})
			.catch(() => {
				this.detail_loading = false
				this.detail_error = true
			})
		},
		/**
		 * Indica si una fila del listado puede expandirse: hace falta un article_id (no viene en
		 * el fallback legacy de skipped_names) y que el detalle ya haya cargado sus attempts.
		 *
		 * @param {Object} item Elemento de skipped_display_items.
		 * @return {Boolean}
		 */
		is_expandable(item) {
			if (!item.article_id) {
				return false
			}
			let article_detail = this.attempts_by_article_id[item.article_id]
			return !!(article_detail && article_detail.attempts && article_detail.attempts.length)
		},
		/**
		 * Attempts de un artículo, ya vienen ordenados por criterion_order desde el backend.
		 *
		 * @param {Object} item Elemento de skipped_display_items.
		 * @return {Array}
		 */
		attempts_of(item) {
			let article_detail = this.attempts_by_article_id[item.article_id]
			if (!article_detail) {
				return []
			}
			return article_detail.attempts
		},
		/**
		 * Alterna el acordeón: un solo artículo expandido a la vez.
		 *
		 * @param {Object} item Elemento de skipped_display_items sobre el que se hizo clic.
		 * @return {void}
		 */
		toggle_expanded(item) {
			if (!this.is_expandable(item)) {
				return
			}
			this.expanded_article_id = this.expanded_article_id === item.article_id ? null : item.article_id
		},
		/**
		 * Texto de resumen de una fila cerrada: preferimos el `summary` que ya viene armado desde
		 * el backend (skipped_items); si no está, lo armamos con los outcome_detail del detalle
		 * cargado. Si no hay ninguno de los dos, no se muestra nada.
		 *
		 * @param {Object} item Elemento de skipped_display_items.
		 * @return {String}
		 */
		summary_line(item) {
			if (item.summary) {
				return item.summary
			}
			let article_detail = this.attempts_by_article_id[item.article_id]
			if (!article_detail || !article_detail.attempts || !article_detail.attempts.length) {
				return ''
			}
			let details = []
			article_detail.attempts.forEach(function (attempt) {
				if (attempt.outcome_detail) {
					details.push(attempt.outcome_detail)
				}
			})
			return details.join(' · ')
		},
		/**
		 * Etiqueta legible del criterio de búsqueda probado.
		 *
		 * @param {Object} attempt Fila de attempt.
		 * @return {String}
		 */
		criterion_label(attempt) {
			return attempt.criterion === 'bar_code' ? 'Se buscó por código de barras' : 'Se buscó por nombre'
		},
		/**
		 * Link de origen de una imagen candidata: preferimos el link a la página donde apareció
		 * (context_url) para que se pueda juzgar el contexto; si no vino, el link directo a la
		 * imagen.
		 *
		 * @param {Object} candidate Imagen candidata descartada o asignada.
		 * @return {String}
		 */
		candidate_link(candidate) {
			return candidate.context_url || candidate.image_url
		},
		/**
		 * Clase de color del badge según el motivo de descarte de la candidata.
		 *
		 * @param {String} outcome Outcome de la candidata.
		 * @return {String}
		 */
		candidate_badge_class(outcome) {
			if (outcome === 'assigned') {
				return 'batch-summary-candidate-badge-success'
			}
			if (outcome === 'download_failed' || outcome === 'not_processable') {
				return 'batch-summary-candidate-badge-warning'
			}
			if (outcome === 'rejected_by_ai' || outcome === 'rejected_by_prefilter') {
				return 'batch-summary-candidate-badge-danger'
			}
			return 'batch-summary-candidate-badge-neutral'
		},
		/**
		 * Clave única de una miniatura para trackear si ya falló al cargar.
		 *
		 * @param {Number} article_id
		 * @param {Object} attempt
		 * @param {Object} candidate
		 * @return {String}
		 */
		thumbnail_key(article_id, attempt, candidate) {
			return article_id + '-' + attempt.criterion + '-' + candidate.position
		},
		/**
		 * Indica si una miniatura ya falló al cargar (para mostrar el ícono de imagen rota en vez
		 * de reintentar el <img>).
		 *
		 * @param {Number} article_id
		 * @param {Object} attempt
		 * @param {Object} candidate
		 * @return {Boolean}
		 */
		is_thumbnail_broken(article_id, attempt, candidate) {
			return !!this.broken_thumbnails[this.thumbnail_key(article_id, attempt, candidate)]
		},
		/**
		 * Marca una miniatura como rota tras el evento @error del <img>. Es esperable: muchas de
		 * estas imágenes justamente no cargan, por eso Google Images las descartó.
		 *
		 * @param {Number} article_id
		 * @param {Object} attempt
		 * @param {Object} candidate
		 * @return {void}
		 */
		mark_thumbnail_broken(article_id, attempt, candidate) {
			this.$set(this.broken_thumbnails, this.thumbnail_key(article_id, attempt, candidate), true)
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

.batch-summary-quota
	background-color: rgba(220, 53, 69, 0.1)
	color: #842029

	.batch-summary-quota-hint
		display: block
		margin-top: 4px
		font-size: 0.85rem
		color: #a83240

.batch-summary-quota-list
	margin-top: 4px
	padding: 12px 16px
	border-radius: 8px
	background-color: rgba(220, 53, 69, 0.08)
	max-height: 220px
	overflow-y: auto

	.batch-summary-quota-list-title
		margin: 0 0 8px 0
		font-weight: bold
		font-size: 0.95rem
		color: #842029

	.batch-summary-quota-names
		margin: 0
		padding-left: 20px
		font-size: 0.9rem
		color: #6a1a24

		li
			margin-bottom: 4px

.batch-summary-skipped-list
	margin-top: 4px
	padding: 12px 16px
	border-radius: 8px
	background-color: rgba(255, 193, 7, 0.08)

	.batch-summary-skipped-list-title
		margin: 0 0 8px 0
		font-weight: bold
		font-size: 0.95rem
		color: #856404

	// Contador honesto: texto discreto, distinto del título, sin fondo propio (estética hairline).
	.batch-summary-diagnostic-counter
		margin: 0 0 10px 0
		font-size: 0.85rem
		color: #6c757d

	.batch-summary-detail-loading,
	.batch-summary-detail-error
		margin: 0 0 8px 0
		font-size: 0.82rem
		color: #6c757d

	.batch-summary-spin
		display: inline-block
		animation: batch-summary-spin-anim 1s linear infinite

.batch-summary-skipped-names
	margin: 0
	padding: 0
	list-style: none
	max-height: 420px
	overflow-y: auto

	.batch-summary-skipped-item
		border-bottom: 1px solid rgba(0, 0, 0, 0.06)

		&:last-child
			border-bottom: none

.batch-summary-skipped-item-header
	display: flex
	align-items: flex-start
	padding: 8px 4px
	font-size: 0.9rem
	color: #664d03

.batch-summary-skipped-item-expandable
	cursor: pointer

.batch-summary-skipped-item-texts
	display: flex
	flex-direction: column
	gap: 2px
	min-width: 0

.batch-summary-skipped-item-name
	font-weight: 600

.batch-summary-skipped-item-summary
	font-size: 0.8rem
	color: #8a7130

.batch-summary-attempts
	display: flex
	flex-direction: column
	gap: 12px
	padding: 4px 4px 14px 26px

.batch-summary-attempt
	display: flex
	flex-direction: column
	gap: 6px
	padding-top: 8px
	border-top: 1px solid rgba(0, 0, 0, 0.05)

	&:first-child
		border-top: none
		padding-top: 0

.batch-summary-attempt-header
	display: flex
	align-items: baseline
	gap: 8px
	flex-wrap: wrap

.batch-summary-attempt-criterion
	font-weight: 600
	font-size: 0.85rem
	color: #495057

.batch-summary-attempt-query
	font-family: monospace
	font-size: 0.8rem
	color: #6c757d
	background: none

.batch-summary-attempt-outcome
	margin: 0
	font-size: 0.82rem
	color: #6c757d

.batch-summary-candidates-grid
	display: grid
	grid-template-columns: repeat(auto-fill, minmax(96px, 1fr))
	gap: 10px
	margin-top: 4px

.batch-summary-candidate-card
	display: flex
	flex-direction: column
	gap: 4px
	align-items: flex-start

.batch-summary-candidate-thumb
	width: 96px
	height: 96px
	object-fit: cover
	border-radius: 6px
	border: 1px solid rgba(0, 0, 0, 0.08)

.batch-summary-candidate-thumb-broken
	display: flex
	align-items: center
	justify-content: center
	background-color: rgba(0, 0, 0, 0.04)
	color: rgba(0, 0, 0, 0.25)
	font-size: 1.4rem

.batch-summary-candidate-badge
	font-size: 0.68rem
	font-weight: 600
	padding: 2px 6px
	border-radius: 6px
	background-color: rgba(0, 0, 0, 0.05)
	color: #6c757d

.batch-summary-candidate-badge-neutral
	background-color: rgba(0, 0, 0, 0.05)
	color: #6c757d

.batch-summary-candidate-badge-warning
	background-color: rgba(255, 152, 0, 0.12)
	color: #7d4e00

.batch-summary-candidate-badge-danger
	background-color: rgba(220, 53, 69, 0.1)
	color: #842029

.batch-summary-candidate-badge-success
	background-color: rgba(40, 167, 69, 0.12)
	color: #155724

.batch-summary-candidate-reason
	font-size: 0.72rem
	color: #6c757d
	word-break: break-word

@keyframes batch-summary-spin-anim
	from
		transform: rotate(0deg)
	to
		transform: rotate(360deg)

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
