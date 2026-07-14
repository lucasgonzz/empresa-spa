<template>
	<b-modal
	v-model="visible_proxy"
	title="Descripciones pendientes de revisión"
	hide-footer
	size="lg"
	@shown="on_shown">
		<div class="ai-review-content">
			<p class="ai-review-counter">
				{{ items.length }} descripción(es) para revisar
			</p>

			<p v-if="loading" class="ai-review-loading">
				Cargando descripciones pendientes...
			</p>

			<p v-else-if="!items.length" class="ai-review-empty">
				No hay descripciones pendientes de revisión.
			</p>

			<transition-group name="ai-review-fade" tag="div" class="ai-review-list">
				<div
				v-for="item in items"
				:key="'ai-review-'+item.id"
				class="ai-review-card">
					<div class="ai-review-card-header">
						<span class="ai-review-article-name">{{ article_name(item) }}</span>
						<span class="ai-review-badge">Poca información confiable</span>
					</div>

					<div class="ai-review-field">
						<label class="ai-review-label">Título</label>
						<input
						type="text"
						class="form-control"
						v-model="item.title">
					</div>

					<div class="ai-review-field">
						<label class="ai-review-label">Contenido</label>
						<textarea
						class="form-control"
						rows="4"
						v-model="item.content"></textarea>
					</div>

					<div
					v-if="item.ai_sources && item.ai_sources.length"
					class="ai-review-sources">
						<span class="ai-review-sources-title">Fuentes:</span>
						<a
						v-for="(source, index) in item.ai_sources"
						:key="'source-'+item.id+'-'+index"
						:href="source"
						target="_blank"
						rel="noopener noreferrer"
						class="ai-review-source-link">
							{{ source }}
						</a>
					</div>

					<div class="ai-review-actions">
						<button
						type="button"
						class="btn btn-sm btn-success"
						:disabled="item.saving"
						@click="approve(item)">
							Aprobar y publicar
						</button>
						<button
						type="button"
						class="btn btn-sm btn-outline-danger"
						:disabled="item.saving"
						@click="discard(item)">
							Descartar
						</button>
					</div>
				</div>
			</transition-group>
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
		 * Items pendientes de revisión que vinieron del resumen del batch (needs_review_items del
		 * payload de Pusher). Se usan solo como pista inicial: al abrirse, el modal siempre trae
		 * la versión completa y actualizada desde el backend (con title/content/ai_sources), porque
		 * el payload del batch no incluye esos datos editables.
		 */
		initial_items: {
			type: Array,
			default: () => [],
		},
	},
	data() {
		return {
			/* Lista de descripciones pendientes de revisión, con sus campos editables. */
			items: [],
			/* Indica si se está cargando la bandeja desde el backend. */
			loading: false,
		}
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
		 * Al mostrarse el modal, carga (o recarga) la bandeja completa de pendientes de revisión.
		 *
		 * @return {void}
		 */
		on_shown() {
			this.load_pending_review()
		},
		/**
		 * Trae desde el backend las descripciones generadas por IA de baja confianza que
		 * todavía no fueron revisadas por una persona (no publicadas en la tienda).
		 *
		 * @return {void}
		 */
		load_pending_review() {
			this.loading = true
			this.$api.get('article-description-ai/pending-review')
			.then(res => {
				this.loading = false
				let models = res.data.models || []
				let items = []
				models.forEach(function (model) {
					// Se agrega "saving" localmente para deshabilitar los botones durante el guardado.
					model.saving = false
					items.push(model)
				})
				this.items = items
			})
			.catch(() => {
				this.loading = false
				this.$toast.error('No se pudieron cargar las descripciones pendientes de revisión')
			})
		},
		/**
		 * Nombre visible del artículo dueño de la descripción, para el encabezado de la tarjeta.
		 *
		 * @param {Object} item Descripción pendiente de revisión, con su artículo relacionado.
		 * @return {String}
		 */
		article_name(item) {
			if (item.article && item.article.name) {
				return item.article.name
			}
			return 'Artículo #' + item.article_id
		},
		/**
		 * Aprueba la descripción con el título y contenido actuales (posiblemente editados) y
		 * la publica en la tienda. La tarjeta sale de la lista sin recargar todo el modal.
		 *
		 * @param {Object} item Descripción a aprobar.
		 * @return {void}
		 */
		approve(item) {
			item.saving = true
			this.$api.put('article-description-ai/approve/' + item.id, {
				title: item.title,
				content: item.content,
			})
			.then(() => {
				this.$toast.success('Descripción aprobada y publicada')
				this.remove_item(item)
			})
			.catch(() => {
				item.saving = false
				this.$toast.error('No se pudo aprobar la descripción')
			})
		},
		/**
		 * Descarta (borra) la descripción generada por IA. La tarjeta sale de la lista sin
		 * recargar todo el modal.
		 *
		 * @param {Object} item Descripción a descartar.
		 * @return {void}
		 */
		discard(item) {
			item.saving = true
			this.$api.delete('article-description-ai/discard/' + item.id)
			.then(() => {
				this.$toast.success('Descripción descartada')
				this.remove_item(item)
			})
			.catch(() => {
				item.saving = false
				this.$toast.error('No se pudo descartar la descripción')
			})
		},
		/**
		 * Quita del array local la descripción ya resuelta (aprobada o descartada).
		 *
		 * @param {Object} item Descripción resuelta.
		 * @return {void}
		 */
		remove_item(item) {
			let index = this.items.findIndex(function (candidate) {
				return candidate.id === item.id
			})
			if (index === -1) {
				return
			}
			this.items.splice(index, 1)
		},
	},
}
</script>
<style lang="sass">
.ai-review-content
	display: flex
	flex-direction: column
	gap: 12px

.ai-review-counter
	margin: 0
	font-weight: bold
	font-size: 0.95rem
	color: #495057

.ai-review-loading,
.ai-review-empty
	color: #6c757d
	font-size: 0.9rem

.ai-review-list
	display: flex
	flex-direction: column
	gap: 14px
	max-height: 60vh
	overflow-y: auto

.ai-review-card
	display: flex
	flex-direction: column
	gap: 10px
	padding: 14px 16px
	border-radius: 8px
	border: 1px solid rgba(0, 0, 0, 0.08)
	background-color: rgba(0, 0, 0, 0.015)

.ai-review-card-header
	display: flex
	align-items: center
	justify-content: space-between
	gap: 8px
	flex-wrap: wrap

.ai-review-article-name
	font-weight: 600
	font-size: 0.95rem
	color: #212529

.ai-review-badge
	font-size: 0.75rem
	font-weight: 600
	padding: 3px 8px
	border-radius: 999px
	background-color: rgba(255, 152, 0, 0.15)
	color: #7d4e00
	white-space: nowrap

.ai-review-field
	display: flex
	flex-direction: column
	gap: 4px

.ai-review-label
	font-size: 0.8rem
	font-weight: 600
	color: #6c757d
	margin-bottom: 0

.ai-review-sources
	display: flex
	flex-direction: column
	gap: 2px
	font-size: 0.8rem

	.ai-review-sources-title
		font-weight: 600
		color: #6c757d

	.ai-review-source-link
		word-break: break-all

.ai-review-actions
	display: flex
	gap: 8px
	margin-top: 4px

.ai-review-fade-enter-active,
.ai-review-fade-leave-active
	transition: opacity 0.2s ease

.ai-review-fade-enter,
.ai-review-fade-leave-to
	opacity: 0
</style>
