<template>
	<!-- Un mensaje de la persona, como en ia.comerciocity.com (ia-spa, mensajes/MensajeUsuario.vue):
	a la derecha, en burbuja gris. Las fotos van arriba de la burbuja; mientras el mensaje sube se ve
	atenuado (D41) y, si falla, «Reintentar». Misión agente-mejoras-uso-real, 29/10/2026. -->
	<article
	class="asistente-ia-msj-usuario"
	:class="clases"
	aria-label="Tu mensaje">
		<!-- Las fotos que el dueño mandó por WhatsApp (misión asistente-capacidades-y-hilos,
		22/9/2026, contrato 1). Lucas: "las fotos que le mando por whatsapp no las veo en el chat
		del sistema" -- llegaban y se guardaban, pero la SPA no las pintaba nunca.

		🔴 Van ARRIBA del texto, al revés que los adjuntos del asistente, y no es una
		inconsistencia: es la maquetación de cualquier chat, la misma que ya usa el módulo de
		WhatsApp y la que usa ia-spa. El dueño manda una foto y escribe SOBRE esa foto: el texto
		es el epígrafe. El asistente hace lo contrario -- dice algo y lo ilustra.

		Sin `imagenes` (API viejo) el computed devuelve [] y acá no se monta nada. -->
		<adjuntos-de-mensaje
		v-if="fotos_del_usuario.length"
		class="asistente-ia-msj-usuario__fotos"
		alt_por_defecto="Foto que mandaste"
		foto_de_camara
		:adjuntos="fotos_del_usuario"></adjuntos-de-mensaje>

		<!-- Texto plano, con la interpolación de Vue (que escapa) y `pre-wrap`. Lo que tipeó la
		persona no se segmenta nunca, ni por mención ni por negrita: marcarlo sería
		reinterpretar lo que ella misma escribió.

		🔴 La interpolación va PEGADA a las etiquetas del <p>: con `pre-wrap`, un salto de línea
		del template se dibujaría como un renglón de más. -->
		<div
		v-if="texto"
		class="asistente-ia-msj-usuario__burbuja">
			<p class="asistente-ia-msj-usuario__texto">{{ texto }}</p>
		</div>

		<!-- El reintento reenvía el mismo texto (D41). -->
		<div
		v-if="con_error"
		class="asistente-ia-msj-usuario__fallo"
		role="alert">
			<icono
			nombre="alerta"
			:tamano="16"></icono>
			<span>No se pudo enviar.</span>
			<button
			type="button"
			class="asistente-ia-msj-usuario__reintentar"
			@click="$emit('retry', message)">
				Reintentar
			</button>
		</div>

		<!-- El pie: el estado del envío (D41), siempre a la vista mientras importa, y «Copiar»,
		que aparece al pasar el mouse como en ia-spa. -->
		<div
		v-else-if="texto || estado_del_envio"
		class="asistente-ia-msj-usuario__pie">
			<button
			v-if="texto"
			type="button"
			class="asistente-ia-msj-usuario__copiar"
			:title="copiado ? 'Copiado' : 'Copiar'"
			:aria-label="copiado ? 'Copiado' : 'Copiar el mensaje'"
			@click="copiar_texto">
				<icono
				:nombre="copiado ? 'check' : 'copiar'"
				:tamano="16"></icono>
			</button>
			<span
			v-if="estado_del_envio == 'enviando'"
			class="asistente-ia-msj-usuario__estado"
			title="Enviando...">
				<icono
				nombre="reloj"
				:tamano="14"
				titulo="Enviando"></icono>
			</span>
			<span
			v-else-if="estado_del_envio == 'enviado'"
			class="asistente-ia-msj-usuario__estado"
			title="Enviado">
				<icono
				nombre="check"
				:tamano="14"
				titulo="Enviado"></icono>
			</span>
		</div>
	</article>
</template>

<script>
import AdjuntosDeMensaje from '@/components/asistente-ia/AdjuntosDeMensaje'
import Icono from '@/components/asistente-ia/Icono'
import { copiar_al_portapapeles } from '@/components/asistente-ia/portapapeles'

/**
 * Cuánto queda el tilde de "Copiado" en el botón, en ms (el de ia-spa).
 */
const DURACION_COPIADO_MS = 1800

