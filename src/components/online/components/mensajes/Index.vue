<template>
	<b-row
	v-if="es_la_vista"
	class="tienda-mensajes-modulo"
	data-testid="tienda-mensajes-modulo">
		<b-col
		class="tienda-mensajes-modulo__bandeja"
		cols="12"
		md="4">
			<bandeja></bandeja>
		</b-col>
		<b-col
		class="tienda-mensajes-modulo__panel"
		cols="12"
		md="8">
			<div class="tienda-mensajes-panel">
				<div class="tienda-mensajes-panel__tarjetas">
					<div
					v-for="tarjeta in tarjetas"
					:key="tarjeta.key"
					class="tienda-mensajes-panel__tarjeta"
					:class="tarjeta.clase"
					:title="tarjeta.ayuda"
					:data-testid="'tienda-mensajes-tarjeta-' + tarjeta.key">
						<i
						class="tienda-mensajes-panel__icono bi"
						:class="tarjeta.icono"></i>
						<div class="tienda-mensajes-panel__contenido">
							<span class="tienda-mensajes-panel__valor">{{ tarjeta.valor }}</span>
							<span class="tienda-mensajes-panel__etiqueta">{{ tarjeta.etiqueta }}</span>
						</div>
					</div>
				</div>

				<!-- El vacío de "elegí una conversación" solo tiene sentido al lado de la bandeja: en
				teléfono la bandeja va abajo y la conversación se abre a pantalla completa. -->
				<div class="tienda-mensajes-panel__vacio">
					<i class="bi bi-chat-dots"></i>
					<p class="tienda-mensajes-panel__vacio-titulo">
						Elegí una conversación
					</p>
					<p class="tienda-mensajes-panel__vacio-ayuda">
						Los mensajes que te mandan tus clientes desde la tienda llegan acá en vivo, y los contestás a mano desde el panel de la derecha.
					</p>
				</div>
			</div>
		</b-col>
	</b-row>
</template>
<script>
import Bandeja from '@/components/online/components/mensajes/bandeja/Index'

/**
 * Submódulo "Mensajes" de Tienda Online (misión mensajes-tienda-online, 28/9/2026): el comercio
 * lee y contesta a mano los mensajes que le mandan sus compradores desde la tienda. Mismo layout
 * que `views/Whatsapp.vue`: la bandeja en un tercio de la pantalla y, en los otros dos, un panel
 * liviano con tres números y el vacío de "Elegí una conversación".
 *
 * 🔴 **Acá NO se dibuja la conversación.** Vive en el sidebar (`mensajes/sidebar/Index.vue`), que
 * monta `mensajes/SidebarHost.vue` desde `App.vue`, igual que WhatsApp: así se abre también desde
 * Clientes, desde Alertas y desde el aviso de mensaje nuevo, sin dos copias de lo mismo.
 *
 * 🔴 **Y acá tampoco vive la suscripción al broadcast.** Es del anfitrión, que está montado en
 * toda la aplicación: estando en cualquier pantalla el mensaje entra, suena y avisa.
 *
 * Se monta siempre que se está en /online (Online.vue monta todas las secciones y cada una se
 * gatea por `view`), así que la carga no va en `created()` sino en el watch de `es_la_vista`: se
 * pide la página 1 cada vez que se ENTRA a Mensajes, no cada vez que se entra a Pedidos.
 */
export default {
	components: {
		Bandeja,
	},
	computed: {
		es_la_vista() {
			return this.view == 'mensajes'
		},
		resumen() {
			return this.$store.state.tienda_mensajes.resumen
		},
		total_conversaciones() {
			return this.$store.state.tienda_mensajes.total_conversaciones
		},
		tarjetas() {
			let mensajes_no_leidos = this.resumen.mensajes_no_leidos
			return [
				{
					key: 'sin-leer',
					icono: 'bi-envelope-exclamation-fill',
					etiqueta: 'Sin leer',
					valor: this.resumen.chats_no_leidos,
					ayuda: 'Conversaciones con mensajes sin leer (' + mensajes_no_leidos + (mensajes_no_leidos == 1 ? ' mensaje' : ' mensajes') + ' en total)',
					clase: 'tienda-mensajes-panel__tarjeta--sin-leer',
				},
				{
					key: 'hoy',
					icono: 'bi-chat-dots-fill',
					etiqueta: 'Conversaciones hoy',
					valor: this.resumen.conversaciones_hoy,
					ayuda: 'Compradores que escribieron o a los que les escribiste hoy',
					clase: 'tienda-mensajes-panel__tarjeta--hoy',
				},
				{
					key: 'total',
					icono: 'bi-people-fill',
					etiqueta: 'Total de conversaciones',
					// null hasta que llegue el listado sin filtros: un 0 mentiría.
					valor: this.total_conversaciones === null ? '—' : this.total_conversaciones,
					ayuda: 'Compradores con al menos un mensaje',
					clase: '',
				},
			]
		},
	},
	watch: {
		es_la_vista: {
			immediate: true,
			handler(es) {
				if (!es) {
					return
				}
				this.$store.dispatch('tienda_mensajes/getChats', { page: 1 })
				this.$store.dispatch('tienda_mensajes/getResumen')
				this.abrir_desde_la_url()
			},
		},
	},
	methods: {
		/**
		 * Link directo a una conversación: /online/mensajes/{buyer_id}. Lo usaba el módulo viejo
		 * y se conserva, con la misma guarda que el link directo de WhatsApp: un id que no es un
		 * número no abre nada.
		 */
		abrir_desde_la_url() {
			let buyer_id = parseInt(this.$route.params.sub_view, 10)
			if (!isNaN(buyer_id) && buyer_id > 0) {
				this.abrir_chat_tienda(buyer_id)
			}
		},
	},
}
</script>
<style lang="sass">
.tienda-mensajes-modulo
	// `100vh` a secas, igual que el módulo de WhatsApp: el nav de este layout es un riel vertical
	// fijo que no consume alto (el porqué completo está en views/Whatsapp.vue).
	height: 100vh
	margin-bottom: 0 !important
	&__bandeja,
	&__panel
		height: 100%
		padding: 0
	// Teléfono: las dos columnas se apilan, el panel compacto ARRIBA y la bandeja abajo. En el DOM
	// la bandeja va primero (así queda a la izquierda en escritorio y tablet), por eso el `order`.
	@media screen and (max-width: 767px)
		height: auto
		min-height: 100vh
		&__panel
			order: 1
		&__bandeja
			order: 2
		&__bandeja,
		&__panel
			height: auto

