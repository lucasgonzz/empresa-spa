<template>
	<div class="andreani-card__configuracion">
		<!-- Ofrecer en la tienda -->
		<div class="andreani-card__campo">
			<b-form-checkbox
			id="andreani-ofrecer-en-tienda"
			data-testid="andreani-ofrecer-en-tienda"
			v-model="form.ofrecer_en_tienda"
			:value="true"
			:unchecked-value="false">
				Ofrecer Andreani en mi tienda online
			</b-form-checkbox>
			<p class="andreani-card__ayuda-corta m-t-5">
				Si lo destildás, la tienda deja de mostrar Andreani pero la conexión queda guardada.
			</p>
		</div>

		<!-- Paquete por defecto -->
		<div class="andreani-card__campo">
			<p class="andreani-card__label m-b-5">Paquete por defecto</p>
			<b-row class="andreani-card__bulto">
				<b-col
				cols="6"
				md="3">
					<label
					for="andreani-bulto-peso"
					class="andreani-card__sublabel">Peso (kg)</label>
					<b-form-input
					id="andreani-bulto-peso"
					type="number"
					min="0.01"
					step="0.01"
					inputmode="decimal"
					v-model="form.bulto_default.peso"></b-form-input>
				</b-col>
				<b-col
				cols="6"
				md="3">
					<label
					for="andreani-bulto-alto"
					class="andreani-card__sublabel">Alto (cm)</label>
					<b-form-input
					id="andreani-bulto-alto"
					type="number"
					min="1"
					step="1"
					inputmode="numeric"
					v-model="form.bulto_default.alto"></b-form-input>
				</b-col>
				<b-col
				cols="6"
				md="3">
					<label
					for="andreani-bulto-ancho"
					class="andreani-card__sublabel">Ancho (cm)</label>
					<b-form-input
					id="andreani-bulto-ancho"
					type="number"
					min="1"
					step="1"
					inputmode="numeric"
					v-model="form.bulto_default.ancho"></b-form-input>
				</b-col>
				<b-col
				cols="6"
				md="3">
					<label
					for="andreani-bulto-profundidad"
					class="andreani-card__sublabel">Largo (cm)</label>
					<b-form-input
					id="andreani-bulto-profundidad"
					type="number"
					min="1"
					step="1"
					inputmode="numeric"
					v-model="form.bulto_default.profundidad"></b-form-input>
				</b-col>
			</b-row>
			<p class="andreani-card__ayuda-corta m-t-5">
				Se usa para cotizar los artículos a los que todavía no les cargaste peso y medidas. Cargalos en
				cada artículo (Listado → editar → Envíos) o de a muchos con la edición masiva. Andreani cotiza
				hasta 50 kg y 165 cm por lado.
			</p>
		</div>

		<!-- Envío gratis desde -->
		<div class="andreani-card__campo">
			<label
			for="andreani-envio-gratis-desde"
			class="andreani-card__label">Envío gratis a partir de $</label>
			<b-form-input
			id="andreani-envio-gratis-desde"
			type="number"
			min="0"
			step="0.01"
			inputmode="decimal"
			placeholder="Dejalo vacío si no ofrecés envío gratis por monto"
			v-model="form.envio_gratis_desde"></b-form-input>
		</div>

		<!-- Declarar valor -->
		<div class="andreani-card__campo">
			<b-form-checkbox
			id="andreani-declarar-valor"
			v-model="form.declarar_valor"
			:value="true"
			:unchecked-value="false">
				Declarar el valor de la compra en cada envío
			</b-form-checkbox>
		</div>

		<!-- Contrato de sucursal y sucursal de origen -->
		<div class="andreani-card__campo">
			<label
			for="andreani-config-contrato-sucursal"
			class="andreani-card__label">Contrato de retiro en sucursal (opcional)</label>
			<b-form-input
			id="andreani-config-contrato-sucursal"
			type="text"
			inputmode="numeric"
			autocomplete="off"
			placeholder="Dejalo vacío si no ofrecés retiro en sucursal"
			v-model.trim="form.contrato_sucursal"></b-form-input>
		</div>

		<div class="andreani-card__campo">
			<label
			for="andreani-config-sucursal-origen"
			class="andreani-card__label">Sucursal de origen (opcional)</label>
			<b-form-input
			id="andreani-config-sucursal-origen"
			type="text"
			inputmode="numeric"
			autocomplete="off"
			placeholder="N° de la sucursal de Andreani donde dejás tus paquetes"
			v-model.trim="form.sucursal_origen"></b-form-input>
		</div>

		<div class="integration-card__actions">
			<btn-loader
			:block="false"
			:loader="guardando"
			text="Guardar"
			variant="primary"
			@clicked="guardarConfig"></btn-loader>

			<btn-loader
			:block="false"
			size="sm"
			variant="outline-danger"
			:loader="desconectando"
			text="Desconectar"
			@clicked="desconectar"></btn-loader>
		</div>
	</div>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Sub-componente "Configuración" de la tarjeta de Andreani (misión envios-andreani, 25/11/2026):
 * lo que se ajusta una vez conectada la cuenta, y el botón Desconectar.
 *
 * - Ofrecer Andreani en la tienda (`ofrecer_en_tienda`, por defecto sí).
 * - Paquete por defecto (`bulto_default`): para los artículos sin peso ni medidas.
 * - Envío gratis desde (`envio_gratis_desde`, vacío = no hay envío gratis por monto).
 * - Declarar el valor de la compra (`declarar_valor`).
 * - Contrato de sucursal y sucursal de origen (opcionales; vacío los limpia).
 *
 * `PUT integraciones/andreani/config` responde `{integracion}` con el item ya actualizado, que se
 * emite con `actualizado`. Omitir una clave la preserva y mandarla en null la limpia: por eso un
 * campo vacío viaja como null y no se omite.
 *
 * Todas las peticiones prenden el indicador global de carga (`auth/setLoading`).
 */
