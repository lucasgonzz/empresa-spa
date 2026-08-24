<template>
	<b-row
	class="whatsapp-module">
		<b-col
		class="whatsapp-module__chats"
		cols="12">
			<chats-list></chats-list>
		</b-col>
	</b-row>
</template>
<script>
import ChatsList from '@/components/whatsapp/chats-list/Index'

/**
 * Módulo de WhatsApp: la bandeja de chats, y nada más.
 *
 * 🔴 **Acá ya no se dibuja la conversación.** Vive en un único lugar de toda la aplicación:
 * el sidebar (`components/whatsapp/sidebar/Index.vue`), que monta `SidebarHost.vue` desde
 * `App.vue`. Es lo que hace que "reutilizable" signifique algo: si la conversación se dibujara
 * también acá, habría dos copias de lo mismo para mantener.
 *
 * 🔴 **Y acá ya no vive la suscripción a Echo.** También se mudó a `SidebarHost.vue`. No puede
 * volver: con las dos escuchas activas, cada mensaje entrante sonaría dos veces y dispararía
 * dos `markRead`.
 *
 * Queda como `b-row` con una sola columna (y no como un div suelto) para conservar los
 * márgenes negativos de Bootstrap que compensan el padding del `b-container` de App.vue: sin
 * eso la bandeja dejaría de llegar hasta el borde de la pantalla.
 */
export default {
	components: {
		ChatsList,
	},
	created() {
		/*
			Carga inicial de la bandeja de chats y del catálogo de plantillas (lo usa el
			composer para el modal de plantillas). Se cargan acá, una sola vez al entrar
			al módulo, en vez de en cada sub-componente.
		*/
		this.$store.dispatch('whatsapp_chat/getChats')
		this.$store.dispatch('whatsapp_template/getModels')

		/*
			Link directo a /whatsapp/{id} (ej: desde otra parte del sistema). Antes esto solo
			commiteaba `setSelectedChatId` y nunca pedía los mensajes: la conversación se abría
			vacía. Ahora abre el sidebar y la carga la dispara el watch de conversation/Index.vue,
			que es el mismo camino que recorren los otros tres modos de abrir un chat.
		*/
		if (this.$route.params.chat_id) {
			let chat_id = parseInt(this.$route.params.chat_id, 10)
			// Con un id que no es un número no se intenta nada: sin esta guarda el payload
			// saldría con chat_id NaN y el store creería que le pidieron abrir por teléfono.
			if (!isNaN(chat_id)) {
				this.abrir_chat_whatsapp({chat_id: chat_id})
			}
		}
	},
}
</script>
<style lang="sass">
.whatsapp-module
	height: calc(100vh - 50px)
	margin-bottom: 0 !important
	// La bandeja ocupa el ancho completo. El sidebar la tapa parcialmente cuando está abierto,
	// a propósito: sigue estando a la vista y se puede saltar de un chat a otro sin cerrarlo.
	&__chats
		height: 100%
		padding: 0
</style>
