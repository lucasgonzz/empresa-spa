<template>
	<!-- Una respuesta del agente, como en ia.comerciocity.com (ia-spa,
	mensajes/MensajeAsistente.vue): a lo ancho, sin burbuja, con el logo del negocio de avatar
	(el mismo del botón flotante, D37) y la barra de acciones abajo. Misión
	agente-mejoras-uso-real, 29/10/2026. -->
	<article
	class="asistente-ia-msj-agente"
	:class="{ 'asistente-ia-msj-agente--error': con_error }"
	aria-label="Respuesta del asistente">
		<div
		class="asistente-ia-msj-agente__avatar"
		aria-hidden="true">
			<img
			v-if="logo_url"
			:src="logo_url"
			alt="">
			<i
			v-else
			class="bi bi-robot"></i>
		</div>

		<div class="asistente-ia-msj-agente__cuerpo">
			<!-- Texto plano SIEMPRE: pre-wrap y la interpolación normal de Vue, que ya
			escapa. Ni markdown, ni v-html, ni sanitizador (D43).

			Desde la misión agente-ia-mano-derecha (16/9/2026) el texto sale partido en
			segmentos (`menciones.js`): los tramos que el API anotó como cliente o artículo
			llevan su propio <span> con estilo, y el resto se pinta igual que siempre. Sigue
			siendo interpolación `{{ }}`: lo único que cambió es CUÁNTOS nodos de texto hay,
			no cómo se escriben. Sin `menciones` (API viejo) el computed devuelve un único
			segmento y esto renderiza exactamente lo de antes.

			🔴 El <span> del v-for va PEGADO a las etiquetas del <p>, sin salto de línea ni
			sangría entre medio, y es a propósito: con `white-space: pre-wrap` cualquier
			espacio suelto del template se dibuja en pantalla como un espacio de más al
			principio o al final del mensaje. Por el mismo motivo hay UN solo elemento
			adentro del <p> y no un <template v-for> con varios: entre dos elementos
			hermanos escritos en líneas distintas quedaría un nodo de espacio por cada
			segmento.

			`data-mencion-tipo` y `data-mencion-id` los lee el listener delegado de
			FichaArticuloPopover.vue (la ficha del artículo al pasar el mouse): no cambiarlos. -->
			<p
			v-if="segmentos_del_texto.length"
			class="asistente-ia-msj-agente__texto"><span
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

			<!-- Adjuntos del asistente (misión asistente-omnisciente, 21/9/2026, §1 del contrato):
			hoy, la foto de un artículo. Van debajo del texto y ARRIBA de las tarjetas: la foto es
			parte de lo que el asistente dice; la tarjeta, lo que propone hacer. Y van FUERA del
			<p>, a propósito: adentro, con `white-space: pre-wrap`, cada salto de línea del template
			se dibujaría como un espacio (ver el comentario de arriba). Sin `adjuntos` (API viejo)
			el computed devuelve [] y acá no se monta nada. -->
			<adjuntos-de-mensaje
			v-if="adjuntos_visibles.length"
			:adjuntos="adjuntos_visibles"></adjuntos-de-mensaje>

			<!-- Tarjetas de carga que propuso el asistente (misión asistente-ia-acciones,
			15/9/2026): una por acción, debajo del texto. Las 'descartada' no se pintan (son de
			una respuesta que terminó en error). -->
			<div
			v-if="acciones_visibles.length"
			class="asistente-ia-msj-agente__acciones">
				<accion-card
				v-for="accion in acciones_visibles"
				:key="accion.id"
				:accion="accion"
				:conversation_id="message.ai_conversation_id"></accion-card>
			</div>

			<!-- La barra de acciones de ia-spa: «Copiar» y la valoración (👍 / 👎, con el cuadro
			del no me gusta en su propio renglón). Aparece al pasar el mouse; queda siempre a la
			vista en la última respuesta, en una respuesta ya valorada (que se vea qué se marcó),
			con el cuadro abierto y en pantallas táctiles. -->
			<div
			v-if="con_barra"
			class="asistente-ia-msj-agente__barra"
			:class="{ 'asistente-ia-msj-agente__barra--siempre': barra_siempre }">
				<button
				v-if="texto_plano"
				type="button"
				class="asistente-ia-msj-agente__boton"
				:title="copiado ? 'Copiado' : 'Copiar'"
				:aria-label="copiado ? 'Copiado' : 'Copiar la respuesta'"
				@click="copiar_respuesta">
					<icono
					:nombre="copiado ? 'check' : 'copiar'"
					:tamano="17"></icono>
				</button>
				<valoracion-mensaje
				:message="message"
				@cuadro="valoracion_abierta = $event"></valoracion-mensaje>
			</div>
		</div>
	</article>
