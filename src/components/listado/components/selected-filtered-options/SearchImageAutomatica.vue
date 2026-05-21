<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		<b-dropdown-text>
			Imagenes inteligentes
		</b-dropdown-text>
	<b-dropdown-item
	@click="start_batch_flow()">
		<i class="bi bi-images m-r-5"></i>
		Asignar imágenes automáticamente
	</b-dropdown-item>
	<b-dropdown-divider></b-dropdown-divider>

	<search-image
	ref="search_image_modal"
	@setImageUrl="on_image_selected"
	@no-image-available="on_no_image_available"></search-image>

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
				<strong class="m-l-10">{{ articles_with_image_count }}</strong>
			</div>
			<div class="batch-summary-row batch-summary-skipped">
				<i class="bi bi-skip-forward-circle-fill m-r-10"></i>
				<span>Artículos sin imagen asignada:</span>
				<strong class="m-l-10">{{ articles_skipped_count }}</strong>
			</div>
			<div
			v-if="articles_skipped_names.length"
			class="batch-summary-skipped-list">
				<p class="batch-summary-skipped-list-title">
					Artículos sin imagen:
				</p>
				<ul class="batch-summary-skipped-names">
					<li
					v-for="(article_name, index) in articles_skipped_names"
					:key="'skipped-'+index">
						{{ article_name }}
					</li>
				</ul>
			</div>
		</div>
	</b-modal>

		<cropper
		v-if="current_article"
		:image_url="image_url"
		:model="current_article"
		:prop="prop_images"
		:model_name="'article'"
		:auto_crop="auto_crop"
		@image-saved="on_image_saved"
		@image-save-failed="on_image_save_failed"></cropper>

	</div>
