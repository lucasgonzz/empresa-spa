<template>
	<!-- 🔴 ESTE div ES EL ROOT Y NO SCROLLEA, Y NO ES DECORACION: es lo unico que
	puede alojar el boton flotante. El que scrollea es `.asistente-ia-conversacion`,
	asi que un hijo `position: absolute` suyo se va con el scroll --no queda flotando--
	por mas `position: relative` que se le ponga al scroller. Por eso el boton es HERMANO
	del scroller y no hijo.

	🔴 Y por eso `flex: 1` + `min-height: 0` estan en los DOS (ver el <style>): ese par es
	lo unico que le da altura al hilo adentro del flex column que lo aloja
	(`.asistente-ia-panel__cuerpo` y `.sidebar-conversacion`). Si se queda solo en el
	scroller, el marco crece con el contenido, el hilo deja de scrollear y el composer se
	va afuera del panel. -->
	<div class="asistente-ia-conversacion-marco">
		<div
		class="asistente-ia-conversacion"
		ref="container"
		@scroll="on_scroll">
			<p
			v-if="loading"
			class="asistente-ia-conversacion__aviso">
				Cargando la conversación...
			</p>

			<!-- Bienvenida de conversación en blanco: refleja lo que el asistente
			puede consultar de verdad (las tools de lectura, D15) y, desde la misión
			asistente-ia-acciones (15/9/2026), lo que puede proponer cargar con una
			tarjeta que la persona confirma. -->
			<div
			v-else-if="!messages.length"
			class="asistente-ia-conversacion__bienvenida">
				<span class="asistente-ia-conversacion__bienvenida-avatar">
					<img
					v-if="logo_url"
					:src="logo_url"
					alt="">
					<i
					v-else
					class="bi bi-robot"></i>
				</span>
				<h5>¿En qué te puedo ayudar?</h5>
				<p>
					Preguntame por el stock o el precio de un artículo, el saldo de un
					cliente o qué se está vendiendo más.
				</p>
				<p>
					También puedo cargar gastos, pagos y tareas de la agenda: te dejo una
					tarjeta para que confirmes.
				</p>
			</div>

			<div
			v-else
			class="asistente-ia-conversacion__mensajes">
				<p
				v-if="loading_more"
				class="asistente-ia-conversacion__aviso asistente-ia-conversacion__aviso--chico">
					Cargando mensajes anteriores...
				</p>
				<template v-for="(message, index) in mensajes_visibles">
					<!-- local_id primero: un globo que nació optimista conserva su key al
					confirmarse y Vue no re-monta el nodo (la entrada no parpadea). -->
					<message-bubble
					:key="message.local_id || message.id"
					:message="message"
					@retry="reintentar"></message-bubble>
					<!-- Puente al submódulo que originó la conversación, debajo del primer
					mensaje del asistente (D24): sin markdown no hay links en el texto, el
					botón es de la SPA. -->
					<div
					v-if="mostrar_boton_de_origen(message, index)"
					:key="'origen-' + (message.id || message.local_id)"
					class="asistente-ia-conversacion__origen">
						<b-button
						size="sm"
						variant="outline-primary"
						@click="ir_al_origen">
							<i class="bi bi-box-arrow-up-right"></i>
							{{ texto_boton_de_origen }}
						</b-button>
					</div>
				</template>

				<pensando-indicator
				v-if="hay_respuesta_en_curso"></pensando-indicator>

				<!-- Aviso de demora (R8: la cola es compartida con las importaciones). -->
				<p
				v-if="hay_respuesta_en_curso && respuesta_demorada"
				class="asistente-ia-conversacion__demora">
					La respuesta está tardando más de lo normal. Puede haber una importación
					en curso ocupando el servidor.
				</p>
			</div>
		</div>

		<!-- "Ir al ultimo mensaje" (pedido de Lucas, 22/9/2026). Sale solo cuando la persona
		no esta abajo de todo; el umbral de tolerancia esta en TOLERANCIA_FINAL. -->
		<button
		v-if="lejos_del_final"
		type="button"
		class="asistente-ia-conversacion-marco__ir-al-final"
		title="Ir al último mensaje"
		aria-label="Ir al último mensaje"
		data-testid="asistente-bajar-al-ultimo-mensaje"
		@click="ir_al_final">
			<i
			class="bi bi-arrow-down"
			aria-hidden="true"></i>
		</button>
	</div>
