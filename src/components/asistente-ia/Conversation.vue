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

			<!-- `ref="mensajes"`: este div ES el alto del contenido (es la columna flex que
			aloja todas las viñetas), así que observarlo es la forma de enterarse de que el
			hilo creció o encogió SIN que nadie haya scrolleado -- una foto que termina de
			decodificar, una tarjeta que se confirma, el indicador de pensando que se va. Ver
			`arrancar_observador_de_alto()`. -->
			<div
			v-else
			ref="mensajes"
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
			// es lo único que muestra el botón de ir al final. Arranca en false porque una
			// conversación recién abierta arranca abajo de todo (mounted).
			//
			// 🔴 Es un CACHE de una medición del DOM, no una fuente de verdad. Quien decide
			// algo a partir de esto mide primero (`recalcular_lejos_del_final()`): redimensionar
			// el panel, confirmar una tarjeta o una foto que termina de cargar la dejan vieja
			// sin que nadie se entere.
			lejos_del_final: false,
			// Clave del último mensaje de la lista en la pasada anterior. Es lo que distingue
			// "entró algo al final" de "se antepuso una página vieja" (ver el watch).
			clave_del_ultimo_mensaje: null,
		}
	},
	/**
	 * `observador` y `nodo_observado` viven acá y NO en data() a propósito: no son estado de
	 * pantalla, nadie los pinta, y meterlos en data() los haría reactivos para nada.
	 */
	created() {
		this.observador = null
		this.nodo_observado = null
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
			self.arrancar_observador_de_alto()
		})
	},
	/**
	 * El div de los mensajes aparece, desaparece y se re-crea con el `v-if`/`v-else` del
	 * template (mientras carga la primera página hay un <p> de aviso en su lugar), así que la
	 * suscripción se vuelve a atar después de cada redibujo. La guarda de identidad hace que
	 * esto no cueste nada cuando el nodo es el mismo, que es casi siempre.
	 */
	updated() {
		this.sincronizar_observador_de_alto()
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.al_cambiar_el_alto)
		if (this.observador) {
			this.observador.disconnect()
			this.observador = null
		}
		this.nodo_observado = null
	},
	watch: {
		selected_conversation_id() {
			let self = this
			// Al abrir otra conversación, arranca siempre desde abajo (lo más reciente).
			this.$nextTick(function () {
				self.scrollToBottom()
			})
		},
		'messages.length'() {
			let self = this

			// 🔴 PRIMERO SE MIDE, NO SE LEE LA BANDERA GUARDADA, y éste es el único momento en
			// que se puede: en Vue 2 los watchers de usuario se crean antes que el watcher de
			// render, así que tienen id menor y el planificador los corre primero — acá el DOM
			// TODAVÍA no pintó el mensaje que acaba de entrar. O sea que esto contesta
			// exactamente "¿dónde estaba parada la persona cuando esto llegó?".
			//
			// Leer `lejos_del_final` cacheada era un defecto y no un atajo: redimensionar el
			// panel, confirmar una tarjeta o una foto que terminó de decodificar cambian el
			// alto sin disparar ningún `scroll`, y con esa bandera vieja se decidía si
			// arrastrar a la persona o no.
			this.recalcular_lejos_del_final()
			let seguia_el_final = !this.lejos_del_final

			// 🔴 DÓNDE se agregó, que es lo único que separa un mensaje nuevo de una página
			// vieja que se antepone. Acá había un `!this.loading_more` con un comentario que
			// decía que hacía justamente eso, y NO lo hacía: el store llama `prependMessages`
			// y `setLoadingMoreMessages(false)` uno detrás del otro, los dos sincrónicos, y los
			// watchers recién se vuelcan en el flush posterior — cuando esto corre ya vale
			// false siempre. La pregunta de verdad la contesta el último mensaje: si sigue
			// siendo el mismo, lo que entró fue arriba y no hay nada que seguir.
			let ultimo = this.messages.length ? this.messages[this.messages.length - 1] : null
			let clave = ultimo ? (ultimo.local_id || ultimo.id || null) : null
			let hay_algo_nuevo_al_final = clave !== this.clave_del_ultimo_mensaje
			this.clave_del_ultimo_mensaje = clave

			// 🔴 Y si el último mensaje es MÍO, se baja siempre, esté la persona donde esté. El
			// pedido de Lucas es sobre los mensajes que ENTRAN; ningún chat te deja sin ver tu
			// propio mensaje salir. El globo optimista que agrega `sendMessage` entra con
			// `rol: 'user'` y queda último, así que esto lo agarra en el mismo tick en que se
			// escribió.
			let es_mio = Boolean(ultimo && ultimo.rol == 'user')

			// 🔴 ACÁ ESTÁ EL CAMBIO DE COMPORTAMIENTO DEL 22/9/2026, Y ES A PROPÓSITO. Hasta el
			// botón esto era un `scrollToBottom()` pelado: entraba un mensaje y te llevaba al
			// fondo estuvieras donde estuvieras. Con el botón puesto eso pasa a molestar: si
			// estás leyendo más arriba, la respuesta del asistente te sacaba del renglón.
			//
			// 🔴 SI ALGUIEN LO "SIMPLIFICA" DE VUELTA a un scrollToBottom() incondicional,
			// deshace el pedido entero: el botón no llegaría a verse nunca, porque el hilo se
			// autocorregiría al fondo en cada mensaje.
			if (hay_algo_nuevo_al_final && (seguia_el_final || es_mio)) {
				this.$nextTick(function () {
					self.scrollToBottom()
				})
				return
			}

			// No se mueve el scroll, pero el alto cambió: se recalcula con el DOM ya pintado.
			// 🔴 Va SIEMPRE, también cuando la lista ENCOGIÓ. Antes esto vivía adentro de un
			// `new_length > old_length` y ahí quedaba un agujero: al cambiar a una conversación
			// más corta que la anterior (la página es de 30, pasa todo el tiempo) el watch no
			// entraba, nadie recalculaba, y quedabas arriba de todo Y sin el botón que existe
			// justamente para rescatarte.
			this.$nextTick(function () {
				self.recalcular_lejos_del_final()
			})
		},
		hay_respuesta_en_curso(en_curso) {
			let self = this
			// Se mide fresco por el mismo motivo y en el mismo instante que en el watch de
			// arriba (ver el 🔴 largo de ahí): el DOM todavía no pintó el cambio.
			this.recalcular_lejos_del_final()
			let seguia_el_final = !this.lejos_del_final
			// Cuando la respuesta llega, el pendiente se convierte en texto (patch, sin cambiar
			// el largo): también hay que bajar a leerla, si la persona estaba abajo.
			if (!en_curso) {
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
		 * Baja al último mensaje, de un salto.
		 *
		 * 🔴 DE UN SALTO Y NO DESLIZANDO, y no es por no saber hacerlo: hubo una versión con
		 * `scrollTo({behavior: 'smooth'})` y se sacó porque el deslizamiento dispara `scroll`
		 * en cada cuadro, así que el botón reaparecía a mitad de camino. Taparlo pedía una
		 * ventana de tiempo durante la cual el recálculo se ignora — y esa ventana tenía su
		 * propio agujero: si la persona cancela el deslizamiento con la rueda y SE QUEDA
		 * QUIETA, no llega ningún `scroll` más y la bandera queda mal hasta que vuelva a
		 * tocar algo. Un salto no tiene ninguno de esos estados, y es además lo que hace todo
		 * el resto de este componente.
		 *
		 * @returns {void}
		 */
		scrollToBottom() {
			if (!this.$refs.container) {
				return
			}
			this.$refs.container.scrollTop = this.$refs.container.scrollHeight
			// El evento `scroll` va a llegar igual y recalcular, pero llega después: esto deja
			// el botón resuelto en el mismo tick.
			this.recalcular_lejos_del_final()
		},
		/**
		 * Mide contra el DOM si el último mensaje quedó fuera de la vista. Es lo único que
		 * decide si el botón se ve, y no tiene memoria: contesta por el estado de ahora.
		 *
		 * 🔴 Se llama desde todos lados --`mounted`, `scrollToBottom`, los tres watch, el
		 * observador de alto y `on_scroll`-- y no es por las dudas: el evento `scroll` avisa
		 * cuando cambia `scrollTop`, pero NO cuando cambia `scrollHeight` ni `clientHeight`.
		 *
		 * @returns {void}
		 */
		recalcular_lejos_del_final() {
			let container = this.$refs.container
			if (!container) {
				return
			}
			let distancia = container.scrollHeight - container.scrollTop - container.clientHeight
			this.lejos_del_final = distancia > TOLERANCIA_FINAL
		},
		/**
		 * Clic en el botón: al último mensaje.
		 *
		 * @returns {void}
		 */
		ir_al_final() {
			this.scrollToBottom()
		},
		/**
		 * Arranca el observador que avisa cuando el alto cambia SIN que nadie haya scrolleado.
		 *
		 * 🔴 POR QUÉ HACE FALTA, con los tres casos medidos que lo pidieron:
		 *
		 *   1. Una foto que termina de cargar. El <img> de AdjuntosDeMensaje.vue va con
		 *      `loading="lazy"`, `height: auto` y sin `aspect-ratio`: mientras no decodificó
		 *      mide ~10px, y al decodificar el hilo crece ~210px de golpe. El dueño manda una
		 *      foto por WhatsApp con el panel abierto, el watch baja al fondo con la miniatura
		 *      todavía en 10px, y la persona termina POR ENCIMA del último mensaje — que es
		 *      literalmente para lo que existe el botón, y sin esto no aparecía.
		 *   2. Redimensionar el panel con la manija, o la ventana. Cambia `clientHeight` y
		 *      reacomoda todo el texto sin disparar un solo `scroll`.
		 *   3. Confirmar o cancelar una tarjeta de carga (AccionCard.vue): la tarjeta cambia
		 *      de alto en su lugar.
		 *
		 * Se observan DOS nodos y cada uno cubre una cosa: el scroller (su caja cambia cuando
		 * cambia el tamaño del panel) y el div de los mensajes (su alto ES el alto del
		 * contenido). Un `@load` en el <img> habría tapado solo el caso 1.
		 *
		 * 🔴 El callback NO cambia la maquetación --solo escribe `scrollTop` y prende o apaga
		 * un botón `position: absolute`--, así que no puede realimentar al observador.
		 *
		 * @returns {void}
		 */
		arrancar_observador_de_alto() {
			if (typeof window.ResizeObserver != 'function') {
				// Navegador sin ResizeObserver: queda el respaldo del resize de ventana, que
				// cubre la parte gruesa del caso 2. Los otros dos se corrigen igual en cuanto
				// la persona scrollea.
				window.addEventListener('resize', this.al_cambiar_el_alto)
				return
			}
			let self = this
			this.observador = new window.ResizeObserver(function () {
				self.al_cambiar_el_alto()
			})
			if (this.$refs.container) {
				this.observador.observe(this.$refs.container)
			}
			this.sincronizar_observador_de_alto()
		},
		/**
		 * Ata el observador al div de los mensajes de ahora. Ese div va y viene con el
		 * `v-if`/`v-else` del template, así que se revisa después de cada redibujo (`updated`);
		 * la comparación de identidad hace que no cueste nada cuando es el mismo nodo.
		 *
		 * @returns {void}
		 */
		sincronizar_observador_de_alto() {
			if (!this.observador) {
				return
			}
			let nodo = this.$refs.mensajes || null
			if (nodo === this.nodo_observado) {
				return
			}
			if (this.nodo_observado) {
				this.observador.unobserve(this.nodo_observado)
			}
			this.nodo_observado = nodo
			if (nodo) {
				this.observador.observe(nodo)
			}
		},
		/**
		 * Cambió el alto sin que nadie scrollee.
		 *
		 * Si la persona venía siguiendo el final, se la deja pegada abajo mientras el contenido
		 * crece: es lo que tiene que pasar con la foto que acaba de entrar y termina de cargar
		 * --seguía mirando el final, no se movió, y no tiene por qué aparecerle un botón para
		 * volver a donde ya estaba--. Si estaba leyendo más arriba NO se la mueve: solo se
		 * recalcula, que es lo que hace aparecer el botón.
		 *
		 * @returns {void}
		 */
		al_cambiar_el_alto() {
			if (!this.lejos_del_final) {
				this.scrollToBottom()
				return
			}
			this.recalcular_lejos_del_final()
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

// El botón no anima nada por su cuenta --baja de un salto, ver `scrollToBottom()`--, así que lo
// único que hay para apagar acá es el tinte del hover.
@media (prefers-reduced-motion: reduce)
	.asistente-ia-conversacion-marco__ir-al-final
		transition: none
</style>