</template>

<script>
import AccionCard from '@/components/asistente-ia/AccionCard'
import AdjuntosDeMensaje from '@/components/asistente-ia/AdjuntosDeMensaje'
import Icono from '@/components/asistente-ia/Icono'
import ValoracionMensaje from '@/components/asistente-ia/mensaje/agente/ValoracionMensaje'
import { segmentar_mensaje } from '@/components/asistente-ia/formato'
import { valoracion_de } from '@/components/asistente-ia/valoracion'
import { logo_del_negocio } from '@/components/asistente-ia/identidad'
import { copiar_al_portapapeles } from '@/components/asistente-ia/portapapeles'

/**
 * Texto del `title` (y de lo que lee un lector de pantalla) de cada tipo de mención. El de
 * cliente cuenta una ACCIÓN porque el clic hace algo; el de artículo cuenta que hay más
 * información porque el hover solo muestra.
 */
const TITULO_POR_TIPO = {
	cliente: 'Ver la cuenta corriente de este cliente',
	articulo: 'Pasá el mouse para ver la ficha del artículo',
}

/**
 * Cuánto queda el tilde de "Copiado" en el botón, en ms (el de ia-spa).
 */
const DURACION_COPIADO_MS = 1800

export default {
	components: {
		AccionCard,
		AdjuntosDeMensaje,
		Icono,
		ValoracionMensaje,
	},
	props: {
		/**
		 * La respuesta del agente (rol `assistant`), tal como está en `ai_chat.messages`.
		 */
		message: {
			type: Object,
			required: true,
		},
		/**
		 * true si es la última respuesta del agente a la vista: la barra queda siempre visible.
		 */
		ultimo: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			// true durante un rato después de copiar: el botón muestra el tilde.
			copiado: false,
			// true mientras el cuadro del 👎 está abierto (lo avisa ValoracionMensaje): la barra no
			// se esconde al sacar el mouse.
			valoracion_abierta: false,
		}
	},
	created() {
		// El temporizador del tilde vive acá y no en data(): no es estado de pantalla.
		this.timer_copiado = null
	},
	beforeDestroy() {
		if (this.timer_copiado) {
			clearTimeout(this.timer_copiado)
			this.timer_copiado = null
		}
	},
	computed: {
		/**
		 * Un error del lado de la IA llega como contenido amigable (D18): se lee como una
		 * respuesta más, apenas atenuada.
		 */
		con_error() {
			return this.message.estado == 'error'
		},
		/**
		 * La cara del agente: el logo del negocio (D37).
		 *
		 * @returns {String|null}
		 */
		logo_url() {
			return logo_del_negocio(this.user)
		},
		/**
		 * El contenido del mensaje partido en segmentos para pintar (misión
		 * agente-ia-mano-derecha, §1 del contrato, + negrita de la misión
		 * burbujas-y-negrita-asistente-ia, 21/9/2026). Cada segmento ya trae resueltos los
		 * atributos del <span>, para que la plantilla no tenga que decidir nada.
		 *
		 * `segmentar_mensaje` (formato.js) cruza menciones y negrita sobre el MISMO string antes
		 * de cortar nada: una mención puede caer en negrita y un tramo de negrita puede contener
		 * una mención sin que se pisen, y ningún asterisco de formato llega nunca a una hoja
		 * final (ver el comentario de por qué en formato.js).
		 *
		 * `mencion_id` y `tipo` viajan al DOM como `data-*` y son los que lee el listener
		 * delegado de `FichaArticuloPopover.vue`: ese componente no conoce a este, solo mira el
		 * documento.
		 *
		 * 🔴 CON CONTENIDO VACÍO DEVUELVE [], y por eso el <p> lleva `v-if`: una respuesta que
		 * es solo una foto o solo una tarjeta no deja un <p> vacío que cualquier regla futura
		 * (un padding, un `min-height`) convertiría en un hueco.
		 *
		 * @returns {Array<Object>}
		 */
		segmentos_del_texto() {
			let segmentos = []
			segmentar_mensaje(this.message.contenido, this.message.menciones).forEach(function (segmento) {
				if (!segmento.mencion) {
					segmentos.push({
						texto: segmento.texto,
						clase: segmento.negrita ? 'asistente-ia-negrita' : null,
						tipo: null,
						mencion_id: null,
						titulo: null,
						role: null,
						tabindex: null,
					})
					return
				}
				let tipo = segmento.mencion.tipo
				let es_clickeable = tipo == 'cliente'
				let clase_mencion = 'asistente-ia-mencion asistente-ia-mencion--' + tipo
				segmentos.push({
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
				})
			})
			return segmentos
		},
		/**
		 * El texto tal como se lee en pantalla, sin los asteriscos de la negrita: es lo que copia
		 * el botón «Copiar» (como `texto_plano` del markdown en ia-spa).
		 *
		 * @returns {String}
		 */
		texto_plano() {
			let texto = ''
			this.segmentos_del_texto.forEach(function (segmento) {
				texto += segmento.texto
			})
			return texto.trim()
		},
		/**
		 * Tarjetas de carga del mensaje (misión asistente-ia-acciones, §4 del plan), sin las
		 * 'descartada'. El criterio de qué tarjeta se ve es solo su `estado`, que ya viene
		 * resuelto del API: acá no se repite ninguna regla del back. Un mensaje sin la clave
		 * `acciones` (API vieja, o el assistant pendiente que devuelve el 201) no tiene
		 * tarjetas.
		 */
		acciones_visibles() {
			if (!Array.isArray(this.message.acciones)) {
				return []
			}
			return this.message.acciones.filter(accion => accion.estado != 'descartada')
		},
		/**
		 * Adjuntos del mensaje (misión asistente-omnisciente, 21/9/2026, §1 del contrato): la
		 * lista tal cual llega, o [] sin la clave (API viejo). Qué se pinta de cada adjunto lo
		 * decide AdjuntosDeMensaje.vue.
		 */
		adjuntos_visibles() {
			if (!Array.isArray(this.message.adjuntos)) {
				return []
			}
			return this.message.adjuntos
		},
		/**
		 * La barra existe para una respuesta guardada (con id) que ya terminó y tiene algo que
		 * hacer: texto que copiar, o la valoración (solo de una respuesta 'listo': una que quedó en
		 * error no se valora, ver ValoracionMensaje.vue::disponible).
		 *
		 * @returns {Boolean}
		 */
		con_barra() {
			if (!this.message.id || this.message.estado == 'pendiente') {
				return false
			}
			return Boolean(this.texto_plano) || this.message.estado == 'listo'
		},
		/**
		 * La barra se ve sin pasar el mouse en la última respuesta, en una ya valorada (que se vea
		 * qué se marcó) y con el cuadro del 👎 abierto, como en ia-spa.
		 *
		 * @returns {Boolean}
		 */
		barra_siempre() {
			return this.ultimo || valoracion_de(this.message) !== null || this.valoracion_abierta
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
		/**
		 * «Copiar»: el texto de la respuesta tal como se lee. Si el navegador no deja copiar, un
		 * toast lo dice (los toasts quedan arriba del panel).
		 *
		 * @returns {void}
		 */
		copiar_respuesta() {
			let self = this
			copiar_al_portapapeles(this.texto_plano)
				.then(function (copio) {
					if (!copio) {
						self.$toast.error('No se pudo copiar. Seleccioná el texto a mano y copialo con Ctrl+C.')
						return
					}
					self.copiado = true
					if (self.timer_copiado) {
						clearTimeout(self.timer_copiado)
					}
					self.timer_copiado = setTimeout(function () {
						self.copiado = false
						self.timer_copiado = null
					}, DURACION_COPIADO_MS)
				})
		},
	},
}
</script>

