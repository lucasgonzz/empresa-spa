<template>
	<!--
		Cobro con el QR de Mercado Pago en la barra de acciones de Vender (misión cobro-qr-mercado-pago,
		26/10/2026), al lado de "Guardar venta". Tiene tres caras:

		1. "Cobrar con QR": Mercado Pago conectado, un QR de la cuenta conectada, el método de pago de
		   estos cobros elegido, conexión, renglones en la venta, venta en pesos y sin presupuesto.
		2. "Pago QR recibido": la venta ya tiene un cobro por QR pagado y falta guardarla. Despliega la
		   opción de quitar el cobro de esta venta (por ejemplo, si la API lo rechazó al guardar).
		3. "Pago QR sin venta": hay cobros que el cliente pagó y no quedaron en ninguna venta. Abre la
		   lista para usarlos en la venta de la pantalla.

		Con una API vieja (404) o cualquier error al preguntar, no aparece ninguna y no avisa nada. La
		barra le pasa las clases de sus botones secundarios (vender-actions-bar__item...): el alto, el
		radio y la tipografía salen de ahí, acá solo el color.
	-->
	<div
	v-if="mostrar_boton || ya_cobrado || mostrar_aviso_sin_venta"
	class="cobrar-con-qr">

		<!-- ============================== PAGOS QR SIN VENTA ============================== -->
		<b-button
		v-if="mostrar_aviso_sin_venta"
		class="cobrar-con-qr__btn cobrar-con-qr__btn--sin-venta"
		data-testid="vender-btn-pagos-qr-sin-venta"
		title="Hay pagos por QR que no quedaron en ninguna venta"
		@click="abrir_pagos_sin_venta">
			<i class="bi bi-exclamation-triangle"></i>
			<span class="cobrar-con-qr__texto-largo">{{ texto_aviso_sin_venta }}</span>
			<span class="cobrar-con-qr__texto-corto">Pago QR</span>
		</b-button>

		<!-- ============================== PAGO QR RECIBIDO ============================== -->
		<b-dropdown
		v-if="ya_cobrado"
		dropup
		right
		no-caret
		class="cobrar-con-qr__cobrado"
		toggle-class="cobrar-con-qr__btn cobrar-con-qr__btn--cobrado"
		data-testid="vender-btn-pago-qr-recibido">
			<template #button-content>
				<i class="bi bi-check-circle"></i>
				<span class="cobrar-con-qr__texto-largo">Pago QR recibido</span>
				<span class="cobrar-con-qr__texto-corto">QR</span>
			</template>
			<b-dropdown-text class="cobrar-con-qr__cobrado-texto">
				<template v-if="cobro_de_esta_venta">
					Ya se cobró <strong>{{ price(cobro_de_esta_venta.total) }}</strong> por Mercado Pago.
				</template>
				<template v-else>
					Ya se cobró por Mercado Pago.
				</template>
				Tocá <strong>Guardar venta</strong> para registrarla.
				<span
				v-if="cobro_de_esta_venta && !totales_coinciden(cobro_de_esta_venta)"
				class="cobrar-con-qr__no-coincide">
					El total de la venta ({{ price(total_de_la_venta) }}) no coincide: tienen que ser iguales para guardar.
				</span>
			</b-dropdown-text>
			<b-dropdown-divider></b-dropdown-divider>
			<b-dropdown-item-button
			variant="danger"
			data-testid="vender-quitar-cobro-qr"
			@click="quitar_cobro_de_esta_venta">
				Quitar el cobro QR de esta venta
			</b-dropdown-item-button>
		</b-dropdown>

		<!-- ============================== COBRAR CON QR ============================== -->
		<b-button
		v-else-if="mostrar_boton"
		class="cobrar-con-qr__btn"
		:disabled="creando"
		data-testid="vender-btn-cobrar-con-qr"
		title="Cargar el total en el QR de Mercado Pago del mostrador"
		@click="cobrar_con_qr">
			<b-spinner
			v-if="creando"
			small></b-spinner>
			<i
			v-else
			class="bi bi-qr-code"></i>
			<!-- En el teléfono la barra no tiene lugar para el texto largo -->
			<span class="cobrar-con-qr__texto-largo">Cobrar con QR</span>
			<span class="cobrar-con-qr__texto-corto">QR</span>
		</b-button>

		<!-- Lista de pagos QR sin venta -->
		<b-modal
		id="cobro-qr-pagos-sin-venta"
		title="Pagos QR sin venta"
		hide-footer
		centered>
			<p class="cobrar-con-qr-lista__intro">
				El cliente pagó por QR, pero el pago no quedó en ninguna venta. Usalo en la venta que tenés en
				pantalla: el total de la venta y el del pago tienen que ser iguales para poder guardarla.
			</p>
			<p class="cobrar-con-qr-lista__total">
				Total de la venta en pantalla: <strong>{{ price(total_de_la_venta) }}</strong>
			</p>

			<p
			v-if="!pagos_sin_venta.length"
			class="cobrar-con-qr-lista__vacio">
				No hay pagos QR sin venta.
			</p>

			<ul
			v-else
			class="cobrar-con-qr-lista__items">
				<li
				v-for="cobro in pagos_sin_venta"
				:key="cobro.id"
				class="cobrar-con-qr-lista__item"
				data-testid="vender-pago-qr-sin-venta">
					<div class="cobrar-con-qr-lista__texto">
						<strong class="cobrar-con-qr-lista__monto">{{ price(cobro.total) }}</strong>
						<span class="cobrar-con-qr-lista__dato">{{ fecha_del_cobro(cobro) }}<span v-if="cobro.qr && cobro.qr.name"> · {{ cobro.qr.name }}</span></span>
						<span
						v-if="!totales_coinciden(cobro)"
						class="cobrar-con-qr__no-coincide">
							No coincide con el total de la venta ({{ price(total_de_la_venta) }}).
						</span>
					</div>
					<b-button
					size="sm"
					variant="primary"
					data-testid="vender-usar-pago-qr"
					@click="usar_en_esta_venta(cobro)">
						Usar en esta venta
					</b-button>
				</li>
			</ul>

			<div class="cobrar-con-qr-lista__acciones">
				<b-button
				variant="outline-secondary"
				@click="$bvModal.hide('cobro-qr-pagos-sin-venta')">
					Cerrar
				</b-button>
			</div>
		</b-modal>
	</div>