</template>

<script>
import MessageBubble from '@/components/asistente-ia/MessageBubble'
import PensandoIndicator from '@/components/asistente-ia/PensandoIndicator'

/**
 * Mapa origen de la conversación -> name de la ruta del submódulo (D24).
 *
 * `sugerencia_stock` y `sugerencia_compra` salieron del mapa en la misión
 * "modulo-ia-mostrador" (14/9/2026): sus vistas (/sugerencias-de-stock y
 * /sugerencias-de-compra) se borraron con el módulo IA viejo, así que para esas
 * conversaciones el botón directamente no se muestra (mostrar_boton_de_origen
 * corta cuando el origen no está acá). Las conversaciones siguen existiendo y se
 * leen igual; solo no tienen adónde volver. `sugerencia_oferta` sigue: Promociones
 * existe. `mostrador_reporte` es el puente nuevo: de la conversación de un
 * informe del mostrador al informe (referencia_id = mostrador_reportes.id, y la
 * ruta /ia/:id? lo abre).
 */
const RUTA_POR_ORIGEN = {
	sugerencia_oferta: 'ofertas',
	mostrador_reporte: 'ia',
}

/**
 * Texto del botón de puente al submódulo, por origen (misión "sugerencias de
 * compra", 15/8/2026): antes era un string fijo "Ver la sugerencia" en el
 * template; con un segundo origen hacía falta distinguir a cuál sugerencia
 * lleva. Toda clave nueva de RUTA_POR_ORIGEN necesita su par acá.
 */
const ETIQUETA_POR_ORIGEN = {
	sugerencia_oferta: 'Ver las ofertas sugeridas',
	mostrador_reporte: 'Ver el informe',
}

/**
 * Cuántos píxeles de distancia al fondo se toleran antes de dar por hecho que la persona
 * "no está abajo de todo" (botón de ir al último mensaje, pedido de Lucas del 22/9/2026).
 *
 * ⚠️ En este módulo "el botón flotante" a secas es OTRO: `FloatingButton.vue`, el que abre
 * el chat (así lo nombra el comentario de `logo_url` acá abajo). Éste es el de la esquina de
 * la conversación.
 *
 * 🔴 No es 0 y no puede serlo: el alto de un contenedor que scrollea es fraccionario (zoom
 * del navegador, densidad de pantalla), así que `scrollHeight - scrollTop - clientHeight`
 * casi nunca da exactamente 0 estando abajo de todo. Con el umbral pegado a 0 el botón
 * aparecería y desaparecería solo, sin que nadie haya tocado nada.
 *
 * 120px es poco más de un renglón de viñeta: alcanza para no parpadear y no es tanto como
 * para esconder el botón cuando ya hay un mensaje entero fuera de la vista.
 *
 * 🔴 El MISMO número decide si un mensaje nuevo arrastra el scroll (ver los watch). Tienen
 * que ser la misma condición: con dos umbrales distintos queda una franja donde el hilo
 * baja solo Y el botón igual se ve, o peor, donde no baja y el botón tampoco está.
 */
const TOLERANCIA_FINAL = 120

/**
 * Milisegundos durante los que, después de tocar el botón, un evento `scroll` no vuelve a
 * mostrarlo. El deslizamiento suave dispara `scroll` en cada cuadro, así que sin esta
 * ventana el botón reaparecería a mitad de camino y se volvería a ir al llegar abajo.
 *
 * Es un VENCIMIENTO y no un temporizador, a propósito: si la persona cancela el
 * deslizamiento con la rueda (el navegador aborta el scroll programático en cuanto la
 * tocás), no queda ningún timer colgado ni nada que limpiar en beforeDestroy — vencida la
 * ventana, el próximo `scroll` vuelve a mandar. 700ms cubre de sobra el tope de animación
 * de Chrome, que no pasa de ~500ms por lejos que estés.
 */
