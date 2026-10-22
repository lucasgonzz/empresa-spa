<template>
	<!--
		Gate por extension (mision agentes-ia-extension-unica, 22/10/2026): el modulo de WhatsApp es
		parte de "Agentes de IA" (agentes_ia). El menu ya lo esconde, pero la ruta /whatsapp existe
		siempre (el router no procesa extensiones), asi que quien la tipee sin la extension ve un
		aviso en vez de una bandeja que responderia 403. Mientras auth/me no resolvio no se dibuja
		ni el modulo ni el aviso (hasExtencion devuelve undefined): sin parpadeo.
	-->
	<b-row
	v-if="tiene_agentes_ia"
	class="whatsapp-module">
		<b-col
		class="whatsapp-module__chats"
		cols="12"
		md="4">
			<chats-list></chats-list>
		</b-col>
		<b-col
		class="whatsapp-module__tablero"
		cols="12"
		md="8">
			<dashboard-tablero></dashboard-tablero>
		</b-col>
	</b-row>
	<b-alert
	v-else-if="extensiones_cargadas"
	show
	variant="warning"
	class="m-t-15">
		Este módulo requiere la extensión Agentes de IA. Comunicate con ComercioCity si querés activarla.
	</b-alert>
</template>
<script>
import ChatsList from '@/components/whatsapp/chats-list/Index'
import DashboardTablero from '@/components/whatsapp/dashboard/Index'

/**
 * Módulo de WhatsApp: la bandeja de chats (un tercio de la pantalla) y el tablero de estado
 * (los dos tercios restantes) — misión whatsapp-tablero-clientes, 14/9/2026. Hasta esa misión
 * esta vista era una sola columna con solo la bandeja; se resolvió el pedido de Lucas de dejar
 * de ocupar toda la pantalla con la lista y sumar un panel fijo con el resumen de la bandeja.
 *
 * 🔴 **Acá NO se dibuja la conversación.** Vive en un único lugar de toda la aplicación:
 * el sidebar (`components/whatsapp/sidebar/Index.vue`), que monta `SidebarHost.vue` desde
 * `App.vue`, `position: fixed` sobre la parte derecha. Es lo que hace que "reutilizable"
 * signifique algo: si la conversación se dibujara también acá, habría dos copias de lo mismo
 * para mantener. Al abrir un chat, el sidebar tapa parte del tablero (no la bandeja, que queda
 * a la izquierda) — es el mismo comportamiento de siempre, no algo que esta misión cambie.
 *
 * 🔴 **Y acá tampoco vive la suscripción a Echo.** También se mudó a `SidebarHost.vue`. No
 * puede volver: con las dos escuchas activas, cada mensaje entrante sonaría dos veces y
 * dispararía dos `markRead`.
 *
 * Queda como `b-row` con `b-col` (y no como dos `div` sueltos) para conservar los márgenes
 * negativos de Bootstrap que compensan el padding del `b-container` de App.vue: sin eso el
 * módulo dejaría de llegar hasta el borde de la pantalla.
 */
export default {
	components: {
		ChatsList,
		DashboardTablero,
	},
	data() {
		return {
			// true cuando ya se hizo la carga inicial (se hace una sola vez, apenas se sabe que hay extension).
			cargado: false,
		}
	},
	computed: {
		/**
		 * La cuenta tiene la extension "Agentes de IA". hasExtencion devuelve undefined mientras
		 * auth/me no resolvio: se lee como "no" (y por eso hay que mirar tambien extensiones_cargadas).
		 */
		tiene_agentes_ia() {
			return !!this.hasExtencion('agentes_ia')
		},
		/** true cuando el usuario y sus extensiones ya llegaron (para no mostrar el aviso antes de tiempo). */
		extensiones_cargadas() {
			return !!(this.authenticated && this.owner_extencions)
		},
	},
	watch: {
		// En una carga fria la extension llega despues de montar la vista: la carga inicial espera a eso.
		tiene_agentes_ia(tiene) {
			if (tiene) {
				this.cargar_modulo()
			}
		},
	},
	created() {
		if (this.tiene_agentes_ia) {
			this.cargar_modulo()
		}
	},
	methods: {
		/**
		 * Carga inicial de la bandeja de chats y del catálogo de plantillas (lo usa el
		 * composer para el modal de plantillas), y abre el chat del link directo si lo hay.
		 * Una sola vez: sin la extension no se llama a nada (la API contestaria 403).
		 */
		cargar_modulo() {
			if (this.cargado) {
				return
			}
			this.cargado = true

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
	},
}
</script>
<style lang="sass">
.whatsapp-module
	// 🔴 `100vh` y no `calc(100vh - 50px)`. Los 50px no correspondían a nada: el nav de este
	// layout es un riel vertical fijo (`NavVertical.vue`, `position: fixed`, ancho fijo) y no
	// consume alto, y `App.vue` no tiene ninguna barra superior fija que reste ese espacio. El
	// resultado con la resta era un hueco vacío de 50px debajo del módulo, en escritorio y en
	// teléfono. Mismo número mágico —sin arreglar acá, fuera de alcance de esta misión— en
	// `components/online/components/messages/Index.vue`.
	height: 100vh
	margin-bottom: 0 !important
	// Escritorio y tablet (≥768px, ver CLAUDE.md — regla de los tres anchos): un tercio para la
	// bandeja, dos tercios para el tablero, los dos a la altura completa del módulo. El sidebar
	// de conversación se abre encima con `position: fixed` (ver el docblock arriba) y tapa parte
	// del tablero cuando está abierto; la bandeja queda siempre visible al lado.
	&__chats,
	&__tablero
		height: 100%
		padding: 0
	// Teléfono (<768px): un tercio de una pantalla de ~375px no alcanza para leer un chat, así
	// que ahí las dos columnas se apilan (Bootstrap ya las pone a `cols="12"` una debajo de la
	// otra) — el tablero arriba, compacto, y la bandeja completa abajo. No se oculta ninguna de
	// las dos: el resumen tiene que verse igual, y `height: 100%` en un `flex-direction: column`
	// de Bootstrap infla cada columna a la altura del módulo entero, así que se corrige a `auto`.
	@media screen and (max-width: 767px)
		height: auto
		min-height: 100vh
		// EL `order` PONE EL TABLERO ARRIBA EN TELEFONO Y NO ES COSMETICO: en el template
		// `__chats` va ANTES que `__tablero` en el DOM (asi queda a la izquierda en
		// desktop/tablet, donde no hay order que lo mueva). Sin esto, en telefono las
		// columnas se apilan en el mismo orden del DOM -bandeja arriba, tablero abajo-, que
		// es lo contrario de lo que dice el parrafo de arriba.
		&__tablero
			order: 1
		&__chats
			order: 2
		&__chats,
		&__tablero
			height: auto
</style>