</template>
<script>
import moment from 'moment'
/*
	Foto y restauración del cobro de la venta, método único y pagos QR sin venta (trae adentro los
	pedidos de mixins/mercado_pago_qr.js y setTotal()).
*/
import cobro_qr from '@/mixins/vender/cobro_qr'
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
 * Al tocarlo: saca la foto del cobro de la venta, pone como método único el método de pago del QR
 * (vacía el reparto), recalcula el total, corre los chequeos de guardar y, si pasan, carga el total
 * en el QR del mostrador (`POST /api/mercado-pago/qr/cobros`) y abre el modal "Esperando el pago"
 * (components/vender/modals/CobroQrMercadoPago.vue), que es el que consulta el estado y guarda la
 * venta cuando el cliente paga. Si el cobro no se llega a crear, la venta vuelve a la foto.
 *
 * La configuración (`GET /api/mercado-pago/qr`) y los pagos QR sin venta se piden al montar (o sea,
 * al entrar a Vender), cada vez que vuelve la conexión, y los pagos sin venta además después de cada
 * venta guardada. Quedan en el store para que los lea también el modal.
 */
export default {
	name: 'CobrarConQr',
	mixins: [cobro_qr, vender_presupuestos, chequeos, cajas, caja_por_defecto],
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
		 * true cuando lo que se arma es un presupuesto (toggle prendido o presupuesto cargado).
		 *
		 * @returns {Boolean}
		 */
		en_modo_presupuesto() {
			return !!this.$store.getters['vender/en_modo_presupuesto']
		},
		/**
		 * El QR cobra en pesos: una venta en dólares no se cobra por acá. La moneda se lee igual que
		 * moneda_de_cuenta_normalizada() (aviso_cambio_de_cuenta.js): vacía o inválida es pesos (1).
		 *
		 * @returns {Boolean}
		 */
		es_venta_en_pesos() {
			let moneda = Number(this.$store.state.vender.moneda_id)
			if (!isFinite(moneda) || moneda < 1) {
				return true
			}
			return Math.floor(moneda) === 1
		},
		/**
		 * Total actual de la venta en pantalla.
		 *
		 * @returns {Number}
		 */
		total_de_la_venta() {
			return Number(this.$store.state.vender.total) || 0
		},
		/**
		 * true cuando la venta ya tiene un cobro por QR pagado y falta guardarla.
		 *
		 * @returns {Boolean}
		 */
		ya_cobrado() {
			return !!this.$store.state.vender.mercado_pago_qr_cobro_id && !this.editando_venta_previa
		},
		/**
		 * El cobro pagado de esta venta (para mostrar su total), si se lo tiene a mano.
		 *
		 * @returns {Object|null}
		 */
		cobro_de_esta_venta() {
			let id = this.$store.state.vender.mercado_pago_qr_cobro_id
			if (!id) {
				return null
			}
			let en_curso = this.$store.state.vender.mercado_pago_qr_cobro_en_curso
			if (en_curso && en_curso.id == id) {
				return en_curso
			}
			let de_la_lista = (this.$store.state.vender.mercado_pago_qr_pagados_sin_venta || []).find(cobro => {
				return cobro.id == id
			})
			return de_la_lista || null
		},
		/**
		 * Pagos QR sin venta que se pueden usar (sin el que ya está puesto en esta venta).
		 *
		 * @returns {Array}
		 */
		pagos_sin_venta() {
			let id = this.$store.state.vender.mercado_pago_qr_cobro_id
			return (this.$store.state.vender.mercado_pago_qr_pagados_sin_venta || []).filter(cobro => {
				return cobro && cobro.id != id
			})
		},
		/**
		 * Si se muestra el aviso de pagos QR sin venta.
		 *
		 * @returns {Boolean}
		 */
		mostrar_aviso_sin_venta() {
			return Boolean(
				this.pagos_sin_venta.length
				&& this.hay_conexion
				&& !this.ya_cobrado
				&& !this.editando_venta_previa
			)
		},
		/**
		 * Texto del aviso: el monto si es uno solo, la cantidad si son varios.
		 *
		 * @returns {String}
		 */
		texto_aviso_sin_venta() {
			if (this.pagos_sin_venta.length == 1) {
				return 'Pago QR sin venta (' + this.price(this.pagos_sin_venta[0].total) + ')'
			}
			return this.pagos_sin_venta.length + ' pagos QR sin venta'
		},
		/**
		 * Si se dibuja el botón "Cobrar con QR".
		 *
		 * @returns {Boolean}
		 */
		mostrar_boton() {
			return Boolean(
				this.config
				&& this.config.conectado
				&& this.qrs_activos.length
				&& this.metodo_de_pago_qr_id
				&& this.hay_conexion
				&& this.items.length
				&& !this.editando_venta_previa
				&& !this.en_modo_presupuesto
				&& this.es_venta_en_pesos
				&& !this.ya_cobrado
			)
		},
	},
	watch: {
		/**
		 * Al volver la conexión se vuelve a preguntar: el pedido del arranque pudo haber fallado sin
		 * internet, y mientras tanto pudieron haber creado un QR o quedado pagos sin venta.
		 *
		 * @param {Boolean} online
		 */
		'$store.state.auth.online'(online) {
			if (online) {
				this.cargar_configuracion()
			}
		},
		/**
		 * Después de cada venta guardada con el servidor (la action `vender` commitea la venta), se
		 * vuelve a mirar si quedan pagos QR sin venta: el que se acaba de usar ya tiene venta.
		 *
		 * @param {Object|null} venta
		 */
		'$store.state.vender.sale'(venta) {
			if (venta && venta.id && this.config) {
				this.qr_refrescar_pagados_sin_venta()
			}
		},
		/**
		 * Cuando un cobro pagado deja de estar en la venta sin que el servidor la haya guardado (el
		 * botón Limpiar, por ejemplo), pasa a ser un pago QR sin venta: se refresca la lista para que
		 * el aviso aparezca enseguida.
		 *
		 * @param {Number|null} nuevo
		 * @param {Number|null} anterior
		 */
		'$store.state.vender.mercado_pago_qr_cobro_id'(nuevo, anterior) {
			if (anterior && !nuevo && this.config && this.hay_conexion) {
				this.qr_refrescar_pagados_sin_venta()
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
		 * Pide la configuración del cobro con QR y la deja en el store; si está, pide también los
		 * pagos QR sin venta.
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
					self.qr_refrescar_pagados_sin_venta()
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
		 * Por qué esta venta no se puede cobrar (ni recibir un pago) por QR. El presupuesto y los
		 * dólares ya esconden el botón, pero "Usar en esta venta" se ofrece igual y pasa por acá. Con
		 * un cliente cuya venta va a la cuenta corriente vale el mismo criterio con el que
		 * PaymentMethod.vue deshabilita el selector de método de pago.
		 *
		 * @returns {String|null} El aviso para el cajero, o null si se puede.
		 */
		motivo_para_no_cobrar() {
			let vender = this.$store.state.vender

			if (this.en_modo_presupuesto) {
				return 'El cobro con QR es para ventas de contado: un presupuesto no se cobra desde acá.'
			}

			if (!this.es_venta_en_pesos) {
				return 'El cobro con QR es solo para ventas en pesos.'
			}

			if (vender.client && (!vender.omitir_en_cuenta_corriente || vender.budget)) {
				return 'Esta venta va a la cuenta corriente de ' + vender.client.name + '. El cobro con QR es para ventas de contado: prendé "Omitir cuenta corriente" o sacá el cliente.'
			}

			return null
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

			let cambio_el_metodo = this.qr_poner_metodo_unico(this.metodo_de_pago_qr_id)

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

				/* Si la venta no se puede guardar, no se cobra y la venta vuelve a como estaba */
				if (!this.checkear_vender()) {
					this.qr_restaurar_foto_del_pago()
					return
				}

				this.crear_cobro()
			})
		},

		/**
		 * Carga el total de la venta en el QR del mostrador y abre el modal "Esperando el pago". Si
		 * el cobro no se crea, la venta vuelve a la foto.
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
					self.qr_restaurar_foto_del_pago()
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
				self.qr_restaurar_foto_del_pago()
				self.$toast.error(self.qr_mensaje_de_error(err, 'No se pudo cargar el total en el QR de Mercado Pago. Probá de nuevo en un rato.'), {
					duration: 10000,
				})
			})
		},

		/**
		 * Si el total de la venta en pantalla es el del cobro (la API los compara con 1 centavo de
		 * tolerancia).
		 *
		 * @param {Object} cobro
		 * @returns {Boolean}
		 */
		totales_coinciden(cobro) {
			return Math.abs((Number(cobro.total) || 0) - this.total_de_la_venta) <= 0.01
		},

		/**
		 * Fecha de un pago QR sin venta.
		 *
		 * @param {Object} cobro
		 * @returns {String}
		 */
		fecha_del_cobro(cobro) {
			let valor = cobro.paid_at || cobro.created_at
			return valor ? moment(valor).format('DD/MM HH:mm') : ''
		},

		/**
		 * Abre la lista de pagos QR sin venta (antes la refresca, por si alguno ya se usó en otra
		 * pestaña).
		 *
		 * @returns {void}
		 */
		abrir_pagos_sin_venta() {
			this.qr_refrescar_pagados_sin_venta()
			this.$bvModal.show('cobro-qr-pagos-sin-venta')
		},

		/**
		 * "Usar en esta venta": pone el método del cobro como método único, le ata el cobro a la venta
		 * y deja el botón en "Pago QR recibido". Al guardar, la API exige que el total coincida.
		 *
		 * @param {Object} cobro Cobro pagado sin venta.
		 * @returns {void}
		 */
		usar_en_esta_venta(cobro) {
			let motivo = this.motivo_para_no_cobrar()
			if (motivo) {
				this.$toast.error(motivo, { duration: 8000 })
				return
			}

			if (!this.items.length) {
				this.$toast.error('Cargá primero los artículos de la venta.')
				return
			}

			let metodo_id = cobro.current_acount_payment_method_id || this.metodo_de_pago_qr_id
			if (!metodo_id) {
				this.$toast.error('Elegí el método de pago de los cobros por QR en Integraciones → Tienda online.')
				return
			}

			let cambio_el_metodo = this.qr_poner_metodo_unico(Number(metodo_id))

			this.$store.commit('vender/setMercadoPagoQrCobroId', cobro.id)
			this.$store.commit('vender/set_mercado_pago_qr_cobro_en_curso', cobro)

			this.$bvModal.hide('cobro-qr-pagos-sin-venta')

			this.$nextTick(() => {
				if (cambio_el_metodo) {
					this.set_caja_por_defecto()
				}

				/* El total se mira después de poner el método: puede tener descuento o recargo */
				if (this.totales_coinciden(cobro)) {
					this.$toast.success('Pago QR agregado a la venta. Tocá Guardar venta.')
				} else {
					this.$toast.warning('Pago QR agregado, pero el total de la venta (' + this.price(this.total_de_la_venta) + ') no coincide con el pago (' + this.price(cobro.total) + '): tienen que ser iguales para guardar.', {
						duration: 12000,
					})
				}
			})
		},

		/**
		 * "Quitar el cobro QR de esta venta": la venta vuelve a guardarse sin él (y al cobro de antes,
		 * si hay foto). El pago no se pierde: queda como pago QR sin venta para usarlo después.
		 *
		 * @returns {void}
		 */
		quitar_cobro_de_esta_venta() {
			this.$store.commit('vender/setMercadoPagoQrCobroId', null)
			this.$store.commit('vender/set_mercado_pago_qr_cobro_en_curso', null)

			if (!this.qr_restaurar_foto_del_pago()) {
				this.setTotal()
			}

			/* La lista de pagos sin venta la refresca el watcher del id, que acaba de pasar a null */
			this.$toast.info('Se quitó el cobro QR de esta venta. El pago queda como "Pago QR sin venta" para usarlo después.', {
				duration: 8000,
			})
		},
	},
}
</script>
<style scoped lang="sass">
.cobrar-con-qr
	display: inline-flex
	align-items: center
	gap: 8px

	/* Celeste de Mercado Pago, suave como los otros botones secundarios de la barra */
	::v-deep .cobrar-con-qr__btn
		color: #0076b3
		border: 1px solid #a9dcf3
		background: #f0f9fe

		&:hover:not(:disabled),
		&:focus:not(:disabled)
			color: #005f90
			border-color: #6fc6ec
			background: #e1f3fc

	/* Ya cobrado: verde, para que se lea como "listo, falta guardar" */
	::v-deep .cobrar-con-qr__btn--cobrado
		color: #1e7e34
		border-color: #b7dfc3
		background: #f4fbf6

		&:hover:not(:disabled),
		&:focus:not(:disabled)
			color: #155724
			border-color: #8fd19e
			background: #e8f7ec

	/* Pago sin venta: ámbar, tiene que verse sin gritar */
	::v-deep .cobrar-con-qr__btn--sin-venta
		color: #8a5a00
		border-color: #f3d38b
		background: #fff8e6

		&:hover:not(:disabled),
		&:focus:not(:disabled)
			color: #6d4700
			border-color: #ecc05c
			background: #fff1cc

	::v-deep .cobrar-con-qr__cobrado-texto
		min-width: 260px
		max-width: 320px
		font-size: 13px
		line-height: 1.45
		white-space: normal

	::v-deep .cobrar-con-qr__texto-corto
		display: none

