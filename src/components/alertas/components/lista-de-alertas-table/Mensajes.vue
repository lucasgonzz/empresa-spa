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

				let ultimo_mensaje_sin_leer = chat_sin_leer.messages[chat_sin_leer.messages.length - 1]

				items.push({
					cliente: chat_sin_leer.name,
					mensajes: this.messagesNotRead(chat_sin_leer),
					hace: this.since(ultimo_mensaje_sin_leer.created_at),
					fecha: this.date(ultimo_mensaje_sin_leer.created_at),
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