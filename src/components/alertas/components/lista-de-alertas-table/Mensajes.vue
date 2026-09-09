<template>
	<div>
		<div
		v-if="view == 'mensajes'">

			<b-table
			v-if="chats_sin_leer.length"
			head-variant="dark"
			responsive
			:fields="fields"
			:items="items">
			</b-table>

			<!-- Estado vacío del sistema (display/EmptyState), en vez del cartel azul viejo. -->
			<empty-state
			v-else
			icon_class="bi bi-chat-dots"
			title="No hay mensajes sin leer"
			hint="Cuando un cliente escriba desde la tienda, el mensaje aparece acá."></empty-state>

		</div>
	</div>

</template>
<script>
import online from '@/mixins/online'
export default {
	mixins: [online],
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
	},
	computed: {
		fields() {
			return [
				{
					key: 'cliente',
				},
				{
					key: 'mensajes',
				},
				{
					key: 'hace',
				},
				{
					key: 'fecha',
				},
			]
		},
		items() {
			let items = []

			this.chats_sin_leer.forEach(chat_sin_leer => {

				// Fecha del último mensaje: el agregado `last_message_at` del listado o, si no
				// vino (payload viejo), la del último mensaje cargado. Sin ninguna, since() y
				// date() devuelven '-'.
				let fecha_ultimo_mensaje = chat_sin_leer.last_message_at
				if (!fecha_ultimo_mensaje && chat_sin_leer.messages && chat_sin_leer.messages.length) {
					fecha_ultimo_mensaje = chat_sin_leer.messages[chat_sin_leer.messages.length - 1].created_at
				}

				items.push({
					cliente: chat_sin_leer.name,
					mensajes: this.messagesNotRead(chat_sin_leer),
					hace: this.since(fecha_ultimo_mensaje),
					fecha: this.date(fecha_ultimo_mensaje),
				})
			})

			return items
		},

		chats() {
			return this.$store.state.message.chats_to_show
		},
		chats_sin_leer() {
			let chats_sin_leer = []

			this.chats.forEach(chat => {
				if (this.messagesNotRead(chat) > 0) {
					chats_sin_leer.push(chat)
				}
			})

			return chats_sin_leer
		}
	},
	methods: {
		showCurrentAcounts(provider_order) {
			this.showProviderCurrentAcount(provider_order)
		}
	}
}
</script>