<template>
	<div>
		<div
		v-if="view == 'mensajes'">

			<!-- Mientras viaja la primera carga no se dibuja el vacío: diría "no hay mensajes sin
			leer" antes de saberlo, con el número de la pestaña diciendo otra cosa. -->
			<p
			v-if="cargando && !cargada"
			data-testid="alertas-mensajes-cargando"
			class="alertas-mensajes__cargando">
				Cargando mensajes sin leer...
			</p>

			<template v-else-if="chats_sin_leer.length">
				<!-- Cada fila abre la conversación en el sidebar de Mensajes, sin salir de Alertas. -->
				<b-table
				data-testid="alertas-mensajes-tabla"
				head-variant="dark"
				responsive
				hover
				tbody-tr-class="alertas-mensajes__fila"
				:fields="fields"
				:items="items"
				@row-clicked="abrir">
					<template #cell(abrir)="data">
						<b-button
						size="sm"
						variant="outline-secondary"
						data-testid="alertas-mensajes-abrir"
						@click.stop="abrir(data.item)">
							<i class="bi bi-chat-dots"></i>
							Abrir
						</b-button>
					</template>
				</b-table>

				<!-- La lista trae la primera página (30). Si hay más, se dice cuántas y se lleva a la
				bandeja con el filtro "Sin leer" prendido, donde se ven todas. -->
				<p
				v-if="faltan > 0"
				class="alertas-mensajes__mas">
					Y {{ faltan == 1 ? 'una conversación más' : faltan + ' conversaciones más' }} sin leer.
					<b-button
					variant="link"
					size="sm"
					class="alertas-mensajes__ver-todas"
					@click="ver_todas">
						Ver todas en Mensajes
					</b-button>
				</p>
			</template>

			<!-- Estado vacío del sistema (display/EmptyState), en vez del cartel azul viejo. -->
			<empty-state
			v-else
			data-testid="alertas-mensajes-vacio"
			icon_class="bi bi-chat-dots"
			title="No hay mensajes sin leer"
			hint="Cuando un cliente escriba desde la tienda, el mensaje aparece acá."></empty-state>

		</div>
	</div>

</template>
<script>
import { nombre_del_comprador } from '@/components/online/components/mensajes/helpers'

/**
 * Alertas → Mensajes: las conversaciones de la tienda con algo sin leer (misión
 * mensajes-tienda-online, 28/9/2026).
 *
 * La lista sale de `tienda_mensajes.chats_no_leidos`, que es una lista APARTE de la bandeja del
 * submódulo (Alertas no puede pisar lo que el operador tiene buscado allá) y que el broadcast
 * mantiene al día: una conversación que se lee desaparece sola de acá. Antes esto bajaba todos los
 * compradores al iniciar sesión y contaba en el navegador.
 *
 * 🔴 La lista la pide ESTE componente, con el watch de `view`, y no `views/Alertas.vue`. El
 * `setSelectedView()` de Alertas solo recarga cuando la pestaña que se toca ya es la de la URL, y el
 * `horizontal-nav` emite `setSelected` ANTES de cambiar la ruta: entrando por la pestaña (o por el
 * menú) nunca pedía nada y la tabla quedaba vacía con el número de la pestaña diciendo "5". Acá
 * anda igual entrando por el menú, por la pestaña o por URL directa (/alertas/mensajes). Si los dos
 * lo piden a la vez, el store reusa el pedido que ya está en vuelo.
 */
export default {
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
	},
	computed: {
		cargando() {
			return this.$store.state.tienda_mensajes.chats_no_leidos_loading
		},
		/**
		 * La lista ya se trajo del backend al menos una vez. Antes de eso, lo que haya en memoria
		 * es solo lo que entró por broadcast (parcial), y no se muestra como si fuera la lista.
		 */
		cargada() {
			return this.$store.state.tienda_mensajes.chats_no_leidos_cargados
		},
		fields() {
			return [
				{
					key: 'cliente',
				},
				{
					key: 'mensajes',
					label: 'Sin leer',
				},
				{
					key: 'hace',
				},
				{
					key: 'fecha',
				},
				{
					key: 'abrir',
					label: '',
				},
			]
		},
		chats_sin_leer() {
			return this.$store.state.tienda_mensajes.chats_no_leidos
		},
		faltan() {
			return Math.max(0, this.$store.state.tienda_mensajes.chats_no_leidos_total - this.chats_sin_leer.length)
		},
		items() {
			return this.chats_sin_leer.map(chat => {
				return {
					buyer_id: chat.buyer_id,
					buyer: chat.buyer || null,
					cliente: nombre_del_comprador(chat.buyer, chat.buyer_id),
					mensajes: chat.unread_count,
					hace: this.since(chat.last_message_at),
					fecha: this.date(chat.last_message_at),
				}
			})
		},
	},
	watch: {
		view: {
			immediate: true,
			handler(vista) {
				if (vista != 'mensajes') {
					return
				}
				// El resumen va junto para que el número de la pestaña (la suma de mensajes sin leer)
				// y la columna "Sin leer" de las filas digan lo mismo.
				this.$store.dispatch('tienda_mensajes/getResumen')
				this.$store.dispatch('tienda_mensajes/getChatsNoLeidos')
			},
		},
	},
	methods: {
		/**
		 * @param {Object} item Fila de la tabla (lleva `buyer_id` y `buyer`).
		 */
		abrir(item) {
			this.abrir_chat_tienda(Object.assign({}, item.buyer || {}, { id: item.buyer_id }))
		},
		/**
		 * Lleva a la bandeja con el filtro "Sin leer" prendido. La bandeja pide la página 1 al
		 * entrar, así que el filtro se deja puesto antes de navegar.
		 */
		ver_todas() {
			this.$store.commit('tienda_mensajes/setBuscar', '')
			this.$store.commit('tienda_mensajes/setSoloNoLeidos', true)
			this.$router.push({name: 'online', params: {view: 'mensajes'}})
		},
	},
}
</script>
<style lang="sass">
.alertas-mensajes__fila
	cursor: pointer
.alertas-mensajes__cargando
	margin: 20px 0
	text-align: center
	font-size: .875rem
	color: var(--color-text-secondary)
.alertas-mensajes__mas
	margin: 8px 0 0 0
	font-size: .875rem
	color: var(--color-text-secondary)
.alertas-mensajes__ver-todas.btn
	padding: 0 0 0 4px
	vertical-align: baseline
	font-size: .875rem
</style>
