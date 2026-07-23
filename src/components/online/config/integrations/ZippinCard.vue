<template>
	<b-card
	no-body
	class="integration-card">
		<div class="p-3">
			<div class="d-flex justify-content-between align-items-start flex-wrap">
				<div class="m-r-10">
					<h6 class="m-b-5">Envíos (Zippin)</h6>
					<p class="text-muted m-b-0">
						Ofrecé envíos con Correo Argentino, Andreani y más, vía Zippin.
					</p>
				</div>
				<b-badge :variant="status.variant">{{ status.text }}</b-badge>
			</div>

			<div class="m-t-15 integration-card__actions">
				<btn-loader
				:block="false"
				size="sm"
				:loader="loading"
				:text="connected ? 'Reconectar' : 'Conectar'"
				:variant="connected ? 'outline-secondary' : 'primary'"
				@clicked="connect"></btn-loader>

				<btn-loader
				v-if="connected"
				:block="false"
				size="sm"
				variant="outline-danger"
				:loader="loading"
				text="Desconectar"
				@clicked="disconnect"></btn-loader>
			</div>
		</div>
	</b-card>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Tarjeta de estado y conexión de Zippin (envíos), dentro de la sección "Integraciones"
 * de Configuración online (prompt 600).
 *
 * Permite conectar (OAuth) y desconectar la cuenta propia de Zippin del comercio, y
 * muestra el estado real leído del online_configuration (zippin_connected /
 * zippin_token_expires_at).
 */
export default {
	name: 'ZippinCard',
	mixins: [IntegrationConnector],
	components: {
		BtnLoader,
	},
	props: {
		// Modelo online_configuration ya cargado (con zippin_enabled, zippin_connected, zippin_token_expires_at, etc.)
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Indicador de carga local, usado por los botones Conectar/Reconectar/Desconectar
			loading: false,
		}
	},
	computed: {
		// true si el comercio ya tiene conectada su cuenta de Zippin
		connected() {
			return !!this.model.zippin_connected
		},
		// Texto y variante de color a mostrar en el badge de estado
		status() {
			return this.integrationStatusInfo(this.model.zippin_connected, this.model.zippin_token_expires_at)
		},
	},
	methods: {
		/**
		 * Pide la URL de autorización de Zippin y redirige la pestaña actual hacia ella.
		 * Se usa tanto para la primera conexión como para reconectar (ej: si el token está por vencer).
		 *
		 * @returns {void}
		 */
		connect() {
			this.loading = true
			this.$store.commit('auth/setMessage', 'Conectando con Zippin')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationConnectUrl('zippin')
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				if (res.data && res.data.url) {
					// Redirige la pestaña actual a la pantalla de autorización de Zippin
					window.location.href = res.data.url
				} else {
					this.loading = false
					this.$toast.error('No se pudo iniciar la conexión con Zippin')
				}
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error('No se pudo iniciar la conexión con Zippin')
			})
		},
		/**
		 * Desconecta la cuenta de Zippin ya conectada, previa confirmación del usuario,
		 * y refresca el online_configuration para reflejar el nuevo estado en la tarjeta.
		 *
		 * @returns {void}
		 */
		disconnect() {
			if (!confirm('¿Seguro que querés desconectar tu cuenta de Zippin? Vas a dejar de poder ofrecer envíos con Zippin hasta que la vuelvas a conectar.')) {
				return
			}

			this.loading = true
			this.$store.commit('auth/setMessage', 'Desconectando Zippin')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationDisconnect('zippin')
			.then(() => {
				return this.refreshOnlineConfigurationModel()
			})
			.then(() => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Zippin desconectado')
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error('No se pudo desconectar Zippin')
			})
		},
	},
}
</script>
