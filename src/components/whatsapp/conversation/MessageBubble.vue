<template>
	<div
	class="whatsapp-bubble"
	:class="bubble_class">
		<span
		v-if="is_out"
		class="whatsapp-bubble__sender">
			{{ sender_label }}
		</span>
		<p class="whatsapp-bubble__text">
			{{ message.body }}
		</p>
		<div class="whatsapp-bubble__footer">
			<span class="whatsapp-bubble__time">
				{{ format_time(message.created_at) }}
			</span>
			<!-- Checks de entrega estilo WhatsApp: solo aplican a mensajes salientes. -->
			<span
			v-if="is_out"
			class="whatsapp-bubble__status"
			:title="status_title">
				<i
				v-if="message.delivery_status == 'pendiente'"
				class="bi bi-clock"></i>
				<i
				v-else-if="message.delivery_status == 'enviado'"
				class="bi bi-check"></i>
				<i
				v-else-if="message.delivery_status == 'entregado'"
				class="bi bi-check-all"></i>
				<i
				v-else-if="message.delivery_status == 'leido'"
				class="bi bi-check-all whatsapp-bubble__status--read"></i>
				<i
				v-else-if="message.delivery_status == 'fallido'"
				class="bi bi-exclamation-circle whatsapp-bubble__status--failed"></i>
			</span>
		</div>
	</div>
</template>
<script>
import moment from 'moment'
export default {
	props: {
		message: {
			type: Object,
			required: true,
		},
	},
	computed: {
		is_out() {
			return this.message.direction == 'out'
		},
		bubble_class() {
			return this.is_out ? 'whatsapp-bubble--out' : 'whatsapp-bubble--in'
		},
		/**
		 * Quién mandó el mensaje saliente: empleado, IA o plantilla usada.
		 *
		 * @returns {string}
		 */
		sender_label() {
			if (this.message.source == 'ia') {
				return 'IA'
			}
			if (this.message.source == 'plantilla') {
				return this.message.template_meta_name || 'Plantilla'
			}
			if (this.message.source == 'sistema') {
				return 'Sistema'
			}
			if (this.message.sent_by_user && this.message.sent_by_user.name) {
				return this.message.sent_by_user.name
			}
			return 'Vos'
		},
		status_title() {
			if (this.message.delivery_status == 'fallido' && this.message.send_error) {
				return 'Falló: ' + this.message.send_error
			}
			let titles = {
				pendiente: 'Pendiente de envío',
				enviado: 'Enviado',
				entregado: 'Entregado',
				leido: 'Leído',
				fallido: 'Falló el envío',
			}
			return titles[this.message.delivery_status] || ''
		},
	},
	methods: {
		format_time(created_at) {
			return moment(created_at).format('HH:mm')
		},
	},
}
</script>
<style lang="sass">
.whatsapp-bubble
	max-width: 70%
	padding: 6px 10px
	border-radius: 10px
	margin-bottom: 4px
	box-shadow: 0 1px 1px rgba(0, 0, 0, .08)
	&--in
		align-self: flex-start
		background: #ffffff
	&--out
		align-self: flex-end
		background: #dcf8c6
	&__sender
		display: block
		font-size: .7rem
		font-weight: 700
		color: #075e54
		margin-bottom: 2px
	&__text
		margin: 0
		white-space: pre-wrap
		word-break: break-word
		text-align: left
	&__footer
		display: flex
		flex-direction: row
		justify-content: flex-end
		align-items: center
		margin-top: 2px
	&__time
		font-size: .68rem
		color: rgba(0, 0, 0, .45)
	&__status
		margin-left: 4px
		font-size: .8rem
		color: rgba(0, 0, 0, .45)
		&--read
			color: #34b7f1
		&--failed
			color: #dc3545
</style>
