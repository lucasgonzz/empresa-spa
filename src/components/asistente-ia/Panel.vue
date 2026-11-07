<template>
	<!-- Click en el fondo oscuro (afuera del panel) cierra el chat, igual que la cruz y Escape.

	🔴 NO ALCANZA CON `@click.self`: un click se dispara sobre el ancestro común de donde bajó
	y donde subió el botón. Arrastrar una manija de PanelResizer (o seleccionar texto del hilo)
	y soltar afuera del panel termina en un click cuyo target es el overlay, y el chat se
	cerraba en la cara de quien lo estaba estirando. Por eso se cierra SOLO si el mousedown
	también arrancó en el overlay: `al_mousedown_overlay` prende la bandera únicamente cuando
	el target es el overlay mismo y la apaga con cualquier otro mousedown. Va en fase de
	CAPTURA (`.capture`) para enterarse de TODO mousedown del panel aunque un hijo corte la
	propagación.

	🔴 Y NO ES UN "click afuera" ESCUCHADO EN `document`: los b-popover y b-modal de
	BootstrapVue que abre el chat (la ficha del artículo, la cuenta corriente, el visor de
	fotos) se montan colgados de <body>, fuera de este árbol, y un click adentro de ellos
	contaría como "afuera del panel" y cerraría el chat. Un click en esos elementos nunca
	tiene como target al overlay, así que acá no molestan.

	Las dos vistas comparten la misma instancia del chat y del compositor. El lateral deja
	pasar los clics al sistema para poder seguir trabajando y hacer recorridos. -->
	<div
	class="asistente-ia-overlay"
	:class="{ 'asistente-ia-overlay--lateral': es_lateral }"
	@mousedown.capture="al_mousedown_overlay"
	@click.self="al_click_overlay">
		<div
		id="asistente-ia-panel"
		class="asistente-ia-panel"
		:role="es_lateral ? 'region' : 'dialog'"
		aria-label="Asistente"
		:style="panel_inline_style">
			<!-- Manijas para estirar el modal entero desde los dos bordes. No existen en
			móvil, igual que el divisor de la sidebar: ahí el panel ocupa el ancho de la
			pantalla y no hay nada que elegir. Son invisibles en reposo (ver PanelResizer). -->
			<panel-resizer
			v-if="!es_movil && !es_lateral"
			lado="izquierda"
			@resize="on_panel_resize"
			@resize-end="on_panel_resize_end"></panel-resizer>

			<panel-resizer
			v-if="!es_movil && !es_lateral"
			lado="derecha"
			@resize="on_panel_resize"
			@resize-end="on_panel_resize_end"></panel-resizer>

			<!-- Sidebar: lista de conversaciones. En escritorio es una columna
			redimensionable; bajo 768px se esconde y aparece como cajón (D38). -->
			<div
			v-show="!es_lateral && (!es_movil || sidebar_movil_abierta)"
			class="asistente-ia-panel__sidebar"
			:class="{ 'asistente-ia-panel__sidebar--abierta': sidebar_movil_abierta }"
			:style="sidebar_inline_style">
				<conversation-list
				:es_cajon="es_movil"
				@select="on_conversation_selected"
				@cerrar="sidebar_movil_abierta = false"></conversation-list>
			</div>

			<!-- Fondito que cierra el cajón móvil al tocar afuera de la lista. -->
			<div
			v-if="!es_lateral && es_movil && sidebar_movil_abierta"
			class="asistente-ia-panel__telon"
			@click="sidebar_movil_abierta = false"></div>

			<!-- Divisor redimensionable reusado de Vender (D39); no existe en móvil. Acá se
			pinta transparente (ver el <style>): en ia-spa la barra y la conversación se
			separan solo por el color de fondo. -->
			<vender-resizer
			v-if="!es_movil && !es_lateral"
			@resize="on_sidebar_resize"
			@resize-end="on_sidebar_resize_end"></vender-resizer>

			<div class="asistente-ia-panel__main">
				<!-- Encabezado de 52px sin borde, como el de ia-spa (chat/Encabezado.vue): en el
				teléfono, el botón de la lista a la izquierda y el de chat nuevo a la derecha. -->
				<header class="asistente-ia-panel__header">
					<button
					v-if="es_movil && !es_lateral"
					type="button"
					class="asistente-ia-panel__boton"
					title="Conversaciones"
					aria-label="Abrir la lista de conversaciones"
					:aria-expanded="sidebar_movil_abierta ? 'true' : 'false'"
					@click="sidebar_movil_abierta = !sidebar_movil_abierta">
						<icono nombre="menu"></icono>
					</button>
					<span class="asistente-ia-panel__orb" aria-hidden="true">✦</span>
					<div class="asistente-ia-panel__identidad">
						<strong>Tu asistente</strong>
						<span class="asistente-ia-panel__titulo">{{ titulo_cabecera }}</span>
					</div>
					<button
					v-if="es_movil || es_lateral"
					type="button"
					class="asistente-ia-panel__boton"
					title="Nueva conversación"
					aria-label="Nueva conversación"
					:disabled="vacia"
					@click="nueva_conversacion">
						<icono nombre="nuevo"></icono>
					</button>
					<button
					class="asistente-ia-panel__boton"
					type="button"
					:title="texto_cambiar_modo"
					:aria-label="texto_cambiar_modo"
					@click="$emit('cambiar-modo', es_lateral ? 'completo' : 'lateral')">
						<i :class="es_lateral ? 'bi bi-arrows-angle-expand' : 'bi bi-arrows-angle-contract'" aria-hidden="true"></i>
					</button>
					<button
					class="asistente-ia-panel__boton"
					type="button"
					title="Cerrar el asistente"
					aria-label="Cerrar el asistente"
					@click="cerrar">
						<icono nombre="cerrar"></icono>
					</button>
				</header>
				<slot name="guia"></slot>

				<!-- Con la conversación en blanco, en escritorio y tablet, el saludo y el
				compositor quedan centrados y las sugerencias abajo (como ChatGPT e ia-spa,
				views/Chat.vue). En el teléfono el saludo queda en el medio y las sugerencias van
				arriba del compositor, en una fila que se desliza. -->
				<div
				class="asistente-ia-panel__cuerpo"
				:class="{ 'asistente-ia-panel__cuerpo--vacia': vacia && !es_movil && !es_lateral }">
					<conversation
					:esperando_bandeja="!bandeja_cargada"></conversation>
					<composer
					ref="composer"
					:vacia="vacia">
						<template v-slot:arriba>
							<pantalla-vacia
							v-if="vacia && (es_movil || es_lateral)"
							class="asistente-ia-panel__sugerencias-tel"
							solo_sugerencias
							@sugerencia="usar_sugerencia"></pantalla-vacia>
						</template>
					</composer>
					<div
					v-if="vacia && !es_movil && !es_lateral"
					class="asistente-ia-panel__sugerencias">
						<pantalla-vacia
						solo_sugerencias
						@sugerencia="usar_sugerencia"></pantalla-vacia>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import ConversationList from '@/components/asistente-ia/ConversationList'
