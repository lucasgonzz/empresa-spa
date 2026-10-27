<template>
	<!--
		Botón "Cobrar con QR" de la barra de acciones de Vender (misión cobro-qr-mercado-pago,
		26/10/2026). Va al lado de "Guardar venta" y solo existe si el comercio tiene Mercado Pago
		conectado, al menos un QR de la cuenta conectada, un método de pago elegido para estos cobros
		y conexión a internet. Con una API vieja (404) o cualquier error al preguntar, no aparece y no
		avisa nada.

		La barra le pasa las clases de sus botones secundarios (vender-actions-bar__item...): el alto,
		el radio y la tipografía salen de ahí, acá solo el color.
	-->
	<div
	v-if="visible"
	class="cobrar-con-qr">
		<b-button
		class="cobrar-con-qr__btn"
		:class="{ 'cobrar-con-qr__btn--cobrado': ya_cobrado }"
		:disabled="creando || ya_cobrado"
		data-testid="vender-btn-cobrar-con-qr"
		:title="ya_cobrado ? 'El pago ya se recibió por Mercado Pago: tocá Guardar venta' : 'Cargar el total en el QR de Mercado Pago del mostrador'"
		@click="cobrar_con_qr">
			<b-spinner
			v-if="creando"
			small></b-spinner>
			<i
			v-else
			:class="ya_cobrado ? 'bi bi-check-circle' : 'bi bi-qr-code'"></i>
			<!-- En el teléfono la barra no tiene lugar para el texto largo -->
			<span class="cobrar-con-qr__texto-largo">{{ ya_cobrado ? 'Pago QR recibido' : 'Cobrar con QR' }}</span>
			<span class="cobrar-con-qr__texto-corto">QR</span>
		</b-button>
	</div>
</template>
<script>
import mercado_pago_qr from '@/mixins/mercado_pago_qr'
import vender_set_total from '@/mixins/vender_set_total'
/*
	Los mismos chequeos que corre "Guardar venta" para una venta nueva (checkear_vender()): si la
	venta no se podría guardar, no tiene sentido cobrarla. Se corren ANTES de cargar el total en el
	QR, para no dejarle al cliente un cobro que después no se puede registrar.
*/
import chequeos from '@/mixins/vender/guardar_venta/chequeos/index'
/*
	🔴 Los chequeos leen computeds que NO declaran ellos: `this.address_id` (chequeos/sucursal.js),
	`this.sale_type_id` (chequeos/sale_type.js), el cliente y el total. BtnGuardar.vue los recibe de
	este mixin (y del de mixins/vender.js que trae adentro). Sin él quedan undefined, `undefined == 0`
	da false y esos dos chequeos no frenarían nunca: el QR cobraría una venta que después no se puede
	guardar.
*/
import vender_presupuestos from '@/mixins/vender_presupuestos'
/*
	La caja por defecto del método de pago, con los mismos dos mixins y en el mismo orden que
	Caja.vue: así se aplica igual aunque el selector de caja no esté dibujado en la etapa abierta.
*/
import cajas from '@/mixins/vender/cajas'
import caja_por_defecto from '@/mixins/caja_por_defecto'

/**
 * Botón "Cobrar con QR" de Vender.
 *
 * Al tocarlo: pone como método único el método de pago del QR (vacía el reparto), recalcula el
 * total, corre los chequeos de guardar y, si pasan, carga el total en el QR del mostrador
 * (`POST /api/mercado-pago/qr/cobros`) y abre el modal "Esperando el pago"
 * (components/vender/modals/CobroQrMercadoPago.vue), que es el que consulta el estado y guarda la
 * venta cuando el cliente paga.
 *
 * La configuración (`GET /api/mercado-pago/qr`) se pide al montar (o sea, al entrar a Vender) y
 * cada vez que vuelve la conexión, y queda en el store (`vender.mercado_pago_qr_config`) para que
 * la lea también el modal.
 */
