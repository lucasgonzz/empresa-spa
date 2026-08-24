<template>
	<div class="whatsapp-connection-config">
		<p class="text-muted whatsapp-connection-config__intro">
			Estos tres datos los provee Kapso, el proveedor por el que sale y entra WhatsApp.
			Los encontrás en el panel de Kapso, en la configuración del número del negocio.
			Mientras no estén cargados, el bot no se puede activar.
		</p>

		<b-form-group
		label="Phone Number ID">
			<b-form-input
			v-model="form.phone_number_id"
			placeholder="123456789012345"></b-form-input>
			<small class="text-muted whatsapp-connection-config__hint">
				Identificador del número de WhatsApp del negocio en Kapso. No es el número de
				teléfono: es el ID que le asigna la plataforma.
			</small>
		</b-form-group>

		<b-form-group
		label="API Key de Kapso">
			<b-form-input
			v-model="form.kapso_api_key"
			placeholder="kapso_live_…"></b-form-input>
			<small class="text-muted whatsapp-connection-config__hint">
				Clave con la que el sistema le manda los mensajes a Kapso. Si la cambiás en el
				panel de Kapso, hay que actualizarla acá o el bot deja de poder responder.
			</small>
		</b-form-group>

		<b-form-group
		label="Webhook Secret">
			<b-form-input
			v-model="form.webhook_secret"
			placeholder="Secreto que configuraste en el webhook de Kapso"></b-form-input>
			<small class="text-muted whatsapp-connection-config__hint">
				Con esto se verifica la firma de cada mensaje entrante. Tiene que ser exactamente
				el mismo que está cargado en el webhook de Kapso: si no coincide, los mensajes de
				los clientes se rechazan y nunca llegan.
			</small>
		</b-form-group>

		<div class="whatsapp-connection-config__toggle-group">
			<b-form-checkbox
			v-model="form.is_active"
			switch>
				Bot activo
			</b-form-checkbox>
			<small class="text-muted">
				Con el bot apagado no entra ni sale ningún mensaje por WhatsApp. Para prenderlo
				hacen falta los tres datos de arriba cargados.
			</small>
		</div>

		<div class="whatsapp-connection-config__actions">
			<btn-loader
			text="Guardar"
			:loader="loading"
			:block="false"
			@clicked="save"></btn-loader>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			// Copia local editable de la configuración técnica (se sincroniza con el store al
			// cargar/guardar). Son los 4 campos que esta pantalla conoce; los del agente los
			// maneja AgentConfig.vue contra el mismo endpoint.
			form: {
				phone_number_id: '',
				kapso_api_key: '',
				webhook_secret: '',
				is_active: false,
			},
			loading: false,
		}
	},
	computed: {
		/**
		 * La API expone la config como lista de 0 o 1 ítem (mismo patrón que el resto del ABM).
		 */
		config() {
			return this.$store.state.whatsapp_bot_config.models[0] || null
		},
	},
	watch: {
		config: {
			immediate: true,
			handler(value) {
				if (!value) {
					return
				}
				this.form.phone_number_id = value.phone_number_id || ''
				this.form.kapso_api_key = value.kapso_api_key || ''
				this.form.webhook_secret = value.webhook_secret || ''
				this.form.is_active = !!value.is_active
			},
		},
	},
	methods: {
		/**
		 * Guarda las credenciales de Kapso y el switch de activo. Usa el indicador global de
		 * carga (además del loading local del botón) según la convención del proyecto.
		 */
		save() {
			let self = this

			this.loading = true
			this.$store.commit('auth/setMessage', 'Guardando la conexión con Kapso')
			this.$store.commit('auth/setLoading', true)

			this.$store.dispatch('whatsapp_bot_config/updateConnectionConfig', this.form)
			.then(() => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.success('Conexión guardada')
			})
			.catch(err => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				// Acá NO alcanza con un mensaje genérico: la API devuelve 422 con un `message`
				// que explica el motivo real (el caso típico es querer activar el bot sin las
				// tres credenciales cargadas). Si se muestra un texto fijo, el dueño ve
				// "no se pudo guardar" y no tiene forma de saber qué le falta.
				let message = (err.response && err.response.data && err.response.data.message) || 'No se pudo guardar la conexión'
				self.$toast.error(message)
			})
		},
	},
}
</script>
<style lang="sass">
.whatsapp-connection-config
	&__intro
		margin-bottom: 18px
	&__hint
		display: block
		margin-top: 6px
	&__toggle-group
		margin-bottom: 18px
	&__actions
		display: flex
		justify-content: flex-end
</style>
