<template>
	<!-- Me gusta / no me gusta de una respuesta del agente, como en ChatGPT y en ia.comerciocity.com
	(ia-spa, mensajes/ValoracionMensaje.vue). Misión agente-mejoras-uso-real, 29/10/2026. Pedido de
	Lucas: que el dueño le pueda poner me gusta o no me gusta a cada respuesta y, con no me gusta,
	explicar por qué o qué le gustaría mejorar; con los botones "con el mismo diseño estético que
	la aplicación de ia.comerciocity.com".

	Va dentro de la barra de acciones de la respuesta (agente/Index.vue), después de «Copiar», y dibuja tres cosas:
	  - los dos botones 👍 / 👎 (el activo, relleno); volver a tocar el activo saca la valoración;
	  - la línea «Gracias, lo vamos a usar para mejorar», un rato después de mandar el comentario;
	  - con 👎, el cuadro EN LÍNEA (no un modal) «¿Qué no te gustó?»: opciones rápidas, el texto
	    libre, Cancelar y Enviar.

	🔴 EL ROOT ES `display: contents` Y NO ES UN CAPRICHO. En ia-spa (Vue 3) este componente es un
	fragmento: sus botones son hijos directos de la barra, que es flex con wrap, y el cuadro ocupa
	su propio renglón. Vue 2 exige UN root; con `display: contents` ese root no genera caja y sus
	hijos se acomodan como hijos de la barra, igual que allá. Con un root normal el cuadro quedaba
	corrido a la derecha del botón «Copiar» en vez de arrancar en el margen del texto.

	El 👎 se guarda apenas se toca (como en ChatGPT): el comentario es opcional, y Cancelar o
	Escape cierran el cuadro sin sacar el 👎. Enviar vuelve a mandar el no me gusta, ahora con el
	comentario. Si falla, el cuadro queda abierto con lo escrito.

	Los toques nunca se ignoran ni se pisan: el store manda los pedidos de un mismo mensaje en
	fila y en orden (`valorarMensaje`, `colas_de_valoracion`), así que tocar 👍 mientras viaja el
	comentario deja guardado el 👍. -->
	<div
	v-if="disponible"
	class="asistente-ia-valoracion">
		<button
		type="button"
		class="asistente-ia-valoracion__boton"
		:class="{ 'asistente-ia-valoracion__boton--activo': actual === me_gusta }"
		title="Me gusta"
		aria-label="Me gusta esta respuesta"
		:aria-pressed="actual === me_gusta ? 'true' : 'false'"
		data-testid="asistente-valoracion-me-gusta"
		@click="tocar_me_gusta">
			<icono
			nombre="pulgar_arriba"
			:relleno="actual === me_gusta"
			:tamano="17"></icono>
		</button>
		<button
		ref="boton_abajo"
		type="button"
		class="asistente-ia-valoracion__boton"
		:class="{ 'asistente-ia-valoracion__boton--activo': actual === no_me_gusta }"
		title="No me gusta"
		aria-label="No me gusta esta respuesta"
		:aria-pressed="actual === no_me_gusta ? 'true' : 'false'"
		:aria-expanded="abierto ? 'true' : 'false'"
		data-testid="asistente-valoracion-no-me-gusta"
		@click="tocar_no_me_gusta">
			<icono
			nombre="pulgar_abajo"
			:relleno="actual === no_me_gusta"
			:tamano="17"></icono>
		</button>

		<!-- Región viva siempre presente: así el lector de pantalla anuncia el «Gracias» al
		aparecer (una región que nace ya con texto no se anuncia de forma confiable). -->
		<span
		class="asistente-ia-valoracion__gracias"
		role="status"><template v-if="gracias"><icono
		nombre="check"
		:tamano="14"></icono><span>Gracias, lo vamos a usar para mejorar</span></template></span>

		<!-- 🔴 `@keydown.esc.stop`: el panel cierra el chat entero con Escape (lo escucha en
		`document`, Panel.vue::on_document_keydown). Adentro del cuadro, Escape es "cancelar el
		comentario" y no tiene que llegar hasta allá: con lo escrito a medio camino, cerrar el chat
		sería perderlo. -->
		<form
		v-if="abierto"
		ref="cuadro"
		class="asistente-ia-valoracion__cuadro"
		:aria-labelledby="id_titulo"
		@submit.prevent="enviar"
		@keydown.esc.stop.prevent="cancelar">
			<div class="asistente-ia-valoracion__tarjeta">
				<div
				:id="id_titulo"
				class="asistente-ia-valoracion__titulo">¿Qué no te gustó?</div>
				<div
				class="asistente-ia-valoracion__opciones"
				role="group"
				aria-label="Opciones rápidas">
					<button
					v-for="opcion in opciones"
					:key="opcion"
					type="button"
					class="asistente-ia-valoracion__opcion"
					:class="{ 'asistente-ia-valoracion__opcion--activa': esta_elegida(opcion) }"
					:aria-pressed="esta_elegida(opcion) ? 'true' : 'false'"
					@click="alternar(opcion)">
						<icono
						v-if="esta_elegida(opcion)"
						nombre="check"
						:tamano="14"></icono>
						<span>{{ opcion }}</span>
					</button>
				</div>
				<textarea
				v-model="texto"
				class="asistente-ia-valoracion__texto"
				rows="3"
				:maxlength="max_texto"
				placeholder="Contanos qué mejorar (opcional)"
				aria-label="Contanos qué mejorar (opcional)"
				data-testid="asistente-valoracion-comentario"></textarea>
				<div class="asistente-ia-valoracion__pie">
					<!-- El contador cuenta como el API (puntos de código). Aparece cerca del tope, o
					cuando elegir una opción recortó lo escrito para que entre (ver
					recortar_texto_al_lugar): así el recorte nunca es en silencio. -->
					<span
					v-if="mostrar_contador"
					class="asistente-ia-valoracion__contador"
					:class="{ 'asistente-ia-valoracion__contador--tope': texto_recortado || largo_del_comentario >= tope_comentario }"
					role="status">{{ largo_del_comentario }}/{{ tope_comentario }}{{ texto_recortado ? ' · se recortó para que entre' : '' }}</span>
					<div class="asistente-ia-valoracion__botones">
						<button
						type="button"
						class="asistente-ia-valoracion__accion asistente-ia-valoracion__accion--secundaria"
						:disabled="enviando"
						@click="cancelar">
							Cancelar
						</button>
						<button
						type="submit"
						class="asistente-ia-valoracion__accion asistente-ia-valoracion__accion--primaria"
						:disabled="!se_puede_enviar"
						data-testid="asistente-valoracion-enviar">
							{{ enviando ? 'Enviando…' : 'Enviar' }}
						</button>
					</div>
				</div>
			</div>
		</form>
	</div>
