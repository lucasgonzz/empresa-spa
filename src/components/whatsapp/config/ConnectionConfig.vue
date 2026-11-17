<template>
	<div class="whatsapp-connection-config">
		<b-alert
		v-if="configurada"
		show
		variant="success"
		class="whatsapp-connection-config__estado">
			<strong>Conexión configurada</strong>
			<div v-if="phone_number_id">
				Número de WhatsApp conectado (ID en Kapso):
				<span class="whatsapp-connection-config__id">{{ phone_number_id }}</span>
			</div>
		</b-alert>

		<b-alert
		v-else
		show
		variant="warning"
		class="whatsapp-connection-config__estado">
			<strong>Pendiente: la configura el equipo de ComercioCity</strong>
			<div>
				Los datos técnicos de WhatsApp los carga ComercioCity por vos. No hace falta que
				los busques ni los copies: apenas esté lista la conexión vas a poder prender el bot desde acá.
			</div>
		</b-alert>

		<div class="whatsapp-connection-config__toggle-group">
			<b-form-checkbox
			v-model="form.is_active"
			:disabled="!configurada"
			switch>
				Bot activo
			</b-form-checkbox>
			<small class="text-muted">
				Con el bot apagado no entra ni sale ningún mensaje por WhatsApp.
				<template v-if="!configurada">
					Para prenderlo, primero tiene que estar configurada la conexión.
				</template>
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
			// Copia local editable (se sincroniza con el store al cargar/guardar). Lo único que
			// el dueño puede cambiar acá es el switch: las credenciales de WhatsApp las carga
			// ComercioCity y nunca llegan al navegador. Los campos del agente los maneja
			// AgentConfig.vue contra el mismo endpoint.
			form: {
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
		phone_number_id() {
			return (this.config && this.config.phone_number_id) || ''
		},
		/**
		 * Si la conexión está lista. La API nueva manda `conexion_configurada`; una API vieja
		 * no lo manda y entonces se deduce de que haya un `phone_number_id` cargado.
		 */
		configurada() {
			if (!this.config) {
				return false
			}
			if (this.config.conexion_configurada !== undefined && this.config.conexion_configurada !== null) {
				return !!this.config.conexion_configurada
			}
			return !!this.config.phone_number_id
		},
	},
	watch: {
		config: {
			immediate: true,
			handler(value) {
				if (!value) {
					return
				}
				this.form.is_active = !!value.is_active
			},
		},
	},
	methods: {
		/**
		 * Guarda el switch de activo (lo único editable). Usa el indicador global de
		 * carga (además del loading local del botón) según la convención del proyecto.
		 */
		save() {
			let self = this

			this.loading = true
			this.$store.commit('auth/setMessage', 'Guardando la conexión de WhatsApp')
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
				// Acá NO alcanza con un mensaje genérico: la API devuelve 403/422 con un `message`
				// que explica el motivo real (el caso típico es querer activar el bot sin la
				// conexión configurada). Si se muestra un texto fijo, el dueño ve
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
	&__estado
		margin-bottom: 18px
	&__id
		word-break: break-all
		font-weight: 600
	&__toggle-group
		margin-bottom: 18px
	&__actions
		display: flex
		justify-content: flex-end
</style>
