<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		<b-dropdown-text>
			Imagenes inteligentes
		</b-dropdown-text>
		<b-dropdown-item
		v-if="selected.length"
		@click="start_batch_flow">
			<i class="bi bi-images m-r-5"></i>
			Asignar imágenes automáticamente
		</b-dropdown-item>
		<b-dropdown-divider></b-dropdown-divider>

		<search-image
		ref="search_image_modal"
		@setImageUrl="on_image_selected"></search-image>

		<cropper
		v-if="current_article"
		:image_url="image_url"
		:model="current_article"
		:prop="prop_images"
		:model_name="'article'"
		:auto_crop="auto_crop"
		@image-saved="on_image_saved"></cropper>

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
		* Inicia el flujo batch con la selección actual y advierte cuota disponible.
		*
		* @return {void}
		*/
		start_batch_flow() {
			if (!this.selected.length) {
				this.$toast.error('Seleccione al menos un artículo para iniciar')
				return
			}

			this.$api.get('google/get-current')
			.then(res => {
				this.current_geocoder_counter = res.data.model
				this.articles_queue = this.selected.slice()
				this.current_index = 0
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
				this.finish_batch_flow('Flujo automático finalizado')
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
		*
		* @return {void}
		*/
		on_image_saved() {
			if (!this.is_running) {
				return
			}
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
		* Limpia estado interno y muestra mensaje final del proceso.
		*
		* @param {String} toast_message Mensaje de feedback para el usuario.
		* @return {void}
		*/
		finish_batch_flow(toast_message) {
			this.is_running = false
			this.articles_queue = []
			this.current_index = 0
			this.current_article = null
			this.image_url = ''
			this.$bvModal.hide('search-image')
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
</style>
