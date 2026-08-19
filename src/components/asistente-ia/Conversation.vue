<template>
	<div
	class="asistente-ia-conversacion"
	ref="container"
	@scroll="on_scroll">
		<p
		v-if="loading"
		class="asistente-ia-conversacion__aviso">
			Cargando la conversación...
		</p>

		<!-- Bienvenida de conversación en blanco: refleja lo que el asistente
		puede consultar de verdad (las tools de lectura, D15). -->
		<div
		v-else-if="!messages.length"
		class="asistente-ia-conversacion__bienvenida">
			<span class="asistente-ia-conversacion__bienvenida-avatar">
				<img
				v-if="logo_url"
				:src="logo_url"
				alt="">
				<i
				v-else
				class="bi bi-robot"></i>
			</span>
			<h5>¿En qué te puedo ayudar?</h5>
			<p>
				Preguntame por el stock o el precio de un artículo, el saldo de un
				cliente o qué se está vendiendo más.
			</p>
		</div>

		<div
		v-else
		class="asistente-ia-conversacion__mensajes">
			<p
			v-if="loading_more"
			class="asistente-ia-conversacion__aviso asistente-ia-conversacion__aviso--chico">
				Cargando mensajes anteriores...
			</p>
			<template v-for="(message, index) in mensajes_visibles">
				<!-- local_id primero: un globo que nació optimista conserva su key al
				confirmarse y Vue no re-monta el nodo (la entrada no parpadea). -->
				<message-bubble
				:key="message.local_id || message.id"
				:message="message"
				@retry="reintentar"></message-bubble>
				<!-- Puente al submódulo que originó la conversación, debajo del primer
				mensaje del asistente (D24): sin markdown no hay links en el texto, el
				botón es de la SPA. -->
				<div
				v-if="mostrar_boton_de_origen(message, index)"
				:key="'origen-' + (message.id || message.local_id)"
				class="asistente-ia-conversacion__origen">
					<b-button
					size="sm"
					variant="outline-primary"
					@click="ir_al_origen">
						<i class="bi bi-box-arrow-up-right"></i>
						{{ texto_boton_de_origen }}
					</b-button>
				</div>
			</template>

			<pensando-indicator
			v-if="hay_respuesta_en_curso"></pensando-indicator>

			<!-- Aviso de demora (R8: la cola es compartida con las importaciones). -->
			<p
			v-if="hay_respuesta_en_curso && respuesta_demorada"
			class="asistente-ia-conversacion__demora">
				La respuesta está tardando más de lo normal. Puede haber una importación
				en curso ocupando el servidor.
			</p>
		</div>
	</div>
</template>

<script>
import MessageBubble from '@/components/asistente-ia/MessageBubble'
import PensandoIndicator from '@/components/asistente-ia/PensandoIndicator'

/**
 * Mapa origen de la conversación -> name de la ruta del submódulo (D24). Las
 * misiones 2-5 (compras, ofertas) agregan acá su fila.
 */
const RUTA_POR_ORIGEN = {
	sugerencia_stock: 'sugerencias_stock',
	sugerencia_compra: 'sugerencias_compra',
	sugerencia_oferta: 'ofertas',
}

/**
 * Texto del botón de puente al submódulo, por origen (misión "sugerencias de
 * compra", 15/8/2026): antes era un string fijo "Ver la sugerencia" en el
 * template; con un segundo origen hacía falta distinguir a cuál sugerencia
 * lleva. Toda clave nueva de RUTA_POR_ORIGEN necesita su par acá.
 */
const ETIQUETA_POR_ORIGEN = {
	sugerencia_stock: 'Ver la sugerencia',
	sugerencia_compra: 'Ver la sugerencia de compra',
	sugerencia_oferta: 'Ver las ofertas sugeridas',
}

