<template>
	<div
	class="whatsapp-bubble"
	:class="bubble_class">
		<!-- Quién mandó el mensaje y si fue simulado, en una fila propia arriba del contenido.
		Van juntos y ALINEADOS AL LADO DE LA BURBUJA (pedido de Lucas, 24/8/2026): pegados a la
		izquierda en los mensajes del cliente, a la derecha en los del negocio. Antes los dos
		arrancaban siempre contra el borde izquierdo, así que en una burbuja saliente —que está
		pegada a la derecha— el rótulo quedaba desalineado del resto del globo.

		La marca de simulado existe porque `direction` y `source` de un mensaje simulado son
		idénticos a los de uno real a propósito (tiene que recorrer el mismo camino): sin ella el
		operador leía mañana un mensaje que el cliente nunca escribió ni recibió. -->
		<div
		v-if="is_out || es_simulado"
		class="whatsapp-bubble__meta">
			<span
			v-if="is_out"
			class="whatsapp-bubble__sender">
				{{ sender_label }}
			</span>
			<span
			v-if="es_simulado"
			class="whatsapp-bubble__sim"
			:title="sim_title">
				<i class="bi bi-cone-striped"></i>
				Simulado
			</span>
		</div>

		<!-- Medio adjunto. Va ARRIBA del texto porque así lo dibuja WhatsApp: el epígrafe de una
		foto va abajo de la foto, y la transcripción de una nota de voz abajo del reproductor.
		El front NUNCA arma la URL: lee `media_src`, que el backend devuelve ya resuelta (puede
		ser una URL ajena, o la ruta autenticada propia si el archivo es nuestro). -->
		<button
		v-if="muestra_imagen"
		type="button"
		class="whatsapp-bubble__image-btn"
		title="Ver la imagen completa"
		@click="abrir_lightbox">
			<!-- 🔴 `referrerpolicy="origin"` no es decorativo. Si `media_src` es la ruta autenticada
			propia (`whatsapp-chats/{chat}/media/{mensaje}`, auth:sanctum), la cookie sola no
			alcanza: Sanctum 2 levanta la sesión solo si el request trae `Referer` u `Origin` de
			un dominio stateful, un <img> no manda `Origin`, y el nginx del VPS sirve la SPA con
			`Referrer-Policy: same-origin`, que le saca el `Referer` al ir a `api-<cliente>`. Sin
			esto la ruta contesta 401 y la foto no se ve. El detalle, en el docblock de
			asistente-ia/AdjuntosDeMensaje.vue. -->
			<img
			:src="message.media_src"
			class="whatsapp-bubble__image"
			referrerpolicy="origin"
			alt="Imagen del mensaje">
		</button>

		<audio-player
		v-else-if="muestra_audio"
		:src="message.media_src"
		:is_outgoing="is_out"></audio-player>

		<!-- 🔴 El mensaje trae un medio pero no hay archivo para dibujar. Es un estado normal y
		esperado, no una rareza: el backend registra la imagen entrante aunque la descarga falle,
		a propósito, porque lo que abre la ventana de 24 h es la fila y no el archivo. Sin este
		aviso la burbuja quedaba con la hora y NADA más —el body era el relleno `[Imagen recibida]`
		y se ocultaba—, así que el operador veía el chat subir a la cabeza de la bandeja con el
		badge de no leído, lo abría, y se encontraba un globo vacío: cero indicación de que el
		cliente le había mandado una foto. -->
		<div
		v-else-if="medio_sin_archivo"
		class="whatsapp-bubble__medio-faltante"
		:title="titulo_medio_faltante">
			<i
			class="bi"
			:class="message.media_type == 'audio' ? 'bi-mic-mute' : 'bi-image'"></i>
			{{ etiqueta_medio_faltante }}
		</div>

		<!-- El texto normal SOLO se dibuja fuera de edición: en edición lo reemplaza el textarea
		de más abajo, con una copia local (`texto_editado`) para que un broadcast que parchee el
		mensaje mientras se escribe no pise lo que el operador está tipeando. -->
		<p
		v-if="muestra_texto && (!editando || !espera_confirmacion)"
		class="whatsapp-bubble__text"
		:class="{'whatsapp-bubble__text--editable': espera_confirmacion}"
		:title="espera_confirmacion ? 'Clic para editar antes de enviar' : null"
		@click="espera_confirmacion && entrar_en_edicion()">
			{{ message.body }}
		</p>

		<!-- Respuesta del agente que TODAVÍA NO SE ENVIÓ: está esperando que una persona la
		apruebe. Se muestra aparte y con todas las letras porque pintada como un saliente
		cualquiera el operador creía que el bot ya había contestado, y no había contestado. -->
		<div
		v-if="espera_confirmacion"
		class="whatsapp-bubble__pending">
			<span
			class="whatsapp-bubble__pending-label"
			title="El agente ya la escribió pero no salió hacia WhatsApp. Si el cliente vuelve a escribir antes de que se envíe, esta respuesta se descarta y el agente arma una nueva.">
				<i class="bi bi-hourglass-split"></i>
				Sin enviar — esperando tu aprobación
			</span>

			<!-- Modo edición: clic en el texto de arriba lo trajo hasta acá. Copia local del
			cuerpo, para no pisar lo que se está escribiendo con un patch que llegue de afuera. -->
			<b-form-textarea
			v-if="editando"
			ref="textarea_edicion"
			v-model="texto_editado"
			class="whatsapp-bubble__textarea-edicion"
			rows="2"
			max-rows="10"
			no-resize
			autofocus
			:disabled="acting"
			placeholder="Editá la respuesta antes de enviarla"
			@keydown="on_keydown_edicion"></b-form-textarea>

			<span class="whatsapp-bubble__pending-timer">
				{{ texto_auto_envio }}
			</span>

			<span
			v-if="message.send_error"
			class="whatsapp-bubble__pending-error">
				<i class="bi bi-exclamation-triangle"></i>
				{{ message.send_error }}
			</span>

			<div class="whatsapp-bubble__pending-actions">
				<template v-if="editando">
					<b-button
					size="sm"
					variant="success"
					:disabled="acting"
					title="Guarda el texto (si lo cambiaste) y lo manda ahora."
					@click="enviar_edicion">
						<i class="bi bi-send"></i>
						Enviar
					</b-button>
					<b-button
					size="sm"
					variant="outline-secondary"
					:disabled="acting"
					title="Descarta los cambios y vuelve al texto original."
					@click="cancelar_edicion">
						<i class="bi bi-x-lg"></i>
						Cancelar
					</b-button>
				</template>
				<b-button
				v-else
				size="sm"
				variant="success"
				:disabled="acting"
				:title="confirm_title"
				@click="confirm">
					<i class="bi bi-send"></i>
					{{ confirm_text }}
				</b-button>
				<b-button
				size="sm"
				variant="outline-danger"
				:disabled="acting"
				title="Borra la respuesta: no se envía ni queda en la conversación."
				@click="discard">
					<i class="bi bi-x-lg"></i>
					Descartar
				</b-button>
			</div>
		</div>

		<!-- Estado intermedio y corto: alguien ganó el derecho a mandarlo y el POST a WhatsApp
		está en vuelo. Ya no se puede descartar. -->
		<div
		v-else-if="esta_enviandose"
		class="whatsapp-bubble__sending">
			<i class="bi bi-arrow-repeat"></i>
			Enviándose...
		</div>

		<div class="whatsapp-bubble__footer">
			<span class="whatsapp-bubble__time">
				{{ format_time(message.created_at) }}
			</span>
			<!-- Checks de entrega estilo WhatsApp: solo aplican a mensajes salientes que de
			verdad salieron. -->
			<span
			v-if="muestra_estado_entrega"
			class="whatsapp-bubble__status"
			:title="status_title">
				<i
				v-if="message.delivery_status == 'pendiente'"
				class="bi bi-clock"></i>
				<i
				v-else-if="message.delivery_status == 'enviado'"
				class="bi bi-check"></i>
				<i
				v-else-if="message.delivery_status == 'entregado'"
				class="bi bi-check-all"></i>
				<i
				v-else-if="message.delivery_status == 'leido'"
				class="bi bi-check-all whatsapp-bubble__status--read"></i>
				<i
				v-else-if="message.delivery_status == 'fallido'"
				class="bi bi-exclamation-circle whatsapp-bubble__status--failed"></i>
			</span>
			<!-- Saliente de un chat en simulación: el envío hacia WhatsApp lo frenó el backend,
			así que el reloj de "pendiente de entrega" sería mentira: no está por salir, no sale. -->
			<span
			v-else-if="is_out && es_simulado"
			class="whatsapp-bubble__status whatsapp-bubble__status--blocked"
			title="No salió hacia WhatsApp: el chat está en simulación. El cliente no recibió este mensaje.">
				<i class="bi bi-slash-circle"></i>
				No se envió
			</span>
		</div>
	</div>
