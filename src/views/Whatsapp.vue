<template>
	<b-row
	v-if="tiene_agentes_ia"
	class="whatsapp-module"
	:style="{'--wa-alto-menu-movil': alto_menu_movil + 'px'}"
	:class="{'whatsapp-module--chat': conversacion_abierta}">
		<b-col class="whatsapp-module__chats" cols="12" md="4">
			<chats-list :chat_de_prueba_id="chat_de_prueba_id"></chats-list>
		</b-col>
		<b-col class="whatsapp-module__panel" cols="12" md="8">
			<template v-if="conversacion_abierta">
				<conversation embedded></conversation>
				<image-lightbox
				:show="Boolean(lightbox_url)"
				:image_url="lightbox_url || ''"
				@close="cerrar_lightbox"></image-lightbox>
			</template>
			<dashboard-tablero v-show="!conversacion_abierta"></dashboard-tablero>
			<div ref="robot_guardado" hidden>
				<robot ref="robot" pose="senalar" class="whatsapp-tour-robot"></robot>
			</div>
		</b-col>
	</b-row>
	<b-alert v-else-if="extensiones_cargadas" show variant="warning" class="m-t-15">
		Este módulo requiere la extensión Agentes de IA. Comunicate con ComercioCity si querés activarla.
	</b-alert>
</template>
<script>
import ChatsList from '@/components/whatsapp/chats-list/Index'
import DashboardTablero from '@/components/whatsapp/dashboard/Index'
import Conversation from '@/components/whatsapp/conversation/Index'
import ImageLightbox from '@/components/whatsapp/conversation/ImageLightbox'
import Robot from '@/components/implementacion/Robot'
import { iniciar_tour, cortar_tour, hay_tour_activo } from '@/tours/motor'

