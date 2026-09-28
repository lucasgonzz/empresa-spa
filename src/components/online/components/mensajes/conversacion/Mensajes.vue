<template>
	<div
	ref="contenedor"
	class="tienda-mensajes-lista"
	data-testid="tienda-mensajes-lista"
	@scroll="on_scroll">
		<p
		v-if="loading"
		class="tienda-mensajes-lista__aviso">
			Cargando mensajes...
		</p>
		<div
		v-else
		class="tienda-mensajes-lista__mensajes">
			<p
			v-if="loading_more"
			class="tienda-mensajes-lista__aviso tienda-mensajes-lista__aviso--anteriores">
				Cargando mensajes anteriores...
			</p>
			<p
			v-if="!messages.length"
			class="tienda-mensajes-lista__aviso">
				Todavía no hay mensajes en esta conversación
			</p>
			<template v-for="item in items">
				<!-- Separador de día (Hoy / Ayer / fecha), como en WhatsApp. -->
				<div
				v-if="item.tipo == 'dia'"
				:key="item.key"
				class="tienda-mensajes-lista__dia">
					<span>{{ item.texto }}</span>
				</div>
				<burbuja
				v-else
				:key="item.key"
				:message="item.message"></burbuja>
			</template>
		</div>
	</div>
</template>
<script>
import moment from 'moment'
import Burbuja from '@/components/online/components/mensajes/conversacion/Burbuja'
import { es_verdadero, texto_de_dia } from '@/components/online/components/mensajes/helpers'

// A cuántos píxeles del tope se pide la página anterior (scroll infinito hacia arriba).
const MARGEN_ARRIBA_PX = 80
// A cuántos píxeles del fondo se considera que el operador "está abajo" y sigue la conversación.
const MARGEN_ABAJO_PX = 150

/**
 * Lista de mensajes de la conversación de la tienda, con los separadores de día y el scroll
 * infinito hacia arriba (técnica copiada de `whatsapp/conversation/Messages.vue`: se anota el alto
 * antes de anteponer la página vieja y se lo compensa después, para que el scroll no salte al
 * tope).
 *
 * 🔴 Cómo se distingue "llegó un mensaje nuevo abajo" de "se antepuso una página vieja arriba": por
 * el id del ÚLTIMO mensaje, no por `loading_more`. Cuando corre el watcher el store ya apagó
 * `loading_more` (lo hace en el mismo tick del prepend), así que mirarlo no sirve; el último id, en
 * cambio, solo cambia cuando entra algo al final.
 */
