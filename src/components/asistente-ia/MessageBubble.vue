<template>
	<div
	class="asistente-ia-globo"
	:class="clases_del_globo">
		<!-- Texto plano SIEMPRE: pre-wrap y la interpolación normal de Vue, que ya
		escapa. Ni markdown, ni v-html, ni sanitizador (D43).

		Desde la misión agente-ia-mano-derecha (16/9/2026) el texto sale partido en
		segmentos (`menciones.js`): los tramos que el API anotó como cliente o artículo
		llevan su propio <span> con estilo, y el resto se pinta igual que siempre. Sigue
		siendo interpolación `{{ }}`: lo único que cambió es CUÁNTOS nodos de texto hay,
		no cómo se escriben. Sin `menciones` (API viejo, o un mensaje del usuario) el
		computed devuelve un único segmento y esto renderiza exactamente lo de antes.

		🔴 El <span> del v-for va PEGADO a las etiquetas del <p>, sin salto de línea ni
		sangría entre medio, y es a propósito: con `white-space: pre-wrap` cualquier
		espacio suelto del template se dibuja en pantalla como un espacio de más al
		principio o al final del mensaje. Por el mismo motivo hay UN solo elemento
		adentro del <p> y no un <template v-for> con varios: entre dos elementos
		hermanos escritos en líneas distintas quedaría un nodo de espacio por cada
		segmento. -->
		<p class="asistente-ia-globo__texto"><span
		v-for="(segmento, indice) in segmentos_del_texto"
		:key="indice"
		:class="segmento.clase"
		:role="segmento.role"
		:tabindex="segmento.tabindex"
		:title="segmento.titulo"
		:data-mencion-tipo="segmento.tipo"
		:data-mencion-id="segmento.mencion_id"
		@click="al_activar_mencion(segmento)"
		@keydown.enter="al_activar_mencion(segmento)">{{ segmento.texto }}</span></p>

		<!-- Tarjetas de carga que propuso el asistente (misión asistente-ia-acciones,
		15/9/2026): una por acción, debajo del texto y adentro de la viñeta. Las
		'descartada' no se pintan (son de una respuesta que terminó en error). -->
		<div
		v-if="acciones_visibles.length"
		class="asistente-ia-globo__acciones">
			<accion-card
			v-for="accion in acciones_visibles"
			:key="accion.id"
			:accion="accion"
			:conversation_id="message.ai_conversation_id"></accion-card>
		</div>

		<!-- Pie solo para mensajes del usuario: el estado del envío (D41). -->
		<div
		v-if="es_del_usuario"
		class="asistente-ia-globo__pie">
			<i
			v-if="message.estado_local == 'enviando'"
			class="bi bi-clock"
			title="Enviando..."></i>
			<i
			v-else-if="message.estado_local == 'enviado'"
			class="bi bi-check2"
			title="Enviado"></i>
			<i
			v-else-if="message.estado_local == 'error'"
			class="bi bi-exclamation-circle"
			title="No se pudo enviar"></i>
		</div>

		<!-- El reintento reenvía el mismo texto (D41). -->
		<div
		v-if="es_del_usuario && message.estado_local == 'error'"
		class="asistente-ia-globo__reintento">
			<span>No se pudo enviar.</span>
			<b-button
			size="sm"
			variant="outline-danger"
			@click="$emit('retry', message)">
				Reintentar
			</b-button>
		</div>
	</div>
</template>

<script>
import AccionCard from '@/components/asistente-ia/AccionCard'
import { segmentar_menciones } from '@/components/asistente-ia/menciones'
import { segmentar_mensaje } from '@/components/asistente-ia/formato'

/**
 * Texto del `title` (y de lo que lee un lector de pantalla) de cada tipo de mención. El de
 * cliente cuenta una ACCIÓN porque el clic hace algo; el de artículo cuenta que hay más
 * información porque el hover solo muestra.
 */
const TITULO_POR_TIPO = {
	cliente: 'Ver la cuenta corriente de este cliente',
	articulo: 'Pasá el mouse para ver la ficha del artículo',
}

