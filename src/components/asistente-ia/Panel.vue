<template>
	<section
	class="asistente-ia-overlay"
	:class="{ 'asistente-ia-overlay--lateral': es_lateral, 'agentes-modulo': !es_lateral, 'support-chat-overlay': soporte_activo }"
	aria-label="Agentes">
		<div id="asistente-ia-panel" ref="panel" class="asistente-ia-panel" tabindex="-1">
			<header
			class="agentes-cabecera"
			:class="{ 'agentes-cabecera--ampliada': cabecera_ampliada, 'agentes-cabecera--dos-filas': cabecera_en_dos_filas }"
			:data-tour="soporte_activo ? 'soporte.encabezado' : null">
				<div class="agentes-cabecera__marca">
					<span class="asistente-ia-panel__orb" aria-hidden="true">✦</span>
					<button
					v-if="lista_es_cajon && !guia_activa"
					type="button"
					class="asistente-ia-panel__boton"
					aria-label="Conversaciones"
					:aria-expanded="String(sidebar_movil_abierta)"
					@click="sidebar_movil_abierta = !sidebar_movil_abierta">
						<icono nombre="menu"></icono>
					</button>
				</div>
				<div class="agentes-selector" role="group" aria-label="Elegí un agente">
					<button v-if="puede_guia" type="button" :aria-pressed="String(guia_activa)" @click="cambiar_agente('guia')">
						Tu guía
					</button>
					<button v-if="puede_asistente" type="button" :aria-pressed="String(agente_activo === 'asistente')" @click="cambiar_agente('asistente')">
						Asistente personal
					</button>
					<button v-if="puede_soporte" type="button" :aria-pressed="String(soporte_activo)" @click="cambiar_agente('soporte')">
						Soporte
					</button>
				</div>
				<div class="agentes-cabecera__acciones">
					<a
					v-if="tienda_url"
					class="agentes-cabecera__tienda"
					:href="tienda_url"
					target="_blank"
					rel="noopener noreferrer"
					data-demo-tienda
					@click="$root.$emit('agentes:guia-pausar')">Tu tienda <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a>
					<button
					v-if="es_lateral"
					class="asistente-ia-panel__boton"
					type="button"
					title="Expandir a Agentes"
					aria-label="Expandir a Agentes"
					@click="$emit('expandir')">
						<i class="bi bi-arrows-angle-expand" aria-hidden="true"></i>
					</button>
					<button
					class="asistente-ia-panel__boton"
					type="button"
					title="Cerrar Agentes"
					aria-label="Cerrar Agentes"
					@click="$emit('cerrar')">
						<icono nombre="cerrar"></icono>
					</button>
				</div>
			</header>
			<div class="agentes-canal">
				<span>{{ texto_canal }}</span>
				<a v-if="telefono" :href="'https://wa.me/' + telefono" target="_blank" rel="noopener noreferrer">
					<icono nombre="whatsapp" :tamano="14"></icono>
					+{{ telefono }}
				</a>
			</div>
			<!-- Cambiar de agente desmonta el reproductor: no debe quedar audio en una pestaña oculta. -->
			<catalogo-videos-prueba v-if="!guia_activa" :key="agente_activo" ref="videos_prueba"></catalogo-videos-prueba>
			<div v-if="personal_visitado && puede_asistente" v-show="agente_activo === 'asistente'" class="agentes-espacio">
				<aside
				v-if="agente_activo === 'asistente' && (!lista_es_cajon || sidebar_movil_abierta)"
				class="asistente-ia-panel__sidebar"
				:class="{ 'agentes-lista--cajon': lista_es_cajon }"
				:style="sidebar_inline_style">
					<conversation-list
					:es_cajon="lista_es_cajon"
					@select="on_conversation_selected"
					@cerrar="sidebar_movil_abierta = false"></conversation-list>
				</aside>
				<vender-resizer v-if="!lista_es_cajon && !es_lateral" @resize="on_sidebar_resize" @resize-end="on_sidebar_resize_end"></vender-resizer>
				<div class="asistente-ia-panel__main">
					<slot name="guia"></slot>
					<div v-if="aviso_traslado" class="asistente-ia-panel__aviso-traslado">
						<span role="status">{{ aviso_traslado }}</span>
						<button type="button" :disabled="traslado_en_curso" @click="cargar_bandeja">Reintentar</button>
					</div>
					<div v-if="selected_conversation && selected_conversation.sistema_exclusivo_at" class="agentes-solo-sistema">
						<i class="bi bi-pc-display" aria-hidden="true"></i> Este hilo sigue únicamente en el sistema.
					</div>
					<div class="asistente-ia-panel__cuerpo">
						<conversation
						:esperando_bandeja="!bandeja_cargada"
						:ocultar_bienvenida="!!reporte_id"
						@ver-informe="abrir_reporte">
							<template #contexto>
								<div v-if="reporte_id" class="agentes-informe">
									<button type="button" class="agentes-informe__volver" @click="nueva_conversacion">Volver a los reportes diarios</button>
									<informe v-if="reporte" :reporte="reporte"></informe>
									<p v-else-if="error_reporte" role="status">No pudimos abrir el reporte. <button type="button" @click="cargar_reporte(reporte_id)">Reintentar</button></p>
									<p v-else role="status">Abriendo el reporte…</p>
								</div>
								<reportes-diarios v-else-if="vacia" @abrir="abrir_reporte"></reportes-diarios>
							</template>
						</conversation>
						<composer
						ref="composer"
						:bloqueado="traslado_en_curso && !selected_conversation_id"
						:clave_borrador="clave_borrador"
						:preparar_envio="preparar_envio_personal"
						:vacia="vacia">
							<template #arriba>
								<pantalla-vacia v-if="vacia && !reporte_id" class="asistente-ia-panel__sugerencias-tel" solo_sugerencias @sugerencia="usar_sugerencia"></pantalla-vacia>
							</template>
						</composer>
					</div>
				</div>
			</div>
			<soporte
			v-if="soporte_visitado && puede_soporte"
			v-show="soporte_activo"
			:activo="soporte_activo"
			:lista_es_cajon="lista_es_cajon"
			:lista_abierta="sidebar_movil_abierta"
			:sidebar_style="sidebar_inline_style"
			@cerrar-lista="sidebar_movil_abierta = false"></soporte>
			<!-- 🔴 Sin hijos de Vue, siempre: DemoChatPanel mete acá su $el con appendChild (ver acomodar_en_agentes). -->
			<div id="agentes-guia-lugar" ref="lugar_guia" v-show="guia_activa" class="agentes-guia-lugar"></div>
			<button
			v-if="lista_es_cajon && sidebar_movil_abierta"
			type="button"
			class="asistente-ia-panel__telon"
			aria-label="Cerrar lista de conversaciones"
			@click="sidebar_movil_abierta = false"></button>
		</div>
	</section>
