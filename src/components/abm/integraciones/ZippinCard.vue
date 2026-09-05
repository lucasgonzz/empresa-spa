<template>
	<b-card
	no-body
	class="integration-card">
		<div class="integration-card__body">
			<div class="integration-card__header">
				<div>
					<h6 class="integration-card__title">Envíos ({{ integracion.name }})</h6>
					<p class="integration-card__description">
						Ofrecé envíos con Correo Argentino, Andreani y más, vía Zippin.
					</p>
					<p
					v-if="connected && integracion.platform_user_id"
					class="integration-card__cuenta">
						Cuenta conectada: {{ integracion.platform_user_id }}
					</p>
				</div>
				<b-badge :variant="status.variant">{{ status.text }}</b-badge>
			</div>

			<div class="integration-card__actions">
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
 * Tarjeta de estado y conexión de Zippin (envíos), dentro de la solapa "Tienda online"
 * del ABM de Integraciones.
 *
 * Permite conectar (OAuth) y desconectar la cuenta propia de Zippin del comercio, y
 * muestra el estado real leído del listado de integraciones (`GET /api/integraciones`).
 *
 * 🔴 Antes vivía en components/online/config/integrations/ y leía el online_configuration
 * (zippin_connected / zippin_token_expires_at). Ahora lee lo mismo que la tarjeta de
 * Mercado Pago: el item que devuelve el endpoint, sin credenciales de por medio.
 */
export default {
	name: 'ZippinCard',
	mixins: [IntegrationConnector],
	components: {
		BtnLoader,
	},
	props: {
		// Item del listado de GET /api/integraciones:
		// { slug, name, grupo, connected, expires_at, platform_user_id }
		integracion: {
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
			return !!this.integracion.connected
		},
		// Texto y variante de color a mostrar en el badge de estado
		status() {
			return this.integrationStatusInfo(this.integracion.connected, this.integracion.expires_at)
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
			let self = this
			self.loading = true
			this.$store.commit('auth/setMessage', 'Conectando con Zippin')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationConnectUrl('zippin')
			.then(res => {
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				if (res.data && res.data.url) {
					// Redirige la pestaña actual a la pantalla de autorización de Zippin
					window.location.href = res.data.url
				} else {
					self.loading = false
					self.$toast.error('No se pudo iniciar la conexión con Zippin')
				}
			})
			.catch(err => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.$toast.error('No se pudo iniciar la conexión con Zippin')
			})
		},
		/**
		 * Desconecta la cuenta de Zippin ya conectada, previa confirmación del usuario, y le
		 * avisa al padre que vuelva a pedir el listado de integraciones para reflejar el
		 * nuevo estado en la tarjeta.
		 *
		 * @returns {void}
		 */
		disconnect() {
			if (!confirm('¿Seguro que querés desconectar tu cuenta de Zippin? Vas a dejar de poder ofrecer envíos con Zippin hasta que la vuelvas a conectar.')) {
				return
			}

			let self = this
			self.loading = true
			this.$store.commit('auth/setMessage', 'Desconectando Zippin')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationDisconnect('zippin')
			.then(() => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				self.$toast.success('Zippin desconectado')
				self.$emit('actualizar')
			})
			.catch(err => {
				self.loading = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.$toast.error('No se pudo desconectar Zippin')
			})
		},
	},
}
</script>