export default {
	name: 'CobrarConQr',
	mixins: [mercado_pago_qr, vender_set_total, vender_presupuestos, chequeos, cajas, caja_por_defecto],
	data() {
		return {
			// true mientras se está cargando el total en el QR (POST del cobro)
			creando: false,
			// Copia reactiva de navigator.onLine: el navegador no avisa a Vue cuando cambia
			navegador_online: typeof navigator == 'undefined' ? true : navigator.onLine,
		}
	},
	computed: {
		/**
		 * Lo que respondió GET /api/mercado-pago/qr, o null si no está disponible.
		 *
		 * @returns {Object|null}
		 */
		config() {
			return this.$store.state.vender.mercado_pago_qr_config
		},
		/**
		 * QRs de la cuenta de Mercado Pago conectada hoy (los de otra cuenta no cobran).
		 *
		 * @returns {Array}
		 */
		qrs_activos() {
			if (!this.config || !Array.isArray(this.config.qrs)) {
				return []
			}
			return this.config.qrs.filter(qr => {
				return qr && qr.activo
			})
		},
		/**
		 * Método de pago con el que se registran los cobros por QR (null si no está configurado).
		 *
		 * @returns {Number|null}
		 */
		metodo_de_pago_qr_id() {
			if (!this.config || !this.config.current_acount_payment_method_id) {
				return null
			}
			return Number(this.config.current_acount_payment_method_id)
		},
		/**
		 * Mismo criterio de "hay conexión" que guardar_venta(): el navegador dice que hay red Y el
		 * sistema no está trabajando sin conexión. El QR necesita internet sí o sí.
		 *
		 * @returns {Boolean}
		 */
		hay_conexion() {
			return this.navegador_online && !!this.$store.state.auth.online
		},
		/**
		 * Una venta guardada se actualiza por otro camino (updateSale): el QR es solo para cobrar
		 * una venta nueva.
		 *
		 * @returns {Boolean}
		 */
		editando_venta_previa() {
			return !!this.$store.getters['vender/previus_sales/editando_venta_previa']
		},
		/**
		 * true cuando el cliente ya pagó por QR y falta que la venta quede guardada (el guardado
		 * falló y el cajero tiene que tocar "Guardar venta"). No se puede volver a cobrar.
		 *
		 * @returns {Boolean}
		 */
		ya_cobrado() {
			return !!this.$store.state.vender.mercado_pago_qr_cobro_id
		},
		/**
		 * Si el botón se dibuja.
		 *
		 * @returns {Boolean}
		 */
		visible() {
			return Boolean(
				this.config
				&& this.config.conectado
				&& this.qrs_activos.length
				&& this.metodo_de_pago_qr_id
				&& this.hay_conexion
				&& this.items.length
				&& !this.editando_venta_previa
			)
		},
	},
	watch: {
		/**
		 * Al volver la conexión se vuelve a preguntar: el pedido del arranque pudo haber fallado sin
		 * internet, y mientras tanto pudieron haber creado un QR.
		 *
		 * @param {Boolean} online
		 */
		'$store.state.auth.online'(online) {
			if (online) {
				this.cargar_configuracion()
			}
		},
	},
	mounted() {
		this.cargar_configuracion()
		window.addEventListener('online', this.al_cambiar_la_red)
		window.addEventListener('offline', this.al_cambiar_la_red)
	},
	beforeDestroy() {
		window.removeEventListener('online', this.al_cambiar_la_red)
		window.removeEventListener('offline', this.al_cambiar_la_red)
	},
	methods: {
		/**
		 * Actualiza la copia de navigator.onLine y, si volvió la red, vuelve a pedir la configuración.
		 *
		 * @returns {void}
		 */
		al_cambiar_la_red() {
			this.navegador_online = navigator.onLine
			if (this.navegador_online) {
				this.cargar_configuracion()
			}
		},

		/**
		 * Pide la configuración del cobro con QR y la deja en el store.
		 *
		 * 🔴 Cualquier error (404 de una API vieja, red, 500) deja la configuración en null y NO
		 * avisa nada: el botón simplemente no aparece. Sin indicador global de carga: es un pedido de
		 * fondo y no tiene por qué tapar Vender.
		 *
		 * @returns {void}
		 */
		cargar_configuracion() {
			let self = this
			this.qr_pedir_configuracion()
			.then(res => {
				let data = res && res.data ? res.data : null
				if (data && typeof data == 'object' && typeof data.conectado != 'undefined') {
					self.$store.commit('vender/set_mercado_pago_qr_config', data)
				} else {
					self.$store.commit('vender/set_mercado_pago_qr_config', null)
				}
			})
			.catch(err => {
				console.log('Cobro con QR no disponible', err)
				self.$store.commit('vender/set_mercado_pago_qr_config', null)
			})
		},

		/**
		 * Mismo criterio con el que PaymentMethod.vue deshabilita el selector de método de pago: en
		 * un presupuesto, o con un cliente cuya venta va a la cuenta corriente, el cobro no se elige
		 * en Vender. El QR es para ventas de contado.
		 *
		 * @returns {String|null} El aviso para el cajero, o null si se puede cobrar con QR.
		 */
		motivo_para_no_cobrar() {
			let vender = this.$store.state.vender

			if (this.$store.getters['vender/en_modo_presupuesto']) {
				return 'El cobro con QR es para ventas de contado: un presupuesto no se cobra desde acá.'
			}

			if (vender.client && (!vender.omitir_en_cuenta_corriente || vender.budget)) {
				return 'Esta venta va a la cuenta corriente de ' + vender.client.name + '. El cobro con QR es para ventas de contado: prendé "Omitir cuenta corriente" o sacá el cliente.'
			}

			return null
		},

		/**
		 * Deja la venta con el método de pago del QR como método único: vacía el reparto en varios
		 * métodos y las cuotas igual que PaymentMethod.vue::set_payment_methods_null(), y recalcula el
		 * total (el método puede tener descuento o recargo).
		 *
		 * @returns {Boolean} true si el método cambió (hay que aplicar su caja por defecto).
		 */
		poner_metodo_de_pago_del_qr() {
			let cambio = Number(this.$store.state.vender.current_acount_payment_method_id) != this.metodo_de_pago_qr_id

			this.$store.commit('vender/setCurrentAcountPaymentMethodId', this.metodo_de_pago_qr_id)

			this.$store.commit('vender/setSelectedPaymentMethods', [])
			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])
			/* El reparto quedó sin efecto, así que sus montos de descuento/recargo también */
			this.$store.commit('vender/set_modal_payment_methods', [])

			/* Las cuotas son del método anterior (mismas mutaciones que limpiar_cuotas() de PaymentMethod.vue) */
			this.$store.commit('vender/set_cuota_id', 0)
			this.$store.commit('vender/set_monto_credito', 0)
			this.$store.commit('vender/set_cantidad_cuotas', 0)
			this.$store.commit('vender/set_cuota_descuento', null)
			this.$store.commit('vender/set_cuota_recargo', null)
			this.$store.commit('vender/set_cuota_monto_descuento', null)
			this.$store.commit('vender/set_cuota_monto_recargo', null)

			this.setTotal()

			return cambio
		},

		/**
		 * Click en "Cobrar con QR".
		 *
		 * @returns {void}
		 */
		cobrar_con_qr() {
			if (this.creando || this.ya_cobrado) {
				return
			}

			let motivo = this.motivo_para_no_cobrar()
			if (motivo) {
				this.$toast.error(motivo, { duration: 8000 })
				return
			}

			let cambio_el_metodo = this.poner_metodo_de_pago_del_qr()

			/*
				🔴 Un tick antes de los chequeos: la caja por defecto depende del método de pago y
				Caja.vue la aplica en su watcher, que corre después de este click. Si el método cambió,
				además se aplica acá por si el selector de caja no está dibujado en la etapa abierta (y
				solo si cambió: con el mismo método se respeta la caja que eligió el cajero).
			*/
			this.$nextTick(() => {
				if (cambio_el_metodo) {
					this.set_caja_por_defecto()
				}

				if (!this.checkear_vender()) {
					return
				}

				this.crear_cobro()
			})
		},

		/**
		 * Carga el total de la venta en el QR del mostrador y abre el modal "Esperando el pago".
		 *
		 * @returns {void}
		 */
		crear_cobro() {
			let self = this
			let vender = this.$store.state.vender

			self.creando = true
			this.$store.commit('auth/setMessage', 'Cargando el total en el QR de Mercado Pago')
			this.$store.commit('auth/setLoading', true)

			this.qr_crear_cobro({
				total: vender.total,
				caja_id: vender.caja_id || null,
				address_id: vender.address_id || null,
				description: 'Venta en el mostrador',
			})
			.then(res => {
				self.creando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')

				let cobro = res && res.data ? res.data.cobro : null
				if (!cobro || !cobro.id) {
					self.$toast.error('No se pudo cargar el total en el QR. Probá de nuevo.')
					return
				}

				self.$store.commit('vender/set_mercado_pago_qr_cobro_en_curso', cobro)
				self.$bvModal.show('cobro-qr-mercado-pago')
			})
			.catch(err => {
				self.creando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(err)
				self.$toast.error(self.qr_mensaje_de_error(err, 'No se pudo cargar el total en el QR de Mercado Pago. Probá de nuevo en un rato.'), {
					duration: 10000,
				})
			})
		},
	},
}
</script>
<style scoped lang="sass">
.cobrar-con-qr
	display: inline-flex
	align-items: center

	/* Celeste de Mercado Pago, suave como los otros botones secundarios de la barra */
	.cobrar-con-qr__btn
		color: #0076b3
		border: 1px solid #a9dcf3
		background: #f0f9fe

		&:hover:not(:disabled),
		&:focus:not(:disabled)
			color: #005f90
			border-color: #6fc6ec
			background: #e1f3fc

	/* Ya cobrado: verde, deshabilitado, para que se lea como "listo, falta guardar" */
	.cobrar-con-qr__btn--cobrado,
	.cobrar-con-qr__btn--cobrado:disabled
		color: #1e7e34
		border-color: #b7dfc3
		background: #f4fbf6
		opacity: 1

	.cobrar-con-qr__texto-corto
		display: none

/* En el teléfono la barra no entra con el texto largo: queda el ícono y "QR" */
@media (max-width: 575px)
	.cobrar-con-qr
		.cobrar-con-qr__texto-largo
			display: none
		.cobrar-con-qr__texto-corto
			display: inline
</style>
