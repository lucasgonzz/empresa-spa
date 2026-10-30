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
	va afuera del panel.

	Desde la misión agente-mejoras-uso-real (29/10/2026) el hilo se dibuja como el de
	ia.comerciocity.com (ia-spa/src/views/Chat.vue y chat/ListaMensajes.vue): una columna
	centrada de 48rem que se angosta sola en el sidebar de 380px del informe. -->
	<div class="asistente-ia-conversacion-marco">
		<div
		class="asistente-ia-conversacion"
		ref="container"
		@scroll="on_scroll">
			<div class="asistente-ia-conversacion__columna">
				<!-- Cargando: el punto que late de ia-spa, en el medio. -->
				<div
				v-if="loading"
				class="asistente-ia-conversacion__cargando"
				role="status"
				aria-label="Cargando la conversación">
					<span
					class="asistente-ia-conversacion__pulso"
					aria-hidden="true"></span>
				</div>

				<!-- Conversación en blanco: el saludo de ia-spa. Las sugerencias (lo que el
				asistente puede consultar y lo que puede proponer cargar con una tarjeta, que
				antes contaba este texto) las dibuja el panel junto al compositor, porque al
				tocarlas se mandan. En el sidebar del informe no hay sugerencias: ahí se escribe
				con la caja del informe. -->
				<div
				v-else-if="!messages.length"
				class="asistente-ia-conversacion__bienvenida">
					<pantalla-vacia solo_saludo></pantalla-vacia>
				</div>

				<!-- `ref="mensajes"`: este div ES el alto del contenido (es la columna flex que
				aloja todos los mensajes), así que observarlo es la forma de enterarse de que el
				hilo creció o encogió SIN que nadie haya scrolleado -- una foto que termina de
				decodificar, una tarjeta que se confirma, el indicador de pensando que se va. Ver
				`arrancar_observador_de_alto()`. -->
				<div
				v-else
				ref="mensajes"
				class="asistente-ia-conversacion__mensajes">
					<p
					v-if="loading_more"
					class="asistente-ia-conversacion__aviso"
					role="status">
						Cargando mensajes anteriores…
					</p>
					<template v-for="(message, index) in mensajes_visibles">
						<!-- local_id primero: un mensaje que nació optimista conserva su key al
						confirmarse y Vue no re-monta el nodo (la entrada no parpadea). -->
						<mensaje-del-chat
						:key="message.local_id || message.id"
						:message="message"
						:ultimo="clave_de(message) === clave_del_ultimo_del_agente"
						@retry="reintentar"></mensaje-del-chat>
						<!-- Puente al submódulo que originó la conversación, debajo del primer
						mensaje del asistente (D24): sin markdown no hay links en el texto, el
						botón es de la SPA. Va alineado con el texto de la respuesta, no con el
						avatar. -->
						<div
						v-if="mostrar_boton_de_origen(message, index)"
						:key="'origen-' + (message.id || message.local_id)"
						class="asistente-ia-conversacion__origen">
							<button
							type="button"
							class="asistente-ia-conversacion__boton-origen"
							@click="ir_al_origen">
								<icono
								nombre="externo"
								:tamano="16"></icono>
								<span>{{ texto_boton_de_origen }}</span>
							</button>
						</div>
					</template>

					<pensando-indicator
					v-if="hay_respuesta_en_curso"
					:progreso="progreso_en_curso"></pensando-indicator>

					<!-- Aviso de demora (R8: la cola es compartida con las importaciones). -->
					<div
					v-if="hay_respuesta_en_curso && respuesta_demorada"
					class="asistente-ia-conversacion__demora"
					role="status">
						<icono
						nombre="reloj"
						:tamano="18"></icono>
						<span>
							La respuesta está tardando más de lo normal. Puede haber una importación
							en curso ocupando el servidor.
						</span>
					</div>
				</div>
			</div>
		</div>

		<!-- "Ir al ultimo mensaje" (pedido de Lucas, 22/9/2026). Sale solo cuando la persona
		no esta abajo de todo; el umbral de tolerancia esta en TOLERANCIA_FINAL. Desde la
		misión agente-mejoras-uso-real va centrado justo arriba del compositor, como el
		«bajar» de ia-spa. -->
		<button
		v-if="lejos_del_final"
		type="button"
		class="asistente-ia-conversacion-marco__ir-al-final"
		title="Ir al último mensaje"
		aria-label="Ir al último mensaje"
		data-testid="asistente-bajar-al-ultimo-mensaje"
		@click="ir_al_final">
			<icono
			nombre="flecha_abajo"
			:tamano="18"></icono>
		</button>
	</div>
