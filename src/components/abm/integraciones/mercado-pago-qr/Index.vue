<template>
	<!--
		Tarjeta "Cobro con QR en el mostrador" (misión cobro-qr-mercado-pago, 26/10/2026), en la solapa
		Tienda online del ABM de Integraciones, al lado de la de Mercado Pago. TiendaOnline.vue la monta
		solo con Mercado Pago conectado.

		🔴 Con una API vieja (GET /api/mercado-pago/qr da 404) la tarjeta no se dibuja y no avisa nada:
		el SPA nuevo puede llegar a un cliente antes que la API nueva.
	-->
	<b-card
	v-if="disponible"
	no-body
	class="integration-card mercado-pago-qr-card"
	data-testid="integracion-mercado-pago-qr">
		<div class="integration-card__body">
			<div class="integration-card__header">
				<div>
					<h6 class="integration-card__title">Cobro con QR en el mostrador</h6>
					<p class="integration-card__description">
						Imprimí el QR y dejalo en el mostrador. Cuando cobres con QR desde Vender, el total le
						aparece al cliente al escanearlo.
					</p>
				</div>
				<b-badge
				v-if="config"
				:variant="cantidad_de_qrs_activos ? 'success' : 'secondary'">
					{{ cantidad_de_qrs_activos ? (cantidad_de_qrs_activos == 1 ? '1 QR' : cantidad_de_qrs_activos + ' QR') : 'Sin QR' }}
				</b-badge>
			</div>

			<div
			v-if="cargando"
			class="text-muted m-t-15">
				<span class="spinner-border spinner-border-sm m-r-10"></span>
				Cargando el cobro con QR
			</div>

			<b-alert
			v-else-if="error_carga"
			show
			variant="warning"
			class="m-t-15 m-b-0">
				No se pudo cargar el cobro con QR.
				<b-link @click="cargar">Volver a intentar</b-link>
			</b-alert>

			<template v-else-if="config">
				<b-alert
				:show="!config.conectado"
				variant="warning"
				class="m-t-15 m-b-0">
					Conectá tu cuenta de Mercado Pago para poder cobrar con QR.
				</b-alert>

				<metodo-de-pago
				:metodo_guardado_id="config.current_acount_payment_method_id"
				@guardado="al_guardar_metodo"></metodo-de-pago>

				<lista-de-qrs
				:qrs="config.qrs || []"
				:puede_crear="!!config.conectado"
				@crear="abrir_crear_qr"
				@eliminado="al_eliminar_qr"></lista-de-qrs>

				<ultimos-cobros
				:cobros="cobros"
				:cargando="cargando_cobros"
				@actualizar="cargar_cobros"></ultimos-cobros>
			</template>
		</div>

		<crear-qr
		ref="crear_qr"
		:qrs="config && config.qrs ? config.qrs : []"
		@creado="al_crear_qr"></crear-qr>
	</b-card>
</template>
<script>
import mercado_pago_qr from '@/mixins/mercado_pago_qr'

/**
 * Orquestador de la tarjeta "Cobro con QR en el mostrador".
 *
 * Pide la configuración (`GET /api/mercado-pago/qr`) y los últimos cobros, y reparte esos datos
 * entre sus partes:
 * - MetodoDePago: con qué método de pago se registran las ventas cobradas por QR.
 * - ListaDeQrs: los QRs creados, para descargar e imprimir o eliminar.
 * - CrearQr: el formulario (modal) para crear un QR nuevo.
 * - UltimosCobros: los últimos cobros hechos con QR.
 *
 * Los catálogos que usa el formulario (cajas, sucursales) y el selector (métodos de pago) son los
 * del store; si la pantalla se abrió sin que hayan llegado, se piden acá.
 */
