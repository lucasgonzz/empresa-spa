<template>
	<!-- Un mensaje de la conversación, como en ia.comerciocity.com (misión agente-mejoras-uso-real,
	29/10/2026): el de la persona en burbuja gris a la derecha (usuario/Index.vue) y la respuesta del
	agente a lo ancho, con el logo del negocio de avatar y la barra de acciones abajo
	(agente/Index.vue, con su valoración en agente/ValoracionMensaje.vue). Hasta esta misión era un solo componente (MessageBubble.vue) con las dos
	viñetas iguales pegadas a cada lado; se partió porque ahora cada lado se dibuja distinto y
	tiene cosas que el otro no (las menciones, las tarjetas y la valoración son solo del agente; el
	estado del envío y el reintento, solo de la persona).

	Este orquestador solo decide cuál de los dos va y les pasa lo que necesitan. -->
	<mensaje-usuario
	v-if="es_del_usuario"
	:message="message"
	@retry="$emit('retry', $event)"></mensaje-usuario>
	<mensaje-agente
	v-else
	:message="message"
	:ultimo="ultimo"></mensaje-agente>
</template>

<script>
import MensajeUsuario from '@/components/asistente-ia/mensaje/usuario/Index'
import MensajeAgente from '@/components/asistente-ia/mensaje/agente/Index'

export default {
	components: {
		MensajeUsuario,
		MensajeAgente,
	},
	props: {
		/**
		 * El mensaje tal como está en `ai_chat.messages` (del API, o el globo optimista).
		 */
		message: {
			type: Object,
			required: true,
		},
		/**
		 * true si es la última respuesta del agente a la vista: su barra de acciones queda
		 * siempre visible (las demás aparecen al pasar el mouse), como en ia-spa.
		 */
		ultimo: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		es_del_usuario() {
			return this.message.rol == 'user'
		},
	},
}
</script>

<style lang="sass">
// La entrada sutil de abajo hacia arriba de los dos lados (D41, la `cc-aparecer` de ia-spa). Vive
// en el orquestador porque la usan los dos hijos (usuario/Index.vue y agente/Index.vue) y los dos se
// cargan siempre a través de este componente.
@keyframes asistente-ia-msj-aparecer
	from
		opacity: 0
		transform: translateY(6px)
	to
		opacity: 1
		transform: none
</style>