.tienda-mensajes-panel
	height: 100%
	// Un escalón por debajo de la bandeja, igual que el tablero de WhatsApp: con el mismo fondo las
	// dos columnas se leían como una sola.
	background: var(--bg-section)
	padding: 24px
	display: flex
	flex-direction: column
	gap: 24px
	&__tarjetas
		display: grid
		grid-template-columns: repeat(3, minmax(0, 1fr))
		gap: 16px
	&__tarjeta
		display: flex
		align-items: center
		gap: 14px
		padding: 18px
		border-radius: 12px
		background: var(--bg-hover)
		border: 1px solid var(--wa-borde)
		border-left: 4px solid transparent
		// Sin `min-width: 0` una etiqueta larga ensanchaba la celda del grid en la franja de tablet.
		min-width: 0
	&__icono
		font-size: 1.6rem
		flex-shrink: 0
		color: var(--color-text-secondary)
	&__contenido
		display: flex
		flex-direction: column
		min-width: 0
	&__valor
		font-size: 1.7rem
		font-weight: 700
		line-height: 1.1
		color: var(--wa-texto)
	&__etiqueta
		font-size: .8rem
		color: var(--color-text-secondary)
		white-space: normal
	// Sin leer: rojo, los mismos tokens que la tarjeta "Sin responder" del tablero de WhatsApp.
	&__tarjeta--sin-leer
		background: var(--wa-sin-responder-bg)
		border-left-color: var(--wa-sin-responder-borde)
		.tienda-mensajes-panel__icono
			color: var(--wa-sin-responder-borde)
		.tienda-mensajes-panel__valor
			color: var(--wa-sin-responder-texto)
	// Conversaciones de hoy: el velo del verde de la marca (respaldo sin color-mix: --wa-hover).
	&__tarjeta--hoy
		background: var(--wa-hover)
		background: color-mix(in srgb, var(--wa-verde) 12%, transparent)
		border-left-color: var(--wa-verde)
		.tienda-mensajes-panel__icono
			color: var(--wa-verde)
	&__vacio
		flex: 1
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		text-align: center
		color: var(--color-text-secondary)
		padding: 24px
		i
			font-size: 3rem
			margin-bottom: 10px
			opacity: var(--wa-texto-tenue-op)
	&__vacio-titulo
		font-size: 1.05rem
		font-weight: 600
		color: var(--wa-texto)
		margin-bottom: 6px
	&__vacio-ayuda
		max-width: 420px
		font-size: .875rem
		margin: 0

// Tablet (768-1024px): el panel mide 510-680px, todavía entran las tres tarjetas en fila; se
// achica el aire para que no se aprieten.
@media screen and (max-width: 1024px)
	.tienda-mensajes-panel
		padding: 16px
		gap: 16px
		&__tarjetas
			gap: 10px
		&__tarjeta
			padding: 12px
			gap: 10px
		&__icono
			font-size: 1.3rem
		&__valor
			font-size: 1.4rem

// Teléfono: el panel pasa arriba de la bandeja, compacto. Las tres tarjetas siguen en fila (son un
// número y una etiqueta corta) pero con el ícono arriba, y el vacío de "elegí una conversación"
// no se dibuja: la conversación se abre a pantalla completa.
@media screen and (max-width: 767px)
	.tienda-mensajes-panel
		height: auto
		padding: 12px
		&__tarjetas
			gap: 8px
		&__tarjeta
			flex-direction: column
			text-align: center
			padding: 10px 6px
			gap: 4px
		&__icono
			font-size: 1.2rem
		&__valor
			font-size: 1.15rem
		&__etiqueta
			font-size: .68rem
		&__vacio
			display: none
</style>
