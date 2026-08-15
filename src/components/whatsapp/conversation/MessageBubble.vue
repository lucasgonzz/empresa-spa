<template>
	<div
	class="whatsapp-bubble"
	:class="bubble_class">
		<span
		v-if="is_out"
		class="whatsapp-bubble__sender">
			{{ sender_label }}
		</span>

		<!-- Marca de simulación. `direction` y `source` de un mensaje simulado son idénticos a
		los de uno real a propósito (tiene que recorrer el mismo camino), así que sin esta marca
		el operador leía mañana un mensaje que el cliente nunca escribió ni recibió. -->
		<span
		v-if="es_simulado"
		class="whatsapp-bubble__sim"
		:title="sim_title">
			<i class="bi bi-cone-striped"></i>
			Simulado
		</span>

		<p class="whatsapp-bubble__text">
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
				<b-button
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
export default {
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
			// true mientras se confirma o se descarta, para no mandar dos veces de un doble click.
			acting: false,
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
				this.$toast.warning(data.message || 'El mensaje ya no está esperando confirmación.', { duration: 6000 })
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
	},
}
</script>
<style lang="sass">
.whatsapp-bubble
	max-width: 70%
	padding: 6px 10px
	border-radius: 10px
	margin-bottom: 4px
	box-shadow: 0 1px 1px rgba(0, 0, 0, .08)
	&--in
		align-self: flex-start
		background: #ffffff
	&--out
		align-self: flex-end
		background: #dcf8c6
	// Simulado: borde punteado, para que se lea de un vistazo que ese globo no es real.
	&--sim
		border: 1px dashed rgba(0, 0, 0, .3)
	// Esperando aprobación: fondo distinto del saliente normal (no es un mensaje enviado) y
	// más ancho, porque adentro entran el aviso, el contador y los dos botones.
	&--a-confirmar
		background: #fff6e5
		border: 1px dashed #d39e00
		max-width: 85%
	&__sender
		display: block
		font-size: .7rem
		font-weight: 700
		color: #075e54
		margin-bottom: 2px
	&__sim
		display: inline-flex
		align-items: center
		gap: 4px
		font-size: .65rem
		font-weight: 700
		text-transform: uppercase
		letter-spacing: .03em
		color: #8a6d3b
		background: rgba(255, 193, 7, .22)
		border-radius: 4px
		padding: 1px 5px
		margin-bottom: 3px
	&__text
		margin: 0
		white-space: pre-wrap
		word-break: break-word
		text-align: left
	&__pending
		display: flex
		flex-direction: column
		align-items: flex-start
		gap: 4px
		margin-top: 6px
		padding-top: 6px
		border-top: 1px dashed rgba(0, 0, 0, .18)
		text-align: left
		&-label
			display: inline-flex
			align-items: center
			gap: 5px
			font-size: .72rem
			font-weight: 700
			color: #8a5b00
		&-timer
			font-size: .72rem
			color: rgba(0, 0, 0, .6)
		&-error
			display: inline-flex
			align-items: flex-start
			gap: 5px
			font-size: .7rem
			color: #dc3545
		&-actions
			display: flex
			flex-direction: row
			// En teléfono el globo mide poco más de 300px y los dos botones no entran en una
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
		color: rgba(0, 0, 0, .55)
	&__footer
		display: flex
		flex-direction: row
		justify-content: flex-end
		align-items: center
		margin-top: 2px
	&__time
		font-size: .68rem
		color: rgba(0, 0, 0, .45)
	&__status
		margin-left: 4px
		font-size: .8rem
		color: rgba(0, 0, 0, .45)
		&--read
			color: #34b7f1
		&--failed
			color: #dc3545
		&--blocked
			display: inline-flex
			align-items: center
			gap: 4px
			font-size: .68rem
			font-weight: 600
			color: #b5651d
</style>
