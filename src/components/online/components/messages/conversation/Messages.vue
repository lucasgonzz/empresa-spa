<template>
	<div
	id="container-messages">
		<p
		class="text-with-icon m-t-50"
		v-if="!selected_buyer">
            <i class="icon-user"></i>
			Seleccione un cliente para ver el chat
		</p>
		<div
		v-else>
			<div
			v-if="!loading">
				<div
				v-if="selected_buyer.messages.length"
				id="messages">
					<div 
					v-for="message in selected_buyer.messages"
					:key="message.id || message.created_at || message.text"
					class="message s-2"
					:class="getClassMessage(message)">
						<p class="text">
							{{ message.text }}
						</p>
						<card-component 
						class="m-t-10"
						v-if="hasArticle(message)"
						:model="message.article"></card-component>
						<p class="since">
							{{ format_message_datetime(message.created_at) }}
						</p>
					</div>
				</div>
				<p
				class="text-with-icon m-t-50"
				v-else>
		            <i class="icon-message"></i>
					No hay mensajes con {{ selected_buyer.name }}
				</p>
			</div>
			<div
			class="messages"
			v-else>
				<div class="message shadow-2 outgoing-message">
					<b-skeleton width="100%"></b-skeleton>
					<b-skeleton width="50px"></b-skeleton>
				</div>
				<div class="message shadow-2 incoming-message">
					<b-skeleton width="100%"></b-skeleton>
					<b-skeleton width="50px"></b-skeleton>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import moment from 'moment'
import online from '@/mixins/online'
export default {
	mixins: [online],
	components: {
		CardComponent: () => import('@/common-vue/components/display/cards/CardComponent'),
	},
	computed: {
		loading() {
			return this.$store.state.message.loading
		},
		selected_buyer() {
			return this.$store.state.message.selected_buyer
		},
	},
	methods: {
		/**
		 * Define la clase visual de cada mensaje según su origen.
		 * from_buyer=true representa mensaje entrante del comprador.
		 *
		 * @param {Object} message Mensaje de conversación.
		 * @returns {string}
		 */
		getClassMessage(message) {
			return message.from_buyer ? 'incoming-message' : 'outgoing-message'
		},
		/**
		 * Formatea fecha y hora con el mismo patrón del chat de soporte.
		 *
		 * @param {string} created_at Fecha de creación del mensaje.
		 * @returns {string}
		 */
		format_message_datetime(created_at) {
			return moment(created_at).format('DD/MM/YYYY HH:mm')
		},
	},
	watch: {
		selected_buyer() {
			if (this.selected_buyer && this.selected_buyer.messages.length) {
				this.scrollBottom('messages')
				setTimeout(() => {
					document.getElementById('message-text').focus()
				}, 100)
			}
		}
	}
}
</script>
<style lang="sass">
#container-messages
	height: calc(100% - 70px)
	overflow-y: scroll
	padding: 12px
	background: var(--bg-section, #f7f9fb)
#messages
	display: flex
	flex-direction: column
	gap: 8px
.incoming-message
	align-self: flex-start
	color: var(--color-text-primary, #111827)
.outgoing-message
	align-self: flex-end
	// NO tocar: va pareado con el verde de WhatsApp de .outgoing-message.message, que es marca
	// y queda igual en los dos modos. Tokenizar solo este lado dejaria texto claro sobre el
	// mismo verde en oscuro.
	color: #111827
.message
	border-radius: 10px
	padding: 8px 10px
	margin-bottom: 0
	width: auto
	max-width: 80%
	background: var(--bg-card, #FFF)
	border: 1px solid var(--color-border-secondary, #ececec)
	.text
		text-align: left
		white-space: pre-wrap
	.since
		font-size: 11px
		text-align: right
		// NO tocar: esta misma regla cae adentro de la burbuja entrante (que va a --bg-card,
		// oscuro) Y de la saliente (que se queda en el verde de WhatsApp, siempre claro). Un
		// solo token no puede acertar en las dos a la vez -- ver el comentario de arriba.
		color: #6b7280
		margin-top: 4px
		line-height: 1.2
.outgoing-message.message
	// Verde de WhatsApp: color de marca, se mantiene igual en los dos modos (rule 8).
	background: #dcf8c6
.incoming-message.message
	background: var(--bg-card, #ffffff)
	p
		margin: 0
</style>