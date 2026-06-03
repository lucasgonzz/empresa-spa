<template>
	<div
	class="table-thumbnail-images img-fluid"
	@mouseenter="on_thumbnail_mouseenter"
	@mouseleave="on_thumbnail_mouseleave">
		<div
		class="table-thumbnail-images__frame"
		:style="frame_inline_style">
			<img
			v-if="current_image_url && !show_load_error"
			class="article-thumbnail"
			:class="{ 'table-thumbnail-images__img--loading': is_loading && reserved_height_px }"
			:src="current_image_url"
			@load="on_thumbnail_image_load"
			@error="on_thumbnail_image_error"
			@click.stop.prevent="on_thumbnail_click"
			@mousedown.stop.prevent>

			<div
			v-if="is_loading"
			class="table-thumbnail-images__overlay"
			aria-hidden="true">
				<b-spinner variant="primary"></b-spinner>
			</div>

			<div
			v-if="show_load_error"
			class="table-thumbnail-images__error">
				Imagen no encontrada
			</div>
		</div>
	</div>
</template>
<script>
/**
 * Miniatura de imagen(es) en celdas de tabla.
 * Con varias imágenes: rotación automática cada 2 s hasta volver a la primera;
 * luego queda fija hasta que el usuario pasa el mouse (un avance por hover;
 * debe salir y volver a entrar para avanzar de nuevo).
 */