</template>

<script>
import MensajeDelChat from '@/components/asistente-ia/mensaje/Index'
import PensandoIndicator from '@/components/asistente-ia/PensandoIndicator'
import PantallaVacia from '@/components/asistente-ia/PantallaVacia'
import Icono from '@/components/asistente-ia/Icono'

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
 * el chat (así lo nombran identidad.js y los comentarios del logo del negocio). Éste es el que
 * aparece abajo de la conversación, justo arriba del compositor.
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
		MensajeDelChat,
		PensandoIndicator,
		PantallaVacia,
		Icono,
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
		/**
		 * true mientras el panel flotante espera la primera carga de la bandeja (misión
		 * agente-mejoras-uso-real, ver `bandeja_cargada` en Panel.vue). Hasta que llega no se
		 * sabe si hay una conversación para abrir, así que en vez del saludo de la conversación
		 * en blanco va el "cargando". El sidebar del informe no la pasa: ahí la conversación ya
		 * viene elegida.
		 */
		esperando_bandeja: {
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
		/**
		 * "Cargando la conversación": mientras viaja su primera página o, en el panel, mientras
		 * llega la bandeja sin nada elegido ni en pantalla todavía. Con mensajes ya en pantalla
		 * (se reabre el panel sobre la misma conversación) se los deja ver mientras tanto.
		 */
		loading() {
			if (this.$store.state.ai_chat.loading_messages) {
				return true
			}
			return this.esperando_bandeja && !this.selected_conversation_id && !this.messages.length
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
		 * La clave (la misma del :key) de la última respuesta del agente a la vista. Esa es la
		 * que lleva la barra de acciones (copiar y valorar) siempre visible, como en ia-spa; las
		 * anteriores la muestran al pasar el mouse.
		 *
		 * @returns {String|Number|null}
		 */
		clave_del_ultimo_del_agente() {
			let del_agente = this.mensajes_visibles.filter(m => m.rol == 'assistant')
			if (!del_agente.length) {
				return null
			}
			return this.clave_de(del_agente[del_agente.length - 1])
		},
		/**
		 * La línea de progreso de la respuesta en curso («Buscando las ventas…»), la que el API
		 * escribe en `ai_messages.progreso` antes de cada herramienta (ProgresoIaHelper, misión
		 * app-ia-y-memoria). null si el mensaje pendiente no la trae (API viejo, o todavía no
		 * arrancó ninguna herramienta): ahí el indicador dice "Pensando…".
		 *
		 * @returns {String|null}
		 */
		progreso_en_curso() {
			let pendientes = this.messages.filter(m => m.rol == 'assistant' && m.estado == 'pendiente')
			if (!pendientes.length) {
				return null
			}
			let progreso = pendientes[pendientes.length - 1].progreso
			return progreso && String(progreso).trim() ? String(progreso).trim() : null
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
		 * La clave con la que se dibuja un mensaje (la del :key del template): el local_id del
		 * optimista si lo tiene, si no el id.
		 *
		 * @param {Object} message
		 * @returns {String|Number|null}
		 */
		clave_de(message) {
			return message ? (message.local_id || message.id || null) : null
		},
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
@import '@/components/asistente-ia/_tokens'

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
// panel flotante y `.sidebar-conversacion` en el informe del mostrador--. Si se queda solo en el
// scroller, este marco crece con el contenido, el hilo deja de scrollear y el composer se va
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
	color: var(--ia-texto)
	font-family: var(--ia-fuente)

	// "Ir al último mensaje" (pedido de Lucas, 22/9/2026): el «bajar» de ia-spa, un círculo
	// centrado justo arriba del compositor (el borde de abajo de este marco ES el borde de
	// arriba del compositor).
	//
	// Centrado ya no choca con la franja de la derecha (la barra de scroll que reserva el
	// `scrollbar-gutter` y, en el panel flotante, la manija de 6px del borde): el botón quedaba a
	// 22px del borde justamente para no caer debajo de las dos, y en el medio no hay nada.
	&__ir-al-final
		position: absolute
		left: 50%
		bottom: 12px
		transform: translateX(-50%)
		z-index: 1
		width: 36px
		height: 36px
		padding: 0
		display: inline-flex
		align-items: center
		justify-content: center
		border: 1px solid var(--ia-borde-fuerte)
		border-radius: 50%
		background: var(--ia-bg)
		color: var(--ia-texto)
		cursor: pointer
		// 🔴 Explícito y no heredado: `common-vue/sass/_inputs.sass` le pone a TODO <button>
		// del sistema una sombra diagonal (`1.95px 1.95px`), que es chasis de formulario. Acá
		// hace falta la sombra pareja de la píldora flotante de ia-spa. Gana por especificidad
		// (0,2,0 contra 0,0,1), así que no depende del orden en que quede la hoja final.
		box-shadow: var(--ia-sombra-flotante)
		transition: background var(--ia-transicion)

		&:hover
			background: var(--ia-bg-hover)

		&:focus
			outline: none

		&:focus-visible
			outline: 2px solid var(--ia-foco)
			outline-offset: 2px

.asistente-ia-conversacion
	flex: 1
	min-height: 0
	overflow-y: auto
	overflow-x: hidden
	overscroll-behavior: contain
	// Reserva siempre el lugar de la barra de scroll (misión asistente-ia-acciones). Sin esto,
	// cuando la conversación empieza a scrollear aparece la barra, se come su ancho y los
	// renglones de las tarjetas de carga (AccionCard.vue, que se acomodan por el ancho del
	// contenedor) pueden saltar de una a dos líneas en el sidebar de 380px o a ~360px. Con
	// barras superpuestas (teléfonos, macOS) no reserva nada, que es lo correcto.
	scrollbar-gutter: stable
	// Columna flex para que la columna de lectura pueda estirarse al alto entero y el saludo y
	// el "cargando" queden en el medio.
	display: flex
	flex-direction: column

	// La columna de lectura de ia-spa (`.principal__columna`, 48rem + aire), centrada.
	//
	// 🔴 HASTA EL 29/10/2026 ESTE TOPE ERA DE 900px (decisión de Lucas del 19/8/2026, "900 y no
	// 640": que estirar el panel agrande la conversación). Lo cambió el pedido de Lucas de que la
	// ventana tenga el diseño de ia.comerciocity.com, que lee en la columna de ChatGPT: 48rem de
	// texto, ~816px con el aire. Estirar el panel sigue agrandando la conversación hasta ese tope
	// (con el ancho por defecto de 984 la columna ni lo alcanza); de ahí en más queda margen,
	// como en ChatGPT, porque un renglón más largo se lee peor.
	&__columna
		+asistente-ia-columna
		flex: 1 0 auto
		display: flex
		flex-direction: column

	// La lista de mensajes de ia-spa (chat/ListaMensajes.vue): 18px entre mensaje y mensaje.
	&__mensajes
		display: flex
		flex-direction: column
		gap: 18px
		padding: 12px 0 28px 0

	&__aviso
		text-align: center
		color: var(--ia-texto-3)
		margin: 0
		font-size: .86rem

	&__cargando
		flex: 1
		display: flex
		align-items: center
		justify-content: center
		padding: 60px 0

	// El punto que late de ia-spa mientras carga la conversación.
	&__pulso
		width: 12px
		height: 12px
		border-radius: 50%
		background: var(--ia-texto)
		animation: asistente-ia-conversacion-pulso 1.3s ease-in-out infinite

	// El saludo de la conversación en blanco, en el medio del alto que hay.
	&__bienvenida
		flex: 1
		display: flex
		align-items: center
		justify-content: center
		padding: 24px 0

	// El puente al submódulo cuelga del primer mensaje del asistente (D24), alineado con el texto
	// de la respuesta: el avatar mide 30px y el espacio 14px (ver mensaje/MensajeAgente.vue).
	&__origen
		align-self: flex-start
		margin: -8px 0 0 44px

	&__boton-origen
		+asistente-ia-boton-secundario
		min-height: 32px
		padding: 0 14px
		font-size: .86rem

	// El aviso de demora, como el de ia-spa: un recuadro suave alineado con las respuestas.
	&__demora
		display: flex
		align-items: center
		gap: 10px
		margin-left: 44px
		padding: 10px 14px
		border-radius: 14px
		background: var(--ia-bg-sutil)
		color: var(--ia-texto-2)
		font-size: .9rem
		line-height: 1.45

		.asistente-ia-icono
			flex-shrink: 0

// En el teléfono el avatar de las respuestas mide 26px y el espacio 10px: el puente y el aviso
// se corren a la par.
@media screen and (max-width: 767px)
	.asistente-ia-conversacion__origen
		margin-left: 36px

	.asistente-ia-conversacion__demora
		margin-left: 0

@keyframes asistente-ia-conversacion-pulso
	0%, 100%
		transform: scale(.85)
		opacity: .55
	50%
		transform: scale(1)
		opacity: 1

@media (prefers-reduced-motion: reduce)
	.asistente-ia-conversacion-marco__ir-al-final
		transition: none

	.asistente-ia-conversacion__pulso
		animation: none
</style>