</template>
<script>
export default {
	components: {
		SearchImage: () => import('@/common-vue/components/model/images/SearchImage'),
		Cropper: () => import('@/common-vue/components/model/images/Cropper'),
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
		/**
		* Indica si hay un filtro activo en el listado.
		*
		* @return {Boolean}
		*/
		is_filtered() {
			return this.$store.state.article.is_filtered
		},
	},
	data() {
		return {
			/* Cola de artículos pendientes para procesar en modo automático. */
			articles_queue: [],
			/* Índice actual de procesamiento dentro de la cola. */
			current_index: 0,
			/* Flag principal para mostrar estado de ejecución y botón de cancelar. */
			is_running: false,
			/* URL seleccionada desde el modal de búsqueda para enviar al cropper. */
			image_url: '',
			/* Artículo activo que se está procesando. */
			current_article: null,
			/* Prop de imágenes usada por Cropper para guardar en `images`. */
			prop_images: {
				key: 'images',
				type: 'images',
			},
			/* Habilita el autoguardado del cropper en cada artículo del batch. */
			auto_crop: true,
			/* Contador actual de búsquedas del día para validar cuota antes de iniciar. */
			current_geocoder_counter: null,
		/* Referencia al botón flotante montado en body para cancelar el flujo. */
		floating_cancel_button: null,
		/* Cantidad de artículos a los que se les asignó imagen exitosamente en el batch. */
		articles_with_image_count: 0,
		/* Cantidad de artículos saltados por falta de imágenes disponibles en el batch. */
		articles_skipped_count: 0,
		/* Nombres de artículos a los que no se les pudo asignar imagen (para el modal resumen). */
		articles_skipped_names: [],
		/* Controla visibilidad del modal resumen al finalizar el procesamiento. */
		batch_summary_visible: false,
		}
	},
	watch: {
		/**
		* Mantiene sincronizado el botón flotante global con el estado del batch.
		*
		* @param {Boolean} is_running indica si el flujo está activo.
		* @return {void}
		*/
		is_running(is_running) {
			if (is_running) {
				this.mount_floating_cancel_button()
				return
			}
			this.unmount_floating_cancel_button()
		},
	},
	beforeDestroy() {
		this.unmount_floating_cancel_button()
	},
	methods: {
		/**
		* Crea un botón fijo en el body para cancelar el flujo desde toda la pantalla.
		*
		* @return {void}
		*/
		mount_floating_cancel_button() {
			if (this.floating_cancel_button) {
				return
			}
			const button = document.createElement('button')
			button.className = 'btn btn-danger batch-cancel-btn-global'
			button.innerHTML = '<i class="icon-cancel"></i> Cancelar procesamiento'
			button.addEventListener('click', this.cancel_batch_flow)
			document.body.appendChild(button)
			this.floating_cancel_button = button
		},
		/**
		* Elimina el botón flotante global cuando termina o se cancela el flujo.
		*
		* @return {void}
		*/
		unmount_floating_cancel_button() {
			if (!this.floating_cancel_button) {
				return
			}
			this.floating_cancel_button.removeEventListener('click', this.cancel_batch_flow)
			if (this.floating_cancel_button.parentNode) {
				this.floating_cancel_button.parentNode.removeChild(this.floating_cancel_button)
			}
			this.floating_cancel_button = null
		},
		/**
		* Inicia el flujo batch con el array de artículos recibido y advierte cuota disponible.
		* Se puede llamar tanto con los artículos seleccionados como con los filtrados visibles.
		*
		* @param {Array} articles_source Array de artículos a procesar en el batch.
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

			this.$api.get('google/get-current')
			.then(res => {
				this.current_geocoder_counter = res.data.model
				/* Copia el array fuente para evitar mutaciones reactivas durante el proceso. */
				this.articles_queue = articles_source.slice()
				this.current_index = 0
				/* Reinicia contadores de resumen para el nuevo batch. */
				this.articles_with_image_count = 0
				this.articles_skipped_count = 0
				this.articles_skipped_names = []
				this.is_running = true
				this.auto_crop = true
				this.notify_quota_status()
				this.process_next_article()
			})
			.catch(() => {
				this.$toast.error('No se pudo validar la cuota de búsquedas')
			})
		},
		/**
		* Informa al usuario si la cuota disponible es menor que los artículos a procesar.
		*
		* @return {void}
		*/
		notify_quota_status() {
			if (!this.current_geocoder_counter) {
				return
			}
			const available_searches = this.owner.google_cuota - this.current_geocoder_counter.counter
			if (available_searches < this.articles_queue.length) {
				this.$toast.error('La cuota disponible no alcanza para todos los artículos seleccionados')
			}
		},
		/**
		* Avanza secuencialmente artículo por artículo en el flujo automático.
		*
		* @return {void}
		*/
		process_next_article() {
			if (!this.is_running) {
				return
			}

		if (this.current_index >= this.articles_queue.length) {
			/* Finalización natural: muestra modal resumen en lugar de toast simple. */
			this.finish_batch_flow(null, true)
			return
		}

			/* Modelo actual que se mostrará en SearchImage y Cropper. */
			const next_article = this.articles_queue[this.current_index]
			if (!next_article) {
				this.current_index++
				this.process_next_article()
				return
			}

		if (!next_article.bar_code && !next_article.name) {
			this.$toast.error('El artículo '+next_article.id+' no tiene código de barras ni nombre para buscar')
			this.register_article_skipped(next_article)
			this.current_index++
			this.process_next_article()
			return
		}

			this.current_article = next_article
			this.image_url = ''

			/* SearchImage consume `article.model`, por eso se actualiza antes de abrir modal. */
			this.$store.commit('article/setModel', {
				model: next_article,
				properties: [],
			})

			this.$bvModal.show('search-image')
			this.$nextTick(() => {
				this.$refs.search_image_modal.luckyFlow()
			})
		},
		/**
		* Recibe la imagen elegida automáticamente y abre el cropper para autoguardado.
		*
		* @param {String} image_url URL seleccionada desde SearchImage.
		* @return {void}
		*/
		on_image_selected(image_url) {
			if (!this.is_running || !this.current_article) {
				return
			}
			this.image_url = image_url
			/* Espera render del Cropper para asegurar que el modal exista antes de abrirlo. */
			this.$nextTick(() => {
				this.$bvModal.show(this.get_cropper_modal_id())
			})
		},
		/**
		* Avanza al siguiente artículo cuando el cropper confirma guardado exitoso.
		* Incrementa el contador de artículos con imagen asignada correctamente.
		*
		* @return {void}
		*/
		on_image_saved() {
			if (!this.is_running) {
				return
			}
			/* Imagen guardada exitosamente: suma al contador de éxitos del batch. */
			this.articles_with_image_count++
			this.current_index++
			this.process_next_article()
		},
		/**
		* Maneja fallo al guardar/recortar (URL inválida, error de API, cropper sin cargar).
		* Registra el artículo en la lista de omitidos y continúa con el siguiente.
		*
		* @return {void}
		*/
		on_image_save_failed() {
			if (!this.is_running || !this.current_article) {
				return
			}
			this.register_article_skipped(this.current_article)
			this.current_index++
			this.process_next_article()
		},
		/**
		* Registra un artículo como omitido: incrementa contador y agrega su nombre al resumen.
		*
		* @param {Object} article Artículo que no recibió imagen.
		* @return {void}
		*/
		register_article_skipped(article) {
			if (!article) {
				return
			}
			this.articles_skipped_count++
			const display_name = this.get_article_display_name(article)
			if (this.articles_skipped_names.indexOf(display_name) === -1) {
				this.articles_skipped_names.push(display_name)
			}
		},
		/**
		* Obtiene el nombre legible del artículo para mostrar en el modal resumen.
		*
		* @param {Object} article Modelo de artículo.
		* @return {String}
		*/
		get_article_display_name(article) {
			if (article.name) {
				return article.name
			}
			if (article.nombre) {
				return article.nombre
			}
			return 'Artículo #'+article.id
		},
		/**
		* Maneja el evento `no-image-available` emitido por SearchImage cuando no
		* hay imágenes disponibles para el artículo actual (sin resultados o todas fallidas).
		* Cierra el modal, registra el salto en el contador y avanza al siguiente.
		*
		* @return {void}
		*/
		on_no_image_available() {
			if (!this.is_running) {
				return
			}
			/* Cierra el modal de búsqueda que puede haber quedado abierto sin imagen seleccionada. */
			this.$bvModal.hide('search-image')
			this.register_article_skipped(this.current_article)
			this.current_index++
			this.process_next_article()
		},
		/**
		* Cancela el flujo batch y cierra modales activos para evitar procesos pendientes.
		*
		* @return {void}
		*/
		cancel_batch_flow() {
			this.finish_batch_flow('Flujo automático cancelado')
		},
		/**
		* Limpia estado interno y muestra feedback final del proceso.
		* Cuando `show_summary` es true (finalización natural) abre el modal resumen;
		* de lo contrario muestra un toast simple (cancelación manual).
		*
		* @param {String|null} toast_message Mensaje de toast; null si se usa modal resumen.
		* @param {Boolean} show_summary     Si true, muestra el modal con estadísticas finales.
		* @return {void}
		*/
		finish_batch_flow(toast_message, show_summary = false) {
			/* Cierra cropper activo antes de limpiar el artículo actual. */
			if (this.current_article) {
				this.$bvModal.hide(this.get_cropper_modal_id())
			}
			this.is_running = false
			this.articles_queue = []
			this.current_index = 0
			this.current_article = null
			this.image_url = ''
			this.$bvModal.hide('search-image')
			if (show_summary) {
				/* Abre el modal resumen con los contadores acumulados del batch. */
				this.batch_summary_visible = true
				return
			}
			if (toast_message) {
				this.$toast.success(toast_message)
			}
		},
		/**
		* Construye el id del modal cropper siguiendo el patrón existente del proyecto.
		*
		* @return {String}
		*/
		get_cropper_modal_id() {
			/*
			* Debe coincidir exactamente con el id interno de Cropper.vue:
			* 'cropper-'+model.id+'-'+model.nombre+'-'+prop.key
			*/
			return 'cropper-'+this.current_article.id+'-'+this.current_article.nombre+'-'+this.prop_images.key
		},
	},
}
</script>
<style lang="sass">
.batch-cancel-btn-global
	position: fixed
	left: 50%
	bottom: 20px
	transform: translateX(-50%)
	z-index: 99999

.batch-summary-content
	display: flex
	flex-direction: column
	gap: 16px
	padding: 8px 0

	.batch-summary-row
		display: flex
		align-items: center
		font-size: 1.05rem
		padding: 12px 16px
		border-radius: 8px

	.batch-summary-success
		background-color: rgba(40, 167, 69, 0.1)
		color: #155724

	.batch-summary-skipped
		background-color: rgba(255, 193, 7, 0.1)
		color: #856404

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
</style>