export default {
	components: {
		MessageBubble,
		PensandoIndicator,
	},
	data() {
		return {
			// Alto del contenedor antes de anteponer una página vieja, para restaurar
			// el scroll exactamente donde estaba (si no, saltaría al tope).
			scroll_height_before_prepend: 0,
		}
	},
	computed: {
		conversation() {
			return this.$store.getters['ai_chat/selected_conversation']
		},
		selected_conversation_id() {
			return this.$store.state.ai_chat.selected_conversation_id
		},
		messages() {
			return this.$store.state.ai_chat.messages
		},
		/**
		 * El assistant 'pendiente' no se pinta como globo vacío: en su lugar va el
		 * indicador de pensando (D41/D18: nunca queda un globo vacío a la vista).
		 */
		mensajes_visibles() {
			return this.messages.filter(m => {
				return !(m.rol == 'assistant' && m.estado == 'pendiente')
			})
		},
		hay_respuesta_en_curso() {
			return this.$store.getters['ai_chat/hay_respuesta_en_curso']
		},
		respuesta_demorada() {
			return this.$store.state.ai_chat.respuesta_demorada
		},
		loading() {
			return this.$store.state.ai_chat.loading_messages
		},
		loading_more() {
			return this.$store.state.ai_chat.loading_more_messages
		},
		messages_page() {
			return this.$store.state.ai_chat.messages_page
		},
		messages_last_page() {
			return this.$store.state.ai_chat.messages_last_page
		},
		has_more_pages() {
			return this.messages_last_page && this.messages_page < this.messages_last_page
		},
		/**
		 * true cuando ya está cargado el principio de la conversación (todas las
		 * páginas): recién ahí el primer assistant visible es el primero real.
		 */
		todas_las_paginas_cargadas() {
			return !this.messages_last_page || this.messages_page >= this.messages_last_page
		},
		/**
		 * Mismo criterio que el botón flotante (D37).
		 */
		logo_url() {
			if (!this.user) {
				return null
			}
			if (this.user.online_configuration && this.user.online_configuration.logo_url) {
				return this.user.online_configuration.logo_url
			}
			return this.user.image_url || null
		},
		/**
		 * Texto del botón de puente al submódulo (D24), según el origen de la
		 * conversación abierta. Reemplaza el "Ver la sugerencia" hardcodeado que
		 * tenía el template: con dos orígenes posibles hacía falta distinguir a
		 * cuál sugerencia lleva. El fallback solo se usaría si algún origen quedara
		 * en RUTA_POR_ORIGEN sin su par en ETIQUETA_POR_ORIGEN.
		 */
		texto_boton_de_origen() {
			if (this.conversation && ETIQUETA_POR_ORIGEN[this.conversation.origen]) {
				return ETIQUETA_POR_ORIGEN[this.conversation.origen]
			}
			return 'Ver la sugerencia'
		},
	},
	mounted() {
		let self = this
		this.$nextTick(function () {
			self.scrollToBottom()
		})
	},
	watch: {
		selected_conversation_id() {
			let self = this
			// Al abrir otra conversación, arranca siempre desde abajo (lo más reciente).
			this.$nextTick(function () {
				self.scrollToBottom()
			})
		},
		'messages.length'(new_length, old_length) {
			let self = this
			// Mensaje nuevo al final (no una página vieja anteponiéndose): se sigue
			// el scroll con la conversación.
			if (new_length > old_length && !this.loading_more) {
				this.$nextTick(function () {
					self.scrollToBottom()
				})
			}
		},
		hay_respuesta_en_curso(en_curso) {
			let self = this
			// Cuando la respuesta llega, el pendiente se convierte en texto (patch,
			// sin cambiar el largo): también hay que bajar a leerla.
			if (!en_curso) {
				this.$nextTick(function () {
					self.scrollToBottom()
				})
			}
		},
		loading_more(is_loading_more) {
			let self = this
			if (is_loading_more) {
				this.scroll_height_before_prepend = this.$refs.container ? this.$refs.container.scrollHeight : 0
			} else {
				// Terminó de cargar la página vieja: restaura el scroll para que no salte.
				this.$nextTick(function () {
					if (self.$refs.container) {
						self.$refs.container.scrollTop = self.$refs.container.scrollHeight - self.scroll_height_before_prepend
					}
				})
			}
		},
	},
	methods: {
		scrollToBottom() {
			if (this.$refs.container) {
				this.$refs.container.scrollTop = this.$refs.container.scrollHeight
			}
		},
		/**
		 * Scroll infinito hacia arriba: cerca del tope pide la página anterior.
		 */
		on_scroll(event) {
			if (event.target.scrollTop < 80 && this.has_more_pages && !this.loading_more && !this.loading) {
				this.$store.dispatch('ai_chat/getMessages', {
					conversation_id: this.selected_conversation_id,
					page: this.messages_page + 1,
				})
			}
		},
		/**
		 * El botón "Ver la sugerencia" va debajo del PRIMER mensaje del asistente de
		 * una conversación que no abrió el usuario (D24), y recién cuando el
		 * principio de la conversación está cargado.
		 */
		mostrar_boton_de_origen(message, index) {
			if (!this.conversation || this.conversation.origen == 'usuario') {
				return false
			}
			if (!this.conversation.referencia_id || !RUTA_POR_ORIGEN[this.conversation.origen]) {
				return false
			}
			if (!this.todas_las_paginas_cargadas) {
				return false
			}
			if (message.rol != 'assistant') {
				return false
			}
			let primer_assistant_index = this.mensajes_visibles.findIndex(m => m.rol == 'assistant')
			return index === primer_assistant_index
		},
		ir_al_origen() {
			let ruta = RUTA_POR_ORIGEN[this.conversation.origen]
			let id = '' + this.conversation.referencia_id
			this.$store.commit('ai_chat/setPanelAbierto', false)
			// Guard contra NavigationDuplicated si ya se está mirando ese detalle.
			if (this.$route.name == ruta && this.$route.params.id == id) {
				return
			}
			this.$router.push({ name: ruta, params: { id: id } })
		},
		reintentar(message) {
			this.$store.dispatch('ai_chat/retryMessage', message)
		},
	},
}
</script>

<style lang="sass">
.asistente-ia-conversacion
	flex: 1
	min-height: 0
	overflow-y: auto
	padding: 16px 18px 6px 18px

	&__mensajes
		display: flex
		flex-direction: column
		max-width: 640px
		margin: 0 auto

	&__aviso
		text-align: center
		color: var(--color-text-secondary, #6c757d)
		margin: 14px 0
		font-size: .85rem

		&--chico
			margin: 0 0 10px 0
			font-size: .8rem

	&__bienvenida
		height: 100%
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		text-align: center
		padding: 0 26px
		color: var(--color-text-secondary, #6c757d)

		h5
			color: var(--color-text-primary, #212529)
			margin-bottom: 6px

		p
			max-width: 380px
			font-size: .9rem
			margin: 0

	&__bienvenida-avatar
		width: 44px
		height: 44px
		border-radius: 999px
		background: var(--color-primary, #007bff)
		color: #fff
		font-size: 22px
		display: flex
		align-items: center
		justify-content: center
		margin-bottom: 12px
		overflow: hidden

		img
			width: 100%
			height: 100%
			object-fit: cover
			display: block

	// El puente al submódulo cuelga del primer mensaje del asistente (D24). El margen
	// superior era -6px para pegarlo al texto suelto que el asistente tenía antes; con la
	// viñeta (19/8/2026) ese negativo lo mete contra el borde del recuadro, así que va 0.
	&__origen
		align-self: flex-start
		margin: 0 0 14px 0
		padding: 0 2px

	&__demora
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)
		margin: 0 0 12px 0
		padding: 0 2px
</style>
