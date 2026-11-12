<template>
	<div class="agentes-espacio agentes-soporte">
		<aside
		v-if="!lista_es_cajon || lista_abierta"
		class="asistente-ia-panel__sidebar"
		:class="{ 'agentes-lista--cajon': lista_es_cajon }"
		:style="sidebar_style">
			<div class="agentes-soporte__lista">
				<header>
					<strong>Conversaciones de soporte</strong>
					<button v-if="lista_es_cajon" type="button" class="asistente-ia-panel__boton" aria-label="Cerrar lista de conversaciones" @click="$emit('cerrar-lista')">
						<icono nombre="cerrar"></icono>
					</button>
				</header>
				<nav aria-label="Conversaciones de soporte">
					<p v-if="loading && !tickets.length" role="status">Cargando conversaciones…</p>
					<p v-else-if="!tickets.length">Todavía no hay conversaciones de soporte.</p>
					<button v-for="ticket in tickets" :key="ticket.id" type="button" :aria-current="ticket.id == seleccionado_id ? 'true' : null" @click="seleccionar(ticket.id)">
						<span :title="ticket.origen === 'whatsapp' ? 'Empezó en WhatsApp' : 'Empezó en el sistema'">
							<icono v-if="ticket.origen === 'whatsapp'" nombre="whatsapp" :tamano="14"></icono>
							<i v-else class="bi bi-pc-display" aria-hidden="true"></i>
						</span>
						<span class="agentes-soporte__titulo" :title="ticket.admin_ticket_id ? 'Ticket #' + ticket.admin_ticket_id : null">{{ ticket.name || 'Conversación ' + (ticket.admin_ticket_id || ticket.id) }}</span>
						<span v-if="ticket.unread_messages_count" class="agentes-soporte__badge" :title="ticket.unread_messages_count + ' mensajes sin leer'">{{ ticket.unread_messages_count }}</span>
					</button>
				</nav>
				<button type="button" class="agentes-soporte__nuevo" @click="iniciar_consulta">
					<icono nombre="nuevo" :tamano="18"></icono> {{ ticket_abierto ? 'Continuar conversación' : 'Nueva conversación' }}
				</button>
			</div>
		</aside>
		<div class="asistente-ia-panel__main" data-tour="soporte.conversacion">
			<div v-if="seleccionado && seleccionado.sistema_exclusivo_at" class="agentes-solo-sistema">
				<i class="bi bi-pc-display" aria-hidden="true"></i> Este hilo sigue únicamente en el sistema.
			</div>
			<div v-if="!seleccionado_id && !messages.length" class="agentes-soporte__bienvenida">
				<span class="asistente-ia-panel__orb" aria-hidden="true">✦</span>
				<!-- En la prueba, mientras llega la lista: su conversación con Soporte se abre sola. -->
				<p v-if="esperando_la_prueba" role="status">Cargando tus conversaciones…</p>
				<template v-else>
					<h2>¿En qué te podemos ayudar?</h2>
					<p>Escribí tu consulta o elegí una conversación del historial.</p>
				</template>
			</div>
			<conversation
			v-else
			:messages="messages"
			:selected_ticket="seleccionado"
			:numero_ticket_admin="seleccionado && seleccionado.admin_ticket_id"
			:loading="messages_loading"
			:show_new_ticket_bar="!!(seleccionado && seleccionado.status !== 'open')"
			:new_ticket_hint="ticket_abierto ? 'Esta conversación está cerrada. Podés seguir en tu conversación abierta.' : 'Esta conversación está cerrada. Podés iniciar una nueva consulta.'"
			:new_ticket_label="ticket_abierto ? 'Continuar conversación' : undefined"
			@retry-message="reintentar"
			@start-new-ticket="iniciar_consulta"></conversation>
			<message-input ref="compositor" en_agentes :can_send="puede_enviar" :clave_borrador="clave_borrador" :preparar_envio="preparar_envio" @send="enviar"></message-input>
		</div>
	</div>
