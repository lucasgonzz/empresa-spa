<template>
	<!--
		Esta raíz no dibuja nada ni ocupa lugar: existe porque Vue 2 no tiene fragments y el telón y
		el panel tienen que ser HERMANOS, los dos con position: fixed (mismo armado que el sidebar de
		WhatsApp).
	-->
	<div class="tienda-mensajes-sidebar">
		<!--
			Telón solo en teléfono. En escritorio NO hay telón y clickear afuera NO cierra, a
			propósito: la bandeja queda visible al lado y el operador tiene que poder saltar de una
			conversación a otra sin cerrar nada. Se cierra con la × del header o con Escape.
		-->
		<div
		v-if="es_movil"
		class="tienda-mensajes-sidebar__telon"
		@click="cerrar"></div>

		<!--
			🔴 La transición va acá adentro y no envolviendo al componente desde el anfitrión: las
			clases de transición caen en el elemento raíz, y un `transform` sobre esta raíz la
			convertiría en bloque contenedor de sus hijos `position: fixed`. La salida es
			instantánea: el anfitrión destruye el componente al cerrar, y mantenerlo vivo solo para
			animar dejaría a la conversación pidiendo mensajes de un chat que ya nadie mira.
		-->
		<transition
		name="tienda-mensajes-sidebar-slide"
		appear>
			<div
			class="tienda-mensajes-sidebar__panel"
			data-testid="tienda-mensajes-sidebar"
			:style="estilo_panel">
				<!-- Borde izquierdo arrastrable. En teléfono el panel ocupa todo el ancho. -->
				<div
				v-if="!es_movil"
				class="tienda-mensajes-sidebar__resizer">
					<vender-resizer
					@resize="on_resize"
					@resize-end="on_resize_end"></vender-resizer>
				</div>

				<div class="tienda-mensajes-sidebar__cuerpo">
					<conversacion></conversacion>
				</div>
			</div>
		</transition>
	</div>
</template>
<script>
import Conversacion from '@/components/online/components/mensajes/conversacion/Index'
import VenderResizer from '@/components/vender/components/VenderResizer'

// Límites del ancho del panel en escritorio, en px (los mismos que el de WhatsApp).
const ANCHO_MIN = 320
const ANCHO_DEFAULT = 460
// Clave PROPIA del ancho elegido: el de WhatsApp usa 'whatsapp_sidebar_width' y cada panel
// recuerda el suyo.
const CLAVE_ANCHO = 'tienda_mensajes_sidebar_width'

/**
 * Cascarón del sidebar de la conversación de la tienda. Calcado de `whatsapp/sidebar/Index.vue`:
 * fijo a la derecha, borde arrastrable, telón solo en teléfono, Escape cierra y el mismo escalón de
 * z-index (1035/1036: arriba de la nav vertical, abajo de los modales de Bootstrap).
 *
 * No recibe props ni emite eventos: se abre con `abrir_chat_tienda()` (mixin global) y se cierra
 * commiteando `tienda_mensajes/setSidebarAbierto`.
 *
 * 🔴 **Nunca abierto a la vez que el de WhatsApp.** Los dos usan el mismo lugar de la pantalla y el
 * mismo z-index: uno quedaría tapando al otro sin que se note cuál está arriba. Al abrirse, este
 * cierra el de WhatsApp; y si después se abre el de WhatsApp, este se cierra solo. Del módulo de
 * WhatsApp solo se LEE `whatsapp_chat.sidebar_abierto` y se commitea `setSidebarAbierto`, con la
 * guarda de que ese módulo del store exista: no se importa ni se toca nada de sus archivos.
 */