import Conversation from '@/components/asistente-ia/Conversation'
import Composer from '@/components/asistente-ia/Composer'
import PanelResizer from '@/components/asistente-ia/PanelResizer'
import PantallaVacia from '@/components/asistente-ia/PantallaVacia'
import Icono from '@/components/asistente-ia/Icono'
import VenderResizer from '@/components/vender/components/VenderResizer'

// Límites del ancho de la sidebar en px (D38).
const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 420
const SIDEBAR_DEFAULT = 260

// Límites del ancho del MODAL ENTERO en px (pedido de Lucas, 19/8/2026).
//
// 🔴 984 no es un número redondo elegido a ojo: es 820 × 1.2, el ancho fijo que tenía
// el panel hasta ahora más el 20% que pidió Lucas. Si alguien lo "redondea" a 1000, deja
// de ser el 20% y el pedido original se pierde sin que nada lo denuncie.
const PANEL_MIN = 720
const PANEL_MAX = 1600
const PANEL_DEFAULT = 984

export default {
	props: {
		modo: {
			type: String,
			default: 'lateral',
		},
	},
	components: {
		ConversationList,
		Conversation,
		Composer,
		PanelResizer,
		PantallaVacia,
		Icono,
		VenderResizer,
	},
	data() {
		return {
			// Ancho actual de la sidebar en px (solo escritorio).
			sidebar_width_px: SIDEBAR_DEFAULT,
			// Ancho actual del modal entero en px (solo escritorio).
			panel_width_px: PANEL_DEFAULT,
			// true cuando el cajón de conversaciones está abierto (solo móvil).
			sidebar_movil_abierta: false,
			// Ancho del viewport, para decidir el modo cajón bajo 768px.
			viewport_width: typeof window !== 'undefined' ? window.innerWidth : 1200,
			// true si el último mousedown arrancó en el overlay (el fondo, afuera del panel).
			// Es la guarda del cierre por click afuera: ver el comentario del <template>.
			mousedown_en_overlay: false,
			// true cuando terminó (bien o mal) la primera carga de la bandeja al abrir el panel.
			//
			// 🔴 Existe por la pantalla vacía centrada (misión agente-mejoras-uso-real): hasta que
			// llega la bandeja no hay conversación elegida y los mensajes están vacíos, o sea que
			// "conversación en blanco" daba true durante el viaje del GET y el compositor saltaba
			// del centro a abajo en cada apertura. Mientras tanto la conversación muestra su
			// "cargando" (ver la prop esperando_bandeja de Conversation.vue).
			bandeja_cargada: false,
		}
	},
	computed: {
		es_lateral() {
			return this.modo === 'lateral'
		},
		texto_cambiar_modo() {
			return this.es_lateral ? 'Expandir y ver conversaciones' : 'Volver al panel lateral'
		},
		conversations() {
			return this.$store.state.ai_chat.conversations
		},
		selected_conversation_id() {
			return this.$store.state.ai_chat.selected_conversation_id
		},
		selected_conversation() {
			return this.$store.getters['ai_chat/selected_conversation']
		},
		titulo_cabecera() {
			if (this.selected_conversation && this.selected_conversation.titulo) {
				return this.selected_conversation.titulo
			}
			return 'Nueva conversación'
		},
		es_movil() {
			return this.viewport_width < 768
		},
		/**
		 * true con la conversación en blanco (la de "Nuevo chat", todavía sin crear): ahí va la
		 * pantalla vacía de ia-spa, con el saludo, el compositor centrado y las sugerencias.
		 * Deja de serlo apenas sube el globo optimista del primer mensaje, como en ChatGPT.
		 *
		 * @returns {Boolean}
		 */
		vacia() {
			let chat = this.$store.state.ai_chat
			return this.bandeja_cargada && !chat.selected_conversation_id && !chat.messages.length && !chat.loading_messages
		},
		/**
		 * En escritorio la sidebar lleva el ancho elegido; en móvil el ancho lo fija
		 * el CSS del cajón.
		 */
		sidebar_inline_style() {
			if (this.es_movil) {
				return null
			}
			return {
				width: this.sidebar_width_px + 'px',
			}
		},
		/**
		 * Ancho del modal entero, en px pelados.
		 *
		 * 🔴 El techo de 96vw NO se pone acá: lo pone el `max-width` del CSS, que gana
		 * sobre este `width` sin que haya que calcular nada. Es a propósito, y no un
		 * olvido: el ancho se guarda por PERSONA y no por dispositivo, así que alguien que
		 * estira el panel a 1600 en el escritorio después abre el sistema desde el
		 * teléfono con ese mismo 1600 guardado. El `max-width` es lo que evita que el
		 * modal se salga de la pantalla, y es también lo que gobierna bajo 768px, donde
		 * las manijas no existen.
		 */
		panel_inline_style() {
			if (this.es_lateral) {
				return null
			}
			return {
				width: this.panel_width_px + 'px',
			}
		},
	},
	created() {
		let self = this

		this.hidratar_ancho_sidebar()
		this.hidratar_ancho_panel()

		// Consumo de IA del mes para el footer de la sidebar (S2). Si el API es viejo y no
		// tiene el endpoint, queda null y el footer no se muestra (degradación limpia).
		this.$store.dispatch('ai_chat/fetchMiConsumo')

		// Al abrir el panel: la bandeja siempre se refresca, y se cae a la última
		// conversación con actividad salvo que ya hubiera una elegida (D44) — por
		// ejemplo la que dejó seteada abrir_chat_ia() desde la notificación (D22).
		this.$store.dispatch('ai_chat/getConversations')
			.then(() => {
				self.bandeja_cargada = true
				if (self.selected_conversation_id) {
					self.$store.dispatch('ai_chat/getMessages', {
						conversation_id: self.selected_conversation_id,
						page: 1,
					})
				} else if (self.conversations.length) {
					// El watch de selected_conversation_id dispara la carga de mensajes.
					self.$store.commit('ai_chat/setSelectedConversationId', self.conversations[0].id)
				} else {
					self.$store.commit('ai_chat/setMessages', [])
				}
			})
	},
	mounted() {
		const self = this
		window.addEventListener('resize', self.on_window_resize)
		document.addEventListener('keydown', self.on_document_keydown)
	},
	beforeDestroy() {
		const self = this
		window.removeEventListener('resize', self.on_window_resize)
		document.removeEventListener('keydown', self.on_document_keydown)
	},
	watch: {
		modo() {
			this.sidebar_movil_abierta = false
		},
		/**
		 * Cada cambio de conversación abierta carga su primera página. Con null
		 * (conversación nueva sin crear) no hay nada que pedir.
		 */
		selected_conversation_id(id) {
			// La selección que hace createConversation al enviar el primer mensaje
			// NO recarga: la conversación recién nace vacía en el backend y el GET
			// pisaría el globo optimista que ya está en pantalla.
			if (this.$store.state.ai_chat.seleccion_sin_recarga) {
				this.$store.commit('ai_chat/setSeleccionSinRecarga', false)
				return
			}
			if (id) {
				this.$store.dispatch('ai_chat/getMessages', {
					conversation_id: id,
					page: 1,
				})
			}
		},
	},
	methods: {
		/**
		 * Ancho inicial de la sidebar: el elegido en esta sesión (store), o el
		 * persistido por persona que viajó en GET api/user, o el default (D38).
		 */
		hidratar_ancho_sidebar() {
			let width = this.$store.state.ai_chat.sidebar_width
			if (!width && this.user && this.user.chat_ia_sidebar_width) {
				width = parseInt(this.user.chat_ia_sidebar_width, 10)
			}
			if (!width || isNaN(width)) {
				width = SIDEBAR_DEFAULT
			}
			this.sidebar_width_px = this.clamp_sidebar_width(width)
		},
		clamp_sidebar_width(width) {
			return Math.min(Math.max(SIDEBAR_MIN, width), SIDEBAR_MAX)
		},
		/**
		 * Ancho inicial del modal: el elegido en esta sesión (store), o el persistido por
		 * persona que viajó en GET api/user, o el default. Mismo orden que la sidebar.
		 */
		hidratar_ancho_panel() {
			let width = this.$store.state.ai_chat.panel_width
			if (!width && this.user && this.user.chat_ia_panel_width) {
				width = parseInt(this.user.chat_ia_panel_width, 10)
			}
			if (!width || isNaN(width)) {
				width = PANEL_DEFAULT
			}
			this.panel_width_px = this.clamp_panel_width(width)
		},
		/**
		 * 🔴 PANEL_MIN y PANEL_MAX tienen que decir el MISMO número que el rango de
		 * set_chat_ia_preferencias en empresa-api (720..1600). Si acá se amplía el rango y
		 * allá no, el usuario arrastra hasta un ancho que se ve bien, el PUT vuelve 422 y
		 * savePreferences() se lo traga en un console.log: el ancho se pierde en silencio
		 * y recién se nota al recargar.
		 */
		clamp_panel_width(width) {
			return Math.min(Math.max(PANEL_MIN, width), PANEL_MAX)
		},
		/**
		 * Igual que el anterior, pero además contra lo que ENTRA EN LA PANTALLA de ahora.
		 *
		 * 🔴 Solo se usa al ARRASTRAR, nunca al hidratar, y la diferencia importa. El
		 * ancho visible lo topea el `max-width: 96vw` del CSS, así que sin este corte el
		 * número seguía creciendo hasta 1600 con el borde ya clavado: en una pantalla de
		 * 1366px son ~145px de cursor sin efecto, y para achicar había que arrastrar de
		 * vuelta todo lo acumulado antes de ver moverse algo.
		 *
		 * Al hidratar NO se aplica, a propósito: el ancho es de la persona y no del
		 * dispositivo, y recortarlo ahí convertiría una visita desde el teléfono en una
		 * pérdida permanente del ancho elegido en el escritorio.
		 */
		clamp_panel_width_visible(width) {
			let tope_pantalla = PANEL_MAX
			if (typeof window !== 'undefined' && window.innerWidth) {
				tope_pantalla = Math.min(PANEL_MAX, Math.floor(window.innerWidth * 0.96))
			}
			// Si la pantalla es tan angosta que ni el mínimo entra, manda PANEL_MIN: el
			// max-width del CSS se encarga de que igual no desborde.
			return Math.min(Math.max(PANEL_MIN, width), Math.max(PANEL_MIN, tope_pantalla))
		},
		/**
		 * Suma el delta de una manija de borde, que ya viene orientado hacia afuera.
		 *
		 * 🔴 El ×2 no sobra. El modal está CENTRADO en el overlay, así que su ancho se
		 * reparte mitad y mitad a los dos lados: para que un borde se corra N px, el ancho
		 * tiene que crecer 2N. Sin el ×2 el borde avanza la mitad de lo que avanza el
		 * cursor y el arrastre se siente pegajoso.
		 */
		on_panel_resize(delta) {
			this.panel_width_px = this.clamp_panel_width_visible(this.panel_width_px + (delta * 2))
		},
		/**
		 * Al soltar se persiste, igual que la sidebar: en el store para reaperturas del
		 * panel en esta sesión, y en la base por persona vía savePreferences.
		 */
		on_panel_resize_end() {
			this.$store.commit('ai_chat/setPanelWidth', this.panel_width_px)
			this.$store.dispatch('ai_chat/savePreferences', {
				chat_ia_panel_width: this.panel_width_px,
			})
		},
		/**
		 * Suma el delta que emite el resizer, acotado a los límites (D39).
		 */
		on_sidebar_resize(delta) {
			this.sidebar_width_px = this.clamp_sidebar_width(this.sidebar_width_px + delta)
		},
		/**
		 * Al soltar el divisor se persiste: en el store para reaperturas del panel
		 * en esta sesión, y en la base por persona vía savePreferences (D39).
		 */
		on_sidebar_resize_end() {
			this.$store.commit('ai_chat/setSidebarWidth', this.sidebar_width_px)
			this.$store.dispatch('ai_chat/savePreferences', {
				chat_ia_sidebar_width: this.sidebar_width_px,
			})
		},
		on_window_resize() {
			this.viewport_width = window.innerWidth
		},
		/**
		 * Escape cierra el panel, igual que el botón de la cabecera.
		 */
		on_document_keydown(event) {
			if (event.key === 'Escape') {
				this.cerrar()
			}
		},
		/**
		 * Al elegir una conversación (o crear una nueva) desde la lista, en móvil
		 * el cajón se guarda solo.
		 */
		on_conversation_selected() {
			this.sidebar_movil_abierta = false
		},
		/**
		 * El botón de chat nuevo del encabezado del teléfono (el de ia-spa): lo mismo que
		 * "Nuevo chat" de la barra lateral (ConversationList.vue::nueva_conversacion), sin
		 * tener que abrir el cajón. La conversación real se crea recién al enviar el primer
		 * mensaje.
		 */
		nueva_conversacion() {
			this.$store.commit('ai_chat/setSelectedConversationId', null)
			this.$store.commit('ai_chat/setMessages', [])
			this.sidebar_movil_abierta = false
		},
		/**
		 * Una sugerencia de la pantalla vacía: el compositor la escribe y la manda, por el
		 * mismo camino que un mensaje tipeado (su manejo del 409 incluido).
		 *
		 * @param {String} texto
		 */
		usar_sugerencia(texto) {
			if (this.$refs.composer) {
				this.$refs.composer.escribir_y_mandar(texto)
			}
		},
		/**
		 * Anota si el mousedown arrancó en el overlay mismo. Corre en captura, así que ve
		 * todos los mousedown del árbol: uno sobre el panel (una manija, el texto, un botón)
		 * apaga la bandera, y solo uno sobre el fondo la prende.
		 */
		al_mousedown_overlay(event) {
			this.mousedown_en_overlay = event.target === event.currentTarget
		},
		/**
		 * Click con target en el overlay: cierra solo si el mousedown también fue ahí. Si
		 * no, era un arrastre o una selección que se soltó afuera del panel, y no se cierra.
		 */
		al_click_overlay() {
			let cerrar = this.mousedown_en_overlay
			this.mousedown_en_overlay = false
			if (cerrar && !this.es_lateral) {
				this.cerrar()
			}
		},
		cerrar() {
			this.$store.commit('ai_chat/setPanelAbierto', false)
		},
	},
}
</script>

