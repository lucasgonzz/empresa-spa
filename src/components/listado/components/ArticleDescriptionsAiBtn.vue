<template>
	<!-- Contenedor inline: el boton convive al lado del "Agregar Descripcion" del HasMany generico. -->
	<span class="ai-desc-btn-wrapper">

		<!-- Boton secundario "Generar con IA". Deshabilitado hasta que el articulo tenga id (este guardado). -->
		<b-button
		size="sm"
		variant="outline-primary"
		:disabled="loading || !article_saved"
		v-b-tooltip.hover="!article_saved ? 'Guardá el artículo primero' : ''"
		@click="generate_preview">
			<b-spinner
			v-if="loading"
			small
			class="m-r-5"></b-spinner>
			<i
			v-else
			class="bi bi-stars m-r-5"></i>
			{{ loading ? 'Buscando información...' : 'Generar con IA' }}
		</b-button>

		<!-- Modal de preview: muestra la ficha generada para que la persona la lea/edite antes de guardar. -->
		<b-modal
		v-model="preview_visible"
		title="Descripción generada"
		hide-footer
		size="lg">

			<div class="ai-desc-preview">

				<!-- Badge de confianza: explica que significa y de donde salio la informacion. -->
				<div
				v-if="confidence"
				class="ai-desc-confidence"
				:class="'ai-desc-confidence-'+confidence">
					<span class="ai-desc-confidence-dot"></span>
					<span class="ai-desc-confidence-text">{{ confidence_text }}</span>
				</div>

				<!-- Secciones editables: el usuario puede corregir titulo y contenido, o borrar una seccion entera. -->
				<div
				v-for="(section, index) in sections"
				:key="'ai-section-'+index"
				class="ai-desc-section">

					<div class="ai-desc-section-header">
						<label class="ai-desc-label">Título</label>
						<button
						type="button"
						class="btn btn-sm btn-link text-danger ai-desc-remove"
						@click="remove_section(index)">
							Quitar sección
						</button>
					</div>

					<input
					type="text"
					class="form-control"
					v-model="section.title">

					<label class="ai-desc-label m-t-10">Contenido</label>
					<textarea
					class="form-control"
					rows="4"
					v-model="section.content"></textarea>
				</div>

				<!-- Fuentes visibles y abribles: permiten chequear en segundos si el texto dice la verdad. -->
				<div
				v-if="sources && sources.length"
				class="ai-desc-sources">
					<span class="ai-desc-sources-title">Fuentes</span>
					<a
					v-for="(source, index) in sources"
					:key="'ai-source-'+index"
					:href="source"
					target="_blank"
					rel="noopener noreferrer"
					class="ai-desc-source-link">
						{{ source }}
					</a>
				</div>

				<!-- Acciones finales: nada se persiste hasta que la persona presiona "Guardar descripciones". -->
				<div class="ai-desc-actions">
					<b-button
					variant="primary"
					:disabled="saving || !sections.length"
					@click="save_descriptions">
						<b-spinner
						v-if="saving"
						small
						class="m-r-5"></b-spinner>
						Guardar descripciones
					</b-button>
					<b-button
					variant="outline-secondary"
					:disabled="saving"
					@click="discard">
						Descartar
					</b-button>
				</div>
			</div>
		</b-modal>
	</span>
