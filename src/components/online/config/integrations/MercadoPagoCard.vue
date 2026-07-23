<template>
	<b-card
	no-body
	class="integration-card">
		<div class="p-3">
			<div class="d-flex justify-content-between align-items-start flex-wrap">
				<div class="m-r-10">
					<h6 class="m-b-5">Mercado Pago</h6>
					<p class="text-muted m-b-0">
						Cobrá con tarjeta y Mercado Pago en tu tienda.
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

			<!--
				Asesor de comisión (solo informativo): no hace cálculos, orienta al dueño
				sobre las dos palancas que definen lo que termina pagando a Mercado Pago.
				ComercioCity no es intermediario ni cobra comisión por transacción.
			-->
			<div class="m-t-15">
				<b-link
				class="integration-card__advisor-toggle"
				@click="show_advisor = !show_advisor">
					{{ show_advisor ? 'Ocultar' : '¿Cómo bajo lo que le pago a Mercado Pago?' }}
				</b-link>

				<b-collapse v-model="show_advisor">
					<div class="text-muted integration-card__advisor m-t-10">
						<p class="m-b-5">
							ComercioCity no es intermediario: vos cobrás directo con tu propia cuenta de Mercado
							Pago, y la comisión de cada cobro se la pagás vos a Mercado Pago (no te la cobramos
							nosotros).
						</p>
						<p class="m-b-5">
							Hay dos cosas que definen cuánto pagás en cada cobro:
						</p>
						<ul class="p-l-20 m-b-5">
							<li>
								El <strong>plazo de acreditación</strong> del dinero: si lo querés disponible al
								instante, es lo más caro. Cuantos más días esperás para tenerlo, más barato.
							</li>
							<li>
								El <strong>medio de pago</strong> que usa tu cliente: transferencia o dinero en
								cuenta es mucho más barato que la tarjeta de crédito.
							</li>
						</ul>
						<p class="m-b-0">
							Estos porcentajes se configuran en tu propia cuenta de Mercado Pago y cambian seguido.
							<a
							href="https://www.mercadopago.com.ar/costs"
							target="_blank"
							rel="noopener">Ver simulador oficial de Mercado Pago</a>.
						</p>
					</div>
				</b-collapse>
			</div>
		</div>
	</b-card>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Tarjeta de estado y conexión de Mercado Pago, dentro de la sección "Integraciones"
 * de Configuración online (prompt 600).
 *
 * Permite conectar (OAuth) y desconectar la cuenta propia de Mercado Pago del comercio,
 * muestra el estado real leído del online_configuration (mp_connected / mp_token_expires_at)
 * y explica, solo a modo informativo, cómo bajar la comisión que el comercio le paga
 * directamente a Mercado Pago (ComercioCity no cobra comisión por transacción).
 */
export default {
	name: 'MercadoPagoCard',
	mixins: [IntegrationConnector],
	components: {
		BtnLoader,
	},
	props: {
		// Modelo online_configuration ya cargado (con mp_enabled, mp_connected, mp_token_expires_at, etc.)
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			// Indicador de carga local, usado por los botones Conectar/Reconectar/Desconectar
			loading: false,
			// Controla si el bloque del asesor de comisión está desplegado
			show_advisor: false,
		}
	},
	computed: {
		// true si el comercio ya tiene conectada su cuenta de Mercado Pago
		connected() {
			return !!this.model.mp_connected
		},
		// Texto y variante de color a mostrar en el badge de estado
		status() {
			return this.integrationStatusInfo(this.model.mp_connected, this.model.mp_token_expires_at)
		},
	},
	methods: {
		/**
		 * Pide la URL de autorización de Mercado Pago y redirige la pestaña actual hacia ella.
		 * Se usa tanto para la primera conexión como para reconectar (ej: si el token está por vencer).
		 *
		 * @returns {void}
		 */
		connect() {
			this.loading = true
			this.$store.commit('auth/setMessage', 'Conectando con Mercado Pago')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationConnectUrl('mercadopago')
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				if (res.data && res.data.url) {
					// Redirige la pestaña actual a la pantalla de autorización de Mercado Pago
					window.location.href = res.data.url
				} else {
					this.loading = false
					this.$toast.error('No se pudo iniciar la conexión con Mercado Pago')
				}
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error('No se pudo iniciar la conexión con Mercado Pago')
			})
		},
		/**
		 * Desconecta la cuenta de Mercado Pago ya conectada, previa confirmación del usuario,
		 * y refresca el online_configuration para reflejar el nuevo estado en la tarjeta.
		 *
		 * @returns {void}
		 */
		disconnect() {
			if (!confirm('¿Seguro que querés desconectar tu cuenta de Mercado Pago? Vas a dejar de poder cobrar con Mercado Pago hasta que la vuelvas a conectar.')) {
				return
			}

			this.loading = true
			this.$store.commit('auth/setMessage', 'Desconectando Mercado Pago')
			this.$store.commit('auth/setLoading', true)

			this.requestIntegrationDisconnect('mercadopago')
			.then(() => {
				return this.refreshOnlineConfigurationModel()
			})
			.then(() => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$toast.success('Mercado Pago desconectado')
			})
			.catch(err => {
				this.loading = false
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				this.$toast.error('No se pudo desconectar Mercado Pago')
			})
		},
	},
}
</script>
<style lang="sass">
// Estilos base de .integration-card compartidos con ZippinCard: ver Index.vue
.integration-card
	.integration-card__advisor-toggle
		font-size: 13px
	.integration-card__advisor
		font-size: 13px
		background: rgba(0, 0, 0, .03)
		border-radius: 6px
		padding: 10px
</style>
