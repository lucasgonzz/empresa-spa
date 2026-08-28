<template>
	<div
	class="whatsapp-chats-list">
		<div class="whatsapp-chats-list__header">
			<chat-search></chat-search>
			<b-button
			size="sm"
			variant="success"
			class="whatsapp-chats-list__btn whatsapp-chats-list__new-btn"
			v-b-modal="'whatsapp-new-chat'">
				<i class="bi bi-plus-lg"></i>
				Nuevo chat
			</b-button>
			<!-- Simular un mensaje entrante del cliente: mismo criterio is_owner que la
			configuración, porque el endpoint `whatsapp-bot/simulate-inbound` también es solo
			del dueño (devuelve 403 al resto). Gateado TAMBIÉN por chat_simulation_enabled: es
			el mismo toggle que gatea el botón equivalente dentro de la conversación
			(conversation/Composer.vue), para que sea honesto en los dos lugares. -->
			<b-button
			v-if="is_owner && config && config.chat_simulation_enabled"
			size="sm"
			variant="outline-warning"
			class="whatsapp-chats-list__btn whatsapp-chats-list__btn--icono"
			title="Simular un mensaje del cliente (no le llega nada a nadie)"
			v-b-modal="'whatsapp-simulate-inbound'">
				<i class="bi bi-cone-striped"></i>
			</b-button>

			<!-- Configuración del agente y plantillas: solo el dueño la ve/edita (patrón is_owner del proyecto) -->
			<b-button
			v-if="is_owner"
			size="sm"
			variant="outline-secondary"
			class="whatsapp-chats-list__btn whatsapp-chats-list__btn--icono"
			title="Configuración de WhatsApp"
			v-b-modal="'whatsapp-config'">
				<i class="bi bi-gear"></i>
			</b-button>
		</div>

		<div class="whatsapp-chats-list__body">
			<p
			v-if="loading"
			class="text-center text-muted m-t-20">
				Cargando chats...
			</p>
			<p
			v-else-if="!chats.length"
			class="text-center text-muted m-t-20">
				No hay chats para mostrar
			</p>
			<chat-row
			v-else
			v-for="chat in chats"
			:key="chat.id"
			:chat="chat"
			:is_active="chat.id == selected_chat_id"
			@select="selectChat"></chat-row>
		</div>

		<new-chat-modal></new-chat-modal>
		<simulate-inbound-modal v-if="is_owner"></simulate-inbound-modal>
		<whatsapp-config v-if="is_owner"></whatsapp-config>
	</div>
</template>
<script>
import ChatSearch from '@/components/whatsapp/chats-list/ChatSearch'
import ChatRow from '@/components/whatsapp/chats-list/ChatRow'
import NewChatModal from '@/components/whatsapp/chats-list/NewChatModal'
import SimulateInboundModal from '@/components/whatsapp/chats-list/SimulateInboundModal'
import WhatsappConfig from '@/components/whatsapp/config/Index'
export default {
	components: {
		ChatSearch,
		ChatRow,
		NewChatModal,
		SimulateInboundModal,
		WhatsappConfig,
	},
	computed: {
		chats() {
			return this.$store.state.whatsapp_chat.chats
		},
		loading() {
			return this.$store.state.whatsapp_chat.loading_chats
		},
		selected_chat_id() {
			return this.$store.state.whatsapp_chat.selected_chat_id
		},
		/**
		 * Config del agente (mismo patrón que usa `whatsapp/config/AgentConfig.vue` y
		 * `conversation/Composer.vue`): de acá se lee `chat_simulation_enabled` para gatear el
		 * botón de simular del header, igual que su equivalente dentro de la conversación.
		 *
		 * @returns {Object|null}
		 */
		config() {
			return this.$store.state.whatsapp_bot_config.models[0] || null
		},
	},
	methods: {
		/**
		 * Abre la conversación del chat elegido en el sidebar.
		 *
		 * Antes acá vivía una de las tres copias del trío `setSelectedChatId` +
		 * `setMessages([])` + `getMessages()`. La carga la dispara ahora el watch de
		 * `conversation/Index.vue`: desde acá solo se dice cuál es el chat.
		 *
		 * @param {Object} chat
		 */
		selectChat(chat) {
			this.abrir_chat_whatsapp({chat_id: chat.id})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-chats-list
	height: 100%
	display: flex
	flex-direction: column
	background: var(--wa-panel)
	color: var(--wa-texto)
	&__header
		display: flex
		flex-direction: row
		align-items: center
		padding: 10px 12px
		border-bottom: 1px solid var(--wa-borde)
		// Con el botón de simular ya son cuatro cosas en la fila. En la franja de tablet
		// (992-1024px) la columna de chats mide unos 330px y sin permitir el salto de línea el
		// buscador quedaba aplastado a nada.
		flex-wrap: wrap
		// El espaciado de la fila lo da el gap y NO el margin-right de cada botón: con los dos,
		// el hueco entre un par de controles y el siguiente quedaba desparejo. Es la misma
		// correccion que ya hizo _toolbar_botones.sass en la barra de encabezado.
		gap: var(--toolbar-btn-gap)
		row-gap: 6px
	// Geometría compartida de los tres botones del header, copiada de .btn-modulo
	// (_controles_modulo.sass): alto, radio, tipografía y sombra de los mismos tokens que usa la
	// barra de encabezado del resto del sistema, para que la bandeja deje de tener su propio
	// dialecto visual.
	//
	// 🔴 A propósito NO se tocan los `variant`: el color acá es información. "Nuevo chat" es la
	// acción principal (verde), simular es una herramienta del dueño (ámbar) y configuración es
	// neutra. El `.btn` del selector le gana a `.btn-sm` por especificidad (0,2,0) contra (0,1,0).
	&__btn.btn
		flex-shrink: 0
		height: var(--toolbar-control-h)
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 6px
		padding: 0 12px
		font-size: .875rem
		line-height: 1
		border-radius: var(--toolbar-btn-radius)
		box-shadow: var(--toolbar-btn-shadow)
		white-space: nowrap
	// Los dos que son solo ícono van cuadrados, del mismo alto: un botón de ícono con el padding
	// horizontal del de texto queda oblongo y desalineado con el resto.
	&__btn--icono.btn
		width: var(--toolbar-control-h)
		padding: 0
	// El verde de la marca en vez del `success` de Bootstrap (#28a745), que no es el de WhatsApp
	// y no cambia en modo oscuro.
	//
	// 🔴 Los selectores de estado llevan `.btn-success:not(:disabled):not(.disabled)` encima, y no
	// es palabrerio defensivo: Bootstrap 4 declara
	// `.btn-success:not(:disabled):not(.disabled):active` en (0,4,0), que le gana a un
	// `&__new-btn.btn:active` de (0,3,0). Sin esto, mientras se mantiene apretado el boton, el
	// verde salta al de Bootstrap: justo el color que esta regla existe para evitar. Estos quedan
	// en (0,5,0) y ganan siempre, sin depender del orden del bundle.
	&__new-btn.btn
		background: var(--wa-verde)
		border-color: var(--wa-verde)
		color: var(--wa-verde-texto)
		&.btn-success:not(:disabled):not(.disabled):hover,
		&.btn-success:not(:disabled):not(.disabled):focus,
		&.btn-success:not(:disabled):not(.disabled):active,
		&.btn-success:not(:disabled):not(.disabled):active:focus
			background: var(--wa-verde-hover)
			border-color: var(--wa-verde-hover)
			color: var(--wa-verde-texto)
			box-shadow: none
	&__body
		flex: 1
		overflow-y: auto
</style>