<style lang="sass">
@import '@/components/asistente-ia/_mixins'

// La respuesta del agente de ia-spa (mensajes/MensajeAsistente.vue): avatar de 30px a la
// izquierda y el cuerpo a lo ancho, sin burbuja. La prosa con las medidas de ChatGPT
// (styles/markdown.css: 1rem, interlineado 1,75).
//
// Entrada sutil de abajo hacia arriba para que la respuesta "suba" a la conversación (D41).
.asistente-ia-msj-agente
	display: flex
	align-items: flex-start
	gap: 14px
	padding: 4px 0 0 0
	text-align: left
	animation: asistente-ia-msj-aparecer .25s ease

	&__avatar
		flex: 0 0 auto
		width: 30px
		height: 30px
		margin-top: 1px
		border-radius: 50%
		border: 1px solid var(--ia-borde)
		background: var(--ia-bg)
		color: var(--ia-primario)
		font-size: 15px
		display: inline-flex
		align-items: center
		justify-content: center
		overflow: hidden

		img
			width: 100%
			height: 100%
			object-fit: cover
			display: block

	&__cuerpo
		flex: 1 1 auto
		min-width: 0
		padding-top: 2px

	&__texto
		margin: 0
		white-space: pre-wrap
		overflow-wrap: anywhere
		font-size: 1rem
		line-height: 1.75
		color: var(--ia-texto)

	// Un error del lado de la IA (D18) se lee como una respuesta más, en el gris secundario,
	// como en ia-spa.
	&--error &__texto
		color: var(--ia-texto-2)

	// Las tarjetas de carga van una debajo de la otra, separadas del texto.
	&__acciones
		display: flex
		flex-direction: column
		gap: 10px
		margin-top: 12px

	// La barra de acciones de ia-spa: corrida 6px a la izquierda para que el ícono quede en la
	// vertical del texto (el botón tiene su propio aire). Con `flex-wrap`, lo que necesite un
	// renglón entero (el cuadro de la valoración) baja solo.
	&__barra
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 2px
		margin: 4px 0 0 -6px
		opacity: 0
		transition: opacity var(--ia-transicion)

	&:hover &__barra, &__barra--siempre, &__barra:focus-within
		opacity: 1

	&__boton
		+asistente-ia-boton-icono(30px, 8px)