export default {
	components: { ChatsList, DashboardTablero, Conversation, ImageLightbox, Robot },
	data() {
		return {
			carga_de_bandeja: null,
			preparando_prueba: false,
			chat_de_prueba_id: null,
			recorrido_activo: false,
			alto_menu_movil: 54,
			observador_menu: null,
		}
	},
	computed: {
		tiene_agentes_ia() {
			return Boolean(this.hasExtencion('agentes_ia'))
		},
		extensiones_cargadas() {
			return Boolean(this.authenticated && this.owner_extencions)
		},
		conversacion_abierta() {
			return this.$store.state.whatsapp_chat.sidebar_abierto
		},
		lightbox_url() {
			return this.$store.state.whatsapp_chat.lightbox_url
		},
	},
	watch: {
		tiene_agentes_ia: {
			immediate: true,
			handler(tiene) {
				if (!tiene || this.carga_de_bandeja) {
					return
				}
				this.carga_de_bandeja = this.$store.dispatch('whatsapp_chat/getChats')
				this.$store.dispatch('whatsapp_template/getModels')
				this.abrir_destino()
			},
		},
		'$route.params.chat_id': 'abrir_destino',
		'$route.query.probar_agente': 'abrir_destino',
	},
	mounted() {
		document.addEventListener('keydown', this.cerrar_con_escape)
		const menu_movil = document.querySelector('.mobile-nav-header')
		if (menu_movil && typeof ResizeObserver !== 'undefined') {
			this.observador_menu = new ResizeObserver(() => {
				this.alto_menu_movil = menu_movil.offsetHeight
			})
			this.observador_menu.observe(menu_movil)
		}
	},
	beforeDestroy() {
		document.removeEventListener('keydown', this.cerrar_con_escape)
		if (this.observador_menu) {
			this.observador_menu.disconnect()
		}
		if (this.recorrido_activo) {
			cortar_tour()
		}
		this.$store.commit('whatsapp_chat/setSidebarAbierto', false)
		this.cerrar_lightbox()
	},
	methods: {
		cerrar_con_escape(event) {
			if (event.key === 'Escape' && !event.defaultPrevented && this.conversacion_abierta
				&& !this.lightbox_url && !hay_tour_activo() && !document.body.classList.contains('modal-open')) {
				this.$store.commit('whatsapp_chat/setSidebarAbierto', false)
			}
		},
		abrir_destino() {
			if (!this.carga_de_bandeja) {
				return
			}
			if (this.$route.query.probar_agente === '1') {
				this.preparar_prueba()
				return
			}
			const chat_id = Number(this.$route.params.chat_id)
			if (Number.isInteger(chat_id) && chat_id > 0) {
				this.abrir_chat_whatsapp({chat_id})
			}
		},
		preparar_prueba() {
			if (this.preparando_prueba) {
				return
			}
			this.preparando_prueba = true
			this.$store.commit('whatsapp_chat/setSidebarAbierto', false)
			this.carga_de_bandeja
				.then(() => {
					if (this.$route.name === 'whatsapp' && this.$store.state.whatsapp_chat.search_query) {
						this.$store.commit('whatsapp_chat/setSearchQuery', '')
						return this.$store.dispatch('whatsapp_chat/getChats')
					}
				})
				.then(() => {
					if (this.$route.name === 'whatsapp' && this.$route.query.probar_agente === '1') {
						return this.$store.dispatch('whatsapp_chat/createChat', {is_test: true, trial_demo: true})
					}
				})
				.then(chat => {
					if (!chat || !this.$el || !this.$el.isConnected || this.$route.query.probar_agente !== '1') {
						return
					}
					this.chat_de_prueba_id = chat.id
					this.$nextTick(() => this.iniciar_recorrido_de_prueba(chat))
				})
				.catch(err => {
					const data = err.response && err.response.data
					this.$toast.error((data && data.message) || 'No pudimos preparar el chat de prueba')
				})
				.finally(() => { this.preparando_prueba = false })
		},
		iniciar_recorrido_de_prueba(chat) {
			const campo = '[data-tour="whatsapp.escribir_como_cliente"] textarea'
			const explicacion_modo = chat.ai_mode === 'automatic'
				? 'Está en Automático. La IA genera la respuesta y la envía sola.'
				: 'Podés volver a Automático para que la IA genere y envíe la respuesta sola.'
			this.recorrido_activo = iniciar_tour({
				id: 'prueba-del-agente-whatsapp',
				pasos: [
					{
						ancla: 'whatsapp.chat_de_prueba',
						titulo: 'Abrí el chat de prueba',
						texto: 'Tocá este chat. Acá podés conversar con tu agente usando tu catálogo.',
						avanza: 'aparece',
						selector_al_aparecer: campo,
					},
					{
						selector: campo,
						titulo: 'Escribí como si fueras un cliente',
						texto: 'Preguntá, por ejemplo, cuánto cuesta un artículo. Apretá Enter para enviar el mensaje de prueba.',
						avanza: 'evento',
						evento: 'whatsapp:mensaje-de-prueba-enviado:' + chat.id,
						selector_al_cerrar: campo,
						foco: true,
					},
					{
						ancla: 'whatsapp.toggle_ia',
						titulo: 'Elegí cómo responde la IA',
						texto: explicacion_modo + ' Probá Semiautomático para editar, aprobar o descartar cada respuesta antes del envío.',
					},
				],
			}, {
				router: this.$router,
				store: this.$store,
				root: this.$root,
				decorar_popover: popover => {
					if (this.$refs.robot && popover.title) {
						popover.title.prepend(this.$refs.robot.$el)
					}
				},
				al_terminar: () => {
					this.recorrido_activo = false
					if (this.$refs.robot_guardado && this.$refs.robot) {
						this.$refs.robot_guardado.appendChild(this.$refs.robot.$el)
					}
				},
			})
			const query = Object.assign({}, this.$route.query)
			delete query.probar_agente
			this.$router.replace({query}).catch(() => {})
		},
		cerrar_lightbox() {
			this.$store.commit('whatsapp_chat/setLightboxUrl', null)
		},
	},
}
</script>
<style lang="sass">
.whatsapp-module
	height: 100vh
	height: 100dvh
	margin-bottom: 0 !important
	&__chats,
	&__panel
		height: 100%
		min-width: 0
		padding: 0
	&__panel
		overflow: auto
		background: var(--color-bg)
	@media (max-width: 767px)
		height: calc(100vh - var(--wa-alto-menu-movil))
		height: calc(100dvh - var(--wa-alto-menu-movil))
		&:not(&--chat)
			flex-wrap: nowrap
			flex-direction: column
			& > .whatsapp-module__chats
				flex: 1 1 auto
				min-height: 230px
			& > .whatsapp-module__panel
				order: -1
				flex: 0 1 auto
				max-height: 46%
		&--chat &__chats
			display: none
		&--chat .whatsapp-header__btn-texto
			display: none
html:has(.whatsapp-module--chat)
	overflow-y: hidden
html:has(.whatsapp-module),
.whatsapp-module__panel,
.whatsapp-module .whatsapp-messages-container,
.whatsapp-module .whatsapp-chats-list__body
	scrollbar-width: thin
	scrollbar-color: color-mix(in srgb, var(--wa-texto) 32%, transparent) transparent
.whatsapp-tour-robot
	width: 34px
	height: 34px
	margin-right: 7px
	vertical-align: middle
</style>