</template>

<script>
import Icono from '@/components/asistente-ia/Icono'
import {
	ME_GUSTA,
	NO_ME_GUSTA,
	OPCIONES_NO_ME_GUSTA,
	TOPE_COMENTARIO,
	armar_comentario,
	largo,
	lugar_para_el_texto,
	mensaje_de_error_de_valoracion,
	recortar,
	valoracion_de,
} from '@/components/asistente-ia/valoracion'

/**
 * Desde cuántos caracteres se muestra el contador del comentario (el de ia-spa).
 */
const MOSTRAR_CONTADOR_DESDE = 800

/**
 * Cuánto queda a la vista el «Gracias», en ms (el de ia-spa).
 */
const DURACION_GRACIAS_MS = 4500

export default {
	components: {
		Icono,
	},
	props: {
		/**
		 * La respuesta del agente, tal como está en `ai_chat.messages`. Trae `valoracion` y
		 * `valoracion_comentario` (null, o ausentes contra un API viejo).
		 */
		message: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Las constantes, para la plantilla.
			me_gusta: ME_GUSTA,
			no_me_gusta: NO_ME_GUSTA,
			// Copia: data() vuelve reactivo lo que recibe, y la lista es una constante compartida
			// con valoracion.js.
			opciones: OPCIONES_NO_ME_GUSTA.slice(),
			tope_comentario: TOPE_COMENTARIO,
			// true mientras el cuadro de «no me gusta» está abierto.
			abierto: false,
			// Opciones rápidas tocadas y texto libre del cuadro.
			elegidas: [],
			texto: '',
			// true mientras viaja el comentario (el botón dice «Enviando…»).
			enviando: false,
			// true cuando elegir una opción recortó lo escrito para que el comentario entre en el
			// tope: el contador lo dice.
			texto_recortado: false,
			// true mientras se ve el «Gracias, lo vamos a usar para mejorar».
			gracias: false,
		}
	},
	created() {
		// El temporizador del «Gracias» vive acá y no en data(): no es estado de pantalla.
		this.timer_gracias = null
	},
	beforeDestroy() {
		this.ocultar_gracias()
	},
	computed: {
		/**
		 * Se puede valorar una respuesta del agente que ya terminó bien y está guardada (con id).
		 * En el sistema los botones se muestran siempre que eso se cumpla: la SPA y el API salen
		 * juntos en el mismo release (contrato C1).
		 *
		 * @returns {Boolean}
		 */
		disponible() {
			return this.message.rol == 'assistant' && this.message.estado == 'listo' && Boolean(this.message.id)
		},
		/**
		 * La valoración vigente del mensaje (null si no tiene o si el API no manda el campo).
		 *
		 * @returns {String|null}
		 */
		actual() {
			return valoracion_de(this.message)
		},
		/**
		 * El comentario tal como va a viajar: «Opción · Opción — texto».
		 *
		 * @returns {String}
		 */
		comentario() {
			return armar_comentario(this.elegidas, this.texto)
		},
		/**
		 * Lugar que le queda al texto libre después de las opciones (el `maxlength` del textarea).
		 *
		 * El `maxlength` del navegador cuenta unidades de UTF-16 (un emoji vale 2) y este número
		 * puntos de código: con emojis el textarea frena ANTES de lo que el API aceptaría, nunca
		 * después, que es lo que importa.
		 *
		 * @returns {Number}
		 */
		max_texto() {
			return lugar_para_el_texto(this.elegidas)
		},
		/**
		 * El largo del comentario como lo cuenta el API (puntos de código).
		 *
		 * @returns {Number}
		 */
		largo_del_comentario() {
			return largo(this.comentario)
		},
		/**
		 * El contador se muestra cerca del tope, o si se recortó lo escrito.
		 *
		 * @returns {Boolean}
		 */
		mostrar_contador() {
			return this.texto_recortado || this.largo_del_comentario >= MOSTRAR_CONTADOR_DESDE
		},
		/**
		 * Enviar queda apagado mientras no haya nada elegido ni escrito (sin nada, el 👎 ya quedó
		 * guardado al tocarlo y no hay comentario que mandar).
		 *
		 * @returns {Boolean}
		 */
		se_puede_enviar() {
			return this.comentario.length > 0 && !this.enviando
		},
		/**
		 * Id del título del cuadro, para nombrar el formulario (aria-labelledby). Único por
		 * instancia: hay un cuadro posible por respuesta.
		 *
		 * @returns {String}
		 */
		id_titulo() {
			return 'asistente-ia-valoracion-titulo-' + this._uid
		},
	},
	watch: {
		/**
		 * Cada opción que se prende le come lugar al texto (va adelante, con su separador): si lo
		 * ya escrito deja de entrar, se recorta a la vista.
		 */
		elegidas() {
			this.recortar_texto_al_lugar()
		},
		/**
		 * El aviso de "se recortó" se apaga cuando la persona borra algo de lo recortado: ya
		 * vio el límite y lo está acomodando.
		 */
		texto() {
			if (this.texto_recortado && largo(this.texto) < this.max_texto) {
				this.texto_recortado = false
			}
		},
		/**
		 * Le avisa al mensaje que el cuadro está abierto, para que la barra no se esconda al sacar
		 * el mouse (agente/Index.vue::barra_siempre).
		 *
		 * @param {Boolean} valor
		 */
		abierto(valor) {
			this.$emit('cuadro', valor)
		},
	},
	methods: {
		/**
		 * true si la opción rápida está tocada.
		 *
		 * @param {String} opcion
		 * @returns {Boolean}
		 */
		esta_elegida(opcion) {
			return this.elegidas.indexOf(opcion) !== -1
		},
		/**
		 * Prende o apaga una opción rápida.
		 *
		 * @param {String} opcion
		 */
		alternar(opcion) {
			if (this.esta_elegida(opcion)) {
				this.elegidas = this.elegidas.filter(function (elegida) {
					return elegida !== opcion
				})
				return
			}
			this.elegidas = this.elegidas.concat([opcion])
		},
		/**
		 * Si lo escrito ya no entra con las opciones elegidas, lo recorta A LA VISTA (por puntos de
		 * código, sin partir un emoji) y prende el aviso del contador. Sin esto, `armar_comentario`
		 * cortaba el final al mandar y la persona no se enteraba de que su texto no llegó entero.
		 */
		recortar_texto_al_lugar() {
			if (largo(this.texto) > this.max_texto) {
				this.texto = recortar(this.texto, this.max_texto)
				this.texto_recortado = true
			}
		},
		/**
		 * Vacía las opciones y el texto del cuadro.
		 */
		limpiar_cuadro() {
			this.elegidas = []
			this.texto = ''
			this.texto_recortado = false
		},
		/**
		 * Cierra el cuadro; con `devolver_foco`, el foco vuelve al 👎 (Cancelar, Escape, Enviar),
		 * para que quien maneja la pantalla con teclado no quede perdido.
		 *
		 * @param {Boolean} devolver_foco
		 */
		cerrar_cuadro(devolver_foco) {
			let self = this
			if (!this.abierto) {
				return
			}
			this.abierto = false
			if (devolver_foco) {
				this.$nextTick(function () {
					if (self.$refs.boton_abajo) {
						self.$refs.boton_abajo.focus({ preventScroll: true })
					}
				})
			}
		},
		/**
		 * Al abrir: el foco a la primera opción (sin abrir el teclado del teléfono, que es lo que
		 * haría enfocar el texto) y el cuadro a la vista dentro de la conversación.
		 *
		 * 🔴 El `scrollIntoView` va en un setTimeout y no junto con el foco, a propósito. El cuadro
		 * agranda el hilo, y Conversation.vue tiene un ResizeObserver que, si la persona estaba
		 * abajo de todo, la vuelve a pegar al final (`al_cambiar_el_alto`). Ese observador corre
		 * DESPUÉS del nextTick, en el mismo cuadro de pintado: un scroll hecho antes quedaba pisado,
		 * y con el 👎 de una respuesta que no es la última el cuadro podía quedar arriba, fuera de
		 * la vista. En la tarea siguiente el observador ya corrió y esto solo corrige si hace falta
		 * (`nearest` no mueve nada si el cuadro ya se ve).
		 */
		enfocar_cuadro() {
			let self = this
			this.$nextTick(function () {
				let cuadro = self.$refs.cuadro
				if (!cuadro) {
					return
				}
				let primera = cuadro.querySelector('.asistente-ia-valoracion__opcion')
				if (primera) {
					primera.focus({ preventScroll: true })
				}
				setTimeout(function () {
					let actual = self.$refs.cuadro
					if (!actual || typeof actual.scrollIntoView != 'function') {
						return
					}
					let menos_movimiento = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
					actual.scrollIntoView({ block: 'nearest', behavior: menos_movimiento ? 'auto' : 'smooth' })
				}, 0)
			})
		},
		ocultar_gracias() {
			if (this.timer_gracias) {
				clearTimeout(this.timer_gracias)
			}
			this.timer_gracias = null
			this.gracias = false
		},
		mostrar_gracias() {
			let self = this
			this.ocultar_gracias()
			this.gracias = true
			this.timer_gracias = setTimeout(function () {
				self.gracias = false
				self.timer_gracias = null
			}, DURACION_GRACIAS_MS)
		},
		/**
		 * Guarda una valoración por el store, que la pone en pantalla al toque, la manda en fila
		 * detrás de los pedidos anteriores del mismo mensaje y, si falla, vuelve a lo último que
		 * el servidor confirmó. Acá solo se avisa el error, con el texto de su `code`.
		 *
		 * @param {String|null} valoracion
		 * @returns {Promise} resuelve con true si se guardó y false si falló.
		 */
		guardar(valoracion) {
			let self = this
			return this.$store.dispatch('ai_chat/valorarMensaje', {
				message_id: this.message.id,
				valoracion: valoracion,
			})
				.then(function () {
					return true
				})
				.catch(function (err) {
					self.$toast.error(mensaje_de_error_de_valoracion(err, 'No se pudo guardar tu valoración. Probá de nuevo.'))
					return false
				})
		},
		/**
		 * 👍: lo pone o, si ya estaba, lo saca. Cierra el cuadro del 👎 si estaba abierto (el API
		 * borra el comentario con un me gusta).
		 */
		tocar_me_gusta() {
			this.ocultar_gracias()
			this.cerrar_cuadro(false)
			this.limpiar_cuadro()
			this.guardar(this.actual === ME_GUSTA ? null : ME_GUSTA)
		},
		/**
		 * 👎: lo guarda y abre el cuadro para contar por qué; si ya estaba, lo saca y cierra el
		 * cuadro.
		 */
		tocar_no_me_gusta() {
			let self = this
			this.ocultar_gracias()
			if (this.actual === NO_ME_GUSTA) {
				this.cerrar_cuadro(false)
				this.limpiar_cuadro()
				this.guardar(null)
				return
			}
			this.limpiar_cuadro()
			this.abierto = true
			this.enfocar_cuadro()
			this.guardar(NO_ME_GUSTA)
				.then(function (guardo) {
					// Volvió atrás: sin 👎 guardado, el cuadro vacío no tiene a qué comentarle y se
					// cierra. Si la persona ya eligió o escribió algo (o lo está mandando), queda
					// abierto: Enviar vuelve a mandar el 👎, ahora con el comentario.
					let con_algo = self.elegidas.length > 0 || self.texto.trim() != '' || self.enviando
					if (!guardo && !con_algo) {
						self.abierto = false
					}
				})
		},
		/**
		 * Manda el comentario con el no me gusta. Si falla, el cuadro queda abierto con lo escrito
		 * para reintentar.
		 */
		enviar() {
			let self = this
			if (!this.se_puede_enviar) {
				return
			}
			this.enviando = true
			this.$store.dispatch('ai_chat/valorarMensaje', {
				message_id: this.message.id,
				valoracion: NO_ME_GUSTA,
				comentario: this.comentario,
			})
				.then(function () {
					self.enviando = false
					self.cerrar_cuadro(true)
					self.limpiar_cuadro()
					// Si mientras viajaba se tocó 👍 (va en la fila detrás de este), el gracias por
					// el comentario ya no corresponde.
					if (self.actual === NO_ME_GUSTA) {
						self.mostrar_gracias()
					}
				})
				.catch(function (err) {
					self.enviando = false
					self.$toast.error(mensaje_de_error_de_valoracion(err, 'No se pudo enviar tu comentario. Probá de nuevo.'))
				})
		},
		/**
		 * Cancelar o Escape: cierra el cuadro y deja el 👎 como está.
		 */
		cancelar() {
			if (this.enviando) {
				return
			}
			this.cerrar_cuadro(true)
			this.limpiar_cuadro()
		},
	},
}
</script>