.cobrar-con-qr__no-coincide
	display: block
	margin-top: 4px
	font-size: 12px
	color: #a35d00

/* En el teléfono la barra no entra con el texto largo: queda el ícono y una palabra */
@media (max-width: 575px)
	.cobrar-con-qr
		::v-deep .cobrar-con-qr__texto-largo
			display: none
		::v-deep .cobrar-con-qr__texto-corto
			display: inline
</style>
<style lang="sass">
/* El modal de la lista se dibuja fuera de la barra (bootstrap-vue lo lleva al body): estilos globales */
#cobro-qr-pagos-sin-venta
	.cobrar-con-qr-lista__intro
		margin: 0 0 8px
		font-size: 14px
		line-height: 1.5
		color: var(--color-text-primary)

	.cobrar-con-qr-lista__total
		margin: 0 0 12px
		font-size: 14px
		color: var(--color-text-secondary)

	.cobrar-con-qr-lista__vacio
		margin: 0
		font-size: 14px
		color: var(--color-text-secondary)

	.cobrar-con-qr-lista__items
		list-style: none
		margin: 0
		padding: 0

	.cobrar-con-qr-lista__item
		display: flex
		flex-wrap: wrap
		justify-content: space-between
		align-items: center
		gap: 10px
		padding: 10px 0
		border-top: 1px solid var(--color-border-secondary)

		&:first-child
			border-top: 0

	.cobrar-con-qr-lista__texto
		display: flex
		flex-direction: column
		min-width: 0
		flex: 1

	.cobrar-con-qr-lista__monto
		font-size: 16px
		color: var(--color-text-primary)

	.cobrar-con-qr-lista__dato
		font-size: 13px
		color: var(--color-text-secondary)

	.cobrar-con-qr__no-coincide
		display: block
		margin-top: 4px
		font-size: 12px
		color: #a35d00

	.cobrar-con-qr-lista__acciones
		display: flex
		justify-content: flex-end
		margin-top: 14px

// En el teléfono el botón de cada pago va a todo el ancho, abajo del monto
@media (max-width: 575px)
	#cobro-qr-pagos-sin-venta
		.cobrar-con-qr-lista__item
			.btn
				width: 100%
</style>