<style lang="sass">
@import '@/components/asistente-ia/_mixins'
@import '@/components/demo/_estetica-asistente'

.asistente-ia-overlay
	--ia-velo: rgba(0, 0, 0, .52)
	position: fixed
	inset: 0
	background: var(--ia-velo)
	z-index: 1055
	/* El contenedor global del sistema centra el texto: la ventana va alineada a la izquierda, como la app. */
	text-align: left
	display: flex
	align-items: center
	justify-content: center

	&--lateral
		inset: 76px 18px 18px
		z-index: 1040
		justify-content: flex-end
		background: transparent
		pointer-events: none

		.asistente-ia-panel
			width: min(420px, 100%)
			max-width: none
			height: 100%
			pointer-events: auto

		.asistente-ia-panel__main
			padding-right: 0

// Los tokens se aplican solo acá: los mismos mensajes se usan en otros paneles del sistema.
.asistente-ia-panel
	--ia-bg: #{$asistente-hilo}
	--ia-bg-barra: #{$asistente-cabecera}
	--ia-bg-burbuja: #{$asistente-burbuja}
	--ia-bg-compositor: #{$asistente-compositor}
	--ia-bg-elevado: #232d48
	--ia-bg-sutil: #1b2239
	--ia-bg-hover: #252e48
	--ia-bg-activo: #303b5b
	--ia-texto: #e8edf8
	--ia-texto-2: #b9c5de
	--ia-texto-3: #a3aec6
	--ia-borde: #303b5b
	--ia-borde-fuerte: #465475
	--ia-primario: #a9ceff
	--ia-primario-tinte: rgba(148, 179, 255, .13)
	--ia-primario-tinte-fuerte: rgba(148, 179, 255, .22)
	--ia-foco: #8fc7ff
	--ia-ok: #75e3bb
	--ia-peligro: #ffb9bc
	--ia-peligro-tinte: rgba(255, 185, 188, .13)
	--ia-boton-enviar: #c2c4ff
	--ia-boton-enviar-texto: #151b2e
	--ia-boton-enviar-apagado: #373f62
	--ia-boton-enviar-apagado-texto: #c2c4ff
	max-width: 96vw
	height: min(88vh, 900px)
	border: 1px solid transparent
	background: linear-gradient($asistente-hilo, $asistente-hilo) padding-box, $asistente-degrade border-box
	background-size: 100% 100%, 300% 300%
	color: var(--ia-texto)
	font-family: var(--ia-fuente)
	font-size: 16px
	line-height: 1.5
	-webkit-font-smoothing: antialiased
	-moz-osx-font-smoothing: grayscale
	border-radius: 24px
	box-shadow: 0 24px 70px #090d2852, 0 0 26px #7969ec20
	display: flex
	overflow: hidden
	position: relative
	animation: asistente-ia-panel-entrada .18s ease-out, asistente-ia-panel-onda 9s ease infinite

	// 🔴 common-vue/sass/_inputs.sass le pone a TODO <button> del sistema una sombra diagonal de
	// formulario (salvo en modales, navbar y sidebars). En ia-spa ningún botón tiene sombra, así
	// que adentro del panel se apaga para todos de una vez. Pesa (0,1,1) contra el (0,0,1) de
	// allá; el anillo de foco de un .btn de bootstrap (`.btn:focus`, 0,2,0) sigue ganando.
	button
		box-shadow: none

	// Barras de desplazamiento discretas, las de ia-spa.
	*
		scrollbar-width: thin
		scrollbar-color: var(--ia-borde-fuerte) transparent

	*::-webkit-scrollbar
		width: 8px
		height: 8px

	*::-webkit-scrollbar-thumb
		background: var(--ia-borde-fuerte)
		border-radius: 8px

	*::-webkit-scrollbar-track
		background: transparent

	// La barra lateral de ia-spa: gris apenas más oscuro que la conversación y sin borde (el
	// cambio de fondo ya separa).
	&__sidebar
		flex-shrink: 0
		min-width: 0
		background: var(--ia-bg-barra)
		display: flex
		flex-direction: column

	&__telon
		position: absolute
		inset: 0
		background: var(--ia-velo)
		z-index: 2

	&__main
		flex: 1
		min-width: 0
		display: flex
		flex-direction: column
		background: var(--ia-bg)
		// 🔴 Franja reservada para la manija derecha. La conversación scrollea sola
		// (overflow-y: auto) y su barra de scroll se apoya en el borde derecho de este
		// contenedor: sin estos 6px, la barra queda DEBAJO de la manija y agarrar el thumb
		// redimensiona el modal en lugar de scrollear. El padding no mueve una barra de
		// scroll, hay que angostar el contenedor -- por eso va acá y no en la conversación.
		padding-right: 6px

	&__header
		min-height: 72px
		flex-shrink: 0
		display: flex
		align-items: center
		gap: 8px
		padding: 12px 14px
		background: $asistente-cabecera

	&__orb
		+asistente-orb

	&__identidad
		flex: 1
		min-width: 0

		strong
			color: #fff

	&__titulo
		display: block
		font-size: .75rem
		color: var(--ia-texto-3)
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	&__boton
		+asistente-ia-boton-icono(34px, 10px)
		background: #ffffff0d
		flex-shrink: 0

		&:disabled
			opacity: .35
			cursor: default

	&__cuerpo
		flex: 1
		min-height: 0
		display: flex
		flex-direction: column

	// La pantalla vacía de ia-spa en escritorio y tablet (views/Chat.vue,
	// `.principal__cuerpo--vacia`): saludo y compositor centrados en el alto, sugerencias abajo.
	// La conversación deja de ocupar todo el alto (deja de ser `flex: 1`) para que el centrado
	// sea del bloque entero, y el aviso de "puede equivocarse" se esconde como allá.
	&__cuerpo--vacia
		justify-content: center
		padding-bottom: 8vh

		.asistente-ia-conversacion-marco, .asistente-ia-conversacion
			flex: 0 0 auto

		.asistente-ia-conversacion
			overflow: visible

		// El saludo pegado al compositor: su propio margen de abajo (28px) ya es la separación.
		.asistente-ia-conversacion__bienvenida
			padding: 0

		.asistente-ia-composer__aviso
			display: none

	&__sugerencias
		+asistente-ia-columna
		flex-shrink: 0
		margin-top: 16px

	&__sugerencias-tel
		margin-bottom: 10px

	.asistente-ia-composer
		background: $asistente-cabecera
		padding-top: 10px

	.asistente-ia-composer__caja
		border: 1px solid transparent
		border-radius: 16px
		background: linear-gradient($asistente-compositor, $asistente-compositor) padding-box, $asistente-degrade border-box
		background-size: 100% 100%, 300% 300%
		animation: asistente-ia-panel-onda 7s ease infinite

		&:focus-within
			outline: 2px solid var(--ia-foco)
			outline-offset: 2px

	.asistente-ia-composer__enviar
		border-radius: 11px

	.asistente-ia-msj-usuario__burbuja
		border-radius: 17px 17px 3px 17px