// En pantallas táctiles no hay hover: la barra queda siempre a la vista.
@media (pointer: coarse)
	.asistente-ia-msj-agente__barra
		opacity: 1

@media screen and (max-width: 767px)
	.asistente-ia-msj-agente
		gap: 10px

	.asistente-ia-msj-agente__avatar
		width: 26px
		height: 26px

// Negrita del markdown que manda la IA (misión burbujas-y-negrita-asistente-ia, 21/9/2026):
// mismo elemento <span> que el texto suelto, solo cambia el peso — no hay nodo de más que
// pueda meter un espacio donde `pre-wrap` lo dibujaría (ver el comentario del <p> arriba).
.asistente-ia-negrita
	font-weight: 600

// ─── Menciones adentro del texto (misión agente-ia-mano-derecha, 16/9/2026) ──────────────
//
// La mención es un <span> más ADENTRO del mismo párrafo: hereda el `pre-wrap`, el corte de
// palabra y el interlineado de la respuesta, y sigue siendo texto que corta de línea donde
// tiene que cortar. Nada de `display: inline-block` --eso le cambiaría el corte a un nombre
// largo de artículo, que es justo lo que más aparece-- ni de padding vertical, que empujaría el
// interlineado de toda la conversación.
//
// Desde la misión agente-mejoras-uso-real se dibujan como las de ia-spa (styles/markdown.css,
// `.cc-mencion`): el color del texto, subrayado punteado y un tinte del azul al pasar el mouse.
// El tinte es un rgba del azul de acción (--ia-primario-tinte) y no un gris: se lee igual sobre
// el fondo claro y el oscuro.
//
// El subrayado va por `text-decoration` y no por `border-bottom`: con un nombre que corta de
// línea, el borde se dibujaría solo debajo del último renglón y la raya del primero
// desaparecería.
.asistente-ia-mencion
	border-radius: 4px
	padding: 0 1px
	color: inherit
	text-decoration: underline
	text-decoration-style: dotted
	text-decoration-thickness: 1.5px
	text-underline-offset: 3px
	transition: background .12s ease

	// El cliente es lo único que se toca: subrayado en el azul de acción y cursor de mano.
	&--cliente
		text-decoration-color: var(--ia-primario)
		cursor: pointer

		&:hover
			background: var(--ia-primario-tinte)
			text-decoration-style: solid

		&:focus
			outline: none

		&:focus-visible
			outline: 2px solid var(--ia-foco)
			outline-offset: 1px

	// El artículo NO se toca: su ficha sale al pasar el mouse. Por eso el subrayado va en el gris
	// (no promete una acción) y el cursor es el de ayuda.
	&--articulo
		text-decoration-color: var(--ia-texto-3)
		cursor: help

		&:hover
			background: var(--ia-primario-tinte)

@media (prefers-reduced-motion: reduce)
	.asistente-ia-msj-agente
		animation: none

	.asistente-ia-msj-agente__barra, .asistente-ia-mencion
		transition: none
</style>