</template>

<script>
import Conversation from '@/common-vue/components/support-chat/Conversation'
import MessageInput from '@/common-vue/components/support-chat/MessageInput'
import Icono from '@/components/asistente-ia/Icono'
import { confirmar_traspaso } from '@/components/asistente-ia/traspaso'
import { prueba_vigente, conversacion_de_la_prueba } from '@/components/asistente-ia/prueba_en_soporte'

export default {
	components: { Conversation, MessageInput, Icono },
	props: { activo: Boolean, lista_es_cajon: Boolean, lista_abierta: Boolean, sidebar_style: Object },
	data() {
		return {
			// true cuando ya se decidió si abrir sola la conversación de la prueba (una vez por apertura del panel).
			prueba_resuelta: false,
		}
	},
	computed: {
		en_prueba() { return prueba_vigente(this.$store.state.auth.user) },
		esperando_la_prueba() { return this.activo && this.en_prueba && !this.prueba_resuelta && this.loading },
		tickets() { return this.$store.state.support_ticket.models },
		loading() { return this.$store.state.support_ticket.loading },
		seleccionado_id() { return this.$store.state.support_message.active_ticket_id },
		clave_borrador() { return this.seleccionado_id == null ? 'nuevo' : 'ticket:' + this.seleccionado_id },
		seleccionado() { return this.tickets.find(ticket => ticket.id == this.seleccionado_id) },
		ticket_abierto() {
			return this.tickets.reduce((abierto, ticket) => {
				if (ticket.status === 'open' && ticket.origen !== 'whatsapp' && (!abierto || ticket.id > abierto.id)) return ticket
				return abierto
			}, null)
		},
		messages() { return this.$store.state.support_message.models },
		messages_loading() { return this.$store.state.support_message.messages_loading },
		enviando() { return this.$store.state.support_message.sending },
		puede_enviar() { return !this.enviando && !this.messages_loading && (!this.seleccionado || this.seleccionado.status === 'open') },
	},
	watch: {
		activo: {
			immediate: true,
			handler(valor) {
				if (valor) this.$store.dispatch('support_ticket/getAgentes')
			},
		},
		// La lista terminó de llegar, o cambió: con la prueba vigente se abre sola su conversación.
		loading(cargando) {
			if (!cargando) this.abrir_conversacion_de_la_prueba()
		},
		tickets() { this.abrir_conversacion_de_la_prueba() },
	},
	methods: {
		/**
		 * Con la prueba gratuita vigente, Soporte no arranca en la pantalla vacía: abre sola la conversación
		 * de la prueba, donde están la bienvenida y los videos (misión prueba-e2e-campana-imperio,
		 * 11/11/2026). Cuál es lo decide `conversacion_de_la_prueba()`.
		 *
		 * Se decide UNA vez por apertura del panel, con la lista ya cargada, y solo si no hay nada que
		 * pisar: ninguna conversación elegida (la pudo elegir «Seguir con Soporte»), ningún mensaje a la
		 * vista, ningún envío en curso, nada escrito en el compositor y ninguna guía de Robotito señalando
		 * esta pantalla. Después, «Nueva conversación» y el historial funcionan como siempre.
		 *
		 * Si todavía no hay ninguna conversación abierta no se da por decidido: la bienvenida puede llegar
		 * unos segundos después del primer ingreso, y se abre cuando aparece en la lista.
		 *
		 * Solo ABRE la conversación. Si es de WhatsApp, escribirle sigue pidiendo la confirmación de
		 * siempre (preparar_envio): acá no se traslada nada de canal.
		 */
		abrir_conversacion_de_la_prueba() {
			if (this.prueba_resuelta || !this.activo || this._isDestroyed || !this.en_prueba || this.loading) return
			const compositor = this.$refs.compositor
			const ocupada = this.seleccionado_id != null || this.messages.length > 0 || this.enviando || this.messages_loading
				|| Boolean(compositor && compositor.tiene_borrador_en_curso)
				|| Boolean(typeof document !== 'undefined' && document.querySelector('.driver-popover.tour-soporte'))
			const ticket = ocupada ? null : conversacion_de_la_prueba(this.tickets)
			if (!ocupada && !ticket) return
			this.prueba_resuelta = true
			if (ticket) this.seleccionar(ticket.id)
		},
		iniciar_consulta() {
			return this.seleccionar(this.ticket_abierto ? this.ticket_abierto.id : null)
		},
		seleccionar(id) {
			if (this.enviando) return
			this.$emit('cerrar-lista')
			return this.$store.dispatch('support_message/loadTicketMessages', { id: id, agentes: true })
		},
		preparar_envio() {
			const ticket = this.seleccionado
			const opciones = { agentes_version: 1 }
			if (!ticket || ticket.origen !== 'whatsapp' || ticket.sistema_exclusivo_at) return Promise.resolve(opciones)
			return confirmar_traspaso(this, 'soporte').then(confirmado => confirmado && this.activo && this.seleccionado_id === ticket.id
				? Object.assign(opciones, { traspasar_a_sistema: 1 }) : null)
		},
		enviar(payload) {
			return this.$store.dispatch('support_message/sendMessage', payload).then(modelo => {
				if (modelo && !this.seleccionado_id) this.seleccionar(modelo.support_ticket_id)
			})
		},
		reintentar(mensaje) {
			const accion = mensaje.remote_delivery_status === 'not_received' && mensaje.id != null ? 'retryRemoteSync' : 'retrySendMessage'
			this.$store.dispatch('support_message/' + accion, mensaje)
		},
	},
}
</script>