export default {
	components: {
		AdjuntosDeMensaje,
		Icono,
	},
	props: {
		/**
		 * El mensaje de la persona (rol `user`): del API, o el globo optimista de `sendMessage`
		 * con su `estado_local` ('enviando' | 'enviado' | 'error').
		 */
		message: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// true durante un rato después de copiar: el botón muestra el tilde.
			copiado: false,
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
		 * Lo que tipeó la persona, o '' (un mensaje que es solo una foto por WhatsApp llega con
		 * `contenido` vacío: pasó con el #97 de demo3).
		 *
		 * @returns {String}
		 */
		texto() {
			return typeof this.message.contenido == 'string' ? this.message.contenido : ''
		},
		/**
		 * El estado del envío del globo optimista (D41), o null para un mensaje que vino del API.
		 *
		 * @returns {String|null}
		 */
		estado_del_envio() {
			return this.message.estado_local || null
		},
		con_error() {
			return this.estado_del_envio == 'error'
		},
		clases() {
			return {
				'asistente-ia-msj-usuario--enviando': this.estado_del_envio == 'enviando',
				'asistente-ia-msj-usuario--error': this.con_error,
			}
		},
		/**
		 * Las fotos que el dueño mandó por WhatsApp (misión asistente-capacidades-y-hilos,
		 * 22/9/2026, contrato 1), traducidas a la forma que entiende AdjuntosDeMensaje.vue.
		 *
		 * El API las manda en `message.imagenes` como `{ id, orden, url }`. Acá se convierten
		 * al `{ tipo, url, texto }` de los adjuntos del asistente en vez de enseñarle a ese
		 * componente un segundo formato: en pantalla las dos cosas son lo mismo --una foto con
		 * visor--, y lo único que las distingue es de quién son y dónde van, que se resuelve acá
		 * y no allá.
		 *
		 * 🔴 `undefined` se trata como [] y no se monta nada. No es defensa por las dudas: es
		 * el contrato. La SPA nueva tiene que andar contra un API que todavía no manda la
		 * clave, porque los dos lados nunca llegan a producción el mismo día.
		 *
		 * `orden` no se usa para ordenar: el API ya las manda en orden, y reordenarlas acá
		 * sería repetir una regla del back que después puede cambiar de un solo lado.
		 *
		 * `texto` va vacío a propósito: sería el epígrafe debajo de la foto, y la foto que
		 * mandó el dueño no tiene ninguno que valga la pena. Lo que el lector de pantalla dice
		 * va por `alt_por_defecto`, que no se dibuja.
		 *
		 * @returns {Array<Object>}
		 */
		fotos_del_usuario() {
			let fotos = []
			if (!Array.isArray(this.message.imagenes)) {
				return fotos
			}
			this.message.imagenes.forEach(function (imagen) {
				fotos.push({
					tipo: 'imagen',
					url: imagen && typeof imagen.url == 'string' ? imagen.url : '',
					texto: '',
				})
			})
			return fotos
		},
	},
	methods: {
		/**
		 * «Copiar» el mensaje tal como se escribió.
		 *
		 * @returns {void}
		 */
		copiar_texto() {
			let self = this
			copiar_al_portapapeles(this.texto)
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
@import '@/components/asistente-ia/_tokens'

// El mensaje de la persona de ia-spa (mensajes/MensajeUsuario.vue): todo pegado a la derecha,
// la burbuja gris con radio 22, las fotos arriba.
.asistente-ia-msj-usuario
	display: flex
	flex-direction: column
	align-items: flex-end
	gap: 6px
	padding: 8px 0 0 0
	animation: asistente-ia-msj-aparecer .2s ease

	// 🔴 80% y no el 70% de ia-spa: la misma conversación vive también en el sidebar de 380px del
	// informe del mostrador y en el panel a su ancho mínimo, donde el 70% dejaba renglones de
	// tres palabras. En una columna ancha el tope de 560px manda igual que allá.
	&__burbuja
		max-width: min(80%, 560px)
		padding: 10px 18px
		border-radius: 22px
		background: var(--ia-bg-burbuja)
		overflow-wrap: anywhere

	&__texto
		margin: 0
		white-space: pre-wrap
		text-align: left
		font-size: 1rem
		line-height: 1.6
		color: var(--ia-texto)

	// Mientras el POST no confirmó, el mensaje respira en baja opacidad (D41).
	&--enviando &__burbuja, &--enviando &__fotos
		opacity: .6

	// Las fotos van ARRIBA de la burbuja (ver el template), pegadas a la derecha. La separación
	// de `.asistente-ia-adjuntos` --pensada para ir DEBAJO de un texto-- se saca.
	//
	// 🔴 El selector suma la clase del componente a propósito: `.asistente-ia-adjuntos` pesa lo
	// mismo que `.asistente-ia-msj-usuario__fotos` (0,1,0) y viven en dos .vue distintos, así que
	// a igual especificidad decidiría el ORDEN en que queden en la hoja final -- que depende del
	// orden de evaluación de los módulos. Compuesto pesa (0,2,0) y gana siempre.
	&__fotos.asistente-ia-adjuntos
		margin: 0
		justify-content: flex-end
		max-width: min(80%, 460px)

	&__fotos .asistente-ia-adjuntos__miniatura
		border-color: var(--ia-borde)
		border-radius: 16px

	&__pie
		display: flex
		align-items: center
		gap: 4px
		min-height: 22px

	&__copiar
		+asistente-ia-boton-icono(30px, 8px)
		opacity: 0
		transition: opacity var(--ia-transicion), background var(--ia-transicion), color var(--ia-transicion)

		&:focus-visible
			opacity: 1

	&:hover &__copiar
		opacity: 1

	&__estado
		display: inline-flex
		align-items: center
		padding: 0 4px
		color: var(--ia-texto-3)

	&__fallo
		display: flex
		align-items: center
		flex-wrap: wrap
		justify-content: flex-end
		gap: 4px 8px
		font-size: .86rem
		color: var(--ia-peligro)

	&__reintentar
		+asistente-ia-boton
		min-height: 28px
		padding: 0 8px
		border: 0
		background: transparent
		color: var(--ia-texto)

		&:hover:not(:disabled)
			background: var(--ia-bg-hover)

// En pantallas táctiles «Copiar» no se muestra, como en ia-spa (se copia manteniendo apretado).
@media (pointer: coarse)
	.asistente-ia-msj-usuario__copiar
		display: none

@media screen and (max-width: 767px)
	.asistente-ia-msj-usuario__burbuja, .asistente-ia-msj-usuario__fotos.asistente-ia-adjuntos
		max-width: 85%

@media (prefers-reduced-motion: reduce)
	.asistente-ia-msj-usuario
		animation: none

	.asistente-ia-msj-usuario__copiar
		transition: none
</style>
