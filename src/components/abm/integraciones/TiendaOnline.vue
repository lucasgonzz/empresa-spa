<template>
	<div class="integraciones-tienda-online">
		<p class="text-muted m-b-15">
			Conecta tu propia cuenta de Mercado Pago y de Zippin para cobrar y ofrecer envios desde tu tienda online.
		</p>

		<div
		v-if="cargando"
		class="text-muted">
			<span class="spinner-border spinner-border-sm m-r-10"></span>
			Cargando integraciones
		</div>

		<b-alert
		v-else-if="error"
		show
		variant="warning">
			No se pudo cargar el estado de las integraciones. Recarga la pagina o intentalo de nuevo en un rato.
		</b-alert>

		<b-alert
		v-else-if="!integraciones_tienda_online.length"
		show
		variant="light">
			No hay integraciones de tienda online disponibles para este comercio.
		</b-alert>

		<b-row v-else>
			<b-col
			v-for="integracion in integraciones_tienda_online"
			:key="integracion.slug"
			md="6"
			class="m-b-15">
				<mercado-pago-card
				v-if="integracion.slug == 'mercado_pago'"
				:integracion="integracion"
				@actualizar="cargarIntegraciones"></mercado-pago-card>

				<zippin-card
				v-else-if="integracion.slug == 'zippin'"
				:integracion="integracion"
				@actualizar="cargarIntegraciones"></zippin-card>
			</b-col>
		</b-row>
	</div>
</template>
<script>
import IntegrationConnector from '@/mixins/integration_connector'

/**
 * Solapa "Tienda online" del ABM de Integraciones.
 *
 * Arma el layout de las tarjetas de integracion del grupo `tienda_online` (Mercado Pago y
 * Zippin) leyendo el estado real de `GET /api/integraciones`. Toda la logica de conectar y
 * desconectar vive en cada tarjeta; aca solo se pide el listado y se lo vuelve a pedir
 * cuando una tarjeta avisa que cambio algo.
 *
 * 🔴 El listado NUNCA trae tokens: el endpoint devuelve slug, nombre, grupo, si esta
 * conectada, cuando vence y el id de la cuenta en la plataforma. Las credenciales no salen
 * del backend, que es justamente el motivo por el que esta pantalla reemplaza a los campos
 * "Clave publica" / "Clave privada" que estaban en el ABM de metodos de pago.
 */
export default {
	name: 'AbmIntegracionesTiendaOnline',
	mixins: [IntegrationConnector],
	components: {
		MercadoPagoCard: () => import('@/components/abm/integraciones/MercadoPagoCard'),
		ZippinCard: () => import('@/components/abm/integraciones/ZippinCard'),
	},
	data() {
		return {
			// Listado completo devuelto por GET /api/integraciones (todos los grupos)
			integraciones: [],
			cargando: true,
			error: false,
		}
	},
	computed: {
		// Solo las del grupo que muestra esta solapa
		integraciones_tienda_online() {
			return this.integraciones.filter(integracion => {
				return integracion.grupo == 'tienda_online'
			})
		},
	},
	created() {
		this.cargarIntegraciones()
		this.avisarRetornoOauth()
	},
	methods: {
		/**
		 * Pide el listado de integraciones del comercio y lo deja en `integraciones`.
		 *
		 * @returns {void}
		 */
		cargarIntegraciones() {
			let self = this
			self.cargando = true
			self.error = false

			this.requestIntegraciones()
			.then(res => {
				self.cargando = false
				if (res.data && res.data.integraciones) {
					self.integraciones = res.data.integraciones
				} else {
					self.integraciones = []
				}
			})
			.catch(err => {
				self.cargando = false
				self.error = true
				self.integraciones = []
				console.log(err)
			})
		},
		/**
		 * Muestra el resultado del OAuth cuando el proveedor devuelve al usuario a esta
		 * pantalla con ?mp=ok|error o ?zippin=ok|error, y limpia el query param para que
		 * el aviso no se repita si el usuario recarga.
		 *
		 * No hace falta refrescar nada a mano: `cargarIntegraciones()` ya salio a pedir el
		 * estado real en el mismo created.
		 *
		 * @returns {void}
		 */
		avisarRetornoOauth() {
			let mp_status = this.$route.query.mp
			let zippin_status = this.$route.query.zippin

			if (!mp_status && !zippin_status) {
				return
			}

			if (mp_status == 'ok') {
				this.$toast.success('Mercado Pago conectado correctamente')
			} else if (mp_status == 'error') {
				this.$toast.error('No se pudo conectar Mercado Pago. Intenta nuevamente')
			}

			if (zippin_status == 'ok') {
				this.$toast.success('Zippin conectado correctamente')
			} else if (zippin_status == 'error') {
				this.$toast.error('No se pudo conectar Zippin. Intenta nuevamente')
			}

			this.limpiarQueryParamsOauth()
		},
		/**
		 * Saca los query params ?mp / ?zippin de la URL actual sin recargar la pagina,
		 * conservando cualquier otro que traiga la ruta.
		 *
		 * @returns {void}
		 */
		limpiarQueryParamsOauth() {
			let query = Object.assign({}, this.$route.query)
			delete query.mp
			delete query.zippin
			this.$router.replace({ query }).catch(() => {})
		},
	},
}
</script>
<style lang="sass">
.integraciones-tienda-online
	width: 100%

// Estilos base compartidos por las tarjetas de integracion (Mercado Pago y Zippin).
// Vienen de components/online/config/integrations/Index.vue, que era donde vivian antes
// de que las integraciones se mudaran al ABM.
.integration-card
	height: 100%
	.integration-card__actions
		display: flex
		flex-wrap: wrap
		gap: 10px
	.integration-card__cuenta
		font-size: 12px
</style>
