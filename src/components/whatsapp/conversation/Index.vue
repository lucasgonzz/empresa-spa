<template>
	<div
	class="whatsapp-conversation">
		<!-- El chat todavía no está en la bandeja: pasa al entrar por link directo, donde el
		sidebar se abre antes de que vuelva `getChats`. Los mensajes ya se están pidiendo (los
		dispara el watch de abajo, que mira el id y no el objeto). -->
		<p
		v-if="!chat"
		class="text-with-icon whatsapp-conversation__empty">
			<i class="bi bi-whatsapp"></i>
			Abriendo la conversación...
		</p>
		<div
		v-else
		class="whatsapp-conversation__content">
			<header-component></header-component>
			<messages></messages>
			<composer></composer>
		</div>
	</div>
</template>
<script>
import HeaderComponent from '@/components/whatsapp/conversation/Header'
import Messages from '@/components/whatsapp/conversation/Messages'
import Composer from '@/components/whatsapp/conversation/Composer'
export default {
	components: {
		HeaderComponent,
		Messages,
		Composer,
	},
	computed: {
		/*
			El getter ya existía en el store desde el primer día y no lo usaba nadie: este
			mismo computed estaba copiado byte por byte acá, en Header.vue y en Composer.vue.
		*/
		chat() {
			return this.$store.getters['whatsapp_chat/selected_chat']
		},
		chat_id() {
			return this.$store.state.whatsapp_chat.selected_chat_id
		},
	},
	watch: {
		/**
		 * 🔴 Acá, y en ningún otro lado, se carga la conversación.
		 *
		 * Antes la carga la hacía el que seleccionaba el chat, y el trío
		 * `setSelectedChatId` + `setMessages([])` + `getMessages()` estaba copiado en tres
		 * lugares (la fila de la bandeja, el modal de chat nuevo y el de simular entrante).
		 * Consecuencias de eso: el cuarto camino —entrar por link directo a /whatsapp/{id}—
		 * nunca se acordó de copiarlo, así que abría header y composer con la conversación
		 * vacía; y cualquier lugar nuevo desde donde se abriera un chat (Clientes, Pedidos,
		 * Compradores) tenía que acordarse de las tres líneas.
		 *
		 * Con el watch acá, quien abre un chat solo tiene que decir cuál. `immediate: true`
		 * cubre el caso de que el sidebar se monte con un chat ya elegido, que es lo que pasa
		 * siempre: `abrirChat` deja la selección hecha antes de que este componente exista.
		 *
		 * `markRead` va sin mirar `unread_count` a propósito: el contador que tiene la fila de
		 * la bandeja en memoria puede estar viejo (el broadcast manda un chat liviano), y
		 * pedirle al backend que marque leído un chat que ya lo estaba no cuesta nada.
		 */
		chat_id: {
			immediate: true,
			handler(id) {
				if (!id) {
					return
				}
				// Limpia la conversación anterior para no mostrar mensajes de otro chat
				// mientras carga.
				this.$store.commit('whatsapp_chat/setMessages', [])
				this.$store.dispatch('whatsapp_chat/getMessages', {chat_id: id, page: 1})
				this.$store.dispatch('whatsapp_chat/markRead', id)
			},
		},
	},
}
</script>
<style lang="sass">
.whatsapp-conversation
	height: 100%
	&__empty
		height: 100%
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		color: rgba(0, 0, 0, .45)
		i
			font-size: 2.5rem
			margin-bottom: 10px
	&__content
		height: 100%
		display: flex
		flex-direction: column
</style>
