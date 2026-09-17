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
		 * agente-ia-mano-derecha, §1 del contrato). Cada segmento ya trae resueltos los
		 * atributos del <span>, para que la plantilla no tenga que decidir nada.
		 *
		 * Los mensajes del USUARIO no se segmentan nunca: el API anota solo los del
		 * asistente, y si algún día mandara menciones en uno del usuario, marcarle su
		 * propio texto sería marcar lo que él mismo escribió.
		 *
		 * `mencion_id` y `tipo` viajan al DOM como `data-*` y son los que lee el listener
		 * delegado de `FichaArticuloPopover.vue`: ese componente no conoce a este, solo
		 * mira el documento.
		 *
		 * @returns {Array<Object>}
		 */
		segmentos_del_texto() {
			let menciones = this.es_del_usuario ? null : this.message.menciones
			return segmentar_menciones(this.message.contenido, menciones).map(function (segmento) {
				if (!segmento.mencion) {
					return {
						texto: segmento.texto,
						clase: null,
						tipo: null,
						mencion_id: null,
						titulo: null,
						role: null,
						tabindex: null,
					}
				}
				let tipo = segmento.mencion.tipo
				let es_clickeable = tipo == 'cliente'
				return {
					texto: segmento.texto,
					clase: 'asistente-ia-mencion asistente-ia-mencion--' + tipo,
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
// Los dos roles van en viñeta, y se distinguen por la FORMA y no por dos rellenos
// peleándose (pedido de Lucas, 19/8/2026: antes el asistente era texto suelto sobre el
// fondo del panel y se leía desprolijo):
//
//   usuario   -> globo relleno con --bg-section, pegado a la derecha, angosto
//   asistente -> tarjeta rellena con --bg-hover, pegada a la izquierda, ancha
//
// 🔴 Los dos rellenos caen a lados OPUESTOS del color del panel (--bg-card), y por eso
// se distinguen en los dos temas sin depender del borde:
//
//   claro:  usuario #f8f9fa y asistente #f1f3f5, los dos por DEBAJO del panel #fff
//   oscuro: usuario #272b31 por debajo, asistente #3a4048 por ENCIMA del panel #2e333a
//
// El asistente NO puede llevar --bg-card: es el mismo color del panel, y en oscuro la
// viñeta quedaba dibujada solo por un borde de rgba(255,255,255,.14) que no se lee --
// o sea, el mensaje seguía pareciendo suelto, que es exactamente lo que se venía a
// arreglar. --bg-hover se usa acá como superficie y no como estado de hover: es el
// único token neutro que queda del otro lado del panel en los dos temas.
//
// Entrada sutil de abajo hacia arriba para que el mensaje "suba" a la conversación (D41).
.asistente-ia-globo
	margin-bottom: 14px
	animation: asistente-ia-globo-entrada .18s ease-out
	transition: opacity .15s ease

	&--usuario
		align-self: flex-end
		max-width: 78%
		background: var(--bg-section, #f8f9fa)
		border: 1px solid var(--color-border-secondary, #e9ecef)
		border-radius: 14px
		padding: 9px 14px

	&--asistente
		align-self: flex-start
		max-width: 96%
		background: var(--bg-hover, #f1f3f5)
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 14px
		padding: 9px 14px
		// Sombra de un píxel y nada más: la viñeta tiene que despegarse del panel sin
		// convertirse en una tarjeta flotante. Una sombra más grande, repetida en cada
		// mensaje, ensucia toda la conversación.
		box-shadow: 0 1px 2px var(--shadow-color, rgba(99, 99, 99, .2))

	// Mientras el POST no confirmó, el globo respira en baja opacidad (D41).
	&--enviando
		opacity: .55

	&--error-envio
		border-color: var(--btn-peligro-borde, #b4443f)

	// Un error del lado de la IA llega como contenido amigable (D18): se lee
	// como un mensaje más, apenas teñido para distinguirlo. Ahora que hay viñeta,
	// el borde acompaña al texto: si no, el teñido quedaba adentro de una tarjeta
	// de contorno neutro y no se leía como un estado distinto.
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

// ─── Menciones adentro del texto (misión agente-ia-mano-derecha, 16/9/2026) ──────────────
//
// La mención es un <span> más ADENTRO del mismo párrafo: hereda el `pre-wrap`, el
// `word-break` y el interlineado de la viñeta, y sigue siendo texto que corta de línea
// donde tiene que cortar. Nada de `display: inline-block` --eso le cambiaría el corte a un
// nombre largo de artículo, que es justo lo que más aparece-- ni de padding vertical, que
// empujaría el interlineado de toda la conversación.
//
// 🔴 El realce va con un TINTE del color de acción y NO con --bg-section / --bg-hover, y es
// por el escalón de relleno: la viñeta del asistente se pinta con --bg-hover, que en claro
// queda más oscuro que el panel (#f1f3f5 sobre #fff) y en oscuro queda más CLARO (#3a4048
// sobre #2e333a). Un gris fijo encima se leería hundido en un tema y elevado en el otro. Un
// rgba del azul de acción se lee igual en los dos, que es lo único que tiene que decir: esto
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
