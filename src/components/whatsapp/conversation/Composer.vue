<template>
	<div
	v-if="chat"
	class="whatsapp-composer">
		<!-- Chat en simulación: el backend FRENA todo envío de texto hacia WhatsApp mientras el
		último entrante sea simulado. Sin este aviso el operador escribía, apretaba enviar, la
		fila se guardaba y no salía nada: fallaba en silencio. -->
		<div
		v-if="en_simulacion"
		class="whatsapp-composer__simulacion">
			<strong class="whatsapp-composer__simulacion-titulo">
				<i class="bi bi-cone-striped"></i>
				Chat en simulación: los envíos a WhatsApp están frenados
			</strong>
			<span class="whatsapp-composer__simulacion-detalle">
				El último mensaje entrante lo inyectaste vos desde "Simular mensaje", así que la
				ventana de 24 h está forzada y no hay una conversación real abierta con este
				número. Lo que mandes se va a guardar acá y lo vas a ver en la conversación,
				pero <strong>al cliente no le llega</strong>. Se destraba solo en cuanto el
				cliente escriba de verdad.
			</span>
		</div>

		<div class="whatsapp-composer__toolbar">
			<b-button
			size="sm"
			variant="outline-secondary"
			:disabled="suggesting"
			@click="suggest">
				<i class="bi bi-magic"></i>
				{{ suggesting ? 'Sugiriendo...' : 'Sugerir respuesta' }}
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			@click="$bvModal.show('whatsapp-templates')">
				<i class="bi bi-file-earmark-text"></i>
				Plantillas
			</b-button>
			<b-button
			size="sm"
			variant="outline-secondary"
			:disabled="enviando_adjunto"
			@click="abrir_selector_de_imagen">
				<i class="bi bi-paperclip"></i>
				Foto
			</b-button>
			<!-- Gateado por el toggle chat_simulation_enabled: apagado por default, así los
			clientes ya activos no ven un botón nuevo que no pidieron. -->
			<b-button
			v-if="is_owner && config && config.chat_simulation_enabled"
			size="sm"
			variant="outline-secondary"
			@click="$bvModal.show('whatsapp-simulate-in-chat')">
				<i class="bi bi-play-fill"></i>
				Simular mensaje
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
			<b-form-textarea
			v-if="!audio_recording"
			v-model="text"
			id="whatsapp-composer-text"
			:placeholder="placeholder"
			rows="2"
			max-rows="6"
			@keydown.enter="onKeydownEnter"></b-form-textarea>

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
			class="btn btn-sm whatsapp-composer__mic"
			:class="audio_recording ? 'btn-danger' : 'btn-outline-secondary'"
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

			<btn-loader
			v-if="!audio_recording"
			:loader="sending"
			:block="false"
			icon="send"
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
			suggesting: false,

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
		 * El borrador que dejó quien abrió la conversación (`{chat_id, texto}` o null).
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
			}
		},
	},
	created() {
		/*
			Chat dueño de la grabación en curso. No va en `data()` porque no lo lee ningún template
			—misma razón por la que el mixin deja afuera las marcas del gesto.
		*/
		this._chat_de_la_grabacion = null
		this.tomar_borrador()
	},
	beforeDestroy() {
		// El sidebar destruye este componente cada vez que se cierra: si la previsualización
		// quedaba armada, su objectURL se filtraba con el blob de la foto adentro.
		this.soltar_adjunto()
	},
	methods: {
		/**
		 * Enter solo (sin Shift) envía el mensaje; Shift+Enter deja pasar el salto de línea normal.
		 *
		 * @param {KeyboardEvent} event
		 */
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
		 * Pide una sugerencia de la IA y la carga en el input, editable antes de enviar
		 * (nunca se envía sola).
		 */
		suggest() {
			if (!this.chat) {
				return
			}
			/*
				La sugerencia se pide para ESTE chat y solo sirve para este chat: si mientras viaja
				el operador salta a otra conversación, se descarta. Si no, la respuesta que la IA
				escribió leyendo la conversación del cliente A —con los datos de A adentro—
				aparecía escrita en el input con el cliente B abierto, lista para mandarse de un
				Enter. Es el mismo problema que resuelve el watch de `chat_id`, por el otro lado.
			*/
			let chat_pedido = this.chat.id
			this.suggesting = true
			this.$store.dispatch('whatsapp_chat/suggest', chat_pedido)
			.then(suggestion => {
				this.suggesting = false
				if (chat_pedido != this.chat_id) {
					return
				}
				this.text = suggestion || ''
			})
			.catch(err => {
				this.suggesting = false
				console.log(err)
				this.$toast.error('No se pudo generar la sugerencia')
			})
		},
		/**
		 * Toma el borrador que dejó quien abrió esta conversación (hoy, el botón de una
		 * oferta) y lo carga en el input. Es de UN SOLO USO: se consume del store apenas se
		 * lee, así que no puede reaparecer al volver a este chat ni filtrarse a otro. Y sólo
		 * se toma si el `chat_id` del borrador es el que está abierto — la misma guarda que
		 * ya usa `suggest()` para que una respuesta pedida para el cliente A no aparezca
		 * escrita con el cliente B abierto.
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
	padding: 8px 14px 14px 14px
	background: #ffffff
	border-top: 1px solid rgba(0, 0, 0, .08)
	&__simulacion
		display: flex
		flex-direction: column
		gap: 2px
		background: #fff6e5
		border: 1px dashed #d39e00
		border-radius: 8px
		padding: 8px 10px
		margin-bottom: 8px
		text-align: left
		&-titulo
			display: flex
			flex-direction: row
			align-items: center
			gap: 6px
			font-size: .8rem
			color: #8a5b00
		&-detalle
			font-size: .74rem
			line-height: 1.35
			color: rgba(0, 0, 0, .65)
			// En teléfono el detalle come media pantalla. Se recorta a tres líneas y el resto
			// queda accesible al tocarlo (el título ya dice lo que hay que saber para no
			// mandar un mensaje creyendo que sale).
			@media screen and (max-width: 575px)
				max-height: 3.5em
				overflow-y: auto
	&__toolbar
		display: flex
		flex-direction: row
		flex-wrap: wrap
		gap: 8px
		margin-bottom: 6px
	&__adjunto
		display: flex
		flex-direction: row
		align-items: flex-start
		gap: 10px
		background: #f7f9fb
		border: 1px solid rgba(0, 0, 0, .08)
		border-radius: 8px
		padding: 8px 10px
		margin-bottom: 8px
		&-preview
			width: 72px
			height: 72px
			object-fit: cover
			border-radius: 6px
			flex-shrink: 0
		&-datos
			display: flex
			flex-direction: column
			gap: 6px
			// `min-width: 0` para que el nombre largo pueda recortarse: sin esto el ítem flex
			// se niega a achicarse debajo de su contenido y el bloque desborda el composer.
			min-width: 0
			flex: 1
		&-nombre
			font-size: .78rem
			color: rgba(0, 0, 0, .6)
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
		&-acciones
			display: flex
			flex-direction: row
			gap: 8px
	&__input-row
		display: flex
		flex-direction: row
		align-items: flex-end
		gap: 8px
		textarea
			flex: 1
	&__mic
		// No se achica: en teléfono el textarea se lleva todo el ancho sobrante y sin esto el
		// botón quedaba de 20px, imposible de apretar con el dedo.
		flex-shrink: 0
		align-self: flex-end
	&__grabando
		display: flex
		flex-direction: row
		align-items: center
		gap: 8px
		flex: 1
		// `min-width: 0` para que el texto de ayuda se pueda recortar en pantallas angostas en
		// vez de estirar la fila y empujar el micrófono fuera del composer.
		min-width: 0
		background: #fff6e5
		border: 1px solid rgba(0, 0, 0, .08)
		border-radius: 8px
		padding: 8px 10px
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
			color: rgba(0, 0, 0, .6)
			overflow: hidden
			text-overflow: ellipsis
			white-space: nowrap
		&-cancelar
			margin-left: auto
			flex-shrink: 0
			color: rgba(0, 0, 0, .6)

// El latido es la única señal de que el micrófono está abierto de verdad; el cronómetro corre
// aunque la grabación haya fallado. Se apaga con `prefers-reduced-motion`, igual que hace el
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