export default {
	props: {
		model: {
			type: Object,
			required: true,
		},
		prop: {
			type: Object,
			required: true,
		},
		/** Intervalo en ms entre cambios automáticos de imagen. */
		auto_interval_ms: {
			type: Number,
			default: 2000,
		},
	},
	data() {
		return {
			/** Índice de la URL visible en `image_urls`. */
			current_index: 0,
			/** ID del `setInterval` del ciclo automático. */
			auto_timer_id: null,
			/** true cuando el ciclo automático ya terminó en la primera imagen. */
			auto_cycle_stopped: false,
			/** false tras avanzar con hover hasta el próximo `mouseleave`. */
			hover_can_advance: true,
			/** true mientras la URL actual aún no terminó de cargar. */
			is_loading: true,
			/** true si la última carga de la URL actual falló. */
			show_load_error: false,
			/** Alto en px de la última imagen cargada (evita saltos de layout). */
			reserved_height_px: null,
		}
	},
	computed: {
		/**
		 * URLs de la celda según tipo de prop (`image` o `images`).
		 *
		 * @returns {Array<string>}
		 */
		image_urls() {
			return this.imageUrlsList(this.model, this.prop)
		},
		/**
		 * URL actual mostrada en la miniatura.
		 *
		 * @returns {string|null}
		 */
		current_image_url() {
			if (!this.image_urls.length) {
				return null
			}
			return this.image_urls[this.current_index]
		},
		/**
		 * Hay más de una imagen: aplica rotación y avance por hover.
		 *
		 * @returns {Boolean}
		 */
		can_rotate() {
			return this.image_urls.length > 1
		},
		/**
		 * Estilo del marco: mantiene el alto de la imagen anterior mientras carga la nueva.
		 *
		 * @returns {Object}
		 */
		frame_inline_style() {
			if (!this.reserved_height_px) {
				return {}
			}
			return {
				minHeight: this.reserved_height_px + 'px',
			}
		},
	},
	watch: {
		/**
		 * Reinicia el carrusel si cambia la fila o el listado de URLs.
		 */
		'model.id': function() {
			this.reset_carousel()
		},
		image_urls: function() {
			this.reset_carousel()
		},
		/**
		 * Al cambiar de imagen, activa carga conservando el alto ya reservado.
		 */
		current_image_url: function(new_url, old_url) {
			if (!new_url) {
				return
			}
			if (new_url !== old_url) {
				this.is_loading = true
				this.show_load_error = false
			}
			// Imagen en caché: load puede no dispararse tras cambiar el src.
			this.sync_thumbnail_load_state()
		},
	},
	mounted() {
		this.start_auto_cycle()
		// Primera pintura: load puede haber ocurrido antes de enlazar @load.
		this.sync_thumbnail_load_state()
	},
	beforeDestroy() {
		this.clear_auto_timer()
	},
	methods: {
		/**
		 * Detiene el timer y reinicia índice y flags del ciclo.
		 *
		 * @return {void}
		 */
		reset_carousel() {
			this.clear_auto_timer()
			this.current_index = 0
			this.auto_cycle_stopped = false
			this.hover_can_advance = true
			this.is_loading = true
			this.show_load_error = false
			this.reserved_height_px = null
			this.start_auto_cycle()
			// Misma URL que antes: el watcher de current_image_url no corre y load no se repite.
			this.sync_thumbnail_load_state()
		},
		/**
		 * Inicia el ciclo automático solo si hay varias imágenes.
		 *
		 * @return {void}
		 */
		start_auto_cycle() {
			this.clear_auto_timer()
			if (!this.can_rotate || this.auto_cycle_stopped) {
				return
			}
			let that = this
			this.auto_timer_id = setInterval(function() {
				that.on_auto_tick()
			}, this.auto_interval_ms)
		},
		/**
		 * Cancela el intervalo de rotación automática.
		 *
		 * @return {void}
		 */
		clear_auto_timer() {
			if (this.auto_timer_id) {
				clearInterval(this.auto_timer_id)
				this.auto_timer_id = null
			}
		},
		/**
		 * Avance automático: recorre todas las imágenes y al volver a la primera se detiene.
		 *
		 * @return {void}
		 */
		on_auto_tick() {
			if (!this.can_rotate || this.auto_cycle_stopped) {
				return
			}
			let last_index = this.image_urls.length - 1
			// Al pasar de la última a la primera, el ciclo automático termina.
			if (this.current_index === last_index) {
				this.current_index = 0
				this.auto_cycle_stopped = true
				this.clear_auto_timer()
			} else {
				this.current_index = this.current_index + 1
			}
		},
		/**
		 * Avance manual: una imagen por cada entrada del mouse (salir y volver a entrar).
		 *
		 * @return {void}
		 */
		on_thumbnail_mouseenter() {
			if (!this.can_rotate || !this.hover_can_advance) {
				return
			}
			let last_index = this.image_urls.length - 1
			if (this.current_index === last_index) {
				this.current_index = 0
			} else {
				this.current_index = this.current_index + 1
			}
			this.hover_can_advance = false
		},
		/**
		 * Habilita un nuevo avance en la próxima entrada del mouse.
		 *
		 * @return {void}
		 */
		on_thumbnail_mouseleave() {
			this.hover_can_advance = true
		},
		/**
		 * Marca la miniatura como cargada y reserva el alto del marco.
		 *
		 * @param {HTMLImageElement} img_el - Elemento img de la miniatura.
		 * @return {void}
		 */
		apply_thumbnail_loaded_state(img_el) {
			if (img_el && img_el.offsetHeight) {
				this.reserved_height_px = img_el.offsetHeight
			}
			this.is_loading = false
			this.show_load_error = false
		},
		/**
		 * Alinea is_loading con el estado real del navegador.
		 * Cubre imágenes en caché y reinicios del carrusel sin cambio de URL.
		 *
		 * @return {void}
		 */
		sync_thumbnail_load_state() {
			let that = this
			that.$nextTick(function() {
				let img_el = that.$el.querySelector('.article-thumbnail')
				if (!img_el || !that.current_image_url) {
					return
				}
				if (!img_el.complete) {
					return
				}
				if (img_el.naturalWidth > 0) {
					that.apply_thumbnail_loaded_state(img_el)
					return
				}
				that.is_loading = false
				that.show_load_error = true
			})
		},
		/**
		 * Guarda el alto renderizado y oculta el overlay de carga.
		 *
		 * @param {Event} event - Evento load del elemento img.
		 * @return {void}
		 */
		on_thumbnail_image_load(event) {
			this.apply_thumbnail_loaded_state(event.target)
		},
		/**
		 * Marca error de carga sin colapsar el marco si ya había alto reservado.
		 *
		 * @return {void}
		 */
		on_thumbnail_image_error() {
			this.is_loading = false
			this.show_load_error = true
		},
		/**
		 * Abre la vista previa con la imagen actualmente visible.
		 *
		 * @return {void}
		 */
		on_thumbnail_click() {
			if (!this.current_image_url || this.is_loading || this.show_load_error) {
				return
			}
			this.$emit('preview', this.current_image_url)
		},
	},
}
</script>
<style lang="sass" scoped>
.table-thumbnail-images
	width: 100%

	&__frame
		position: relative
		width: 100%
		display: block
		// Altura mínima solo en la primera carga, antes de conocer el alto real de la imagen.
		min-height: 48px

	&__overlay
		position: absolute
		top: 0
		right: 0
		bottom: 0
		left: 0
		display: flex
		align-items: center
		justify-content: center
		pointer-events: none
		z-index: 1

	&__img--loading
		// Oculta la nueva imagen mientras carga; el marco conserva el alto de la anterior.
		visibility: hidden
		pointer-events: none

	&__error
		display: block
		width: 100%
		padding: .5rem 0
		text-align: center
		font-size: .85rem
		color: #6c757d

.article-thumbnail
	display: block
	width: 100%
	max-width: none
	cursor: zoom-in
</style>