const VENTANA_BAJADA = 700

export default {
	components: {
		MessageBubble,
		PensandoIndicator,
	},
	props: {
		/**
		 * true cuando la conversación ya se está mirando desde el lugar que la originó
		 * (el sidebar del informe abierto del mostrador, misión "modulo-ia-mostrador",
		 * 14/9/2026): ahí el puente "Ver el informe" no tiene sentido, se está parado
		 * sobre el informe. Desde el panel flotante queda en false y el puente sale.
		 */
		sin_puente: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			// Alto del contenedor antes de anteponer una página vieja, para restaurar
			// el scroll exactamente donde estaba (si no, saltaría al tope).
			scroll_height_before_prepend: 0,
			// true cuando el último mensaje quedó a más de TOLERANCIA_FINAL de la vista:
			// es lo único que muestra el botón flotante. Arranca en false porque una
			// conversación recién abierta arranca abajo de todo (mounted).
			lejos_del_final: false,
			// Date.now() hasta el que se ignora el recálculo del botón: la ventana del
			// deslizamiento que disparó el propio botón (ver VENTANA_BAJADA). 0 = nada
			// en curso.
			bajada_hasta: 0,
		}
	},
	computed: {
		conversation() {
			return this.$store.getters['ai_chat/selected_conversation']
		},
		selected_conversation_id() {
			return this.$store.state.ai_chat.selected_conversation_id
		},
		messages() {
			return this.$store.state.ai_chat.messages
		},
		/**
		 * El assistant 'pendiente' no se pinta como globo vacío: en su lugar va el
		 * indicador de pensando (D41/D18: nunca queda un globo vacío a la vista).
		 */
		mensajes_visibles() {
			return this.messages.filter(m => {
				return !(m.rol == 'assistant' && m.estado == 'pendiente')
			})
		},
		hay_respuesta_en_curso() {
			return this.$store.getters['ai_chat/hay_respuesta_en_curso']
		},
		respuesta_demorada() {
			return this.$store.state.ai_chat.respuesta_demorada
		},
		loading() {
			return this.$store.state.ai_chat.loading_messages
		},
		loading_more() {
			return this.$store.state.ai_chat.loading_more_messages
		},
		messages_page() {
			return this.$store.state.ai_chat.messages_page
		},
		messages_last_page() {
			return this.$store.state.ai_chat.messages_last_page
		},
		has_more_pages() {
			return this.messages_last_page && this.messages_page < this.messages_last_page
		},
		/**
		 * true cuando ya está cargado el principio de la conversación (todas las
		 * páginas): recién ahí el primer assistant visible es el primero real.
		 */
		todas_las_paginas_cargadas() {
			return !this.messages_last_page || this.messages_page >= this.messages_last_page
		},
		/**
		 * Mismo criterio que el botón flotante (D37).
		 */
		logo_url() {
			if (!this.user) {
				return null
			}
			if (this.user.online_configuration && this.user.online_configuration.logo_url) {
				return this.user.online_configuration.logo_url
			}
			return this.user.image_url || null
		},
		/**
		 * Texto del botón de puente al submódulo (D24), según el origen de la
		 * conversación abierta. Reemplaza el "Ver la sugerencia" hardcodeado que
		 * tenía el template: con dos orígenes posibles hacía falta distinguir a
		 * cuál sugerencia lleva. El fallback solo se usaría si algún origen quedara
		 * en RUTA_POR_ORIGEN sin su par en ETIQUETA_POR_ORIGEN.
		 */
		texto_boton_de_origen() {
			if (this.conversation && ETIQUETA_POR_ORIGEN[this.conversation.origen]) {
				return ETIQUETA_POR_ORIGEN[this.conversation.origen]
			}
			return 'Ver la sugerencia'
		},
	},
	mounted() {
		let self = this
		this.$nextTick(function () {
			self.scrollToBottom()
		})
	},
	watch: {
		selected_conversation_id() {
			let self = this
			// Al abrir otra conversación, arranca siempre desde abajo (lo más reciente).
			this.$nextTick(function () {
				self.scrollToBottom()
			})
		},
		'messages.length'(new_length, old_length) {
			let self = this
			// Mensaje nuevo al final (no una página vieja anteponiéndose).
			if (new_length > old_length && !this.loading_more) {
				// 🔴 ACÁ ESTÁ EL CAMBIO DE COMPORTAMIENTO DEL 22/9/2026, Y ES A PROPÓSITO.
				// Hasta el botón flotante esto era un `scrollToBottom()` pelado: entraba un
				// mensaje y te llevaba al fondo estuvieras donde estuvieras. Con el botón
				// puesto eso deja de tener sentido y pasa a molestar: si estás leyendo un
				// mensaje de más arriba, la respuesta del asistente te sacaba del renglón.
				//
				// Ahora: si estabas abajo de todo, baja solo como siempre; si no, NO te mueve
				// nada y aparece el botón, que es el pedido textual de Lucas ("mostrarlo solo
				// cuando no estoy con el scroll en el último mensaje").
				//
				// 🔴 SI ALGUIEN LO "SIMPLIFICA" DE VUELTA a un scrollToBottom() incondicional,
				// deshace el pedido entero: el botón no llegaría a verse nunca, porque el hilo
				// se autocorregiría al fondo en cada mensaje.
				//
				// `lejos_del_final` se lee ANTES del $nextTick a propósito: en este punto
				// todavía vale lo que valía antes de pintar el mensaje nuevo, o sea "¿dónde
				// estaba parada la persona cuando esto llegó?", que es la pregunta correcta.
				let seguia_el_final = !this.lejos_del_final
				this.$nextTick(function () {
					if (seguia_el_final) {
						self.scrollToBottom()
						return
					}
					// No se mueve el scroll, pero el contenido creció: hay que recalcular,
					// porque ningún evento `scroll` va a avisar de un cambio de alto.
					self.recalcular_lejos_del_final()
				})
			}
		},
		hay_respuesta_en_curso(en_curso) {
			let self = this
			// Cuando la respuesta llega, el pendiente se convierte en texto (patch,
			// sin cambiar el largo): también hay que bajar a leerla. Mismo criterio que
			// arriba: solo si la persona estaba abajo de todo.
			if (!en_curso) {
				let seguia_el_final = !this.lejos_del_final
				this.$nextTick(function () {
					if (seguia_el_final) {
						self.scrollToBottom()
						return
					}
					// Acá el recálculo no es un detalle: al irse el indicador de pensando el
					// contenido puede ENCOGER, y encoger no dispara `scroll`. Sin esto el
					// botón quedaría pegado a la vista con la conversación ya abajo.
					self.recalcular_lejos_del_final()
				})
			}
		},
		loading_more(is_loading_more) {
			let self = this
			if (is_loading_more) {
				this.scroll_height_before_prepend = this.$refs.container ? this.$refs.container.scrollHeight : 0
			} else {
				// Terminó de cargar la página vieja: restaura el scroll para que no salte.
				this.$nextTick(function () {
					if (self.$refs.container) {
						self.$refs.container.scrollTop = self.$refs.container.scrollHeight - self.scroll_height_before_prepend
					}
					// 🔴 Ese `scrollTop =` dispara el evento `scroll`, así que `on_scroll`
					// reentra. No pasa nada y no hace falta ninguna bandera: `loading_more` ya
					// está en false, y la página siguiente la sigue frenando la misma guarda de
					// siempre (`scrollTop < 80`, que después de anteponer una página entera
					// queda muy por encima de 80). Es el comportamiento de antes del botón, sin
					// cambios. Y el botón no parpadea: quedás arriba de todo, o sea lejos del
					// final, antes y después de reentrar.
					//
					// Este recálculo explícito está igual porque la reentrada NO alcanza: si el
					// contenedor ya estaba en scrollTop 0, asignarle 0 otra vez no dispara nada.
					self.recalcular_lejos_del_final()
				})
			}
		},
	},
	methods: {
		/**
		 * Baja al último mensaje.
		 *
		 * `suave` lo pasa SOLO el botón flotante: todo lo demás (abrir una conversación,
		 * seguir un mensaje que entra) tiene que ser instantáneo, si no la conversación se
		 * vería deslizándose sola cada vez que el asistente contesta.
		 *
		 * @param {Boolean} [suave] true para deslizar en lugar de saltar.
		 * @returns {void}
		 */
		scrollToBottom(suave) {
			if (!this.$refs.container) {
				return
			}
			let container = this.$refs.container
			if (suave && !this.prefiere_menos_movimiento() && typeof container.scrollTo == 'function') {
				container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
			} else {
				container.scrollTop = container.scrollHeight
			}
			// El evento `scroll` va a llegar igual y recalcular, pero llega después; con el
			// salto instantáneo esto deja el botón resuelto en el mismo tick.
			this.recalcular_lejos_del_final()
		},
		/**
		 * ¿La persona pidió menos movimiento en el sistema operativo? Es la misma pregunta que
		 * contesta el `@media (prefers-reduced-motion: reduce)` del <style>, pero desde JS: un
		 * scroll suave se dispara por código y ningún media query puede frenarlo.
		 *
		 * @returns {Boolean}
		 */
		prefiere_menos_movimiento() {
			if (typeof window.matchMedia != 'function') {
				return false
			}
			return window.matchMedia('(prefers-reduced-motion: reduce)').matches
		},
		/**
		 * Recalcula si el último mensaje quedó fuera de la vista, que es lo único que decide
		 * si el botón flotante se ve.
		 *
		 * 🔴 Se llama a mano desde `mounted`, desde `scrollToBottom` y desde los tres watch
		 * además de desde `on_scroll`, y no es por las dudas: el evento `scroll` avisa cuando
		 * cambia `scrollTop`, pero NO cuando cambia `scrollHeight`. Un mensaje que entra, una
		 * página vieja que se antepone o el indicador de pensando que se va cambian el alto
		 * sin mover el scroll, y sin estas llamadas el botón se quedaría en el estado anterior.
		 *
		 * @returns {void}
		 */
		recalcular_lejos_del_final() {
			let container = this.$refs.container
			if (!container) {
				return
			}
			let distancia = container.scrollHeight - container.scrollTop - container.clientHeight
			let llego = distancia <= TOLERANCIA_FINAL
			if (!llego && Date.now() < this.bajada_hasta) {
				// El deslizamiento que disparó el propio botón sigue en camino (ver
				// VENTANA_BAJADA): sus eventos `scroll` no tienen que volver a mostrarlo.
				return
			}
			this.bajada_hasta = 0
			this.lejos_del_final = !llego
		},
		/**
		 * Clic en el botón flotante: al último mensaje, deslizando.
		 *
		 * El botón se esconde en el acto y no al llegar: si esperara al final del
		 * deslizamiento, se vería el cartelito quieto mientras la conversación se mueve
		 * debajo.
		 *
		 * @returns {void}
		 */
		ir_al_final() {
			this.lejos_del_final = false
			this.bajada_hasta = Date.now() + VENTANA_BAJADA
			this.scrollToBottom(true)
		},
		/**
		 * Scroll infinito hacia arriba: cerca del tope pide la página anterior. Y, desde el
		 * 22/9/2026, el recálculo del botón flotante.
		 */
		on_scroll(event) {
			this.recalcular_lejos_del_final()
			if (event.target.scrollTop < 80 && this.has_more_pages && !this.loading_more && !this.loading) {
				this.$store.dispatch('ai_chat/getMessages', {
					conversation_id: this.selected_conversation_id,
					page: this.messages_page + 1,
				})
			}
		},
		/**
		 * El botón "Ver la sugerencia" va debajo del PRIMER mensaje del asistente de
		 * una conversación que no abrió el usuario (D24), y recién cuando el
		 * principio de la conversación está cargado.
		 */
		mostrar_boton_de_origen(message, index) {
			if (this.sin_puente) {
				return false
			}
			if (!this.conversation || this.conversation.origen == 'usuario') {
				return false
			}
			if (!this.conversation.referencia_id || !RUTA_POR_ORIGEN[this.conversation.origen]) {
				return false
			}
			if (!this.todas_las_paginas_cargadas) {
				return false
			}
			if (message.rol != 'assistant') {
				return false
			}
			let primer_assistant_index = this.mensajes_visibles.findIndex(m => m.rol == 'assistant')
			return index === primer_assistant_index
		},
		ir_al_origen() {
			let ruta = RUTA_POR_ORIGEN[this.conversation.origen]
			let id = '' + this.conversation.referencia_id
			this.$store.commit('ai_chat/setPanelAbierto', false)
			// Guard contra NavigationDuplicated si ya se está mirando ese detalle.
			if (this.$route.name == ruta && this.$route.params.id == id) {
				return
			}
			this.$router.push({ name: ruta, params: { id: id } })
		},
		reintentar(message) {
			this.$store.dispatch('ai_chat/retryMessage', message)
		},
	},
}
</script>

