<template>
	<div
	v-if="chat"
	class="whatsapp-composer">
		<!-- Chat en simulación: el backend FRENA todo envío de texto hacia WhatsApp mientras el
		último entrante sea simulado. Sin este aviso el operador escribía, apretaba enviar, la
		fila se guardaba y no salía nada: fallaba en silencio.

		🔴 Solo el título. El párrafo de detalle que estaba acá abajo (cinco renglones
		explicando la ventana de 24 h forzada) se sacó por pedido de Lucas el 24/8/2026: comía
		alto de la conversación en un panel que ya es angosto. Lo que hacía falta saber para no
		mandar un mensaje creyendo que sale está en esta línea, en el `title` de abajo, en el
		placeholder del input y en el badge del header. -->
		<div
		v-if="en_simulacion"
		class="whatsapp-composer__simulacion"
		title="El último mensaje entrante lo inyectaste vos desde &quot;Simular mensaje&quot;, así que la ventana de 24 h está forzada. Lo que mandes se guarda y se ve acá, pero al cliente no le llega. Se destraba solo en cuanto el cliente escriba de verdad.">
			<i class="bi bi-cone-striped"></i>
			Chat en simulación: los envíos a WhatsApp están frenados
		</div>

		<!-- Arriba del input y en su propia fila, que es donde Lucas lo quiere. Gateado por el
		toggle chat_simulation_enabled: apagado por default, así los clientes ya activos no ven un
		botón nuevo que no pidieron. -->
		<div
		v-if="is_owner && config && config.chat_simulation_enabled"
		class="whatsapp-composer__toolbar">
			<b-button
			size="sm"
			variant="outline-warning"
			class="whatsapp-composer__simular-btn"
			title="Inyecta un mensaje como si lo hubiera escrito el cliente. No le llega nada a nadie."
			@click="$bvModal.show('whatsapp-simulate-in-chat')">
				<i class="bi bi-cone-striped"></i>
				Simular mensaje del cliente
			</b-button>
		</div>

		<!-- El input real nunca se ve: lo abre el botón de arriba. Es el mismo camino que usa el
		molde de admin-spa. `accept` es la lista blanca de imágenes que acepta la Cloud API; no es
		una validación (el navegador la puede ignorar), es para que el explorador de archivos no
		le ofrezca al operador algo que el backend va a rechazar. -->
		<input
		ref="file_input"
		type="file"
		class="d-none"
		accept="image/png,image/jpeg,image/webp,image/gif"
		@change="on_file_change">

		<!-- Previsualización de la foto elegida, con su epígrafe. Mientras está armada, el
		operador ve exactamente lo que va a salir; recién con "Enviar" viaja. -->
		<div
		v-if="adjunto"
		class="whatsapp-composer__adjunto">
			<img
			:src="adjunto_preview_url"
			class="whatsapp-composer__adjunto-preview"
			alt="Imagen a enviar">
			<div class="whatsapp-composer__adjunto-datos">
				<span
				class="whatsapp-composer__adjunto-nombre"
				:title="adjunto.name">
					{{ adjunto.name }}
				</span>
				<b-form-input
				v-model="epigrafe"
				size="sm"
				placeholder="Epígrafe (opcional)"
				@keydown.enter="enviar_adjunto"></b-form-input>
				<div class="whatsapp-composer__adjunto-acciones">
					<btn-loader
					text="Enviar"
					:loader="enviando_adjunto"
					:block="false"
					size="sm"
					@clicked="enviar_adjunto"></btn-loader>
					<b-button
					size="sm"
					variant="outline-secondary"
					:disabled="enviando_adjunto"
					@click="cancelar_adjunto">
						Cancelar
					</b-button>
				</div>
			</div>
		</div>

		<div class="whatsapp-composer__input-row">
			<!-- El clip vive ACÁ, en la misma fila que el input y los dos botones, y no arriba en
			una barra aparte: es el orden de la aplicación de WhatsApp y es lo que Lucas pidió. Va
			pelado (sin borde ni fondo de botón) por la misma razón. Abre el mismo
			`$refs.file_input` de siempre; el flujo de previsualización con epígrafe no cambió. -->
			<button
			type="button"
			class="whatsapp-composer__clip"
			:disabled="enviando_adjunto"
			title="Adjuntar una foto"
			@click="abrir_selector_de_imagen">
				<i class="bi bi-paperclip"></i>
			</button>

			<!--
			🔴 `<textarea>` NATIVO y no `<b-form-textarea>`, y no es una preferencia de estilo.

			El pedido es que el input arranque en UN renglón y crezca hasta CINCO. El auto-alto de
			bootstrap-vue no puede hacer lo primero: su `computedMinRows` es
			`mathMax(toInteger(rows, 2), 2)` (verificado en
			`node_modules/bootstrap-vue/src/components/form-textarea/form-textarea.js:89-93`), o
			sea que **fuerza un piso de 2 renglones** con el comentario de que "un valor de 1 da
			problemas en algunos navegadores". Su `computeHeight()` repite el piso en el cálculo
			del contenido. Con `rows="1" max-rows="5"` el campo arrancaría igual en dos renglones,
			sin ningún error a la vista: se veía bien y no era lo que se pidió.

			De paso, ese mismo modo automático le pone `overflow-y: scroll` FIJO al elemento (línea
			84 del mismo archivo), así que la cápsula mostraría la barra de scroll siempre, incluso
			vacía.

			El alto lo maneja `ajustar_alto()`, que mide el `scrollHeight` real y lo acota a cinco
			renglones. Son veinte líneas y hacen exactamente lo que Lucas pidió.
			-->
			<textarea
			v-if="!audio_recording"
			ref="textarea"
			v-model="text"
			id="whatsapp-composer-text"
			class="form-control whatsapp-composer__texto"
			rows="1"
			:placeholder="placeholder"
			@keydown.enter="onKeydownEnter"></textarea>

			<!-- Mientras graba, esta franja REEMPLAZA al textarea (no se agrega al lado): en un
			teléfono de 360px las dos cosas juntas no entran, y escribir mientras se graba no es
			un flujo real. Cancelar es un botón y no un deslizamiento porque el molde tampoco
			tiene "cancelar deslizando" y escribirlo desde cero no está en el pedido. -->
			<div
			v-else
			class="whatsapp-composer__grabando">
				<span class="whatsapp-composer__grabando-punto"></span>
				<span class="whatsapp-composer__grabando-reloj">
					{{ audio_elapsed_label }}
				</span>
				<span class="whatsapp-composer__grabando-ayuda">
					Grabando nota de voz
				</span>
				<button
				type="button"
				class="btn btn-sm btn-link whatsapp-composer__grabando-cancelar"
				@click="cancel_audio_recording">
					Cancelar
				</button>
			</div>

			<!--
			🔴 Botón HTML pelado y no <b-button> a propósito: acá cuelgan los seis manejadores
			del gesto (touch y mouse) y la grabación tiene que arrancar SINCRÓNICAMENTE adentro
			del touchstart, si no en iOS la nota sale muda. Un componente en el medio es una capa
			más entre el gesto real y `audioContext.resume()`, y no hay nada que ganar: las
			clases de Bootstrap 4 dan el mismo botón.
			-->
			<button
			type="button"
			class="whatsapp-composer__mic"
			:class="{'whatsapp-composer__mic--grabando': audio_recording}"
			:disabled="enviando_adjunto"
			:title="titulo_microfono"
			@click="on_audio_click"
			@mousedown="on_audio_mousedown"
			@mouseup="on_audio_mouseup_or_leave"
			@mouseleave="on_audio_mouseup_or_leave"
			@touchstart.prevent="on_audio_touchstart"
			@touchend.prevent="on_audio_touchend"
			@touchcancel.prevent="on_audio_touchcancel">
				<i
				class="bi"
				:class="audio_recording ? 'bi-stop-circle-fill' : 'bi-mic'"></i>
			</button>

			<!-- Círculo verde con la flecha, como el de WhatsApp. La clase cae en la raíz del
			componente (en Vue 2 el `class` del padre se hereda al elemento raíz del hijo), que es
			el propio <button> de bootstrap-vue. -->
			<btn-loader
			v-if="!audio_recording"
			class="whatsapp-composer__send"
			:loader="sending"
			:block="false"
			icon_class="bi bi-send-fill"
			variant="success"
			@clicked="send"></btn-loader>
		</div>

		<templates-modal
		:chat="chat"></templates-modal>
		<simulate-in-chat-modal
		:chat="chat"></simulate-in-chat-modal>
	</div>