export default {
	components: {
		Conversacion,
		VenderResizer,
	},
	data() {
		return {
			ancho_px: ANCHO_DEFAULT,
			viewport_width: typeof window !== 'undefined' ? window.innerWidth : 1200,
		}
	},
	computed: {
		es_movil() {
			return this.viewport_width < 768
		},
		estilo_panel() {
			if (this.es_movil) {
				return null
			}
			return {
				width: this.ancho_px + 'px',
			}
		},
		/**
		 * ¿Está abierto el sidebar de WhatsApp? false si el módulo del store no existe.
		 */
		whatsapp_abierto() {
			let whatsapp = this.$store.state.whatsapp_chat
			return !!(whatsapp && whatsapp.sidebar_abierto)
		},
	},
	watch: {
		whatsapp_abierto(abierto) {
			if (abierto) {
				this.cerrar()
			}
		},
	},
	created() {
		this.hidratar_ancho()
		if (this.whatsapp_abierto) {
			this.$store.commit('whatsapp_chat/setSidebarAbierto', false)
		}
	},
	mounted() {
		window.addEventListener('resize', this.on_window_resize)
		document.addEventListener('keydown', this.on_document_keydown)
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.on_window_resize)
		document.removeEventListener('keydown', this.on_document_keydown)
	},
	methods: {
		cerrar() {
			this.$store.commit('tienda_mensajes/setSidebarAbierto', false)
		},
		/**
		 * Ancho inicial: el que quedó guardado o el default, acotado igual (puede venir de una
		 * pantalla más grande que esta).
		 */
		hidratar_ancho() {
			let guardado = NaN
			try {
				guardado = parseInt(localStorage.getItem(CLAVE_ANCHO), 10)
			} catch (e) {
				// Sin almacenamiento local (modo privado estricto): se usa el default.
			}
			if (isNaN(guardado)) {
				guardado = ANCHO_DEFAULT
			}
			this.ancho_px = this.acotar_ancho(guardado)
		},
		acotar_ancho(ancho) {
			let maximo = Math.floor(window.innerWidth * 0.75)
			if (maximo < ANCHO_MIN) {
				return maximo
			}
			return Math.min(Math.max(ANCHO_MIN, ancho), maximo)
		},
		/**
		 * `VenderResizer` emite el delta horizontal del mouse. El panel está anclado a la DERECHA,
		 * así que se resta: arrastrar hacia la izquierda lo agranda.
		 *
		 * @param {Number} delta
		 */
		on_resize(delta) {
			this.ancho_px = this.acotar_ancho(this.ancho_px - delta)
		},
		on_resize_end() {
			try {
				localStorage.setItem(CLAVE_ANCHO, String(this.ancho_px))
			} catch (e) {
				// Sin almacenamiento local: el ancho dura lo que dure la pestaña.
			}
		},
		on_window_resize() {
			this.viewport_width = window.innerWidth
			if (!this.es_movil) {
				this.ancho_px = this.acotar_ancho(this.ancho_px)
			}
		},
		/**
		 * Escape cierra el sidebar, salvo que haya un modal de Bootstrap abierto encima (el body
		 * lleva `modal-open`): ahí Escape es de ese modal y no puede llevarse también la
		 * conversación de atrás.
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
			this.cerrar()
		},
	},
}
</script>
<style lang="sass">
.tienda-mensajes-sidebar
	// Mismo escalón de z-index que el sidebar de WhatsApp: arriba de la nav vertical (1000) y
	// abajo de la capa de modales de Bootstrap 4 (backdrop 1040, modal 1050).
	// 🔴 Prohibido 1054/1055: son del botón flotante y del panel del asistente IA.
	&__telon
		position: fixed
		inset: 0
		background: var(--bg-overlay)
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
	&__cuerpo
		flex: 1
		min-height: 0
		display: flex
		flex-direction: column

// En teléfono el panel ocupa la pantalla entera y el telón de atrás lo cierra.
@media screen and (max-width: 767px)
	.tienda-mensajes-sidebar__panel
		width: 100%
		border-left: none

// 🔴 En Vue 2 las clases son `-enter` y `-leave-to` (`-enter-from` es de Vue 3 y acá no haría nada).
.tienda-mensajes-sidebar-slide-enter-active,
.tienda-mensajes-sidebar-slide-leave-active
	transition: transform .22s ease

.tienda-mensajes-sidebar-slide-enter,
.tienda-mensajes-sidebar-slide-leave-to
	transform: translateX(100%)

@media (prefers-reduced-motion: reduce)
	.tienda-mensajes-sidebar-slide-enter-active,
	.tienda-mensajes-sidebar-slide-leave-active
		transition: none
</style>