export default {
	name: 'MercadoPagoQrCard',
	mixins: [mercado_pago_qr],
	components: {
		MetodoDePago: () => import('@/components/abm/integraciones/mercado-pago-qr/MetodoDePago'),
		ListaDeQrs: () => import('@/components/abm/integraciones/mercado-pago-qr/ListaDeQrs'),
		CrearQr: () => import('@/components/abm/integraciones/mercado-pago-qr/CrearQr'),
		UltimosCobros: () => import('@/components/abm/integraciones/mercado-pago-qr/UltimosCobros'),
	},
	data() {
		return {
			// false si la API no tiene el cobro con QR (404): la tarjeta no se dibuja
			disponible: true,
			// Respuesta de GET /api/mercado-pago/qr: {conectado, current_acount_payment_method_id, qrs}
			config: null,
			cargando: true,
			// true si la configuración no se pudo cargar por otro motivo que un 404
			error_carga: false,
			// Últimos cobros por QR (forma `Cobro` del contrato)
			cobros: [],
			cargando_cobros: false,
		}
	},
	computed: {
		/**
		 * QRs de la cuenta de Mercado Pago conectada hoy.
		 *
		 * @returns {Number}
		 */
		cantidad_de_qrs_activos() {
			if (!this.config || !Array.isArray(this.config.qrs)) {
				return 0
			}
			return this.config.qrs.filter(qr => {
				return qr && qr.activo
			}).length
		},
	},
	created() {
		this.cargar_catalogos_si_faltan()
		this.cargar()
	},
	methods: {
		/**
		 * Pide los catálogos que usan el selector y el formulario si todavía no están en el store.
		 *
		 * @returns {void}
		 */
		cargar_catalogos_si_faltan() {
			let catalogos = ['current_acount_payment_method', 'caja', 'address']
			catalogos.forEach(modulo => {
				let modelos = this.$store.state[modulo] ? this.$store.state[modulo].models : null
				if (!Array.isArray(modelos) || !modelos.length) {
					this.$store.dispatch(modulo + '/getModels')
				}
			})
		},

		/**
		 * Pide la configuración del cobro con QR y, si la hay, los últimos cobros.
		 *
		 * @returns {void}
		 */
		cargar() {
			let self = this
			self.cargando = true
			self.error_carga = false

			this.qr_pedir_configuracion()
			.then(res => {
				self.cargando = false
				let data = res && res.data ? res.data : null
				if (!data || typeof data != 'object' || typeof data.conectado == 'undefined') {
					/* Respuesta que no es la del contrato: se trata como API vieja */
					self.disponible = false
					return
				}
				self.config = data
				self.cargar_cobros()
			})
			.catch(err => {
				self.cargando = false
				if (err && err.response && err.response.status == 404) {
					self.disponible = false
					return
				}
				console.log(err)
				self.error_carga = true
			})
		},

		/**
		 * Pide los últimos 20 cobros por QR. Un error deja la lista como estaba, sin aviso: es
		 * información de consulta.
		 *
		 * @returns {void}
		 */
		cargar_cobros() {
			let self = this
			self.cargando_cobros = true

			this.qr_pedir_ultimos_cobros(20)
			.then(res => {
				self.cargando_cobros = false
				self.cobros = res && res.data && Array.isArray(res.data.cobros) ? res.data.cobros : []
			})
			.catch(err => {
				self.cargando_cobros = false
				console.log(err)
			})
		},

		/**
		 * El selector guardó un método de pago nuevo.
		 *
		 * @param {Number} current_acount_payment_method_id
		 * @returns {void}
		 */
		al_guardar_metodo(current_acount_payment_method_id) {
			if (this.config) {
				this.config.current_acount_payment_method_id = current_acount_payment_method_id
			}
		},

		/**
		 * Abre el formulario de "Crear QR".
		 *
		 * @returns {void}
		 */
		abrir_crear_qr() {
			if (this.$refs.crear_qr) {
				this.$refs.crear_qr.abrir()
			}
		},

		/**
		 * Se creó un QR: se lo suma a la lista sin volver a pedir todo.
		 *
		 * @param {Object} qr QR con la forma `QrCaja` del contrato.
		 * @returns {void}
		 */
		al_crear_qr(qr) {
			if (!this.config || !qr) {
				this.cargar()
				return
			}
			if (!Array.isArray(this.config.qrs)) {
				this.config.qrs = []
			}
			this.config.qrs.push(qr)
		},

		/**
		 * Se eliminó un QR: se lo saca de la lista sin volver a pedir todo.
		 *
		 * @param {Number} qr_id
		 * @returns {void}
		 */
		al_eliminar_qr(qr_id) {
			if (!this.config || !Array.isArray(this.config.qrs)) {
				return
			}
			this.config.qrs = this.config.qrs.filter(qr => {
				return qr.id != qr_id
			})
		},
	},
}
</script>
<!--
	Sin bloque <style> propio para la tarjeta: los estilos de .integration-card viven en
	TiendaOnline.vue (ver el comentario de MercadoPagoCard.vue). Los de cada parte están en su archivo.
-->