export default {
	components: {
		AccionCard,
	},
	props: {
		message: {
			type: Object,
			required: true,
		},
	},
	computed: {
		es_del_usuario() {
			return this.message.rol == 'user'
		},
		/**
		 * El contenido del mensaje partido en segmentos para pintar (misión
		 * agente-ia-mano-derecha, §1 del contrato, + negrita de la misión
		 * burbujas-y-negrita-asistente-ia, 21/9/2026). Cada segmento ya trae resueltos los
		 * atributos del <span>, para que la plantilla no tenga que decidir nada.
		 *
		 * Los mensajes del USUARIO no se segmentan nunca, ni por mención ni por negrita: el
		 * API anota menciones solo en las respuestas del asistente y la IA es la única que
		 * escribe con `**negrita**`. Marcar el texto de un mensaje del usuario sería
		 * reinterpretar lo que él mismo tipeó — sigue por `segmentar_menciones` sola, que con
		 * `menciones=null` ya devuelve el mensaje entero como un único tramo plano.
		 *
		 * Para el asistente, `segmentar_mensaje` (formato.js) cruza menciones y negrita
		 * sobre el MISMO string antes de cortar nada: una mención puede caer en negrita y un
		 * tramo de negrita puede contener una mención sin que se pisen, y ningún asterisco de
		 * formato llega nunca a una hoja final (ver el comentario de por qué en formato.js).
		 *
		 * `mencion_id` y `tipo` viajan al DOM como `data-*` y son los que lee el listener
		 * delegado de `FichaArticuloPopover.vue`: ese componente no conoce a este, solo
		 * mira el documento.
		 *
		 * @returns {Array<Object>}
		 */
		segmentos_del_texto() {
			if (this.es_del_usuario) {
				return segmentar_menciones(this.message.contenido, null).map(function (segmento) {
					return {
						texto: segmento.texto,
						clase: null,
						tipo: null,
						mencion_id: null,
						titulo: null,
						role: null,
						tabindex: null,
					}
				})
			}

			return segmentar_mensaje(this.message.contenido, this.message.menciones).map(function (segmento) {
				if (!segmento.mencion) {
					return {
						texto: segmento.texto,
						clase: segmento.negrita ? 'asistente-ia-negrita' : null,
						tipo: null,
						mencion_id: null,
						titulo: null,
						role: null,
						tabindex: null,
					}
				}
				let tipo = segmento.mencion.tipo
				let es_clickeable = tipo == 'cliente'
				let clase_mencion = 'asistente-ia-mencion asistente-ia-mencion--' + tipo
				return {
					texto: segmento.texto,
					clase: segmento.negrita ? clase_mencion + ' asistente-ia-negrita' : clase_mencion,
					tipo: tipo,
					mencion_id: segmento.mencion.id,
					titulo: TITULO_POR_TIPO[tipo] || null,
					// Solo lo que se ACTIVA es un botón y para el teclado. La mención de
					// artículo no hace nada al tocarla (su tarjeta es de hover), así que
					// dejarla como parada del tabulador sería prometer algo que no pasa.
					role: es_clickeable ? 'button' : null,
					tabindex: es_clickeable ? 0 : null,
				}
			})
		},
		/**
		 * Tarjetas de carga del mensaje (misión asistente-ia-acciones, §4 del plan), sin las
		 * 'descartada'. El criterio de qué tarjeta se ve es solo su `estado`, que ya viene
		 * resuelto del API: acá no se repite ninguna regla del back. Un mensaje sin la clave
		 * `acciones` (API vieja, o el assistant pendiente que devuelve el 201) no tiene
		 * tarjetas.
		 */
		acciones_visibles() {
			if (this.es_del_usuario || !Array.isArray(this.message.acciones)) {
				return []
			}
			return this.message.acciones.filter(accion => accion.estado != 'descartada')
		},
		clases_del_globo() {
			return {
				'asistente-ia-globo--usuario': this.es_del_usuario,
				'asistente-ia-globo--asistente': !this.es_del_usuario,
				'asistente-ia-globo--enviando': this.es_del_usuario && this.message.estado_local == 'enviando',
				'asistente-ia-globo--error-envio': this.es_del_usuario && this.message.estado_local == 'error',
				'asistente-ia-globo--error-respuesta': !this.es_del_usuario && this.message.estado == 'error',
			}
		},
	},
	methods: {
		/**
		 * Clic (o Enter) sobre un segmento. Hoy actúa solo la mención de CLIENTE: deja el
		 * pedido en el store y lo atiende `CuentaCorrienteDeMencion.vue`, que es quien
		 * tiene el `<b-modal>` montado.
		 *
		 * 🔴 Por qué no abre el modal desde acá: el `#current-acounts` de siempre **solo
		 * existe si la vista actual lo montó** (`views/Client.vue`, `Ventas.vue`,
		 * `Listado.vue`, `Vender.vue`, `Budget.vue` y algunas más), y el chat se abre desde
		 * cualquier pantalla — parado en Caja no hay ningún modal al que mostrarle nada. El
		 * chat monta el suyo, con id propio, colgado del botón flotante.
		 *
		 * El segmento de texto suelto y el de artículo caen en el `return`: el handler está
		 * en el template para todos los <span> porque `v-for` dibuja uno solo.
		 *
		 * @param {Object} segmento Un elemento de `segmentos_del_texto`.
		 * @returns {void}
		 */
		al_activar_mencion(segmento) {
			if (!segmento || segmento.tipo != 'cliente' || !segmento.mencion_id) {
				return
			}
			this.$store.commit('ai_chat/pedirCuentaCorrienteDeCliente', {
				client_id: segmento.mencion_id,
				nombre: segmento.texto,
			})
		},
	},
}
</script>

