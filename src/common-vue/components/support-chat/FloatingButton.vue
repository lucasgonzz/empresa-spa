<template>
	<div v-if="should_show">
		<button
			class="support-chat-floating-button"
			type="button"
			@click="toggle_chat">
			<!-- <i class="fab fa-whatsapp"></i> -->
			<img src="@/assets/whastapp.png" alt="Soporte">
			<span
				v-if="unread_badge_count > 0"
				class="support-chat-unread-badge"
				:title="'Mensajes de soporte sin leer: ' + unread_badge_count">
				{{ unread_badge_text }}
			</span>
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
		/**
		 * Suma unread_messages_count de todos los tickets (mensajes del operador aún no leídos en cliente).
		 */
		unread_badge_count() {
			const models = this.$store.state.support_ticket.models
			if (!models || !models.length) {
				return 0
			}
			let total = 0
			for (let i = 0; i < models.length; i = i + 1) {
				const n = models[i].unread_messages_count
				if (n != null && n !== '') {
					const p = parseInt(n, 10)
					if (!isNaN(p) && p > 0) {
						total = total + p
					}
				}
			}
			return total
		},
		/**
		 * Muestra número acotado para no desbordar el badge visual.
		 */
		unread_badge_text() {
			const c = this.unread_badge_count
			if (c > 99) {
				return '99+'
			}
			return String(c)
		},
	},
	/**
	 * Carga bandeja para contadores; al loguear o activar el botón se pide de nuevo.
	 */
	mounted() {
		this.load_support_tickets_for_badge()
	},
	watch: {
		should_show: {
			immediate: false,
			handler(value) {
				if (value) {
					this.load_support_tickets_for_badge()
				}
			},
		},
		authenticated: {
			immediate: false,
			handler(value) {
				const self = this
				if (value) {
					this.$nextTick(function () {
						if (self.should_show) {
							self.load_support_tickets_for_badge()
						}
					})
				}
			},
		},
	},
	methods: {
		/**
		 * Lista tickets con unread_messages_count desde la API; idempotente.
		 */
		load_support_tickets_for_badge() {
			if (!this.should_show) {
				return
			}
			this.$store.dispatch('support_ticket/getModels')
		},
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
	display: flex;
	align-items: center;
	justify-content: center;
	/* ancla al badge (mensajes de admin sin leer) */
}

.support-chat-floating-button > img {
	display: block;
	width: 34px;
	height: auto;
}

/* Badge rojo: total de burbujas del operador con read_at nulo, sumando tickets. */
.support-chat-unread-badge {
	position: absolute;
	top: -2px;
	right: -2px;
	min-width: 1.15rem;
	padding: 0.2em 0.42em;
	background: #dc3545;
	color: #fff;
	font-size: 0.7rem;
	font-weight: 700;
	line-height: 1.1;
	border-radius: 999px;
	text-align: center;
	box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>