<style lang="sass">
// ─── El marco quieto, y el botón flotante que cuelga de él ──────────────────────────────
//
// 🔴 ESTE BLOQUE NO ES DECORACIÓN Y NO SE PUEDE COLAPSAR CON EL DE ABAJO. El elemento que
// scrollea es `.asistente-ia-conversacion`; ponerle `position: relative` a ÉL y colgarle el
// botón adentro NO funciona --el botón se iría con el scroll, que es justo lo contrario de
// "flotante"--. Por eso hay dos cajas: ésta, que no se mueve y hace de ancla, y la de abajo,
// que scrollea adentro.
//
// 🔴 `flex: 1` + `min-height: 0` van acá ADEMÁS de en el scroller. Ese par es lo único que le
// da altura al hilo adentro del flex column que lo aloja --`.asistente-ia-panel__cuerpo` en el
// panel flotante y `.sidebar-conversacion` en el informe del mostrador--. Si se queda solo en
// el scroller, este marco crece con el contenido, el hilo deja de scrollear y el composer se va
// abajo de todo, fuera del panel.
.asistente-ia-conversacion-marco
	flex: 1
	min-height: 0
	// El ancla del botón: la única caja de acá adentro que se queda quieta.
	position: relative
	// Para que el scroller ocupe el marco entero: su `flex: 1` + `min-height: 0` se resuelven
	// contra esta columna.
	display: flex
	flex-direction: column

	// "Ir al último mensaje" (pedido de Lucas, 22/9/2026). Una píldora chica, del color de una
	// tarjeta, pegada a la esquina de abajo a la derecha: justo arriba del input de escribir.
	&__ir-al-final
		position: absolute
		// 🔴 22px de separación del borde derecho, y NO los 12 de costumbre. La franja de la
		// derecha ya está ocupada por dos cosas:
		//   · el `scrollbar-gutter: stable` del scroller (ver abajo) reserva el ancho de la
		//     barra --~15-17px en Windows-- contra el borde derecho de ESTE marco, así que un
		//     botón a 12px queda debajo del thumb y el clic se lo lleva la barra;
		//   · en el panel flotante, los 6px de `padding-right` de `.asistente-ia-panel__main`
		//     son la franja de la manija de resize (`.asistente-ia-resizer`, `width: 6px;
		//     right: 0`). Esos 6px quedan FUERA de este marco, porque el padding es del
		//     abuelo: el botón no puede pisar la manija --agarrarla redimensionaría el
		//     modal--, pero son la razón de que el borde derecho ya venga justo.
		// 22 deja ~5px de aire entre el botón y la barra en Windows. Donde la barra se
		// superpone (macOS, teléfonos) el gutter no reserva nada y el botón queda apenas más
		// adentro, que se ve igual de bien.
		right: 22px
		bottom: 12px
		z-index: 1
		width: 34px
		height: 34px
		padding: 0
		display: flex
		align-items: center
		justify-content: center
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 999px
		background: var(--bg-card, #fff)
		color: var(--color-text-secondary, #6c757d)
		font-size: 15px
		line-height: 1
		cursor: pointer
		// 🔴 Explícito y no heredado: `common-vue/sass/_inputs.sass` le pone a TODO <button>
		// del sistema una sombra diagonal (`1.95px 1.95px`), que es chasis de formulario. Acá
		// hace falta una sombra pareja alrededor, como la de cualquier píldora flotante del
		// repo. Gana por especificidad (0,2,0 contra 0,0,1), así que no depende del orden en
		// que quede la hoja final.
		box-shadow: 0 2px 8px var(--shadow-color, rgba(99, 99, 99, .2))
		transition: background .12s ease, border-color .12s ease, color .12s ease

		&:hover
			background: var(--bg-hover, #f1f3f5)
			border-color: var(--color-primary, #007bff)
			color: var(--color-primary, #007bff)

		&:focus-visible
			outline: 2px solid var(--color-primary, #007bff)
			outline-offset: 2px

.asistente-ia-conversacion
	flex: 1
	min-height: 0
	overflow-y: auto
	// Reserva siempre el lugar de la barra de scroll (misión asistente-ia-acciones). Sin esto,
	// cuando la conversación empieza a scrollear aparece la barra, se come su ancho y los
	// renglones de las tarjetas de carga (AccionCard.vue, que se acomodan por el ancho del
	// contenedor) pueden saltar de una a dos líneas en el sidebar de 380px o a ~360px. Con
	// barras superpuestas (teléfonos, macOS) no reserva nada, que es lo correcto.
	scrollbar-gutter: stable
	padding: 16px 18px 6px 18px

	// 🔴 900 y no 640 (decisión de Lucas, 19/8/2026). El tope viejo lo alcanzaba el
	// panel con apenas 942px de ancho, así que desde el default nuevo de 984 en adelante
	// TODO lo que se ganaba estirando el modal se convertía en margen vacío y la
	// conversación no se movía: la manija existía pero no servía para nada.
	//
	// Sigue habiendo un tope, y no es capricho: una línea de texto muy larga se lee peor
	// porque el ojo pierde el renglón al volver. 900 es el punto donde estirar el panel
	// hasta el máximo todavía agranda la conversación sin que las líneas se vuelvan
	// incómodas. Sacarlo del todo NO es "mejor": es volver al problema que el tope evita.
	&__mensajes
		display: flex
		flex-direction: column
		max-width: 900px
		margin: 0 auto

	&__aviso
		text-align: center
		color: var(--color-text-secondary, #6c757d)
		margin: 14px 0
		font-size: .85rem

		&--chico
			margin: 0 0 10px 0
			font-size: .8rem

	&__bienvenida
		height: 100%
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		text-align: center
		padding: 0 26px
		color: var(--color-text-secondary, #6c757d)

		h5
			color: var(--color-text-primary, #212529)
			margin-bottom: 6px

		p
			max-width: 380px
			font-size: .9rem
			margin: 0

			// La segunda línea (lo que el asistente puede cargar, misión
			// asistente-ia-acciones) va apenas separada de la primera: son dos ideas.
			& + p
				margin-top: 6px

	&__bienvenida-avatar
		width: 44px
		height: 44px
		border-radius: 999px
		background: var(--color-primary, #007bff)
		color: #fff
		font-size: 22px
		display: flex
		align-items: center
		justify-content: center
		margin-bottom: 12px
		overflow: hidden

		img
			width: 100%
			height: 100%
			object-fit: cover
			display: block

	// El puente al submódulo cuelga del primer mensaje del asistente (D24). El margen
	// superior era -6px para pegarlo al texto suelto que el asistente tenía antes; con la
	// viñeta (19/8/2026) ese negativo lo mete contra el borde del recuadro, así que va 0.
	&__origen
		align-self: flex-start
		margin: 0 0 14px 0
		padding: 0 2px

	&__demora
		font-size: .8rem
		color: var(--color-text-secondary, #6c757d)
		margin: 0 0 12px 0
		padding: 0 2px

// El deslizamiento del botón se apaga en JS y no acá (ningún media query puede frenar un
// `scrollTo({behavior: 'smooth'})`): lo mira `prefiere_menos_movimiento()`. Esto cubre lo que sí
// es CSS, que es el tinte del hover.
@media (prefers-reduced-motion: reduce)
	.asistente-ia-conversacion-marco__ir-al-final
		transition: none
</style>
