<template>
	<div class="sidebar-conversacion">
		<div class="sidebar-conversacion__cabecera">
			<!-- En modo cajón (< 900px) el sidebar tapa el informe: este botón vuelve. -->
			<button
			v-if="es_cajon"
			type="button"
			class="sidebar-conversacion__volver"
			@click="$emit('volver')">
				<i class="bi bi-arrow-left"></i>
				Volver al informe
			</button>
			<span
			v-else
			class="sidebar-conversacion__titulo">
				<i class="bi bi-chat-dots"></i>
				Tu conversación
			</span>
		</div>

		<!--
			La conversación es la misma pieza del panel flotante (MessageBubble,
			PensandoIndicator, aviso de demora, scroll infinito hacia arriba), leyendo
			ai_chat.messages. `sin_puente`: el botón "Ver el informe" no tiene sentido
			cuando ya se está parado sobre el informe.
		-->
		<conversation
		sin_puente></conversation>
	</div>
</template>

<script>
import Conversation from '@/components/asistente-ia/Conversation'

/**
 * El sidebar de conversación del informe abierto (§2.2). NO duplica nada de la
 * mecánica de mensajes: selecciona la conversación del informe en el store ai_chat
 * y le pide la primera página; de ahí en más, el envío (PreguntaInput ->
 * ai_chat/sendMessage), el polling de respaldo (esperarRespuesta) y el evento de
 * Echo (chat.user.{id}, suscripto por el FloatingButton, que está montado siempre
 * que la extensión esté activa) escriben en ai_chat.messages y esto se redibuja.
 *
 * Lo que queda seleccionado en ai_chat al cerrar el informe se respeta: si después
 * se abre el panel flotante, cae en esta conversación (es la última con actividad,
 * mismo criterio D44 del panel), y la lista del panel la muestra como una más.
 */
export default {
	components: {
		Conversation,
	},
	props: {
		conversation_id: {
			type: [Number, String],
			required: true,
		},
		/**
		 * true bajo 900px: el sidebar es un cajón que se superpone al informe y lleva
		 * el botón de volver.
		 */
		es_cajon: {
			type: Boolean,
			default: false,
		},
	},
	created() {
		this.seleccionar()
	},
	watch: {
		conversation_id() {
			this.seleccionar()
		},
	},
	methods: {
		/**
		 * Deja la conversación del informe como la seleccionada de ai_chat y carga su
		 * primera página.
		 *
		 * 🔴 seleccion_sin_recarga es la marca que deja mostrador/crearConversacion
		 * (misma que ai_chat/createConversation): la conversación recién nace vacía (o,
		 * si ya existía, se acaba de cargar) y el primer mensaje ya está subiendo como
		 * globo optimista, así que pedir la página lo pisaría. Se consume acá, como
		 * hace el watch del panel flotante.
		 *
		 * Y si la conversación ya era la seleccionada y sus mensajes ya están cargados,
		 * tampoco se recarga: ai_chat.messages es el de la seleccionada y lo mantienen
		 * al día el evento de Echo y el polling (fetchMessage pisa solo la conversación
		 * en pantalla), así que volver a pedir la página no trae nada nuevo y sí puede
		 * pisar un globo optimista —el caso concreto: el panel flotante montado detrás
		 * consumió la marca de arriba desde su propio watch antes de que este sidebar
		 * se montara. Reabrir el mismo informe cae acá también, y es lo esperado.
		 */
		seleccionar() {
			let chat = this.$store.state.ai_chat
			let ya_seleccionada = chat.selected_conversation_id == this.conversation_id
			if (!ya_seleccionada) {
				this.$store.commit('ai_chat/setSelectedConversationId', this.conversation_id)
			}
			if (chat.seleccion_sin_recarga) {
				this.$store.commit('ai_chat/setSeleccionSinRecarga', false)
				return
			}
			if (ya_seleccionada && chat.messages.length) {
				return
			}
			this.$store.dispatch('ai_chat/getMessages', {
				conversation_id: this.conversation_id,
				page: 1,
			})
		},
	},
}
</script>

<style lang="sass">
.sidebar-conversacion
	flex: 1
	min-height: 0
	display: flex
	flex-direction: column
	background: var(--bg-section, #f8f9fa)

	&__cabecera
		height: 48px
		flex-shrink: 0
		display: flex
		align-items: center
		padding: 0 16px
		border-bottom: 1px solid var(--color-border, #dee2e6)

	&__titulo
		display: inline-flex
		align-items: center
		gap: 8px
		font-weight: 600
		font-size: .92rem
		color: var(--color-text-primary, #212529)

	&__volver
		appearance: none
		border: none
		// common-vue/sass/_inputs.sass le pone sombra a TODO <button> del sistema; acá es un link.
		box-shadow: none
		background: transparent
		padding: 6px 8px 6px 0
		font: inherit
		font-size: .92rem
		font-weight: 600
		color: var(--color-primary, #007bff)
		display: inline-flex
		align-items: center
		gap: 8px
		cursor: pointer

	// La conversación del panel viene con padding para un modal ancho; acá es una
	// columna de 380px.
	.asistente-ia-conversacion
		padding: 14px 14px 4px 14px
</style>