</template>
<script>
import moment from 'moment'
import AudioPlayer from '@/components/whatsapp/conversation/AudioPlayer'

// Cuerpos de relleno que el backend escribe cuando el mensaje es SOLO un medio, para que la fila
// nunca quede con `body` vacío. Con la imagen o el reproductor dibujados arriba, repetirlos abajo
// no le dice nada al operador.
//
// 🔴 `'[Audio sin transcripción]'` NO está en esta lista y no tiene que estarlo: ese sí informa
// algo real —que la nota de voz llegó pero Kapso no la pudo pasar a texto—, y el operador tiene
// que verlo para saber que la única forma de enterarse de qué dice es escuchándola.
//
// 🔴 Estar en esta lista NO quiere decir "no se muestra nunca": ver `muestra_texto`, que lo
// oculta solo cuando arriba quedó un medio dibujado. Si no hay medio, el relleno es lo único que
// le queda a la burbuja.
const CUERPOS_DE_RELLENO = [
	'[Imagen recibida]',
	'[Imagen enviada]',
	'[Audio enviado]',
]

export default {
	components: {
		AudioPlayer,
	},
	props: {
		message: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Reloj propio para el contador regresivo del auto-envío. Se refresca una vez por
			// segundo y SOLO mientras haya una cuenta viva (ver el watch de más abajo): una
			// conversación larga tiene decenas de globos y no hace falta un intervalo por cada uno.
			ahora: Date.now(),
			intervalo_contador: null,
			// true mientras se confirma, se descarta o se guarda una edición, para no disparar
			// dos acciones a la vez de un doble click.
			acting: false,
			// true mientras la burbuja pendiente está en modo edición (clic en su texto).
			editando: false,
			// Copia local del cuerpo mientras se edita. Adrede NO es un computed sobre
			// `message.body`: si el store patchea el mensaje mientras se está editando (un
			// broadcast, o la pausa del auto-envío al entrar en edición), esta copia no se
			// entera y lo que el operador está tipeando no se pisa.
			texto_editado: '',
		}
	},
	computed: {
		is_out() {
			return this.message.direction == 'out'
		},
		/**
		 * El mensaje es parte de una simulación: lo inyectó el dueño desde "Simular mensaje", o
		 * salió como respuesta a uno inyectado. El cliente no lo escribió ni lo recibió.
		 *
		 * `== 1` y no `!!`: la columna llega booleana (está casteada en el modelo) pero así
		 * también aguanta un 0/1 crudo, y un '0' —que con `!!` daría true— sale bien.
		 */
		es_simulado() {
			return this.message.is_simulated == 1
		},
		/**
		 * Respuesta del agente generada pero NO enviada, esperando aprobación humana
		 * (`ai_status = 'a_confirmar'`, misión whatsapp-agente).
		 */
		espera_confirmacion() {
			return this.is_out && this.message.ai_status == 'a_confirmar'
		},
		/**
		 * El POST hacia WhatsApp está en vuelo (`ai_status = 'enviando'`). Dura segundos y ya no
		 * se puede descartar.
		 */
		esta_enviandose() {
			return this.is_out && this.message.ai_status == 'enviando'
		},
		/**
		 * Los checks de entrega solo se muestran cuando dicen la verdad. Se ocultan en los dos
		 * casos en que `delivery_status` se queda en 'pendiente' para siempre y el relojito
		 * significaría "está por llegarle al cliente" cuando no es así:
		 *  - el mensaje todavía espera aprobación (o está saliendo en este mismo momento),
		 *  - el chat está en simulación y el backend frenó el envío.
		 */
		muestra_estado_entrega() {
			if (!this.is_out) {
				return false
			}
			return !this.espera_confirmacion && !this.esta_enviandose && !this.es_simulado
		},
		bubble_class() {
			return {
				'whatsapp-bubble--out': this.is_out,
				'whatsapp-bubble--in': !this.is_out,
				'whatsapp-bubble--sim': this.es_simulado,
				'whatsapp-bubble--a-confirmar': this.espera_confirmacion,
			}
		},
		sim_title() {
			if (this.is_out) {
				return 'Mensaje simulado: no salió por WhatsApp, el cliente no lo recibió.'
			}
			return 'Mensaje simulado: lo inyectaste vos desde "Simular mensaje". El cliente no lo escribió.'
		},
		/**
		 * En un chat en simulación el mensaje no sale a WhatsApp aunque se confirme (lo frena el
		 * backend), así que el botón no puede prometer un envío que no va a pasar.
		 */
		confirm_text() {
			return this.es_simulado ? 'Aprobar' : 'Enviar ahora'
		},
		confirm_title() {
			if (this.es_simulado) {
				return 'El chat está en simulación: la respuesta queda aprobada y visible en la conversación, pero no sale hacia WhatsApp.'
			}
			return 'Manda la respuesta al cliente ahora mismo, sin esperar el plazo.'
		},
		/**
		 * Hay contador vivo solo si el mensaje espera confirmación Y tiene fecha de auto-envío.
		 * Sin fecha no hay nada que contar: o la espera configurada es 0, o el auto-envío ya se
		 * canceló (falló un intento anterior, o alguien lo confirmó/descartó).
		 */
		cuenta_regresiva_activa() {
			return this.espera_confirmacion && !!this.message.ai_auto_send_at
		},
		segundos_para_auto_envio() {
			if (!this.cuenta_regresiva_activa) {
				return null
			}
			let restante = moment(this.message.ai_auto_send_at).valueOf() - this.ahora
			return Math.ceil(restante / 1000)
		},
		texto_auto_envio() {
			if (!this.cuenta_regresiva_activa) {
				return 'No se envía solo: sale cuando lo confirmes.'
			}
			if (this.segundos_para_auto_envio <= 0) {
				return 'Se está enviando solo...'
			}
			return 'Se envía solo en ' + this.format_cuenta_regresiva(this.segundos_para_auto_envio)
		},
		/**
		 * Quién mandó el mensaje saliente: empleado, IA o plantilla usada.
		 *
		 * @returns {string}
		 */
		sender_label() {
			if (this.message.source == 'ia') {
				return 'IA'
			}
			if (this.message.source == 'plantilla') {
				return this.message.template_meta_name || 'Plantilla'
			}
			if (this.message.source == 'sistema') {
				return 'Sistema'
			}
			/*
				🔴 Sin esta rama el recordatorio de cobro caía al fallback 'Vos' y le decía al
				operador que ese mensaje lo había escrito él. No lo escribió nadie: lo mandó el
				módulo de alertas. Y no se etiqueta como 'plantilla' aunque a veces salga por
				plantilla, porque el otro camino es texto libre y ahí la etiqueta mentiría.
			*/
			if (this.message.source == 'recordatorio_cobro') {
				return 'Recordatorio de cobro'
			}
			if (this.message.sent_by_user && this.message.sent_by_user.name) {
				return this.message.sent_by_user.name
			}
			return 'Vos'
		},
		status_title() {
			if (this.message.delivery_status == 'fallido' && this.message.send_error) {
				return 'Falló: ' + this.message.send_error
			}
			let titles = {
				pendiente: 'Pendiente de envío',
				enviado: 'Enviado',
				entregado: 'Entregado',
				leido: 'Leído',
				fallido: 'Falló el envío',
			}
			return titles[this.message.delivery_status] || ''
		},
		/**
		 * Hay una imagen para dibujar. Se piden las dos cosas: que el mensaje SEA de tipo imagen y
		 * que el backend haya podido resolver el archivo. La fila puede existir con `media_type`
		 * cargado y `media_src` en null: es a propósito, la ventana de 24 h se abre igual aunque
		 * la descarga desde Kapso haya fallado. En ese caso queda el texto y nada más.
		 *
		 * `==` y no `===` a propósito, igual que en el resto del archivo.
		 *
		 * @returns {boolean}
		 */
		muestra_imagen() {
			return this.message.media_type == 'image' && !!this.message.media_src
		},
		/**
		 * Ídem para la nota de voz. La transcripción no vive acá: viaja en el `body` y se dibuja
		 * abajo del reproductor como cualquier texto.
		 *
		 * @returns {boolean}
		 */
		muestra_audio() {
			return this.message.media_type == 'audio' && !!this.message.media_src
		},
		/**
		 * El mensaje declara un medio pero no hay archivo para dibujar: `media_type` cargado y
		 * `media_src` en null.
		 *
		 * Es un estado normal, previsto por el backend, no una fila corrupta. Pasa cuando la
		 * resolución de la URL no matchea ninguna de sus cuatro rutas candidatas (el servicio
		 * loguea un warning obligatorio ahí justamente porque el payload de medios de Kapso no
		 * está documentado), cuando el mime queda afuera de la lista blanca, cuando el archivo
		 * pasa los 20 MB, o cuando el CDN devuelve error. En todos esos casos la fila se guarda
		 * igual: es lo que abre la ventana de 24 h.
		 *
		 * @returns {boolean}
		 */
		medio_sin_archivo() {
			return !!this.message.media_type && !this.message.media_src
		},
		/**
		 * Qué llegó, en palabras, para el aviso de medio sin archivo. Los dos tipos son femeninos
		 * ("Imagen", "Nota de voz"), así que la concordancia sale sola.
		 *
		 * @returns {string}
		 */
		etiqueta_medio_faltante() {
			let tipo = this.message.media_type == 'audio' ? 'Nota de voz' : 'Imagen'
			if (this.is_out) {
				return tipo + ' enviada (el archivo no está disponible)'
			}
			return tipo + ' recibida (no se pudo descargar)'
		},
		/**
		 * @returns {string}
		 */
		titulo_medio_faltante() {
			if (this.is_out) {
				return 'El archivo se envió pero ya no está disponible en el servidor.'
			}
			return 'El cliente mandó este archivo por WhatsApp pero no se pudo descargar. Si necesitás verlo, pedile que lo mande de nuevo.'
		},
		/**
		 * Arriba del texto quedó algo dibujado: la miniatura, el reproductor, o el aviso de que
		 * el medio llegó sin archivo.
		 *
		 * @returns {boolean}
		 */
		hay_medio_visible() {
			return this.muestra_imagen || this.muestra_audio || this.medio_sin_archivo
		},
		/**
		 * Oculta los cuerpos de relleno (ver `CUERPOS_DE_RELLENO`). Sin esto, abajo de cada foto
		 * sin epígrafe quedaba colgado un `[Imagen recibida]` que no le suma nada al operador.
		 *
		 * 🔴 Pero se ocultan SOLO cuando arriba hay un medio dibujado, y esa condición no se puede
		 * "simplificar" sacándola: el relleno es lo ÚNICO que queda en la burbuja cuando el medio
		 * no se puede mostrar. Ocultándolo siempre, un mensaje de imagen sin archivo —que existe a
		 * propósito, ver `medio_sin_archivo`— se dibujaba como un globo con la hora y nada más. El
		 * backend registra esa fila para que la ventana de 24 h se abra igual aunque el archivo no
		 * baje; una burbuja vacía en pantalla anula esa decisión, porque el operador nunca se
		 * entera de que el cliente le mandó una foto. La asimetría de `CUERPOS_DE_RELLENO` dice lo
		 * mismo: `'[Audio sin transcripción]'` quedó afuera de la lista justamente para que se vea.
		 *
		 * La comparación es exacta y no un "empieza con": si el cliente escribiera justo ese
		 * texto se perdería, pero cualquier cosa más laxa se comería epígrafes reales.
		 *
		 * @returns {boolean}
		 */
		muestra_texto() {
			// La burbuja pendiente de aprobación SIEMPRE deja ver (y editar) su cuerpo, aunque
			// sea el relleno de un medio sin epígrafe propio: es el único lugar de la burbuja
			// donde hacer clic para entrar en edición (misión sugerencia-ia-como-borrador,
			// 29/9/2026 — "el textarea edita el epígrafe, la foto sigue"). En la práctica esto
			// no cambia nada para las sugerencias de la IA (D7 del plan: la foto queda fuera de
			// alcance, así que `suggest()` nunca genera un mensaje con medio), pero cubre sin
			// sorpresas cualquier otra respuesta `a_confirmar` con foto que exista o se agregue.
			if (this.espera_confirmacion) {
				return true
			}
			if (!this.hay_medio_visible) {
				return true
			}
			return CUERPOS_DE_RELLENO.indexOf(this.message.body) == -1
		},
	},
	watch: {
		cuenta_regresiva_activa: {
			immediate: true,
			handler(activa) {
				this.detener_reloj()
				if (!activa) {
					return
				}
				let self = this
				this.ahora = Date.now()
				this.intervalo_contador = setInterval(() => {
					self.ahora = Date.now()
				}, 1000)
			},
		},
		/**
		 * 🔴 Si mientras se está editando el mensaje deja de estar `a_confirmar` por OTRA vía
		 * —otra pestaña lo confirmó, salió por auto-envío, alguien lo descartó y el patch llegó
		 * antes que el `removeMessage`—, hay que salir del modo edición ACÁ, y no esperar a que
		 * lo haga el propio flujo de `enviar_edicion()`. El bloque `__pending` entero (textarea y
		 * botones incluidos) vive detrás de `v-if="espera_confirmacion"`: sin este watch,
		 * `editando` se quedaba en `true` con ese bloque ya desmontado, y el `<p>` del texto
		 * normal (que antes solo se dibujaba con `!editando`) tampoco volvía a aparecer — la
		 * burbuja quedaba en blanco, sin texto y sin ninguna acción para salir.
		 *
		 * El `v-if` del `<p>` de arriba tiene además su propia defensa (`!editando ||
		 * !espera_confirmacion`), por si algún día este watch corriera después del render.
		 */
		espera_confirmacion(sigue_pendiente) {
			if (sigue_pendiente || !this.editando) {
				return
			}
			this.editando = false
			this.texto_editado = ''
			let ya_se_envio = this.message.ai_status == 'enviando' || this.message.ai_status == 'enviado'
			this.$toast.warning(
				ya_se_envio
					? 'Este mensaje ya se envió: se descartó tu edición.'
					: 'Este mensaje ya no está pendiente: se descartó tu edición.',
				{ duration: 6000 }
			)
		},
	},
	beforeDestroy() {
		this.detener_reloj()
	},
	methods: {
		detener_reloj() {
			if (this.intervalo_contador) {
				clearInterval(this.intervalo_contador)
				this.intervalo_contador = null
			}
		},
		format_time(created_at) {
			return moment(created_at).format('HH:mm')
		},
		/**
		 * Segundos a `m:ss` (ej: 251 -> "4:11"). La espera de confirmación llega hasta una hora,
		 * así que arriba de 60 minutos se muestran los minutos igual, sin hora aparte.
		 *
		 * @param {number} segundos
		 * @returns {string}
		 */
		format_cuenta_regresiva(segundos) {
			let minutos = Math.floor(segundos / 60)
			let resto = segundos % 60
			return minutos + ':' + (resto < 10 ? '0' + resto : resto)
		},
		/**
		 * Confirma la respuesta del agente: la manda ahora sin esperar el plazo.
		 */
		confirm() {
			let self = this
			this.acting = true
			this.$store.dispatch('whatsapp_chat/confirmAiMessage', this.message.id)
			.then(() => {
				self.acting = false
			})
			.catch(err => {
				self.acting = false
				console.log(err)
				self.manejar_error_confirmacion(err)
			})
		},
		/**
		 * Descarta la respuesta del agente: el backend cancela el auto-envío y borra la fila.
		 */
		discard() {
			let self = this
			this.acting = true
			this.$store.dispatch('whatsapp_chat/discardAiMessage', this.message.id)
			.then(() => {
				self.acting = false
				self.$toast.success('Respuesta descartada')
			})
			.catch(err => {
				self.acting = false
				console.log(err)
				self.manejar_error_confirmacion(err)
			})
		},
		/**
		 * Clic en el texto de una burbuja pendiente: la vuelve editable. Copia el cuerpo actual
		 * a `texto_editado` (de un solo uso, se vuelve a copiar cada vez que se entra) y enfoca
		 * el textarea apenas se dibuja.
		 *
		 * D5 del plan: si la respuesta tenía auto-envío programado, entrar en edición lo pausa
		 * —una persona la tomó, no puede salir sola con el texto viejo mientras se edita—. Se
		 * pausa con un PUT sin `body`: el texto no se toca todavía, recién se guarda al confirmar
		 * o mandar la edición.
		 */
		entrar_en_edicion() {
			if (this.editando || this.acting) {
				return
			}
			this.texto_editado = this.message.body
			this.editando = true
			let self = this
			this.$nextTick(function () {
				if (self.$refs.textarea_edicion) {
					self.$refs.textarea_edicion.focus()
				}
			})
			if (this.message.ai_auto_send_at) {
				this.$store.dispatch('whatsapp_chat/updateAiMessage', { message_id: this.message.id })
				.catch(function (err) {
					console.log(err)
					// El body no se llegó a tocar. Si la pausa falló porque el mensaje ya cambió
					// de estado por atrás (ya se está enviando, o ya no está pendiente), seguir
					// "editando" un texto que ya no se puede guardar sería peor que salir: se
					// cierra la edición y se avisa igual que en confirm/discard.
					self.editando = false
					self.manejar_error_confirmacion(err)
				})
			}
		},
		/**
		 * Cancela la edición sin guardar nada: vuelve a mostrar el texto original.
		 */
		cancelar_edicion() {
			this.editando = false
			this.texto_editado = this.message.body
		},
		/**
		 * Ctrl/Cmd+Enter manda la edición, Esc la cancela — mismos atajos que ya usa el composer
		 * principal de la conversación.
		 *
		 * @param {KeyboardEvent} e
		 */
		on_keydown_edicion(e) {
			if (e.key == 'Escape') {
				e.preventDefault()
				this.cancelar_edicion()
				return
			}
			if (e.key == 'Enter' && (e.ctrlKey || e.metaKey)) {
				e.preventDefault()
				this.enviar_edicion()
			}
		},
		/**
		 * Guarda la edición (si el texto cambió) y manda la respuesta, en un solo botón: pedirle
		 * al operador que primero guarde y después confirme por separado sería un paso de más
		 * para lo que en la cabeza de quien está mirando es una sola acción, "enviar esto".
		 *
		 * Si el texto NO cambió (entró en edición y salió sin tocar nada, o lo dejó igual), se
		 * salta el PUT y se confirma directo: no hay nada que guardar.
		 */
		enviar_edicion() {
			let texto = (this.texto_editado || '').trim()
			if (!texto) {
				this.$toast.error('El mensaje no puede quedar vacío')
				return
			}
			let self = this
			let cambio = texto != this.message.body
			this.acting = true
			let promesa = cambio
				? this.$store.dispatch('whatsapp_chat/updateAiMessage', { message_id: this.message.id, body: texto })
				: Promise.resolve()
			promesa
			.then(function () {
				return self.$store.dispatch('whatsapp_chat/confirmAiMessage', self.message.id)
			})
			.then(function () {
				self.acting = false
				self.editando = false
			})
			.catch(function (err) {
				self.acting = false
				console.log(err)
				self.manejar_error_confirmacion(err)
			})
		},
		/**
		 * Traduce los `code` que devuelve el backend en los 422 de confirmar/descartar. Los tres
		 * primeros significan que el estado del mensaje cambió por atrás mientras el operador lo
		 * miraba, así que además de avisar se recargan los mensajes para que la pantalla deje de
		 * mostrar algo que ya no es.
		 *
		 * @param {Object} err Error de axios.
		 */
		manejar_error_confirmacion(err) {
			let status = err.response && err.response.status
			let data = err.response && err.response.data
			let code = data && data.code

			if (status == 422 && code == 'fuera_de_ventana') {
				this.$toast.error(
					'Pasaron más de 24 h desde el último mensaje del cliente. WhatsApp solo permite retomar la conversación con una plantilla.',
					{ duration: 8000 }
				)
				this.$bvModal.show('whatsapp-templates')
				return
			}
			if (status == 422 && code == 'envio_fallido') {
				// El backend devuelve el mensaje actualizado con el motivo en `send_error`: se
				// refleja para que el operador vea por qué falló y pueda reintentar.
				if (data.model) {
					this.$store.commit('whatsapp_chat/patchMessage', data.model)
				}
				this.$toast.error(data.message || 'No se pudo enviar el mensaje por WhatsApp.', { duration: 8000 })
				return
			}
			if (status == 422 && (code == 'ya_en_envio' || code == 'ya_no_esta_pendiente')) {
				// Sale de edición ACÁ (y no solo vía el watch de `espera_confirmacion`): así, si
				// `recargar_mensajes()` termina cambiando el estado del mensaje, ese watch se
				// encuentra `editando` ya en `false` y no dispara un segundo toast por lo mismo.
				this.editando = false
				this.texto_editado = ''
				this.$toast.warning(data.message || 'El mensaje ya no está esperando confirmación.', { duration: 6000 })
				this.recargar_mensajes()
				return
			}
			// 🔴 404: el mensaje ya no existe. Pasa cuando se está editando y, mientras tanto, el
			// cliente vuelve a escribir: `discard_pending_ai_messages()` la BORRA de la base (no
			// la patchea), y el broadcast de ese borrado viaja sin mensaje adjunto (no hay nada
			// que patchear), así que esta instancia no se entera hasta que actúa sobre un id que
			// ya no está. Sin este caso caía al genérico de abajo y la burbuja fantasma —sin
			// texto, en edición sobre nada— se quedaba en pantalla hasta recargar a mano.
			if (status == 404) {
				this.editando = false
				this.texto_editado = ''
				this.$toast.warning('Ese mensaje ya no existe: el cliente volvió a escribir.', { duration: 6000 })
				this.recargar_mensajes()
				return
			}
			this.$toast.error((data && data.message) || 'No se pudo completar la acción')
		},
		/**
		 * Vuelve a pedir la primera página de la conversación abierta para que quede igual a lo
		 * que hay en la base.
		 */
		recargar_mensajes() {
			if (!this.message.whatsapp_chat_id) {
				return
			}
			this.$store.dispatch('whatsapp_chat/getMessages', {
				chat_id: this.message.whatsapp_chat_id,
				page: 1,
			})
		},
		/**
		 * Abre la imagen a pantalla completa.
		 *
		 * 🔴 No emite un evento hacia arriba ni monta el visor acá adentro. La burbuja vive dentro
		 * del panel del sidebar, que tiene `overflow: hidden`: un visor colgado de esta burbuja
		 * quedaría recortado al ancho del sidebar, y en Vue 2 no hay `<teleport>` para sacarlo.
		 * Se avisa por el store y el visor —que es hermano del panel, no hijo— se abre solo.
		 * De paso, la burbuja sigue sin emitir un solo evento, que es lo que la deja moverse de
		 * lugar en el árbol sin tocarla.
		 */
		abrir_lightbox() {
			this.$store.commit('whatsapp_chat/setLightboxUrl', this.message.media_src)
		},
	},
}
</script>
<style lang="sass">
.whatsapp-bubble
	max-width: 70%
	padding: 6px 10px
	border-radius: 10px
	margin-bottom: 4px
	box-shadow: 0 1px 1px var(--wa-burbuja-sombra)
	&--in
		align-self: flex-start
		background: var(--wa-burbuja-in)
		color: var(--wa-burbuja-in-texto)
	&--out
		align-self: flex-end
		background: var(--wa-burbuja-out)
		// 🔴 El texto de la saliente NO hereda: en modo oscuro esa burbuja es verde petroleo y el
		// gris del tema claro queda ilegible encima. Sale del token propio.
		color: var(--wa-burbuja-out-texto)
	// Simulado: borde punteado, para que se lea de un vistazo que ese globo no es real.
	&--sim
		border: 1px dashed var(--wa-sim-borde)
	// Esperando aprobacion: fondo distinto del saliente normal (no es un mensaje enviado) y
	// mas ancho, porque adentro entran el aviso, el contador y los dos botones. Borde punteado
	// de 2px (mas grueso que el de --sim, arriba) en el amarillo de "pendiente" del modulo
	// -mismo token que ya usan la tarjeta del tablero y la fila amarilla de ChatRow.vue-, para
	// que se note de un vistazo que esta burbuja todavia no salio (pedido de Lucas, misión
	// sugerencia-ia-como-borrador, 29/9/2026).
	&--a-confirmar
		background: var(--wa-pendiente-bg)
		border: 2px dashed var(--wa-pendiente-borde)
		color: var(--wa-texto)
		max-width: 85%

	// --- Fila del emisor y la marca de simulado ---------------------------------------------
	// El lado lo decide la direccion del mensaje, no un valor fijo: entrantes a la izquierda,
	// salientes a la derecha, para que el rotulo quede alineado con el borde de la burbuja que
	// mira al centro de la conversacion. Es lo que pidio Lucas el 24/8/2026.
	//
	// 🔴 No se agrego un rotulo "Cliente" inventado en los entrantes: en un mensaje del cliente
	// esta fila lleva SOLO la marca de simulado cuando corresponde, y por eso el v-if de arriba
	// pide `is_out || es_simulado` --si no, quedaria un div vacio con margen en cada entrante--.
	&__meta
		display: flex
		flex-direction: row
		align-items: center
		flex-wrap: wrap
		gap: 6px
		margin-bottom: 3px
	&--in &__meta
		justify-content: flex-start
	&--out &__meta
		justify-content: flex-end

	&__sender
		font-size: .7rem
		font-weight: 700
		// 🔴 --wa-sender y NO --wa-verde. Este rotulo se dibuja SIEMPRE sobre la burbuja saliente
		// (`v-if="is_out"`), que en claro es verde palido: el verde de marca encima da 1,8:1 y se
		// lee como una mancha. El token propio es el verde oscuro de WhatsApp, 6,9:1.
		color: var(--wa-sender)
	&__sim
		display: inline-flex
		align-items: center
		gap: 4px
		font-size: .65rem
		font-weight: 700
		text-transform: uppercase
		letter-spacing: .03em
		color: var(--wa-sim-texto)
		background: var(--wa-sim-bg)
		border-radius: 4px
		padding: 1px 5px

	// La miniatura es un <button> y no un <img> suelto para que se pueda abrir con Enter y con
	// el lector de pantalla, no solo con el mouse. De ahi que haya que sacarle todo el aspecto
	// de boton que le pone el navegador.
	&__image-btn
		display: block
		max-width: 100%
		margin: 0 0 4px 0
		padding: 0
		border: none
		background: transparent
		cursor: zoom-in
	&__image
		display: block
		// El 100% es lo que la mantiene adentro de la burbuja en telefono; los 280px son para
		// que en escritorio no ocupe media conversacion.
		max-width: min(100%, 280px)
		max-height: 180px
		width: auto
		object-fit: cover
		border-radius: 6px
	// El reproductor viene del molde con `min-width: 200px`, que sumado al padding de la burbuja
	// no entra en el 70% de un sidebar puesto en su ancho minimo (320px) y se desbordaba. Aca se
	// lo deja encoger: el waveform es flexible y aguanta perfecto un poco menos de ancho.
	.wa-audio-player
		min-width: 0
		max-width: 100%
	// Aviso de medio sin archivo. Va como bloque punteado y tenue, y no como una linea de texto
	// mas, para que se lea de un vistazo que eso NO lo escribio el cliente: es el sistema
	// avisando que llego algo que no puede mostrar.
	&__medio-faltante
		display: flex
		flex-direction: row
		align-items: center
		gap: 6px
		margin-bottom: 4px
		padding: 5px 8px
		border: 1px dashed var(--wa-borde)
		border-radius: 6px
		font-size: .74rem
		opacity: var(--wa-texto-tenue-op)
		text-align: left
		i
			font-size: .95rem
			flex-shrink: 0
	&__text
		margin: 0
		white-space: pre-wrap
		word-break: break-word
		text-align: left
		// Solo la burbuja pendiente de aprobación agrega esta clase (ver el `:class` del
		// template): es la única cuyo texto se puede clickear para editar.
		&--editable
			cursor: pointer
			&:hover
				text-decoration: underline
				text-decoration-style: dotted
	// Textarea de edición de la burbuja pendiente: mismos colores del módulo (nada de blanco
	// fijo, que en modo oscuro sobre el fondo ambar de --a-confirmar quedaría fuera de lugar) y
	// sin el foco celeste default de bootstrap, que no combina con el amarillo de la burbuja.
	&__textarea-edicion
		width: 100%
		margin-bottom: 4px
		font-size: .82rem
		background: var(--wa-panel)
		color: var(--wa-texto)
		border-color: var(--wa-pendiente-borde)
		&:focus
			background: var(--wa-panel)
			color: var(--wa-texto)
			border-color: var(--wa-pendiente-borde)
			box-shadow: none
	&__pending
		display: flex
		flex-direction: column
		align-items: flex-start
		gap: 4px
		margin-top: 6px
		padding-top: 6px
		border-top: 1px dashed var(--wa-borde)
		text-align: left
		&-label
			display: inline-flex
			align-items: center
			gap: 5px
			font-size: .72rem
			font-weight: 700
			color: var(--wa-pendiente-texto)
		&-timer
			font-size: .72rem
			opacity: var(--wa-texto-tenue-op)
		&-error
			display: inline-flex
			align-items: flex-start
			gap: 5px
			font-size: .7rem
			color: var(--wa-error)
		&-actions
			display: flex
			flex-direction: row
			// En telefono el globo mide poco mas de 300px y los dos botones no entran en una
			// fila: se permite el salto en vez de que se desborden.
			flex-wrap: wrap
			gap: 6px
			margin-top: 2px
	&__sending
		display: inline-flex
		align-items: center
		gap: 5px
		margin-top: 4px
		font-size: .72rem
		opacity: var(--wa-texto-tenue-op)
	&__footer
		display: flex
		flex-direction: row
		justify-content: flex-end
		align-items: center
		margin-top: 2px
	&__time
		font-size: .68rem
		opacity: var(--wa-texto-muy-tenue-op)
	// 🔴 Los checks se destiñen con `color` y NO con `opacity`, a diferencia del resto del texto
	// secundario de este archivo: los íconos de estado son HIJOS de este span, y dos de ellos
	// (`--read` celeste, `--failed` rojo) traen color propio. `opacity` crea un contexto de
	// composición que se aplica al subárbol entero, así que un `opacity: 1` en el hijo no lo
	// deshace —se compone dentro del padre ya translúcido— y el doble check azul de "leído"
	// quedaba lavado justo cuando es la información que el operador está buscando.
	&__status
		margin-left: 4px
		font-size: .8rem
		color: var(--color-text-secondary)
		&--read
			color: #34b7f1
		// Token y no el #dc3545 de Bootstrap: este check vive adentro de la burbuja saliente, y
		// ese fondo ahora cambia entre modos. Sobre el verde petroleo del oscuro daba 1,8:1, o
		// sea que desaparecia el unico aviso de que el mensaje NO salio.
		&--failed
			color: var(--wa-error)
		&--blocked
			display: inline-flex
			align-items: center
			gap: 4px
			font-size: .68rem
			font-weight: 600
			color: var(--wa-sim-texto)
</style>
