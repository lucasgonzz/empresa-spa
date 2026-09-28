<template>
	<div
	class="tienda-mensajes-conversacion"
	data-testid="tienda-mensajes-conversacion">
		<header-conversacion></header-conversacion>
		<mensajes></mensajes>
		<composer></composer>
	</div>
</template>
<script>
import axios from 'axios'
import HeaderConversacion from '@/components/online/components/mensajes/conversacion/Header'
import Mensajes from '@/components/online/components/mensajes/conversacion/Mensajes'
import Composer from '@/components/online/components/mensajes/conversacion/Composer'
import { es_verdadero } from '@/components/online/components/mensajes/helpers'

/**
 * Conversación con un comprador de la tienda, adentro del sidebar. Basada en
 * `whatsapp/conversation/Index.vue`.
 */
export default {
	components: {
		HeaderConversacion,
		Mensajes,
		Composer,
	},
	computed: {
		buyer_id() {
			return this.$store.state.tienda_mensajes.selected_buyer_id
		},
	},
	watch: {
		/**
		 * 🔴 Acá, y en ningún otro lado, se carga la conversación.
		 *
		 * Quien abre un chat (la bandeja, Clientes, Alertas, el aviso de mensaje nuevo) solo dice
		 * cuál, con `abrir_chat_tienda()`. Es la lección que dejó el módulo de WhatsApp, donde la
		 * carga estuvo copiada en cada lugar desde donde se abría un chat y el que no se acordó de
		 * copiarla abría la conversación vacía. `immediate` cubre el caso normal: el sidebar se
		 * monta con la selección ya hecha.
		 *
		 * Después de cargar se marca leído, pero solo si hay algo sin leer (según la fila de la
		 * bandeja o de Alertas, o según lo que llegó): cada "leído" dispara un evento en vivo a
		 * todas las pestañas del comercio, y abrir una conversación ya leída no tiene por qué.
		 */
		buyer_id: {
			immediate: true,
			handler(id) {
				if (!id) {
					return
				}
				let self = this
				this.$store.commit('tienda_mensajes/setMessages', [])
				this.$store.commit('tienda_mensajes/setMessagesPaginas', { page: 0, last_page: null })
				this.$store.dispatch('tienda_mensajes/getMessages', { buyer_id: id, page: 1 })
				.then(function (datos) {
					if (!datos || self.buyer_id != id) {
						return
					}
					if (self.hay_algo_sin_leer(id)) {
						self.$store.dispatch('tienda_mensajes/marcarLeido', id)
					}
				})
				.catch(function (err) {
					if (self.buyer_id != id || axios.isCancel(err)) {
						return
					}
					console.log(err)
					let status = err && err.response ? err.response.status : null
					if (status == 404) {
						// El comprador no es de este comercio (o ya no existe): no hay nada que mostrar.
						self.$toast.error('No se encontró esa conversación en tu tienda.')
						self.$store.commit('tienda_mensajes/setSidebarAbierto', false)
						return
					}
					self.$toast.error('No se pudieron cargar los mensajes. Probá de nuevo en un rato.')
				})
			},
		},
	},
	methods: {
		/**
		 * @param {Number} id
		 * @returns {Boolean}
		 */
		hay_algo_sin_leer(id) {
			let fila = this.$store.getters['tienda_mensajes/fila_de'](id)
			if (fila && parseInt(fila.unread_count, 10) > 0) {
				return true
			}
			return this.$store.state.tienda_mensajes.messages.some(function (message) {
				return es_verdadero(message.from_buyer) && !es_verdadero(message.read)
			})
		},
	},
}
</script>
<style lang="sass">
.tienda-mensajes-conversacion
	height: 100%
	display: flex
	flex-direction: column
</style>