</template>

<script>
import ConversationList from '@/components/asistente-ia/ConversationList'
import Conversation from '@/components/asistente-ia/Conversation'
import Composer from '@/components/asistente-ia/Composer'
import Soporte from '@/components/asistente-ia/Soporte'
import ReportesDiarios from '@/components/asistente-ia/ReportesDiarios'
import { confirmar_traspaso } from '@/components/asistente-ia/traspaso'
import PantallaVacia from '@/components/asistente-ia/PantallaVacia'
import Icono from '@/components/asistente-ia/Icono'
import VenderResizer from '@/components/vender/components/VenderResizer'
import { url_de_tienda } from '@/store/ai_chat'
import CatalogoVideosPrueba from '@/components/prueba/CatalogoVideosPrueba'

// Límites del ancho de la sidebar en px (D38).
const SIDEBAR_MIN = 180
const SIDEBAR_MAX = 420
const SIDEBAR_DEFAULT = 260

export default {
	props: {
		puede_asistente: Boolean,
		puede_soporte: Boolean,
		puede_guia: Boolean,
		modo: {
			type: String,
			default: 'lateral',
		},
	},
	components: {
		CatalogoVideosPrueba,
		ConversationList,
		Conversation,
		Composer,
		Soporte,
		ReportesDiarios,
		Informe: () => import('@/components/ia/Informe'),
		PantallaVacia,
		Icono,
		VenderResizer,
	},
	data() {
		return {
			// Ancho actual de la sidebar en px (solo escritorio).
			sidebar_width_px: SIDEBAR_DEFAULT,
			personal_visitado: false,
			soporte_visitado: false,
			canales: {},
			reporte_nuevo: null,
			reporte: null,
			error_reporte: false,
			// true cuando el cajón de conversaciones está abierto (solo móvil).
			sidebar_movil_abierta: false,
			// Ancho del viewport, para decidir el modo cajón bajo 768px.
			viewport_width: typeof window !== 'undefined' ? window.innerWidth : 1200,
			// true cuando terminó (bien o mal) la primera carga de la bandeja al abrir el panel.
			//
			// 🔴 Existe por la pantalla vacía centrada (misión agente-mejoras-uso-real): hasta que
			// llega la bandeja no hay conversación elegida y los mensajes están vacíos, o sea que
			// "conversación en blanco" daba true durante el viaje del GET y el compositor saltaba
			// del centro a abajo en cada apertura. Mientras tanto la conversación muestra su
			// "cargando" (ver la prop esperando_bandeja de Conversation.vue).
			bandeja_cargada: false,
			traslado_en_curso: false,
			aviso_traslado: '',
			panel_vigente: true,
		}
	},
	computed: {
		es_lateral() {
			return this.modo === 'lateral'
		},
		/**
		 * El agente que se está mostrando, ya resuelto contra lo que la cuenta puede usar.
		 *
		 * @returns {String} 'guia' | 'soporte' | 'asistente'
		 */
		agente_activo() {
			const agente = this.$store.state.ai_chat.agente
			// Una cuenta que solo tiene la guía (un empleado de la demo) cae siempre en ella:
			// si no, el lateral quedaba vacío con el 'asistente' por defecto del store.
			if (this.puede_guia && (agente === 'guia' || (!this.puede_asistente && !this.puede_soporte))) return 'guia'
			if (this.puede_soporte && (!this.puede_asistente || agente === 'soporte')) return 'soporte'
			return 'asistente'
		},
		guia_activa() { return this.agente_activo === 'guia' },
		soporte_activo() { return this.agente_activo === 'soporte' },
		tienda_url() { return url_de_tienda(this.owner && this.owner.online) },
		/**
		 * La cabecera solo cambia su reparto si tiene algo más que mostrar: una cuenta sin tienda
		 * ni guía tiene que seguir viéndose exactamente como antes de esta misión.
		 *
		 * @returns {Boolean}
		 */
		cabecera_ampliada() { return this.puede_guia || !!this.tienda_url },
		cabecera_en_dos_filas() {
			return this.cabecera_ampliada && (this.es_movil || (this.es_lateral && this.viewport_width < 1000))
		},
		texto_canal() {
			// «Tu guía» existe solo en la demo (misión prueba-ayuda-unificada-en-soporte: la prueba la perdió).
			if (this.guia_activa) return 'Tu asistente de la demo: explorá, preguntá y probá.'
			return this.soporte_activo ? 'Conversaciones supervisadas por el equipo de Soporte de ComercioCity.' : 'Esta conversación es privada entre vos y tu asistente personal.'
		},
		lista_es_cajon() { return this.es_movil || (this.es_lateral && this.viewport_width < 1000) },
		telefono() {
			if (this.guia_activa) return ''
			const valor = this.canales[this.soporte_activo ? 'soporte' : 'asistente']
			const numero = typeof valor === 'string' ? valor.replace(/\D/g, '') : ''
			return numero.length >= 8 && numero.length <= 15 ? numero : ''
		},
		reporte_id() {
			const hilo = this.selected_conversation
			return this.reporte_nuevo || (hilo && hilo.origen === 'mostrador_reporte' ? hilo.referencia_id : null)
		},
		clave_borrador() {
			if (this.reporte_id) return 'reporte:' + this.reporte_id
			return this.selected_conversation_id == null ? 'nuevo' : 'hilo:' + this.selected_conversation_id
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
			if (this.lista_es_cajon) {
				return null
			}
			return {
				width: (this.es_lateral ? 188 : this.sidebar_width_px) + 'px',
			}
		},
	},
	created() {
		this.hidratar_ancho_sidebar()
		this.preparar_agente(this.agente_activo)
		this.$axios.get('/api/agentes/canales', { skip_global_error_event: true, skip_navigation_cancel: true })
			.then(res => { this.canales = res.data || {} })
			.catch(() => {})
	},
	mounted() {
		this.foco_antes_de_abrir = document.activeElement
		window.addEventListener('resize', this.on_window_resize)
		document.addEventListener('keydown', this.on_document_keydown)
		this.$root.$emit('agentes:guia-lugar')
	},
	beforeDestroy() {
		// Se mira el foco ANTES de sacar la guía: si estaba en su textarea, al sacarla cae al body
		// y ya no se sabría que había que devolverlo.
		const tenia_el_foco = !!(this.$refs.panel && this.$refs.panel.contains(document.activeElement))
		// Antes de que Vue desarme el lateral: la conversación de la guía tiene que sobrevivirle.
		this.$root.$emit('agentes:guia-lugar-sale', this.$refs.lugar_guia)
		this.panel_vigente = false
		window.removeEventListener('resize', this.on_window_resize)
		document.removeEventListener('keydown', this.on_document_keydown)
		const foco = this.foco_antes_de_abrir
		if (foco && tenia_el_foco) {
			this.$nextTick(() => {
				if (document.activeElement === document.body && foco.isConnected && !this.hay_interfaz_encima()) {
					foco.focus({ preventScroll: true })
				}
			})
		}
	},
	watch: {
		modo() { this.cerrar_videos_prueba(); this.sidebar_movil_abierta = false },
		'$store.state.support_message.active_ticket_id'() { this.cerrar_videos_prueba() },
		agente_activo(valor) {
			this.sidebar_movil_abierta = false
			this.preparar_agente(valor)
		},
		/**
		 * La guía (DemoChatPanel) decide si se muestra mirando `ai_chat.agente` del store, no este
		 * computed. Si el agente resuelto es la guía y el store dice otra cosa (F5 en /agentes, o una
		 * cuenta que solo tiene la guía), se alinea el store para que la guía no quede escondida.
		 */
		guia_activa: {
			immediate: true,
			handler(activa) {
				if (activa && this.$store.state.ai_chat.agente !== 'guia') this.$store.commit('ai_chat/setAgente', 'guia')
			},
		},
		reporte_id: {
			immediate: true,
			handler(id) { this.cargar_reporte(id) },
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
		cerrar_videos_prueba() { if (this.$refs.videos_prueba) this.$refs.videos_prueba.cerrar() },
		cargar_bandeja() {
			let self = this
			const usuario = this.user
			const revision_seleccion = this.$store.state.ai_chat.revision_seleccion
			const sigue_vigente = () => self.panel_vigente && usuario && self.user && self.user.id === usuario.id
			const trasladar = usuario && usuario.puede_unificar_chat_prueba === true

			this.traslado_en_curso = trasladar
			const recuperacion = trasladar ? this.recuperar_chat_prueba() : Promise.resolve()
			recuperacion.then(() => {
				if (!sigue_vigente()) return
				return self.$store.dispatch('ai_chat/getConversations').then(() => {
					if (!sigue_vigente()) return
					self.bandeja_cargada = true
					self.traslado_en_curso = false
					const seleccion_paso = revision_seleccion === self.$store.state.ai_chat.revision_seleccion
					const id_actual = self.selected_conversation_id
					if (id_actual && seleccion_paso) self.$store.dispatch('ai_chat/getMessages', { conversation_id: id_actual, page: 1 })
				})
			})
		},
		recuperar_chat_prueba() {
			let self = this
			const fallo = () => {
				self.aviso_traslado = 'No pudimos recuperar tu conversación de la prueba.'
				return null
			}
			return this.$axios.post('/api/prueba/chat/trasladar', {}, {
				skip_navigation_cancel: true,
				timeout: 12000,
			}).then(res => {
				if (!res.data || res.data.disponible !== true) return fallo()
				self.aviso_traslado = res.data.pendiente ? 'Todavía falta una respuesta de tu conversación de la prueba.' : ''
				return res.data.conversacion_id
			}).catch(fallo)
		},
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
		hay_interfaz_encima() {
			return document.body.classList.contains('modal-open')
				|| Boolean(document.querySelector('.modal.show, .popover.show, .driver-popover, .driver-active, .asistente-ia-guia-activa'))
		},
		on_document_keydown(evento) {
			if (evento.key !== 'Escape' || evento.defaultPrevented || this.hay_interfaz_encima()) return
			const panel = this.$refs.panel
			if (!panel || (this.es_lateral && !panel.contains(document.activeElement))) return
			evento.preventDefault()
			if (this.sidebar_movil_abierta) this.sidebar_movil_abierta = false
			else this.$emit('cerrar')
		},
		/**
		 * Al elegir una conversación (o crear una nueva) desde la lista, en móvil
		 * el cajón se guarda solo.
		 */
		on_conversation_selected() {
			this.reporte_nuevo = null
			this.sidebar_movil_abierta = false
		},
		/**
		 * El botón de chat nuevo del encabezado del teléfono (el de ia-spa): lo mismo que
		 * "Nuevo chat" de la barra lateral (ConversationList.vue::nueva_conversacion), sin
		 * tener que abrir el cajón. La conversación real se crea recién al enviar el primer
		 * mensaje.
		 */
		nueva_conversacion() {
			this.reporte_nuevo = null
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
		cambiar_agente(agente) {
			this.$store.commit('ai_chat/setAgente', agente)
		},
		preparar_agente(agente) {
			if (agente === 'soporte') this.soporte_visitado = true
			// La guía trae su propia conversación: no carga la bandeja ni el consumo del personal.
			else if (agente === 'asistente' && !this.personal_visitado && this.puede_asistente) {
				this.personal_visitado = true
				this.$store.dispatch('ai_chat/fetchMiConsumo')
				this.cargar_bandeja()
			}
		},
		abrir_reporte(reporte) {
			const id = typeof reporte === 'object' ? reporte.id : reporte
			const hilo = this.selected_conversation
			if (hilo && hilo.origen === 'mostrador_reporte' && hilo.referencia_id == id) {
				const informe = this.$el.querySelector('.agentes-informe')
				if (informe) informe.scrollIntoView({ block: 'start' })
				return
			}
			this.nueva_conversacion()
			const conversacion = this.conversations.find(item => item.origen === 'mostrador_reporte' && item.referencia_id == id)
			if (conversacion) this.$store.commit('ai_chat/setSelectedConversationId', conversacion.id)
			else this.reporte_nuevo = id
		},
		cargar_reporte(id) {
			const solicitud = {}
			this._solicitud_reporte = solicitud
			this.reporte = null
			this.error_reporte = false
			if (!id) return
			this.$axios.get('/api/mostrador/reportes/' + id, { skip_global_error_event: true, skip_navigation_cancel: true })
				.then(res => {
					if (this._solicitud_reporte !== solicitud || !this.panel_vigente) return
					this.reporte = res.data.model
					this.$store.commit('mostrador/marcarLeido', id)
				})
				.catch(() => {
					if (this._solicitud_reporte === solicitud) this.error_reporte = true
				})
		},
		preparar_envio_personal() {
			const hilo = this.selected_conversation
			const opciones = { agentes_version: 1 }
			const whatsapp = hilo && (hilo.origen_canal || hilo.origen) === 'whatsapp' && !hilo.sistema_exclusivo_at
			if (whatsapp) {
				return confirmar_traspaso(this).then(confirmado => confirmado && this.selected_conversation_id === hilo.id && this.agente_activo === 'asistente'
					? Object.assign(opciones, { traspasar_a_sistema: 1 }) : null)
			}
			if (!this.reporte_nuevo) return Promise.resolve(opciones)
			const id = this.reporte_nuevo
			const revision = this.$store.state.ai_chat.revision_seleccion
			return this.$store.dispatch('mostrador/crearConversacion', { id: id, seleccion_vigente: () => {
				return this.panel_vigente && this.agente_activo === 'asistente' && this.reporte_nuevo === id && this.$store.state.ai_chat.revision_seleccion === revision
			} }).then(conversacion => {
				if (!conversacion || !this.panel_vigente || this.agente_activo !== 'asistente' || this.reporte_nuevo !== id || this.selected_conversation_id !== conversacion.id) return null
				this.reporte_nuevo = null
				return this.preparar_envio_personal()
			})
		},
	},
}
</script>

<style lang="sass">
@import '@/components/asistente-ia/_mixins'
@import '@/components/demo/_estetica-asistente'

#agentes-confirmar-traspaso___BV_modal_outer_
	z-index: 1095 !important

.asistente-ia-overlay
	--ia-velo: rgba(0, 0, 0, .52)
	text-align: left

	&--lateral
		position: fixed
		inset: 76px 18px 18px
		z-index: 1040
		display: flex
		justify-content: flex-end
		pointer-events: none

		.asistente-ia-panel
			width: min(450px, 100%)
			height: 100%
			pointer-events: auto
			@media (min-width: 1000px)
				width: min(640px, 100%)

.agentes-modulo
	padding-top: 12px
	padding-bottom: 12px
	.asistente-ia-panel
		width: 100%
		height: calc(100vh - 24px)
		height: calc(100dvh - 24px)

.agentes-espacio
	flex: 1
	display: flex
	min-height: 0

.agentes-cabecera
	display: grid
	grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr)
	align-items: center
	padding: 10px 12px
	gap: 8px
	background: #1b2239
	&__marca, &__acciones
		display: flex
		align-items: center
		gap: 5px
	&__acciones
		justify-content: flex-end
	&__tienda
		display: inline-flex
		align-items: center
		gap: 4px
		padding: 0 6px
		color: #b7c9ff
		font-size: .8rem
		font-weight: 600
		white-space: nowrap
		&:hover, &:focus
			color: #fff
	.asistente-ia-panel__orb
		width: 30px
		height: 30px
		font-size: .9rem
	&--ampliada
		grid-template-columns: auto minmax(0, 1fr) auto
		.agentes-selector
			justify-self: center
	// Con tres pestañas y «Tu tienda» no entra todo en un renglón: arriba marca y acciones, abajo el selector.
	&--dos-filas
		grid-template-columns: minmax(0, 1fr) auto
		.agentes-cabecera__acciones
			grid-column: 2
			grid-row: 1
		.agentes-selector
			grid-column: 1 / -1
			grid-row: 2
			justify-self: stretch
			button
				flex: 1 1 auto

.agentes-guia-lugar
	flex: 1
	display: flex
	flex-direction: column
	min-height: 0

.agentes-selector
	display: flex
	gap: 3px
	padding: 4px
	border-radius: 999px
	background: #111729
	border: 1px solid var(--ia-borde)
	button
		padding: 7px 14px
		border: 0
		border-radius: 999px
		background: transparent
		color: var(--ia-texto-2)
		white-space: nowrap
		font-size: .85rem
		font-weight: 600
		&[aria-pressed="true"]
			background: var(--ia-bg-activo)
			color: var(--ia-texto)
		&:focus-visible, &:hover
			color: #fff

.agentes-canal, .agentes-solo-sistema
	display: flex
	align-items: center
	flex-wrap: wrap
	justify-content: space-between
	padding: 7px 14px
	gap: 4px 10px
	color: var(--ia-texto-2)
	background: var(--ia-bg-sutil)
	border-bottom: 1px solid var(--ia-borde)
	font-size: .78rem
	a
		display: inline-flex
		align-items: center
		gap: 5px
		color: var(--ia-ok)
		font-weight: 600
		white-space: nowrap

.agentes-solo-sistema
	justify-content: flex-start

.agentes-informe
	padding: 12px
	border: 1px solid var(--ia-borde)
	border-radius: 16px
	background: var(--ia-bg-elevado)
	overflow: auto
	--color-text-primary: var(--ia-texto)
	--color-text-secondary: var(--ia-texto-2)
	--bg-card: var(--ia-bg-elevado)
	--color-border: var(--ia-borde)
	&__volver
		padding: 0
		border: 0
		color: var(--ia-primario)
		background: transparent
		font-size: .8rem

.agentes-lista--cajon
	position: absolute
	inset: 0 auto 0 0
	width: min(290px, 88%)
	z-index: 3
	box-shadow: 0 0 40px rgba(0, 0, 0, .3)

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
	flex-direction: column
	overflow: hidden
	position: relative
	animation: asistente-ia-panel-entrada .18s ease-out, asistente-ia-panel-onda 9s ease infinite

	// 🔴 common-vue/sass/_inputs.sass le pone a TODO <button> del sistema una sombra diagonal de
	// formulario (salvo en modales, navbar y sidebars). En ia-spa ningún botón tiene sombra, así
	// que adentro del panel se apaga para todos de una vez. Pesa (0,1,1) contra el (0,0,1) de
	// allá; el anillo de foco de un .btn de bootstrap (`.btn:focus`, 0,2,0) sigue ganando.
	button
		box-shadow: none

	&__aviso-traslado
		padding: 6px 16px
		background: var(--ia-bg-barra)
		color: var(--ia-texto-2)
		font-size: 13px

		button
			margin-left: 6px
			padding: 0
			border: 0
			background: none
			color: var(--ia-primario)
			text-decoration: underline

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
		border: 0
		z-index: 2

	&__main
		flex: 1
		min-width: 0
		display: flex
		flex-direction: column
		background: var(--ia-bg)
	&__orb
		+asistente-orb

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

.asistente-ia-overlay .asistente-ia-panel .vender-resizer
	background: transparent
	&:hover, &.vender-resizer--active
		background: var(--ia-borde)

@media (max-width: 767px)
	.asistente-ia-overlay--lateral
		inset: 68px 6px 6px
	.agentes-modulo
		padding-top: 6px
		padding-bottom: 6px
		.asistente-ia-panel
			height: calc(100vh - 72px)
			height: calc(100dvh - 72px)

	.asistente-ia-guia-activa .asistente-ia-overlay--lateral .asistente-ia-panel
		visibility: hidden
		pointer-events: none

@media (max-width: 480px)
	.agentes-cabecera
		padding: 8px 9px
		gap: 4px
		.asistente-ia-panel__orb
			display: none
		.asistente-ia-panel__boton
			width: 30px
			height: 32px
	.agentes-selector button
		padding: 6px 9px
		font-size: .78rem

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

</style>
