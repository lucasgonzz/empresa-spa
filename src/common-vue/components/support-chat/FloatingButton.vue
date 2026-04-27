<template>
	<div v-if="should_show">
		<button
			class="support-chat-floating-button"
			type="button"
			@click="toggle_chat">
			<i class="fab fa-whatsapp"></i>
		</button>
		<support-chat-modal
			v-if="show_chat"
			@close="show_chat = false" />
	</div>
</template>

<script>
import SupportChatModal from '@/common-vue/components/support-chat/Modal'

export default {
	components: {
		SupportChatModal,
	},
	data() {
		return {
			// Estado local para abrir/cerrar el panel de chat.
			show_chat: false,
		}
	},
	computed: {
		/**
		 * Muestra chat sólo con sesión autenticada y extensión habilitada.
		 */
		should_show() {
			return this.authenticated && this.hasExtencion('support_chat')
		},
	},
	methods: {
		/**
		 * Alterna la visibilidad del panel de soporte.
		 */
		toggle_chat() {
			this.show_chat = !this.show_chat
		},
	},
}
</script>

<style scoped>
.support-chat-floating-button {
	position: fixed;
	right: 20px;
	bottom: 20px;
	width: 60px;
	height: 60px;
	border: none;
	border-radius: 999px;
	background: #25d366;
	color: #fff;
	font-size: 28px;
	z-index: 1052;
	box-shadow: 0 5px 20px rgba(0, 0, 0, 0.25);
}
</style>