</template>
<script>
import TemplatesModal from '@/components/whatsapp/conversation/TemplatesModal'
import SimulateInChatModal from '@/components/whatsapp/conversation/SimulateInChatModal'
import audio_recorder_button from '@/mixins/audio_recorder_button'

/**
 * Tope local de una imagen, en bytes. Está duplicado a propósito con el del backend: el de
 * acá evita el viaje inútil de subir 8 MB para que los rechacen, pero el que manda es el del
 * backend, porque este se puede saltear. Es el límite real de la Cloud API de Meta.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

/**
 * Tope de alto del input, en renglones. Lo pidió Lucas así: el campo arranca en uno y crece
 * hasta cinco; a partir de ahí el texto scrollea adentro en vez de seguir comiéndose la
 * conversación. Es el mismo tope que usa la aplicación de WhatsApp.
 */
const MAX_RENGLONES = 5

export default {
	components: {
		TemplatesModal,
		SimulateInChatModal,
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	/*
		El mixin trae el ciclo completo del botón de grabar: los seis manejadores del gesto, el
		cronómetro y el grabador ogg/opus. Este componente solo cumple su contrato:
		`on_audio_blob(blob)` (obligatorio), `can_record_audio()` y `on_audio_error(message)`.

		Ojo con los hooks: el mixin define su propio `beforeDestroy` (cancela la grabación para
		que ninguna vista deje el micrófono abierto). En Vue 2 el hook del mixin y el del
		componente corren LOS DOS —primero el del mixin—, así que el `beforeDestroy` de abajo no
		lo pisa. Si se quisiera reemplazar, habría que sacarlo del mixin.
	*/
	mixins: [audio_recorder_button],
	data() {
		return {
			text: '',
			sending: false,

			// Foto elegida con el clip y todavía no enviada (null = no hay ninguna armada).
			adjunto: null,
			// objectURL de la previsualización. Se revoca SIEMPRE que se suelta el archivo:
			// un objectURL vivo le sostiene el blob entero en memoria al navegador.
			adjunto_preview_url: '',
			// Epígrafe de la foto (viaja como `caption`; el audio no lleva).
			epigrafe: '',
			// true mientras un adjunto está viajando (bloquea el clip y los dos botones).
			enviando_adjunto: false,
		}
	},
	computed: {
		// El getter del store hace exactamente esto y ya existía; este computed estaba copiado
		// byte por byte también en conversation/Index.vue y en Header.vue.
		chat() {
			return this.$store.getters['whatsapp_chat/selected_chat']
		},
		/**
		 * Id de la conversación abierta. Se lee del state y NO de `chat.id` a propósito: cuando se
		 * salta a un chat que todavía no está en la bandeja (link directo, o un chat recién
		 * creado), el getter devuelve null por un instante, y un watch colgado de `chat` no vería
		 * el cambio hasta que la bandeja termine de llegar. Es el mismo computed que mira
		 * `Messages.vue`.
		 *
		 * @returns {number|null}
		 */
		chat_id() {
			return this.$store.state.whatsapp_chat.selected_chat_id
		},
		/**
		 * El borrador que le dejaron a esta conversación (`{chat_id, texto}` o null): lo escriben
		 * el botón de una oferta y "Sugerir respuesta" del header. Ver `tomar_borrador()`.
		 *
		 * Se expone como computed —y no se lee solo adentro del método— porque hace falta que
		 * sea REACTIVO: hay un caso en el que este componente ya existe y el chat abierto no
		 * cambia, así que el único aviso de que llegó un borrador nuevo es que este valor
		 * cambió. Ver el watch de abajo y el docblock de `tomar_borrador()`.
		 *
		 * @returns {Object|null}
		 */
		borrador() {
			return this.$store.state.whatsapp_chat.borrador
		},
		/**
		 * El chat abierto está en modo simulación (ver el getter en `store/whatsapp_chat.js`:
		 * se resuelve mirando el último entrante cargado, que es lo único que el broadcast
		 * mantiene al día).
		 */
		en_simulacion() {
			return this.$store.getters['whatsapp_chat/chat_en_simulacion']
		},
		/**
		 * En simulación el placeholder también lo dice: el aviso de arriba se puede pasar por
		 * alto, el cursor no.
		 */
		placeholder() {
			if (this.en_simulacion) {
				return 'Simulación: lo que escribas se guarda pero no le llega al cliente'
			}
			return 'Escribí un mensaje (Enter para enviar, Shift+Enter para salto de línea)'
		},
		/**
		 * Ayuda del micrófono. El botón tiene dos semánticas y ninguna se ve mirándolo, así que
		 * se explican acá: un toque corto empieza a grabar y deja grabando (el próximo toque
		 * corta y manda), y mantenerlo apretado graba mientras esté apretado (walkie-talkie).
		 *
		 * @returns {string}
		 */
		titulo_microfono() {
			if (this.audio_recording) {
				return 'Grabando ' + this.audio_elapsed_label + '. Tocá para cortar y enviar'
			}
			return 'Tocá para grabar una nota de voz, o mantené apretado para grabar mientras lo apretás'
		},
		/**
		 * Config del agente (mismo patrón que usa `whatsapp/config/AgentConfig.vue`): de acá se
		 * lee `chat_simulation_enabled` para gatear el botón de simular del toolbar.
		 *
		 * @returns {Object|null}
		 */
		config() {
			return this.$store.state.whatsapp_bot_config.models[0] || null
		},
	},
	watch: {
		/**
		 * 🔴 Todo lo que el operador tiene a medio armar es de la conversación que está abierta:
		 * al saltar a otra, se tira.
		 *
		 * Sin esto, la foto elegida con el clip para el cliente A seguía armada en la
		 * previsualización después de clickear al cliente B en la bandeja —que queda visible al
		 * lado del sidebar justamente para poder saltar de un chat a otro—, y como
		 * `enviar_adjunto()` resuelve `this.chat.id` recién en el momento de mandar, la foto de un
		 * cliente le salía a otro. Con la nota de voz era peor todavía: el micrófono seguía abierto
		 * durante el cambio y el audio grabado para A se enviaba a B.
		 *
		 * Es la misma omisión que `Messages.vue` ya tenía resuelta con su propio `watch: chat_id`.
		 * El arreglo va acá y no con un `:key` en `conversation/Index.vue` porque recrear el árbol
		 * entero en cada salto se llevaría puestos el scroll de la conversación y el modal de
		 * plantillas, para limpiar un estado que es de este componente y de nadie más.
		 */
		chat_id() {
			/*
				Cancelar cierra el micrófono de verdad (`_force_release()` corta los tracks del
				stream) y descarta lo grabado: con `cancel()` el blob nunca llega a
				`on_audio_blob`. Se llama sin condición porque también limpia el temporizador del
				"mantener apretado", que puede estar por arrancar una grabación.
			*/
			this.cancel_audio_recording()
			this.cancelar_adjunto()
			/*
				Decisión tomada a conciencia: el borrador de TEXTO también se limpia, aunque
				arrastrarlo de un chat a otro sea anterior a esta misión y no una regresión nuestra.
				Un mensaje escrito para el cliente A no puede quedar cargado en el input con el
				cliente B abierto: es el mismo accidente que el de la foto, a un Enter de distancia.
				Y como en el sistema no hay borradores por chat en ningún lado, tirar la foto pero
				dejar el texto sería el más confuso de los tres comportamientos posibles.
			*/
			this.text = ''
			// Y recién DESPUÉS de esa limpieza se toma el borrador, si es de este chat: al revés
			// se pisaría solo. Ver el docblock de tomar_borrador().
			this.tomar_borrador()
		},
		/**
		 * Llegó (o se consumió) un borrador con el componente ya montado.
		 *
		 * 🔴 ESTE ES EL CASO QUE FALTABA Y EL QUE ROMPÍA: el sidebar ya abierto en ESTA MISMA
		 * conversación. Ahí `selected_chat_id` se vuelve a commitear con el valor que ya tenía,
		 * la mutación no cambia nada y Vue no dispara el watch de `chat_id`; y el componente ya
		 * existe, así que tampoco hay `created()`. El operador con dos ofertas activas del mismo
		 * cliente apretaba el ícono de la segunda y en pantalla seguía escrito el mensaje de la
		 * primera: un Enter y le mandaba la oferta equivocada, con 201 y aviso de éxito.
		 *
		 * 🔴 VA EN `$nextTick` Y NO DERECHO, y no es cosmético. Cuando el chat SÍ cambia (el
		 * caso del sidebar abierto en otra conversación), este watch y el de `chat_id` se
		 * disparan los dos en la misma vuelta del scheduler, y el orden entre ellos depende de
		 * en qué orden se declararon. Si este corriera primero y sin diferir, tomaría el
		 * borrador y acto seguido el watch de `chat_id` lo borraría con su `this.text = ''`,
		 * dejando el composer vacío. Diferir a `$nextTick` lo saca de esa carrera: el callback
		 * corre después de TODOS los watchers de esa vuelta, así que para entonces la limpieza
		 * de `chat_id` ya pasó (y si ese watch ya consumió el borrador, acá no queda nada que
		 * hacer y `tomar_borrador()` sale por su guarda). No lo "simplifiques" sacándole el
		 * nextTick.
		 */
		borrador() {
			this.$nextTick(this.tomar_borrador)
		},
		/**
		 * Se anota a qué conversación pertenece la grabación que arranca.
		 *
		 * Hace falta porque `cancel_audio_recording()` no alcanza en una ventana chica pero real:
		 * si el operador ya soltó el micrófono, el grabador queda en estado 'stopping' (esperando
		 * la duración mínima y el cierre del encoder) y ahí `cancel()` es un no-op a propósito
		 * —ver `oggOpusRecorder.js`—, así que el blob igual va a llegar. Si en ese segundo el
		 * operador cambió de chat, `on_audio_blob` lo descarta comparando contra esta marca.
		 *
		 * @param {boolean} esta_grabando
		 */
		audio_recording(esta_grabando) {
			if (esta_grabando) {
				this._chat_de_la_grabacion = this.chat_id
			} else {
				// La franja de grabación REEMPLAZA al textarea (`v-if`/`v-else`), así que al
				// soltar el micrófono el campo se vuelve a crear desde cero, con el alto de un
				// renglón y el texto que hubiera quedado escrito. Sin esto, un borrador de tres
				// líneas reaparecía recortado a una.
				this.$nextTick(this.ajustar_alto)
			}
		},
		/**
		 * El alto del input sigue al contenido. Va como watch de `text` y no como `@input` del
		 * elemento porque el texto también cambia POR CÓDIGO —la sugerencia de la IA, el borrador
		 * de una oferta, el reset después de enviar— y por esos caminos no hay ningún `input` que
		 * escuchar: el campo se quedaba con el alto viejo.
		 */
		text() {
			this.$nextTick(this.ajustar_alto)
		},
	},
	created() {
		/*
			Chat dueño de la grabación en curso. No va en `data()` porque no lo lee ningún template
			—misma razón por la que el mixin deja afuera las marcas del gesto.
		*/
		this._chat_de_la_grabacion = null
		/*
			Observador del ancho del composer y último ancho visto. Tampoco van en `data()`: no
			los lee ningún template, y un ResizeObserver metido en el sistema de reactividad de
			Vue 2 se convertiría en un objeto observado sin ninguna necesidad.
		*/
		this._observador_de_ancho = null
		this._ancho_observado = 0
		this.tomar_borrador()
	},
	mounted() {
		// El composer puede nacer con texto adentro (el borrador que tomó `created()`), así que
		// el alto se ajusta ya en el primer dibujo y no recién a la primera tecla.
		this.ajustar_alto()
		this.observar_ancho()
	},
	beforeDestroy() {
		// El sidebar destruye este componente cada vez que se cierra: si la previsualización
		// quedaba armada, su objectURL se filtraba con el blob de la foto adentro.
		this.soltar_adjunto()
		this.dejar_de_observar_ancho()
	},
	methods: {
		/**
		 * Vigila el ANCHO del composer para recalcular el alto del input.
		 *
		 * 🔴 No alcanza con el watch de `text`. El panel del sidebar es redimensionable
		 * arrastrando su borde izquierdo (`sidebar/Index.vue`, `on_resize`), y ese arrastre no
		 * dispara ningún evento del textarea ni `resize` de la ventana: cambia el ancho del
		 * panel por estilo inline. Con tres renglones escritos y el panel angostándose, el texto
		 * se reacomoda a cinco pero el campo se queda con el alto de tres y recorta lo que el
		 * operador está escribiendo, hasta la próxima tecla.
		 *
		 * 🔴 Se compara el ancho contra el anterior y se sale si no cambió. El observer también
		 * se dispara cuando `ajustar_alto()` cambia el ALTO —que es lo que este mismo callback
		 * acaba de hacer—, y sin ese corte cada ajuste agenda otro: no es un bucle infinito
		 * (converge cuando el alto se estabiliza), pero le hace ruido a la consola con el
		 * "ResizeObserver loop completed with undelivered notifications" de Chrome.
		 *
		 * `ResizeObserver` se chequea antes de usarlo: si el navegador no lo tiene, se pierde
		 * solo este recálculo y todo lo demás sigue andando.
		 *
		 * @returns {void}
		 */
		observar_ancho() {
			let self = this
			if (typeof ResizeObserver === 'undefined' || !this.$el) {
				return
			}
			this._ancho_observado = this.$el.offsetWidth
			this._observador_de_ancho = new ResizeObserver(function () {
				let ancho = self.$el ? self.$el.offsetWidth : 0
				if (ancho === self._ancho_observado) {
					return
				}
				self._ancho_observado = ancho
				self.ajustar_alto()
			})
			this._observador_de_ancho.observe(this.$el)
		},
		/**
		 * @returns {void}
		 */
		dejar_de_observar_ancho() {
			if (this._observador_de_ancho) {
				this._observador_de_ancho.disconnect()
				this._observador_de_ancho = null
			}
		},
		/**
		 * Enter solo (sin Shift) envía el mensaje; Shift+Enter deja pasar el salto de línea normal.
		 *
		 * @param {KeyboardEvent} event
		 */
		/**
		 * Ajusta el alto del input al contenido: arranca en un renglón y crece hasta cinco, y a
		 * partir de ahí el texto scrollea adentro.
		 *
		 * 🔴 El `height = 'auto'` de antes de medir no se puede sacar. `scrollHeight` nunca es
		 * menor que el alto que el elemento ya tiene puesto, así que midiendo sin resetear el
		 * campo crece y **no se vuelve a achicar nunca**: borrar cuatro líneas dejaba el input
		 * igual de alto, comiéndose la conversación hasta recargar la página.
		 *
		 * El `line-height` se lee computado y no del SASS para que siga valiendo si mañana alguien
		 * cambia la tipografía del composer; el fallback cubre el `normal` que devuelven algunos
		 * navegadores cuando el valor es relativo y el elemento todavía no se dibujó.
		 *
		 * @returns {void}
		 */
		ajustar_alto() {
			let el = this.$refs.textarea
			// Mientras el micrófono está abierto el textarea no existe (lo reemplaza la franja de
			// grabación), y el watch de `text` puede correr igual.
			if (!el) {
				return
			}
			let estilo = window.getComputedStyle(el)
			let borde = parseFloat(estilo.borderTopWidth) + parseFloat(estilo.borderBottomWidth)
			let relleno = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom)
			let alto_renglon = parseFloat(estilo.lineHeight)
			if (isNaN(alto_renglon)) {
				alto_renglon = parseFloat(estilo.fontSize) * 1.4
			}
			let maximo = (alto_renglon * MAX_RENGLONES) + relleno + borde
			el.style.height = 'auto'
			// `scrollHeight` trae el relleno pero no el borde, y el elemento es `border-box`
			// (Bootstrap lo aplica a todo): sin sumarlo, el campo queda dos píxeles corto y
			// aparece un scroll de una línea con el texto justo.
			let alto = el.scrollHeight + borde
			el.style.height = Math.min(alto, maximo) + 'px'
			// La barra solo cuando de verdad hay algo que scrollear: en la cápsula, una barra
			// permanente se ve siempre y desentona con el resto.
			el.style.overflowY = alto > maximo ? 'auto' : 'hidden'
		},
		onKeydownEnter(event) {
			if (!event.shiftKey) {
				event.preventDefault()
				this.send()
			}
		},
		send() {
			let body = this.text.trim()
			if (!body || !this.chat) {
				return
			}
			this.sending = true
			this.$store.dispatch('whatsapp_chat/sendMessage', {
				chat_id: this.chat.id,
				body: body,
			})
			.then(() => {
				this.sending = false
				this.text = ''
			})
			.catch(err => {
				this.sending = false
				this.manejar_error_de_envio(err, 'No se pudo enviar el mensaje')
			})
		},
		/**
		 * Manejo común del error de cualquier envío del composer (texto, foto o nota de voz).
		 *
		 * Está factorizado porque el caso de la ventana de 24 h no es un error más: cuando el
		 * backend contesta 422 con `code: 'fuera_de_ventana'` hay que abrirle al operador el
		 * modal de plantillas, que es el único camino que deja Meta para retomar una
		 * conversación fría. Copiarlo en cada envío es garantizar que el tercero se olvide.
		 *
		 * @param {Error} err Error de axios.
		 * @param {string} texto_por_defecto Mensaje a mostrar si el backend no mandó uno.
		 * @returns {void}
		 */
		manejar_error_de_envio(err, texto_por_defecto) {
			console.log(err)
			let data = err.response && err.response.data
			if (err.response && err.response.status == 422 && data && data.code == 'fuera_de_ventana') {
				this.$toast.error(
					'Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite retomar la conversación con una plantilla.',
					{ duration: 8000 }
				)
				this.$bvModal.show('whatsapp-templates')
				return
			}
			this.$toast.error((data && data.message) || texto_por_defecto)
		},
		/**
		 * Abre el explorador de archivos del sistema. El `<input type="file">` está escondido
		 * con `d-none` porque su estilo nativo no se puede tocar y no pega con el resto.
		 *
		 * @returns {void}
		 */
		abrir_selector_de_imagen() {
			if (this.enviando_adjunto || !this.$refs.file_input) {
				return
			}
			this.$refs.file_input.click()
		},
		/**
		 * Toma la foto elegida, la valida y arma la previsualización.
		 *
		 * El `value = ''` del input al final no es cosmético: sin él, elegir dos veces seguidas
		 * el MISMO archivo no dispara un segundo `change` (el valor no cambió), así que después
		 * de cancelar un envío el clip parecía no responder.
		 *
		 * @param {Event} event
		 * @returns {void}
		 */
		on_file_change(event) {
			let file = event.target.files && event.target.files[0]
			event.target.value = ''
			if (!file) {
				return
			}
			if (file.size > MAX_IMAGE_BYTES) {
				this.$toast.error('La imagen no puede pesar más de 5 MB.')
				return
			}
			this.soltar_adjunto()
			this.adjunto = file
			this.adjunto_preview_url = URL.createObjectURL(file)
			this.epigrafe = ''
		},
		/**
		 * Manda la foto armada con su epígrafe.
		 *
		 * @returns {void}
		 */
		enviar_adjunto() {
			let self = this
			if (!this.adjunto || !this.chat || this.enviando_adjunto) {
				return
			}
			this.enviando_adjunto = true
			this.$store.dispatch('whatsapp_chat/sendMedia', {
				chat_id: this.chat.id,
				file: this.adjunto,
				caption: this.epigrafe,
			})
			.then(function (data) {
				self.enviando_adjunto = false
				self.cancelar_adjunto()
				self.avisar_si_no_salio(data)
			})
			.catch(function (err) {
				self.enviando_adjunto = false
				self.manejar_error_de_envio(err, 'No se pudo enviar la imagen')
			})
		},
		/**
		 * El backend contesta 201 con `enviado: false` en DOS casos distintos: WhatsApp rechazó
		 * el archivo, o el chat está en simulación (donde el envío se frena a propósito y no
		 * falló nada). Sin distinguirlos, simular una conversación —que es un flujo normal del
		 * dueño— tiraba un "WhatsApp lo rechazó" que era mentira. La simulación ya se avisa con
		 * el cartel de arriba del composer, así que acá se calla.
		 *
		 * @param {Object} data Respuesta del backend, { model, enviado }.
		 * @returns {void}
		 */
		avisar_si_no_salio(data) {
			if (!data || data.enviado !== false || this.en_simulacion) {
				return
			}
			this.$toast.warning(
				'El archivo se guardó en la conversación pero WhatsApp lo rechazó.',
				{ duration: 8000 }
			)
		},
		/**
		 * Descarta la foto armada sin mandarla.
		 *
		 * @returns {void}
		 */
		cancelar_adjunto() {
			this.soltar_adjunto()
			this.epigrafe = ''
		},
		/**
		 * Suelta el archivo y revoca su objectURL. Es el único lugar del componente que revoca:
		 * llamarlo de más es inofensivo (revocar una URL vacía no hace nada), olvidarlo deja la
		 * imagen entera colgada en memoria hasta recargar la página.
		 *
		 * @returns {void}
		 */
		soltar_adjunto() {
			if (this.adjunto_preview_url) {
				URL.revokeObjectURL(this.adjunto_preview_url)
			}
			this.adjunto_preview_url = ''
			this.adjunto = null
		},
		/**
		 * Contrato del mixin `audio_recorder_button` (obligatorio): llega el Blob 'audio/ogg' ya
		 * cerrado y válido, y este componente decide qué hacer con él. Acá se manda derecho: la
		 * nota de voz no tiene previsualización a propósito, porque el gesto que la produce
		 * ("soltá y sale") es el de WhatsApp y meterle un paso de confirmación en el medio lo
		 * rompe. Para descartarla está Cancelar, que corta antes de que exista el blob.
		 *
		 * Va envuelto en un `File` y no como Blob pelado porque el backend lee
		 * `$request->file('file')`: un Blob sin nombre viaja en el multipart sin `filename`, y
		 * PHP lo toma como campo de texto, no como archivo subido. El nombre además le da la
		 * extensión `.ogg`, que es lo que hace que Meta lo muestre como nota de voz.
		 *
		 * @param {Blob} blob
		 * @returns {void}
		 */
		on_audio_blob(blob) {
			let self = this
			if (!this.chat) {
				return
			}
			/*
				La nota se manda al chat en el que se grabó, o no se manda. El blob llega
				asincrónico (el encoder tarda en cerrar el ogg), así que para cuando aparece el
				operador puede estar mirando otra conversación: ver el watch de `audio_recording`
				para el porqué de la marca. `!=` y no `!==`, como el resto de las comparaciones de
				id del módulo.
			*/
			if (this._chat_de_la_grabacion != this.chat_id) {
				return
			}
			this.enviando_adjunto = true
			this.$store.dispatch('whatsapp_chat/sendMedia', {
				chat_id: this.chat.id,
				file: new File([blob], 'nota.ogg', { type: 'audio/ogg' }),
				caption: '',
			})
			.then(function (data) {
				self.enviando_adjunto = false
				self.avisar_si_no_salio(data)
			})
			.catch(function (err) {
				self.enviando_adjunto = false
				self.manejar_error_de_envio(err, 'No se pudo enviar la nota de voz')
			})
		},
		/**
		 * Contrato del mixin: no arrancar a grabar si ya hay un adjunto viajando. Es el mismo
		 * indicador que usa la foto porque el endpoint es uno solo y el estado de "hay algo
		 * subiendo" también.
		 *
		 * @returns {boolean}
		 */
		can_record_audio() {
			return !this.enviando_adjunto
		},
		/**
		 * Contrato del mixin: el default es `alert()`, que en este sistema desentona. Los errores
		 * que llegan por acá son de permisos del micrófono o de un cierre que no confirmó.
		 *
		 * @param {string} message
		 * @returns {void}
		 */
		on_audio_error(message) {
			this.$toast.error(message)
		},
		/**
		 * Toma el borrador que le dejaron a esta conversación y lo carga en el input. Es de UN
		 * SOLO USO: se consume del store apenas se lee, así que no puede reaparecer al volver a
		 * este chat ni filtrarse a otro. Y sólo se toma si el `chat_id` del borrador es el que
		 * está abierto, para que un texto escrito para el cliente A no aparezca con el B abierto.
		 *
		 * 🔴 HOY LO ESCRIBEN DOS: el botón de una oferta (que abre el chat con el mensaje ya
		 * redactado) y, desde el 24/8/2026, **"Sugerir respuesta" del header de la conversación**.
		 * Ese botón vivía acá adentro y escribía `this.text` derecho; al mudarse a `Header.vue`
		 * dejó de poder tocar el `data()` de este componente, así que usa este mismo canal. Si
		 * mañana aparece un tercero, no hay nada que cambiar acá: el contrato es
		 * `setBorrador({chat_id, texto})` y este método lo levanta.
		 *
		 * 🔴 SE LLAMA DESDE TRES LUGARES, UNO POR CADA ESTADO EN EL QUE PUEDE ESTAR EL SIDEBAR
		 * CUANDO ALGUIEN APRIETA UN BOTÓN QUE DEJA BORRADOR. Los tres hacen falta y ninguno
		 * cubre al otro. Si mañana aparece un cuarto estado, esta lista queda corta: hasta el
		 * 17/8/2026 enumeraba dos como si fueran todos, y el que faltaba era justo el que
		 * mandaba el mensaje equivocado.
		 *
		 * 1. Sidebar CERRADO → `created()`. Quien abre el chat deja `selected_chat_id` puesto
		 *    ANTES de que este componente exista (y encima `conversation/Index.vue` no dibuja
		 *    el composer hasta que el chat aparece en la bandeja): el watch de `chat_id` no se
		 *    dispara nunca, y sin el `created()` el borrador no se carga.
		 * 2. Sidebar ABIERTO en OTRA conversación → `watch: chat_id`. El componente ya existe y
		 *    lo que corre es ese watch, que arranca limpiando `this.text`; por eso la toma va
		 *    DESPUÉS de esa línea, o se pisa sola.
		 * 3. Sidebar ABIERTO en ESTA MISMA conversación → `watch: borrador`. No corre ninguno
		 *    de los dos anteriores: el componente ya existe y `selected_chat_id` se commitea
		 *    con el valor que ya tenía, así que Vue no dispara nada. Es el caso más común de
		 *    todos —un cliente con dos ofertas activas y el operador clickeando la segunda— y
		 *    era el que quedaba afuera.
		 *
		 * @returns {void}
		 */
		tomar_borrador() {
			let borrador = this.borrador
			if (!borrador || borrador.chat_id != this.chat_id) {
				return
			}
			this.text = borrador.texto
			this.$store.commit('whatsapp_chat/setBorrador', null)
		},
	},
}
</script>
<style lang="sass">
.whatsapp-composer
	padding: 8px 10px 10px 10px
	background: var(--wa-panel)
	border-top: 1px solid var(--wa-borde)
	color: var(--wa-texto)

	// --- Aviso de simulacion ------------------------------------------------------------------
	// Una sola linea. El parrafo de detalle se saco el 24/8/2026 (pedido de Lucas): en un panel de
	// 320px de ancho minimo comia cinco renglones de conversacion cada vez que se probaba el
	// agente. El texto largo quedo en el `title`, a un hover de distancia.
	&__simulacion
		display: flex
		flex-direction: row
		align-items: center
		gap: 6px
		background: var(--wa-sim-bg)
		border: 1px dashed var(--wa-sim-borde)
		border-radius: 8px
		padding: 5px 10px
		margin-bottom: 6px
		font-size: .78rem
		font-weight: 600
		color: var(--wa-sim-texto)
		text-align: left
		i
			flex-shrink: 0

	// --- Fila del boton de simular ------------------------------------------------------------
	// Queda ARRIBA del input, que es donde estaba y donde Lucas lo quiere. Ya no comparte fila con
	// Sugerir, Plantillas y Foto: los dos primeros se mudaron al header y el clip bajo a la fila
	// del input.
	&__toolbar
		display: flex
		flex-direction: row
		margin-bottom: 6px
	// Misma geometria que los botones del header (32px, radio del token), para que las dos filas
	// de controles del sidebar se lean como el mismo sistema. El `.btn` del selector le gana a
	// `.btn-sm` por especificidad (0,2,0) contra (0,1,0).
	&__simular-btn.btn
		height: 32px
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 5px
		padding: 0 10px
		font-size: .8125rem
		line-height: 1
		border-radius: var(--toolbar-btn-radius)
		white-space: nowrap

	// --- Previsualizacion del adjunto ---------------------------------------------------------
	&__adjunto
		display: flex
		flex-direction: row
		align-items: flex-start
		gap: 10px
		background: var(--bg-section)
		border: 1px solid var(--wa-borde)
		border-radius: 12px
		padding: 8px 10px
		margin-bottom: 8px
		&-preview
			width: 72px
			height: 72px
			object-fit: cover
			border-radius: 8px
			flex-shrink: 0
		&-datos
			display: flex
			flex-direction: column
			gap: 6px
			// `min-width: 0` para que el nombre largo pueda recortarse: sin esto el item flex
			// se niega a achicarse debajo de su contenido y el bloque desborda el composer.
			min-width: 0
			flex: 1
		&-nombre
			font-size: .78rem
			opacity: var(--wa-texto-tenue-op)
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
		&-acciones
			display: flex
			flex-direction: row
			gap: 8px

	// --- La fila del composer -----------------------------------------------------------------
	// Clip, input, microfono y enviar, en ese orden y en una sola fila: es la anatomia de la
	// aplicacion de WhatsApp y es lo que pidio Lucas. `align-items: flex-end` es lo que mantiene
	// los tres controles pegados al piso mientras el input crece hacia arriba.
	&__input-row
		display: flex
		flex-direction: row
		align-items: flex-end
		gap: 6px

	// El clip va pelado --sin borde ni fondo--, como en WhatsApp. Es un <button> y no un <i>
	// clickeable para que se pueda enfocar con el teclado y activar con Enter.
	&__clip
		flex-shrink: 0
		width: var(--wa-control-h)
		height: var(--wa-control-h)
		border: none
		background: transparent
		border-radius: 50%
		color: var(--wa-texto)
		opacity: var(--wa-texto-tenue-op)
		display: flex
		align-items: center
		justify-content: center
		font-size: 1.2rem
		transition: background .15s ease, opacity .15s ease
		&:hover:not(:disabled)
			background: var(--wa-hover)
			opacity: 1
		&:disabled
			opacity: .35
			cursor: not-allowed

	// La capsula donde se escribe. El radio grande es lo que la hace leer como WhatsApp; el
	// padding vertical chico es lo que deja que una sola linea entre en los 42px de la fila sin
	// que el input quede mas alto que los botones de al lado.
	//
	// 🔴 NADA de `height`, `min-height` ni `max-height` aca. El alto lo escribe `ajustar_alto()`
	// en el estilo inline del elemento en cada cambio del texto, y una regla de altura propia
	// pelearia contra ese calculo. El tope de cinco renglones tambien sale de ahi, calculado
	// contra el `line-height` computado: si se lo pusiera aca como `max-height` fijo, cambiar la
	// tipografia del composer lo dejaria desfasado sin que nadie se entere.
	//
	// Lo que SI se toca aca: el padding, el radio de la capsula, los colores y el `resize`.
	&__texto.form-control
		flex: 1
		min-width: 0
		padding: 9px 14px
		border-radius: var(--wa-input-radius)
		border: 1px solid var(--wa-borde)
		background: var(--wa-input-bg)
		color: var(--wa-texto)
		font-size: .9rem
		line-height: 1.4
		box-shadow: none
		// La manija de la esquina pelea contra el alto automatico: el usuario la arrastra y la
		// primera tecla que toque le devuelve el alto calculado.
		resize: none
		// Arranca oculto y `ajustar_alto()` lo prende recien cuando el texto pasa los cinco
		// renglones. Sin esto, el campo vacio ya mostraba la barra en algunos navegadores.
		overflow-y: hidden
		&:focus
			border-color: var(--wa-verde)
			box-shadow: none
			background: var(--wa-input-bg)
			color: var(--wa-texto)
		&::placeholder
			color: var(--wa-texto)
			opacity: var(--wa-texto-muy-tenue-op)

	// Microfono y enviar: los dos circulos del mismo diametro, alineados al piso de la fila.
	&__mic,
	&__send.btn
		flex-shrink: 0
		width: var(--wa-control-h)
		height: var(--wa-control-h)
		border-radius: 50%
		display: inline-flex
		align-items: center
		justify-content: center
		padding: 0
		border: none
		font-size: 1.05rem
		line-height: 1

	// Tenue mientras no graba (es una accion secundaria al lado de Enviar) y rojo lleno mientras
	// graba, que es el unico momento en que tiene que gritar.
	&__mic
		background: transparent
		color: var(--wa-texto)
		opacity: var(--wa-texto-tenue-op)
		transition: background .15s ease, color .15s ease, opacity .15s ease
		&:hover:not(:disabled)
			background: var(--wa-hover)
			opacity: 1
		&:disabled
			opacity: .35
			cursor: not-allowed
		&--grabando
			background: #d9534f
			color: #ffffff
			opacity: 1
			&:hover:not(:disabled)
				background: #c9302c
				color: #ffffff

	// Verde de la marca, texto blanco. Se pisa el `variant="success"` de bootstrap a proposito:
	// el verde de Bootstrap (#28a745) no es el de WhatsApp y en modo oscuro no cambia.
	&__send.btn
		background: var(--wa-verde)
		color: var(--wa-verde-texto)
		&:hover:not(:disabled),
		&:focus:not(:disabled),
		&:active
			background: var(--wa-verde-hover)
			color: var(--wa-verde-texto)
			border: none
			box-shadow: none
		&:disabled
			background: var(--wa-verde)
			color: var(--wa-verde-texto)
			opacity: .5
		// El spinner y el icono son hermanos en BtnLoader y el que no corresponde se oculta con
		// v-show; sin esto el <span> vacio le mete un margen al circulo y descentra el icono.
		span
			display: inline-flex
			align-items: center
			justify-content: center
			margin: 0

	// --- Franja de grabacion ------------------------------------------------------------------
	// Reemplaza al textarea mientras el microfono esta abierto (decision previa: en un telefono de
	// 360px las dos cosas no entran). Toma el radio de la capsula para no desentonar con la fila.
	&__grabando
		display: flex
		flex-direction: row
		align-items: center
		gap: 8px
		flex: 1
		// `min-width: 0` para que el texto de ayuda se pueda recortar en pantallas angostas en
		// vez de estirar la fila y empujar el microfono fuera del composer.
		min-width: 0
		background: var(--wa-sim-bg)
		border: 1px solid var(--wa-sim-borde)
		border-radius: var(--wa-input-radius)
		padding: 8px 14px
		&-punto
			width: 10px
			height: 10px
			border-radius: 50%
			background: #d9534f
			flex-shrink: 0
			animation: whatsapp-composer-latido 1.2s ease-in-out infinite
		&-reloj
			font-variant-numeric: tabular-nums
			font-size: .9rem
			color: #d9534f
			flex-shrink: 0
		&-ayuda
			font-size: .78rem
			opacity: var(--wa-texto-tenue-op)
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
		&-cancelar
			margin-left: auto
			flex-shrink: 0
			color: var(--wa-texto)
			opacity: var(--wa-texto-tenue-op)

// El latido es la unica señal de que el microfono esta abierto de verdad; el cronometro corre
// aunque la grabacion haya fallado. Se apaga con `prefers-reduced-motion`, igual que hace el
// panel del asistente IA.
@keyframes whatsapp-composer-latido
	0%
		opacity: 1
	50%
		opacity: .25
	100%
		opacity: 1

@media (prefers-reduced-motion: reduce)
	.whatsapp-composer__grabando-punto
		animation: none
</style>