// El divisor de Vender pinta una barra gris de 6px entre la lista y la conversación. En ia-spa
// no hay nada ahí: se deja transparente (la "manija invisible") y se tiñe apenas al pasar el
// mouse o mientras se arrastra, para que se descubra. Las dos manijas de los bordes del modal,
// lo mismo con los tokens de acá.
//
// 🔴 Los selectores llevan las dos clases del panel adelante a propósito: los dos resizers tienen
// estilo `scoped` (clase + atributo, 0,2,0 o 0,3,0 con el estado) y a igual peso ganaría el orden
// de la hoja final, que depende del orden de carga de los módulos.
.asistente-ia-overlay .asistente-ia-panel
	.vender-resizer
		background: transparent

		&:hover, &.vender-resizer--active
			background: var(--ia-borde)

	.asistente-ia-resizer:hover, .asistente-ia-resizer.asistente-ia-resizer--activo
		background: var(--ia-borde-fuerte)

// Bajo 768px la sidebar es un cajón absoluto adentro del panel (D38): se abre
// con el botón de la lista del encabezado y el resizer no existe.
@media screen and (max-width: 767px)
	.asistente-ia-panel__header
		padding-left: 8px

	.asistente-ia-overlay--lateral
		inset: 68px 6px 6px

	// El recorrido interactúa con los controles de Vender detrás del chat. Se guarda
	// visualmente el lateral en el teléfono, conservando la conversación y el borrador.
	.asistente-ia-guia-activa .asistente-ia-overlay--lateral .asistente-ia-panel
		visibility: hidden
		pointer-events: none

	.asistente-ia-panel__sidebar
		position: absolute
		top: 0
		bottom: 0
		left: 0
		width: min(300px, 85%)
		z-index: 3
		transform: translateX(-100%)
		transition: transform .24s ease
		box-shadow: none

		&--abierta
			transform: translateX(0)
			box-shadow: 0 0 40px rgba(0, 0, 0, .3)

@keyframes asistente-ia-panel-entrada
	from
		opacity: 0
		transform: translateY(8px) scale(.98)
	to
		opacity: 1
		transform: translateY(0) scale(1)

@keyframes asistente-ia-panel-onda
	0%, 100%
		background-position: 0 0, 0% 50%
	50%
		background-position: 0 0, 100% 50%

@media (prefers-reduced-motion: reduce)
	.asistente-ia-panel, .asistente-ia-panel .asistente-ia-composer__caja
		animation: none

	.asistente-ia-panel__sidebar
		transition: none
</style>
