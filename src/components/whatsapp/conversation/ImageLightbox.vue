<template>
	<!--
		Raíz única con `v-if`: cuando está cerrado el componente sigue instanciado (lo monta el
		sidebar una sola vez) pero no dibuja nada. Hace falta que siga vivo para que el watch de
		`show` pueda enganchar y desenganchar Escape.
	-->
	<div
	v-if="show"
	class="whatsapp-lightbox"
	role="dialog"
	aria-modal="true"
	aria-label="Imagen ampliada"
	@click.self="cerrar">
		<button
		type="button"
		class="whatsapp-lightbox__cerrar"
		aria-label="Cerrar"
		title="Cerrar"
		@click="cerrar">
			<i class="bi bi-x-lg"></i>
		</button>

		<img
		v-if="image_url"
		:src="image_url"
		class="whatsapp-lightbox__img"
		alt="Imagen ampliada"
		@click.stop>
	</div>
</template>
<script>
/**
 * Visor de imagen a pantalla completa, adentro de la misma página (sin pestaña nueva).
 *
 * 🔴 **Este componente NO se monta donde se usa la imagen.** Vive en `sidebar/Index.vue`, como
 * HERMANO del panel: el panel tiene `overflow: hidden` y adentro de una burbuja el visor
 * quedaría recortado al ancho del sidebar. En Vue 3 el molde de `admin-spa` resuelve esto con
 * `<teleport to="body">`, que **en Vue 2 no existe**; el equivalente barato es montarlo arriba
 * de todo en el árbol y que la burbuja solo avise por el store.
 *
 * Por eso no recibe la imagen por props desde la burbuja: `MessageBubble.vue` commitea
 * `whatsapp_chat/setLightboxUrl` y el sidebar baja esa URL hasta acá.
 */
export default {
	name: 'WhatsappImageLightbox',
	props: {
		/** Controla si el visor está visible. */
		show: {
			type: Boolean,
			default: false,
		},
		/** URL de la imagen a mostrar ampliada. */
		image_url: {
			type: String,
			default: '',
		},
	},
	watch: {
		/**
		 * Escape se engancha al abrir y se suelta al cerrar.
		 *
		 * 🔴 **En fase de captura (el `true` del final), y no por casualidad.** El sidebar que
		 * hospeda a este visor también escucha `keydown` en `document` para cerrarse, y entre dos
		 * listeners del mismo nodo y la misma fase manda el orden de alta, que acá depende de en
		 * qué momento el operador clickeó la miniatura. Con la captura el orden deja de importar:
		 * este corre siempre primero y frena la propagación, así que un Escape con el visor
		 * abierto cierra el visor y NADA MÁS. Sin eso, el mismo tecleo se llevaba puesta también
		 * la conversación de atrás.
		 *
		 * @param {boolean} visible
		 */
		show: {
			immediate: true,
			handler(visible) {
				if (visible) {
					document.addEventListener('keydown', this.on_document_keydown, true)
					return
				}
				document.removeEventListener('keydown', this.on_document_keydown, true)
			},
		},
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.on_document_keydown, true)
	},
	methods: {
		/**
		 * @param {KeyboardEvent} event
		 */
		on_document_keydown(event) {
			if (event.key !== 'Escape') {
				return
			}
			event.stopPropagation()
			this.cerrar()
		},
		/**
		 * No commitea el store directamente: avisa y el sidebar decide. Así este visor sirve
		 * igual si algún día se lo usa fuera del sidebar de WhatsApp.
		 */
		cerrar() {
			this.$emit('close')
		},
	},
}
</script>
<style lang="sass">
// z-index 1056: por ENCIMA de la capa de modales de Bootstrap 4 (backdrop 1040, modal 1050),
// porque la imagen se puede abrir con un modal del sidebar abierto y tiene que taparlo.
// 🔴 Prohibido 1054 y 1055: son del botón flotante y del panel del asistente IA.
.whatsapp-lightbox
	position: fixed
	inset: 0
	z-index: 1056
	display: flex
	align-items: center
	justify-content: center
	padding: 24px
	background: rgba(0, 0, 0, .88)
	&__cerrar
		position: absolute
		top: 16px
		right: 16px
		z-index: 2
		width: 44px
		height: 44px
		border: none
		border-radius: 50%
		background: rgba(255, 255, 255, .15)
		color: #ffffff
		font-size: 20px
		line-height: 1
		cursor: pointer
		&:hover
			background: rgba(255, 255, 255, .28)
	&__img
		display: block
		// El tope en vw es lo que la deja entrar en teléfono; el de px evita que una foto
		// enorme se estire más allá de lo que se puede mirar en un monitor.
		max-width: min(96vw, 1400px)
		max-height: 92vh
		width: auto
		height: auto
		object-fit: contain
		border-radius: 4px
		box-shadow: 0 8px 32px rgba(0, 0, 0, .45)

// En teléfono el padding de 24px se come casi un tercio del ancho útil.
@media screen and (max-width: 767px)
	.whatsapp-lightbox
		padding: 8px
		&__cerrar
			top: 8px
			right: 8px
</style>