<style lang="sass">
// Burbuja para los dos roles (pedido de Lucas, 21/9/2026: reversión explícita del "estilo
// lista" del 17/9/2026 — quiere maquetación de WhatsApp, cada lado con su viñeta, SIN los
// colores de WhatsApp). Los dos usan el mismo fondo/borde/radio/padding; lo único que cambia
// es a qué lado se pegan, que ya alcanza para leer de un vistazo quién habló:
//
//   usuario   -> pegado a la derecha
//   asistente -> pegado a la izquierda
//
// 🔴 El fondo es --bg-section (neutro, ya usado en el resto del panel) a propósito: nada de
// verde ni de la paleta de WhatsApp, que es lo que Lucas pidió evitar. Las tarjetas de carga
// (AccionCard.vue) siguen apoyándose en --bg-hover, un escalón más oscuro que --bg-section en
// los dos temas — con las dos viñetas ahora en --bg-section, ese escalón es el mismo sin
// importar cuál de las dos lo aloja.
//
// Entrada sutil de abajo hacia arriba para que el mensaje "suba" a la conversación (D41).
.asistente-ia-globo
	margin-bottom: 14px
	max-width: 78%
	background: var(--bg-section, #f8f9fa)
	border: 1px solid var(--color-border-secondary, #e9ecef)
	border-radius: 14px
	padding: 9px 14px
	animation: asistente-ia-globo-entrada .18s ease-out
	transition: opacity .15s ease

	&--usuario
		align-self: flex-end

	&--asistente
		align-self: flex-start

	// Mientras el POST no confirmó, el globo respira en baja opacidad (D41).
	&--enviando
		opacity: .55

	&--error-envio
		border-color: var(--btn-peligro-borde, #b4443f)

	// Un error del lado de la IA llega como contenido amigable (D18): se lee como un
	// mensaje más, apenas teñido para distinguirlo. Con las dos viñetas ahora con borde
	// propio, el error tiñe también el borde (mismo criterio que --error-envio) y no solo
	// el texto, si no quedaba como la única viñeta "neutra" en un mensaje que no lo es.
	&--error-respuesta
		color: var(--caja-cerrar-texto, #9c3a36)
		border-color: var(--btn-peligro-borde, #b4443f)

	&__texto
		margin: 0
		white-space: pre-wrap
		word-break: break-word
		text-align: left
		line-height: 1.55

	&__pie
		display: flex
		justify-content: flex-end
		margin-top: 2px
		font-size: .75rem
		color: var(--color-text-secondary, #6c757d)

	&__reintento
		display: flex
		align-items: center
		gap: 8px
		margin-top: 6px
		font-size: .8rem
		color: var(--btn-peligro-texto, #9c3a36)

// Negrita del markdown que manda la IA (misión burbujas-y-negrita-asistente-ia, 21/9/2026):
// mismo elemento <span> que el texto suelto, solo cambia el peso — no hay nodo de más que
// pueda meter un espacio donde `pre-wrap` lo dibujaría (ver el comentario del <p> arriba).
.asistente-ia-negrita
	font-weight: 600

// ─── Menciones adentro del texto (misión agente-ia-mano-derecha, 16/9/2026) ──────────────
//
// La mención es un <span> más ADENTRO del mismo párrafo: hereda el `pre-wrap`, el
// `word-break` y el interlineado de la viñeta, y sigue siendo texto que corta de línea
// donde tiene que cortar. Nada de `display: inline-block` --eso le cambiaría el corte a un
// nombre largo de artículo, que es justo lo que más aparece-- ni de padding vertical, que
// empujaría el interlineado de toda la conversación.
//
// 🔴 El realce va con un TINTE del color de acción y NO con --bg-section / --bg-hover, y es
// por el escalón de relleno: las dos viñetas se pintan con --bg-section, que en claro queda
// más oscuro que el panel (#f8f9fa sobre #fff) y en oscuro queda más CLARO (#272b31 sobre
// #2e333a). Un gris fijo encima se leería hundido en un tema y elevado en el otro. Un rgba
// del azul de acción se lee igual en los dos, que es lo único que tiene que decir: esto
// no es texto común. Mismo criterio que --cc-fila-sel en el modal de cuenta corriente.
//
// El subrayado va por `text-decoration` y no por `border-bottom`: con un nombre que corta de
// línea, el borde se dibujaría solo debajo del último renglón y la raya del primero
// desaparecería.
.asistente-ia-mencion
	--mencion-tinte: rgba(0, 123, 255, .10)
	--mencion-tinte-fuerte: rgba(0, 123, 255, .20)
	border-radius: 4px
	padding: 0 2px
	transition: background .12s ease

	// El cliente es lo único que se toca: lleva el color de acción y cursor de mano.
	&--cliente
		color: var(--color-primary, #007bff)
		font-weight: 600
		background: var(--mencion-tinte)
		cursor: pointer
		text-decoration: underline
		text-decoration-color: var(--mencion-tinte-fuerte)
		text-underline-offset: 2px

		&:hover
			background: var(--mencion-tinte-fuerte)
			text-decoration-color: var(--color-primary, #007bff)

		&:focus-visible
			outline: 2px solid var(--color-primary, #007bff)
			outline-offset: 1px

	// El artículo NO se toca: su ficha sale al pasar el mouse. Por eso va en el color del
	// texto (no promete una acción), con punteado --la señal de "acá hay más información"
	// que ya usan las ayudas del sistema-- y cursor de ayuda.
	&--articulo
		font-weight: 600
		color: var(--color-text-primary, #212529)
		background: var(--mencion-tinte)
		cursor: help
		text-decoration: underline dotted
		text-decoration-color: var(--color-text-secondary, #6c757d)
		text-underline-offset: 2px

		&:hover
			background: var(--mencion-tinte-fuerte)

html.dark-mode .asistente-ia-mencion
	// El azul de acción del tema oscuro (--color-primary #4da3ff): el #007bff del claro
	// sobre #3a4048 queda demasiado apagado para leerse como realce.
	--mencion-tinte: rgba(77, 163, 255, .16)
	--mencion-tinte-fuerte: rgba(77, 163, 255, .28)

@keyframes asistente-ia-globo-entrada
	from
		opacity: 0
		transform: translateY(6px)
	to
		transform: translateY(0)

@media (prefers-reduced-motion: reduce)
	.asistente-ia-globo
		animation: none
		transition: none
</style>
