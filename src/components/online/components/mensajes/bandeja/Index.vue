<template>
	<div
	class="tienda-mensajes-bandeja"
	data-testid="tienda-mensajes-bandeja">
		<div class="tienda-mensajes-bandeja__header">
			<buscador></buscador>
			<!-- Filtro "Sin leer": lo pide al backend (`?solo_no_leidos=1`), no filtra lo que ya
			está en memoria, porque la bandeja viene paginada. -->
			<b-button
			size="sm"
			variant="outline-secondary"
			class="tienda-mensajes-bandeja__filtro"
			:class="{'tienda-mensajes-bandeja__filtro--activo': solo_no_leidos}"
			:pressed="solo_no_leidos"
			data-testid="tienda-mensajes-filtro-sin-leer"
			title="Mostrar solo las conversaciones con mensajes sin leer"
			@click="alternar_solo_no_leidos">
				<i class="bi bi-funnel"></i>
				<span>Sin leer</span>
			</b-button>
		</div>

		<div
		ref="cuerpo"
		class="tienda-mensajes-bandeja__cuerpo"
		@scroll="on_scroll">
			<p
			v-if="loading"
			class="tienda-mensajes-bandeja__aviso">
				Cargando conversaciones...
			</p>
			<p
			v-else-if="!chats.length"
			class="tienda-mensajes-bandeja__aviso">
				{{ texto_vacio }}
			</p>
			<template v-else>
				<chat-row
				v-for="chat in chats"
				:key="chat.buyer_id"
				:chat="chat"
				:is_active="sidebar_abierto && chat.buyer_id == selected_buyer_id"
				@select="abrir"></chat-row>
				<p
				v-if="loading_more"
				class="tienda-mensajes-bandeja__aviso tienda-mensajes-bandeja__aviso--mas">
					Cargando más conversaciones...
				</p>
			</template>
		</div>
	</div>
</template>
<script>
import Buscador from '@/components/online/components/mensajes/bandeja/Buscador'
import ChatRow from '@/components/online/components/mensajes/bandeja/ChatRow'

// A cuántos píxeles del fondo se pide la página siguiente de la bandeja.
const MARGEN_SCROLL_PX = 120

/**
 * Bandeja de conversaciones con los compradores de la tienda. Calcada de
 * `whatsapp/chats-list/Index.vue`, sin "Nuevo chat" ni configuración: acá la conversación la
 * empieza siempre el comprador desde la tienda (o el comercio desde Clientes, con el botón
 * "Mensaje").
 *
 * La bandeja viene paginada del backend (30 por página) y se completa con scroll infinito hacia
 * abajo. Los pedidos los hace el store; acá solo se decide cuándo.
 */
export default {
	components: {
		Buscador,
		ChatRow,
	},
	computed: {
		chats() {
			return this.$store.state.tienda_mensajes.chats
		},
		loading() {
			return this.$store.state.tienda_mensajes.chats_loading
		},
		loading_more() {
			return this.$store.state.tienda_mensajes.chats_loading_more
		},
		solo_no_leidos() {
			return this.$store.state.tienda_mensajes.solo_no_leidos
		},
		selected_buyer_id() {
			return this.$store.state.tienda_mensajes.selected_buyer_id
		},
		sidebar_abierto() {
			return this.$store.state.tienda_mensajes.sidebar_abierto
		},
		hay_mas() {
			return this.$store.getters['tienda_mensajes/hay_mas_chats']
		},
		texto_vacio() {
			if (String(this.$store.state.tienda_mensajes.buscar || '').trim()) {
				return 'No hay conversaciones que coincidan con la búsqueda'
			}
			if (this.solo_no_leidos) {
				return 'No hay conversaciones sin leer'
			}
			return 'Todavía no hay mensajes de la tienda. Cuando un cliente te escriba desde la tienda, la conversación aparece acá.'
		},
	},
	watch: {
		/**
		 * Si la página que llegó no alcanza a llenar el alto de la bandeja no hay scroll, y sin
		 * scroll nunca se pediría la siguiente. Pasa en pantallas altas o con un filtro que deja
		 * pocas filas por página.
		 */
		'chats.length'() {
			this.$nextTick(this.completar_si_no_hay_scroll)
		},
	},
	methods: {
		abrir(chat) {
			this.abrir_chat_tienda(Object.assign({}, chat.buyer || {}, { id: chat.buyer_id }))
		},
		alternar_solo_no_leidos() {
			this.$store.commit('tienda_mensajes/setSoloNoLeidos', !this.solo_no_leidos)
			this.$store.dispatch('tienda_mensajes/getChats', { page: 1 })
			if (this.$refs.cuerpo) {
				this.$refs.cuerpo.scrollTop = 0
			}
		},
		/**
		 * Scroll infinito hacia abajo: cerca del fondo se pide la página siguiente (el store corta
		 * si no hay más o si ya hay una en vuelo).
		 */
		on_scroll(event) {
			let el = event.target
			if (el.scrollHeight - el.scrollTop - el.clientHeight < MARGEN_SCROLL_PX) {
				this.$store.dispatch('tienda_mensajes/getMasChats')
			}
		},
		completar_si_no_hay_scroll() {
			let el = this.$refs.cuerpo
			if (!el || !this.hay_mas || this.loading || this.loading_more) {
				return
			}
			if (el.scrollHeight <= el.clientHeight + MARGEN_SCROLL_PX) {
				this.$store.dispatch('tienda_mensajes/getMasChats')
			}
		},
	},
}
</script>
<style lang="sass">
@import '@/components/online/components/mensajes/_tokens'

