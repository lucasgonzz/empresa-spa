<template>
	<!--
		Esta raíz no dibuja nada ni ocupa lugar: existe porque Vue 2 no tiene fragments y el
		telón, el panel y el visor de imagen tienen que ser HERMANOS, los tres con
		position: fixed. Si el visor colgara de adentro del panel quedaría recortado por su
		overflow: hidden, y en Vue 2 no hay <teleport> para sacarlo de ahí.
	-->
	<div class="whatsapp-sidebar">
		<!--
			Telón solo en teléfono. En escritorio NO hay telón y clickear afuera NO cierra, a
			propósito: la bandeja queda visible al lado y el operador tiene que poder saltar de
			un chat a otro sin cerrar nada. Se cierra con la × del header o con Escape.
		-->
		<div
		v-if="es_movil"
		class="whatsapp-sidebar__telon"
		@click="cerrar"></div>

		<!--
			🔴 La transición va acá adentro y no envolviendo a este componente desde
			SidebarHost.vue: las clases de transición se aplican al elemento raíz, y cualquier
			`transform` sobre esta raíz la convertiría en bloque contenedor de sus hijos
			`position: fixed`, que dejarían de estar anclados al viewport.

			Por eso lleva `appear` (anima al montarse) y la salida queda instantánea: el host
			destruye el componente al cerrar. Mantenerlo montado solo para animar la salida
			dejaría vivo a conversation/Index.vue y su watch seguiría pidiendo mensajes de un
			chat que ya nadie está mirando.
		-->
		<transition
		name="whatsapp-sidebar-slide"
		appear>
			<div
			class="whatsapp-sidebar__panel"
			:style="estilo_panel">
				<!-- Borde izquierdo arrastrable. En teléfono el panel ocupa todo el ancho y no
				hay nada que redimensionar. -->
				<div
				v-if="!es_movil"
				class="whatsapp-sidebar__resizer">
					<vender-resizer
					@resize="on_resize"
					@resize-end="on_resize_end"></vender-resizer>
				</div>

				<!-- Salida de emergencia: la × vive en el header de la conversación, y ese
				header solo se dibuja cuando el chat ya está en la bandeja. Al entrar por link
				directo hay un instante en que todavía no llegó (getChats va por la red) y sin
				esto el único modo de cerrar sería Escape. -->
				<button
				v-if="!chat"
				class="whatsapp-sidebar__cerrar-suelto"
				type="button"
				title="Cerrar la conversación"
				@click="cerrar">
					<i class="bi bi-x-lg"></i>
				</button>

				<div class="whatsapp-sidebar__cuerpo">
					<conversation></conversation>
				</div>
			</div>
		</transition>

		<!--
			🔴 El visor va ACÁ, hermano del panel y afuera de la <transition>, no adentro de la
			burbuja que muestra la miniatura. Dos motivos, los dos duros. Uno: el panel tiene
			`overflow: hidden`, así que colgado ahí adentro el visor quedaría recortado al ancho
			del sidebar en vez de ocupar la pantalla. Dos: cualquier `transform` —el de la
			transición de entrada, sin ir más lejos— convierte al elemento en bloque contenedor
			de sus hijos `position: fixed`, que dejarían de estar anclados al viewport.
			En Vue 3 esto se resuelve con <teleport to="body">, que en Vue 2 no existe.

			Se monta siempre y se muestra por prop en vez de ponerle un `v-if` acá: el componente
			tiene que seguir vivo para que su watch de `show` enganche y suelte Escape.
		-->
		<image-lightbox
		:show="!!lightbox_url"
		:image_url="lightbox_url || ''"
		@close="cerrar_lightbox"></image-lightbox>
	</div>
</template>
<script>
import Conversation from '@/components/whatsapp/conversation/Index'
import ImageLightbox from '@/components/whatsapp/conversation/ImageLightbox'
import VenderResizer from '@/components/vender/components/VenderResizer'

// Límites del ancho del panel en escritorio, en px.
const ANCHO_MIN = 320
const ANCHO_DEFAULT = 460
// Clave del ancho elegido. Es propia del sidebar de WhatsApp: el de leads del admin usa
// 'lead_sidebar_width' y el asistente IA persiste el suyo en la base, no acá.
const CLAVE_ANCHO = 'whatsapp_sidebar_width'