</template>
<script>
export default {
	name: 'ArticleDescriptionsAiBtn',
	props: {
		/**
		 * Articulo dueño de las descripciones. Es el mismo objeto reactivo que edita el HasMany
		 * (state.model del store), asi que actualizar su propiedad descriptions refresca la tabla.
		 */
		parent_model: {
			type: Object,
			required: true,
		},
		/**
		 * Nombre del modelo padre (por ejemplo 'article'). Se recibe por consistencia con el
		 * contrato del hook extra_action_component del HasMany.
		 */
		parent_model_name: {
			type: String,
			default: '',
		},
	},
	data() {
		return {
			/* Spinner del boton mientras corre la busqueda + sintesis (llamada sincrona, ~10-20s). */
			loading: false,
			/* Spinner del boton de guardar mientras se persisten las secciones confirmadas. */
			saving: false,
			/* Controla la visibilidad del modal de preview. */
			preview_visible: false,
			/* Secciones editables devueltas por la IA (cada una: { title, content }). */
			sections: [],
			/* Nivel de confianza declarado por la IA: 'high' | 'medium' | 'low'. */
			confidence: null,
			/* Fuentes verificables (URLs) usadas para redactar la ficha. */
			sources: [],
		}
	},
	computed: {
		/**
		 * Indica si el articulo ya esta guardado (tiene id). Sin id no se puede generar el preview.
		 *
		 * @return {Boolean}
		 */
		article_saved() {
			return Boolean(this.parent_model && this.parent_model.id)
		},
		/**
		 * Texto explicativo del badge de confianza, segun el nivel devuelto por la IA.
		 *
		 * @return {String}
		 */
		confidence_text() {
			if (this.confidence === 'high') {
				return 'Alta — datos del producto obtenidos por su código de barras'
			}
			if (this.confidence === 'medium') {
				return 'Media — información encontrada por el código de barras'
			}
			if (this.confidence === 'low') {
				return 'Baja — la información encontrada es genérica. Revisá bien antes de guardar'
			}
			return ''
		},
	},
	methods: {
		/**
		 * Solicita al backend un preview sincrono de la descripcion del articulo. No guarda nada:
		 * segun la respuesta muestra un toast neutro o abre el modal de preview para revision.
		 *
		 * @return {void}
		 */
		generate_preview() {
			// Guarda: sin articulo guardado no hay id contra el que generar.
			if (!this.article_saved) {
				return
			}

			this.loading = true
			// Indicador global de carga: la llamada es sincrona y puede tardar bastante.
			this.$store.commit('auth/setMessage', 'Buscando información del producto')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('article-description-ai/preview/' + this.parent_model.id)
			.then(res => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.handle_preview_response(res.data)
			})
			.catch(() => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.error('No se pudo generar la descripción')
			})
		},
		/**
		 * Interpreta la respuesta (siempre HTTP 200) del endpoint de preview y decide que mostrar:
		 * cuota agotada, sin informacion confiable (mensaje neutro, no de error) o abrir el preview.
		 *
		 * @param  {Object} data Respuesta del backend { found, quota_reached, sections, confidence, sources }.
		 * @return {void}
		 */
		handle_preview_response(data) {
			// Sin resultado por cuota diaria de Google agotada (compartida con las imagenes).
			if (!data.found && data.quota_reached) {
				this.$toast.warning('Se agotó la cuota diaria de búsquedas de Google (compartida con las imágenes). Volvé a intentar mañana.')
				return
			}

			// Sin resultado confiable: NO es un fallo, es el sistema negandose a inventar. Copy neutro.
			if (!data.found) {
				this.$toast.info('No se encontró información confiable sobre este producto')
				return
			}

			// Con resultado: se cargan las secciones editables y se abre el modal de preview.
			this.sections = Array.isArray(data.sections) ? data.sections : []
			this.confidence = data.confidence || null
			this.sources = Array.isArray(data.sources) ? data.sources : []
			this.preview_visible = true
		},
		/**
		 * Quita una seccion del preview antes de guardar (el usuario puede descartar contenido
		 * que no le sirve sin necesidad de vaciar los campos a mano).
		 *
		 * @param  {Number} index Posicion de la seccion a quitar.
		 * @return {void}
		 */
		remove_section(index) {
			this.sections.splice(index, 1)
		},
		/**
		 * Persiste las secciones confirmadas (posiblemente editadas) junto con la confianza y las
		 * fuentes. Al confirmar manualmente queda marcada como revisada por una persona en el backend.
		 * La respuesta trae el fullModel del articulo: se refresca parent_model.descriptions para que
		 * la tabla del HasMany muestre las descripciones nuevas sin recargar la pagina.
		 *
		 * @return {void}
		 */
		save_descriptions() {
			// Guarda: no tiene sentido guardar si el usuario borro todas las secciones.
			if (!this.sections.length) {
				return
			}

			this.saving = true
			this.$store.commit('auth/setMessage', 'Guardando descripciones')
			this.$store.commit('auth/setLoading', true)

			this.$api.post('article-description-ai/store/' + this.parent_model.id, {
				sections: this.sections,
				confidence: this.confidence,
				sources: this.sources,
			})
			.then(res => {
				this.saving = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				// Refresca las descripciones del articulo en el objeto reactivo del store (state.model).
				let updated = res.data && res.data.model ? res.data.model : null
				if (updated && Array.isArray(updated.descriptions)) {
					this.$set(this.parent_model, 'descriptions', updated.descriptions)
				}

				this.$toast.success('Descripciones guardadas')
				this.preview_visible = false
			})
			.catch(() => {
				this.saving = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.error('No se pudieron guardar las descripciones')
			})
		},
		/**
		 * Cierra el modal sin guardar nada. No crea ninguna fila en descriptions.
		 *
		 * @return {void}
		 */
		discard() {
			this.preview_visible = false
		},
	},
}
</script>
<style scoped lang="sass">
.ai-desc-btn-wrapper
	display: inline-block

.ai-desc-preview
	display: flex
	flex-direction: column
	gap: 16px

.ai-desc-confidence
	display: inline-flex
	align-items: center
	gap: 8px
	align-self: flex-start
	padding: 6px 12px
	border-radius: 999px
	font-size: 0.82rem
	font-weight: 600

.ai-desc-confidence-dot
	width: 9px
	height: 9px
	border-radius: 50%

.ai-desc-confidence-high
	background-color: rgba(40, 167, 69, 0.12)
	color: #1e7e34
	.ai-desc-confidence-dot
		background-color: #28a745

.ai-desc-confidence-medium
	background-color: rgba(0, 123, 255, 0.12)
	color: #0056b3
	.ai-desc-confidence-dot
		background-color: #007bff

.ai-desc-confidence-low
	background-color: rgba(255, 152, 0, 0.15)
	color: #8a5a00
	.ai-desc-confidence-dot
		background-color: #ff9800

.ai-desc-section
	display: flex
	flex-direction: column
	gap: 4px
	padding: 14px 16px
	border-radius: 8px
	border: 1px solid rgba(0, 0, 0, 0.08)
	background-color: rgba(0, 0, 0, 0.015)

.ai-desc-section-header
	display: flex
	align-items: center
	justify-content: space-between

.ai-desc-label
	font-size: 0.8rem
	font-weight: 600
	color: #6c757d
	margin-bottom: 0

.ai-desc-remove
	padding: 0
	font-size: 0.8rem

.ai-desc-sources
	display: flex
	flex-direction: column
	gap: 3px
	font-size: 0.82rem

.ai-desc-sources-title
	font-weight: 600
	color: #6c757d

.ai-desc-source-link
	word-break: break-all

.ai-desc-actions
	display: flex
	gap: 10px
	margin-top: 4px
</style>