<style lang="sass">
.agentes-soporte
	--bg-card: var(--ia-bg-elevado)
	--color-border: var(--ia-borde)
	--color-text: var(--ia-texto)
	--text-color: var(--ia-texto)
	&__lista
		display: flex
		flex: 1
		min-height: 0
		flex-direction: column
		padding: 12px
		header
			display: flex
			align-items: center
			justify-content: space-between
			font-size: .88rem
			margin-bottom: 12px
		nav
			flex: 1
			min-height: 0
			overflow-y: auto
			p
				color: var(--ia-texto-2)
				font-size: .82rem
		nav button, .agentes-soporte__nuevo
			display: flex
			align-items: center
			width: 100%
			gap: 8px
			margin: 2px 0
			padding: 8px
			border: 1px solid transparent
			border-radius: 9px
			background: transparent
			color: var(--ia-texto)
			text-align: left
			font-size: .84rem
			&:hover, &[aria-current="true"]
				background: var(--ia-bg-activo)
		.agentes-soporte__nuevo
			border-color: var(--ia-borde)
	&__titulo
		flex: 1
		min-width: 0
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
	&__badge
		background: #b91c3b
		border-radius: 999px
		padding: 0 5px
		font-size: .7rem
	&__bienvenida
		flex: 1
		min-height: 0
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		padding: 20px
		text-align: center
		h2
			font-size: 1.25rem
			margin: 12px 0 6px
		p
			font-size: .85rem
			color: var(--ia-texto-2)
	.support-conversation
		min-height: 0
		width: 100%
		max-width: 52rem
		margin: 0 auto
	.support-conversation-title
		background: var(--ia-bg-barra)
		color: var(--ia-texto)
	.support-conversation-body
		background: var(--ia-bg)
	.support-message .support-message-bubble
		background: var(--ia-bg-elevado)
		color: var(--ia-texto)
		> div:first-child
			white-space: pre-wrap
			overflow-wrap: anywhere
	.support-message.mine .support-message-bubble
		background: var(--ia-bg-burbuja)
	.support-message-audio
		max-width: 100%
</style>