/**
 * Cascarón del sidebar de conversación de WhatsApp.
 *
 * 🔴 **No recibe props ni emite eventos.** Todo su estado (qué chat está abierto, si el panel
 * está abierto) vive en `store/whatsapp_chat.js`, que es un singleton. Se abre desde cualquier
 * parte del sistema con `abrir_chat_whatsapp()` y se cierra commiteando `setSidebarAbierto`.
 *
 * **Por qué no se usa `b-sidebar` de BootstrapVue**, que ya está en el proyecto: este panel
 * hospeda tres `b-modal` y un visor de imagen, y necesita control fino del z-index para quedar
 * por encima de la nav vertical (1000) pero por debajo de la capa de modales de Bootstrap 4
 * (backdrop 1040, modal 1050), que es lo que hace que esos tres modales se dibujen encima suyo.
 * Con `b-sidebar` habría que pisar `.b-sidebar-body` —como ya hay que hacer en
 * `common-vue/components/download-resources/Index.vue`— y encima meterle el resizer y la
 * columna flex con scroll interno a mano. Se pelea más CSS del que se escribe.
 */
export default {
	components: {
		Conversation,
		ImageLightbox,
		VenderResizer,
	},
	data() {
		return {
			// Ancho actual del panel en px (solo escritorio).
			ancho_px: ANCHO_DEFAULT,
			// Ancho del viewport, para decidir el modo teléfono.
			viewport_width: typeof window !== 'undefined' ? window.innerWidth : 1200,
		}
	},
	computed: {
		chat() {
			return this.$store.getters['whatsapp_chat/selected_chat']
		},
		es_movil() {
			return this.viewport_width < 768
		},
		/**
		 * URL de la imagen que se está mirando a pantalla completa, o null. La escribe
		 * `MessageBubble.vue` commiteando `setLightboxUrl`: la burbuja no tiene forma de llegar
		 * hasta acá por props (hay tres componentes de por medio) y tampoco emite eventos.
		 */
		lightbox_url() {
			return this.$store.state.whatsapp_chat.lightbox_url
		},
		/**
		 * En escritorio el ancho es el elegido; en teléfono lo fija el CSS (pantalla completa),
		 * así que devolver null saca el estilo inline en vez de pisarlo.
		 */
		estilo_panel() {
			if (this.es_movil) {
				return null
			}
			return {
				width: this.ancho_px + 'px',
			}
		},
	},
	created() {
		this.hidratar_ancho()

		/*
			🔴 El catálogo de plantillas lo cargaba `views/Whatsapp.vue` al entrar al módulo, y
			eso alcanzaba mientras la conversación existía solo ahí adentro. Ahora el sidebar se
			abre desde Clientes, Pedidos y Compradores, donde esa vista puede no haberse
			visitado nunca en toda la sesión: sin esto, el modal de plantillas —que es el ÚNICO
			camino para retomar una conversación fuera de la ventana de 24 h— aparecía vacío
			justo fuera del módulo.

			Se pide una sola vez: el catálogo casi no cambia y el sidebar se abre y se cierra
			muchas veces por sesión.
		*/
		if (!this.$store.state.whatsapp_template.models.length) {
			this.$store.dispatch('whatsapp_template/getModels')
		}
	},
	mounted() {
		let self = this
		window.addEventListener('resize', self.on_window_resize)
		document.addEventListener('keydown', self.on_document_keydown)
	},
	beforeDestroy() {
		let self = this
		window.removeEventListener('resize', self.on_window_resize)
		document.removeEventListener('keydown', self.on_document_keydown)
		/*
			El visor vive adentro de este componente pero su estado vive en el store, que sobrevive
			al cierre del sidebar. Si no se limpia acá, la próxima vez que se abriera una
			conversación aparecería de entrada la foto que alguien miró hace media hora.
		*/
		this.cerrar_lightbox()
	},
	methods: {
		cerrar() {
			this.$store.commit('whatsapp_chat/setSidebarAbierto', false)
		},
		cerrar_lightbox() {
			this.$store.commit('whatsapp_chat/setLightboxUrl', null)
		},
		/**
		 * Ancho inicial: el que quedó guardado la última vez, o el default. Se acota igual,
		 * porque el ancho guardado puede venir de una pantalla mucho más grande que esta.
		 */
		hidratar_ancho() {
			let guardado = parseInt(localStorage.getItem(CLAVE_ANCHO), 10)
			if (isNaN(guardado)) {
				guardado = ANCHO_DEFAULT
			}
			this.ancho_px = this.acotar_ancho(guardado)
		},
		acotar_ancho(ancho) {
			let maximo = Math.floor(window.innerWidth * 0.75)
			// En una pantalla muy angosta el máximo puede quedar por debajo del mínimo: ahí
			// manda el máximo, si no el panel se saldría de la pantalla.
			if (maximo < ANCHO_MIN) {
				return maximo
			}
			return Math.min(Math.max(ANCHO_MIN, ancho), maximo)
		},
		/**
		 * `VenderResizer` emite el delta horizontal del mouse (positivo hacia la derecha). Este
		 * panel está anclado a la DERECHA, así que se resta: arrastrar hacia la izquierda es lo
		 * que lo agranda. En Vender el mismo resizer suma, porque ahí el panel está a la izquierda.
		 *
		 * @param {number} delta
		 */
		on_resize(delta) {
			this.ancho_px = this.acotar_ancho(this.ancho_px - delta)
		},
		/**
		 * Al soltar el divisor se persiste. En localStorage y no en la base (como hace el
		 * asistente IA) porque el ancho cómodo depende del monitor, no de la persona: el mismo
		 * usuario en la notebook y en el escritorio quiere anchos distintos.
		 */
		on_resize_end() {
			localStorage.setItem(CLAVE_ANCHO, String(this.ancho_px))
		},
		on_window_resize() {
			this.viewport_width = window.innerWidth
			// Achicar la ventana puede dejar el panel más ancho que el 75% permitido.
			if (!this.es_movil) {
				this.ancho_px = this.acotar_ancho(this.ancho_px)
			}
		},
		/**
		 * Escape cierra el sidebar, igual que la × del header.
		 *
		 * 🔴 Los dos cortes de abajo no son de más. Este panel hospeda tres `b-modal`
		 * (plantillas, vincular cliente, resumen) y el visor de imagen: sin ellos, Escape
		 * cerraría el modal Y el sidebar de atrás en el mismo tecleo, y el operador perdería la
		 * conversación por querer cerrar un modal. BootstrapVue marca el body con `modal-open`
		 * mientras haya alguno abierto, así que alcanza con mirar eso.
		 *
		 * @param {KeyboardEvent} event
		 */
		on_document_keydown(event) {
			if (event.key !== 'Escape') {
				return
			}
			if (document.body.classList.contains('modal-open')) {
				return
			}
			if (this.$store.state.whatsapp_chat.lightbox_url) {
				return
			}
			this.cerrar()
		},
	},
}
</script>
<style lang="sass">
.whatsapp-sidebar
	// Telón y panel conviven con el resto del sistema en este escalón de z-index:
	// ARRIBA de la nav vertical (1000), y ABAJO de la capa de modales de Bootstrap 4
	// (backdrop 1040, modal 1050), que es lo que hace que los tres modales que este panel
	// abre se dibujen encima suyo. 1035 es el mismo escalón que elige b-sidebar.
	// 🔴 Prohibido 1054/1055: son del botón flotante y del panel del asistente IA.
	&__telon
		position: fixed
		inset: 0
		background: rgba(0, 0, 0, .35)
		z-index: 1035
	&__panel
		position: fixed
		top: 0
		right: 0
		height: 100vh
		max-width: 100vw
		z-index: 1036
		background: var(--wa-panel)
		border-left: 1px solid var(--wa-borde)
		box-shadow: -4px 0 16px var(--shadow-color)
		display: flex
		flex-direction: column
		overflow: hidden
	&__resizer
		position: absolute
		top: 0
		bottom: 0
		left: 0
		width: 6px
		z-index: 2
		display: flex
	&__cerrar-suelto
		position: absolute
		top: 8px
		right: 8px
		z-index: 3
		width: 34px
		height: 34px
		border-radius: 8px
		background: var(--wa-panel)
		// Con borde y no pelado: en modo oscuro el panel y la superficie de atrás son casi del
		// mismo tono, y sin el contorno el botón desaparecía.
		border: 1px solid var(--wa-borde)
		color: var(--wa-texto)
		opacity: var(--wa-texto-tenue-op)
		display: flex
		align-items: center
		justify-content: center
	&__cuerpo
		flex: 1
		min-height: 0
		display: flex
		flex-direction: column

// En teléfono el panel ocupa la pantalla entera y el telón de atrás lo cierra.
@media screen and (max-width: 767px)
	.whatsapp-sidebar__panel
		width: 100%
		border-left: none

// 🔴 En Vue 2 las clases son `-enter` y `-leave-to`. `-enter-from` es de Vue 3 y acá no
// haría absolutamente nada (el panel aparecería de golpe, sin ningún error).
.whatsapp-sidebar-slide-enter-active,
.whatsapp-sidebar-slide-leave-active
	transition: transform .22s ease

.whatsapp-sidebar-slide-enter,
.whatsapp-sidebar-slide-leave-to
	transform: translateX(100%)

@media (prefers-reduced-motion: reduce)
	.whatsapp-sidebar-slide-enter-active,
	.whatsapp-sidebar-slide-leave-active
		transition: none
</style>