.tienda-mensajes-bandeja
	height: 100%
	display: flex
	flex-direction: column
	background: var(--wa-panel)
	color: var(--wa-texto)
	&__header
		display: flex
		flex-direction: row
		align-items: center
		padding: 10px 12px
		border-bottom: 1px solid var(--wa-borde)
		// En la franja de tablet (768-1024px) la columna de la bandeja mide 250-340px: sin permitir
		// el salto de línea el buscador quedaba aplastado a nada al lado del filtro.
		flex-wrap: wrap
		gap: var(--toolbar-btn-gap)
		row-gap: 6px
	// Geometría de los botones de barra del sistema (mismos tokens que .btn-modulo y que el header
	// de la bandeja de WhatsApp). El `.btn` del selector le gana a `.btn-sm` por especificidad.
	&__filtro.btn
		flex-shrink: 0
		height: var(--toolbar-control-h)
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 6px
		padding: 0 12px
		font-size: .875rem
		line-height: 1
		border-radius: var(--toolbar-btn-radius)
		box-shadow: var(--toolbar-btn-shadow)
		white-space: nowrap
		color: var(--wa-texto)
		border-color: var(--wa-borde)
		background: var(--wa-panel)
		&:hover,
		&:focus
			color: var(--wa-texto)
			background: var(--wa-hover)
			border-color: var(--wa-borde)
			box-shadow: var(--toolbar-btn-shadow)
	// Prendido: el verde de la marca con su texto oscuro. Los selectores llevan el
	// `:not(:disabled):not(.disabled)` porque Bootstrap 4 declara `.btn-outline-secondary:not(...):active`
	// en (0,4,0) y sin esto el `pressed` (que agrega `.active`) pintaba el gris de Bootstrap.
	&__filtro--activo.btn,
	&__filtro--activo.btn.btn-outline-secondary:not(:disabled):not(.disabled).active,
	&__filtro--activo.btn.btn-outline-secondary:not(:disabled):not(.disabled):active,
	&__filtro--activo.btn:hover,
	&__filtro--activo.btn:focus
		background: var(--wa-verde)
		border-color: var(--wa-verde)
		color: var(--wa-verde-texto)
		box-shadow: none
	&__cuerpo
		flex: 1
		min-height: 0
		overflow-y: auto
	&__aviso
		margin: 20px 16px
		text-align: center
		font-size: .875rem
		color: var(--color-text-secondary)
		&--mas
			margin: 10px 16px
			font-size: .8rem

// Teléfono: la vista se apila (ver mensajes/Index.vue) y la columna deja de tener el alto de la
// pantalla. La bandeja se queda con un alto propio y su scroll adentro, a diferencia de la de
// WhatsApp (que crece con la página): esta viene PAGINADA, y el scroll infinito necesita un
// contenedor que scrollee para saber cuándo pedir la página siguiente.
@media screen and (max-width: 767px)
	.tienda-mensajes-bandeja
		height: 80vh
		min-height: 420px
</style>