export default {
	components: {
		Burbuja,
	},
	data() {
		return {
			// Alto y posición del scroll antes de anteponer una página vieja.
			alto_antes_de_anteponer: 0,
			scroll_antes_de_anteponer: 0,
		}
	},
	computed: {
		buyer_id() {
			return this.$store.state.tienda_mensajes.selected_buyer_id
		},
		messages() {
			return this.$store.state.tienda_mensajes.messages
		},
		loading() {
			return this.$store.state.tienda_mensajes.messages_loading
		},
		loading_more() {
			return this.$store.state.tienda_mensajes.messages_loading_more
		},
		messages_page() {
			return this.$store.state.tienda_mensajes.messages_page
		},
		hay_mas() {
			return this.$store.getters['tienda_mensajes/hay_mas_mensajes']
		},
		id_del_ultimo() {
			let ultimo = this.messages[this.messages.length - 1]
			return ultimo ? ultimo.id : null
		},
		/**
		 * Mensajes intercalados con un separador cada vez que cambia el día (en la hora local de
		 * quien mira, que es la que muestra cada burbuja).
		 */
		items() {
			let items = []
			let dia_anterior = null
			this.messages.forEach(message => {
				let dia = moment(message.created_at).format('YYYY-MM-DD')
				if (dia !== dia_anterior) {
					items.push({
						tipo: 'dia',
						key: 'dia-' + dia,
						texto: texto_de_dia(message.created_at),
					})
					dia_anterior = dia
				}
				items.push({
					tipo: 'mensaje',
					key: 'mensaje-' + message.id,
					message: message,
				})
			})
			return items
		},
	},
	watch: {
		/**
		 * Terminó la carga de la primera página (conversación recién abierta): arranca desde abajo,
		 * en el mensaje más reciente.
		 */
		loading(cargando) {
			if (!cargando) {
				this.$nextTick(this.bajar_al_final)
			}
		},
		/**
		 * Entró un mensaje al final (uno nuevo del comprador, o el que acaba de mandar el
		 * comercio). Se sigue la conversación si el operador ya estaba abajo o si el mensaje es
		 * suyo; si estaba leyendo más arriba, no se le mueve la pantalla.
		 *
		 * El "estaba abajo" se mide ACÁ y no en el `$nextTick`: los watchers corren antes de que
		 * Vue redibuje, así que el DOM todavía es el de antes del mensaje nuevo.
		 */
		id_del_ultimo(nuevo, viejo) {
			if (!nuevo || nuevo === viejo) {
				return
			}
			let ultimo = this.messages[this.messages.length - 1]
			let es_propio = !!ultimo && !es_verdadero(ultimo.from_buyer)
			if (viejo === null || es_propio || this.distancia_al_final() < MARGEN_ABAJO_PX) {
				this.$nextTick(this.bajar_al_final)
			}
		},
		loading_more(cargando) {
			let contenedor = this.$refs.contenedor
			if (cargando) {
				this.alto_antes_de_anteponer = contenedor ? contenedor.scrollHeight : 0
				this.scroll_antes_de_anteponer = contenedor ? contenedor.scrollTop : 0
				return
			}
			// Terminó de anteponer la página vieja: se compensa lo que creció arriba para que el
			// mensaje que el operador estaba mirando quede en el mismo lugar.
			let self = this
			this.$nextTick(function () {
				let el = self.$refs.contenedor
				if (el) {
					el.scrollTop = self.scroll_antes_de_anteponer + (el.scrollHeight - self.alto_antes_de_anteponer)
				}
			})
		},
	},
	methods: {
		bajar_al_final() {
			let el = this.$refs.contenedor
			if (el) {
				el.scrollTop = el.scrollHeight
			}
		},
		distancia_al_final() {
			let el = this.$refs.contenedor
			if (!el) {
				return 0
			}
			return el.scrollHeight - el.scrollTop - el.clientHeight
		},
		/**
		 * Scroll infinito hacia arriba: cerca del tope se pide la página anterior, si hay y no hay
		 * otra carga en curso.
		 */
		on_scroll(event) {
			if (event.target.scrollTop < MARGEN_ARRIBA_PX && this.hay_mas && !this.loading_more && !this.loading) {
				this.$store.dispatch('tienda_mensajes/getMessages', {
					buyer_id: this.buyer_id,
					page: this.messages_page + 1,
				})
				.catch(function (err) {
					console.log(err)
				})
			}
		},
	},
}
</script>
<style lang="sass">
.tienda-mensajes-lista
	flex: 1
	min-height: 0
	overflow-y: auto
	padding: 14px
	// El fondo propio de la conversación de WhatsApp (beige en claro, casi negro en oscuro): es la
	// mitad de lo que hace que se lea como una conversación.
	background: var(--wa-fondo-chat)
	color: var(--wa-texto)
	&__mensajes
		display: flex
		flex-direction: column
	&__aviso
		margin: 20px 0 0 0
		text-align: center
		font-size: .875rem
		color: var(--color-text-secondary)
		&--anteriores
			margin: 0 0 8px 0
			font-size: .8rem
	// Separador de día: una pastilla centrada, como en WhatsApp.
	&__dia
		display: flex
		justify-content: center
		margin: 8px 0
		span
			padding: 3px 10px
			border-radius: 8px
			background: var(--wa-panel)
			color: var(--color-text-secondary)
			font-size: .72rem
			font-weight: 600
			box-shadow: 0 1px 1px var(--wa-burbuja-sombra)
</style>