<style lang="sass">
@import '@/components/asistente-ia/_mixins'

// Los estilos son los de ia-spa (mensajes/ValoracionMensaje.vue) con los tokens `--ia-*`.
.asistente-ia-valoracion
	// Ver el comentario del <template>: sin caja propia, los hijos son hijos de la barra.
	display: contents

	&__boton
		+asistente-ia-boton-icono(30px, 8px)

		// El activo: relleno y en el color del texto (como ChatGPT), no en el gris de los demás.
		&--activo
			color: var(--ia-texto)

	&__gracias
		display: inline-flex
		align-items: center
		gap: 5px
		margin-left: 6px
		font-size: .82rem
		color: var(--ia-texto-3)
		animation: asistente-ia-valoracion-aparecer .25s ease

		// Vacía no ocupa lugar, pero sigue en el árbol de accesibilidad (con display: none no se
		// anunciaría).
		&:empty
			margin: 0

	// El cuadro ocupa un renglón entero de la barra (que es flex con wrap). El padding devuelve
	// los 6px que la barra corre a la izquierda para alinear los íconos con el texto.
	&__cuadro
		flex: 0 0 100%
		margin: 0
		padding: 6px 0 4px 6px
		box-sizing: border-box
		animation: asistente-ia-valoracion-aparecer .22s ease

	// La misma tarjeta que las de acción (AccionCard.vue): fondo sutil, borde y radio 16.
	&__tarjeta
		max-width: 520px
		padding: 14px 16px
		border: 1px solid var(--ia-borde)
		border-radius: 16px
		background: var(--ia-bg-sutil)

	&__titulo
		margin-bottom: 10px
		font-size: .98rem
		font-weight: 600

	&__opciones
		display: flex
		flex-wrap: wrap
		gap: 8px
		margin-bottom: 10px

	// Las opciones rápidas: los chips de ia-spa.
	&__opcion
		display: inline-flex
		align-items: center
		gap: 5px
		min-height: 34px
		padding: 0 14px
		border: 1.5px solid var(--ia-borde-fuerte)
		border-radius: 999px
		background: var(--ia-bg)
		color: var(--ia-texto)
		font-family: inherit
		font-size: .88rem
		text-align: left
		box-shadow: none
		cursor: pointer
		transition: border-color var(--ia-transicion), background var(--ia-transicion)

		&:hover
			border-color: var(--ia-primario)

		&:focus
			outline: none

		&:focus-visible
			outline: 2px solid var(--ia-foco)
			outline-offset: 2px

		&--activa
			border-color: var(--ia-primario)
			background: var(--ia-primario-tinte)

			.asistente-ia-icono
				color: var(--ia-primario)

	// El `.campo` de ia-spa. 🔴 `box-shadow: none` explícito: common-vue/sass/_inputs.sass le pone
	// a todo <textarea> la sombra de formulario. Sin `.form-control` a propósito, para que no le
	// lleguen los fondos de formulario de bootstrap ni los del modo oscuro del sistema.
	&__texto
		display: block
		width: 100%
		min-height: 76px
		margin: 0
		padding: 10px 14px
		border: 1px solid var(--ia-borde-fuerte)
		border-radius: 12px
		background: var(--ia-bg)
		color: var(--ia-texto)
		font-family: inherit
		// 16px y no menos: con menos, iOS hace zoom al enfocar.
		font-size: 16px
		line-height: 1.5
		resize: vertical
		box-shadow: none
		box-sizing: border-box
		transition: border-color var(--ia-transicion), box-shadow var(--ia-transicion)

		&::placeholder
			color: var(--ia-texto-3)

		&:focus
			outline: none
			border-color: var(--ia-primario)
			box-shadow: 0 0 0 3px var(--ia-primario-tinte)

	&__pie
		display: flex
		align-items: center
		justify-content: flex-end
		gap: 10px
		margin-top: 10px

	&__contador
		margin-right: auto
		font-size: .8rem
		color: var(--ia-texto-3)

		// En el tope (o recortado para que entre) se lee en el color de aviso.
		&--tope
			color: var(--ia-peligro)

	&__botones
		display: flex
		flex-wrap: wrap
		justify-content: flex-end
		gap: 8px

	&__accion--secundaria
		+asistente-ia-boton-secundario

	&__accion--primaria
		+asistente-ia-boton-primario

@media screen and (max-width: 767px)
	.asistente-ia-valoracion__tarjeta
		max-width: none
		padding: 12px 14px

	// En el teléfono, objetivos táctiles un poco más altos.
	.asistente-ia-valoracion__opcion
		min-height: 36px
		padding: 0 12px

@keyframes asistente-ia-valoracion-aparecer
	from
		opacity: 0
		transform: translateY(6px)
	to
		opacity: 1
		transform: none

@media (prefers-reduced-motion: reduce)
	.asistente-ia-valoracion__gracias, .asistente-ia-valoracion__cuadro
		animation: none

	.asistente-ia-valoracion__opcion, .asistente-ia-valoracion__texto
		transition: none
</style>