export default {
	name: 'AndreaniConfiguracion',
	mixins: [IntegrationConnector],
	components: {
		BtnLoader,
	},
	props: {
		// Item de la integración (conectada), con `config`
		integracion: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Indicador de carga del botón Guardar
			guardando: false,
			// Indicador de carga del botón Desconectar
			desconectando: false,
			// Copia editable de `config` (se sincroniza desde la prop en el watcher)
			form: this.formVacio(),
		}
	},
	computed: {
		// Configuración que manda el backend (siempre un objeto)
		config() {
			return this.integracion.config ? this.integracion.config : {}
		},
	},
	watch: {
		/**
		 * Cada vez que el padre reemplaza el item (conectar, guardar), se vuelve a copiar la
		 * configuración al formulario. A diferencia de Zipnova no hace falta proteger lo que el dueño
		 * está tipeando: el único endpoint que reemplaza el item mientras esta pantalla está abierta
		 * es el propio Guardar, y ahí el formulario ya coincide con la respuesta.
		 * `immediate` para la primera carga.
		 */
		integracion: {
			immediate: true,
			deep: true,
			handler() {
				this.form = this.formDesdeConfig()
			},
		},
	},
	methods: {
		/**
		 * Formulario con los mismos defaults que usa el backend (AndreaniCredentialsHelper::config()).
		 *
		 * @returns {Object}
		 */
		formVacio() {
			return {
				ofrecer_en_tienda: true,
				bulto_default: {
					peso: 0.5,
					alto: 10,
					ancho: 10,
					profundidad: 10,
				},
				declarar_valor: true,
				envio_gratis_desde: null,
				contrato_sucursal: '',
				sucursal_origen: '',
			}
		},
		/**
		 * Formulario armado a partir de `config` de la prop, sin pisar los defaults cuando el
		 * backend manda una clave en null o no la manda (API vieja, lectura tolerante).
		 *
		 * @returns {Object} Misma forma que formVacio().
		 */
		formDesdeConfig() {
			let form = this.formVacio()
			let config = this.config

			if (typeof config.ofrecer_en_tienda != 'undefined' && config.ofrecer_en_tienda !== null) {
				form.ofrecer_en_tienda = !!config.ofrecer_en_tienda
			}
			if (config.bulto_default) {
				['peso', 'alto', 'ancho', 'profundidad'].forEach(clave => {
					if (typeof config.bulto_default[clave] != 'undefined' && config.bulto_default[clave] !== null) {
						form.bulto_default[clave] = config.bulto_default[clave]
					}
				})
			}
			if (typeof config.declarar_valor != 'undefined' && config.declarar_valor !== null) {
				form.declarar_valor = !!config.declarar_valor
			}
			if (typeof config.envio_gratis_desde != 'undefined' && config.envio_gratis_desde !== null) {
				form.envio_gratis_desde = config.envio_gratis_desde
			}
			if (config.contrato_sucursal) {
				form.contrato_sucursal = String(config.contrato_sucursal)
			}
			if (config.sucursal_origen) {
				form.sucursal_origen = String(config.sucursal_origen)
			}

			return form
		},
		/**
		 * Avisa al padre con el item actualizado que devolvió el backend; si por lo que sea no
		 * vino, le pide que vuelva a cargar el listado.
		 *
		 * @param {Object} res Respuesta de axios.
		 * @returns {void}
		 */
		emitirActualizado(res) {
			if (res && res.data && res.data.integracion) {
				this.$emit('actualizado', res.data.integracion)
			} else {
				this.$emit('actualizar')
			}
		},
		/**
		 * Guarda la configuración. Los números viajan como Number y lo vacío viaja como null, que es
		 * lo que el backend entiende como "limpiar" (envío gratis por monto, contrato de sucursal,
		 * sucursal de origen).
		 *
		 * @returns {void}
		 */
		guardarConfig() {
			let self = this
			let bulto = this.form.bulto_default
			let payload = {
				ofrecer_en_tienda: !!this.form.ofrecer_en_tienda,
				bulto_default: {
					peso: Number(bulto.peso),
					alto: Number(bulto.alto),
					ancho: Number(bulto.ancho),
					profundidad: Number(bulto.profundidad),
				},
				declarar_valor: !!this.form.declarar_valor,
				envio_gratis_desde: (this.form.envio_gratis_desde === '' || this.form.envio_gratis_desde === null)
					? null
					: Number(this.form.envio_gratis_desde),
				contrato_sucursal: this.form.contrato_sucursal ? this.form.contrato_sucursal : null,
				sucursal_origen: this.form.sucursal_origen ? Number(this.form.sucursal_origen) : null,
			}

			if (!(payload.bulto_default.peso > 0) || !(payload.bulto_default.alto > 0) || !(payload.bulto_default.ancho > 0) || !(payload.bulto_default.profundidad > 0)) {
				this.$toast.error('El paquete por defecto necesita peso, alto, ancho y largo mayores a cero')
				return
			}
			if (payload.sucursal_origen !== null && !(payload.sucursal_origen > 0)) {
				this.$toast.error('La sucursal de origen tiene que ser un número')
				return
			}

			self.guardando = true
			this.$store.commit('auth/setMessage', 'Guardando la configuración de Andreani')
			this.$store.commit('auth/setLoading', true)

			this.requestAndreaniConfig(payload)
			.then(res => {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.success('Configuración de Andreani guardada')
				self.emitirActualizado(res)
			})
			.catch(err => {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.$toast.error(self.mensajeDeErrorDeIntegracion(err, 'No se pudo guardar la configuración'))
			})
		},
		/**
		 * Desconecta Andreani, previa confirmación.
		 *
		 * @returns {void}
		 */
		desconectar() {
			if (!confirm('¿Seguro que querés desconectar Andreani? Tu tienda online va a dejar de ofrecer Andreani hasta que la vuelvas a conectar. Los pedidos que ya la eligieron siguen estando.')) {
				return
			}

			let self = this
			self.desconectando = true
			this.$store.commit('auth/setMessage', 'Desconectando Andreani')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationDisconnect('andreani', { skip_global_error_event: true, skip_global_validation_toast: true })
			.then(res => {
				self.desconectando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.success('Andreani desconectado')
				self.emitirActualizado(res)
			})
			.catch(err => {
				self.desconectando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.$toast.error(self.mensajeDeErrorDeIntegracion(err, 'No se pudo desconectar Andreani'))
			})
		},
	},
}
</script>
