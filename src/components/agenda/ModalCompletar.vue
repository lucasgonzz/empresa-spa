<template>
	<b-modal
	id="agenda-completar"
	title="Marcar como hecha"
	size="lg"
	modal-class="agenda-completar"
	@show="on_show">

		<template v-if="ocurrencia">

			<!-- Que tarea se esta cerrando y para que fecha: el modal se abre desde una fila y esa fila ya no se ve. -->
			<div class="agenda-completar__tarea">
				<div class="agenda-completar__detalle">
					{{ ocurrencia.detalle }}
				</div>
				<div class="agenda-completar__fecha">
					{{ texto_fecha }}
				</div>
			</div>

			<div class="agenda-completar__concepto">
				<i class="bi bi-cash-coin"></i>
				<span>Sub categoría del gasto</span>
				<strong>{{ nombre_concepto }}</strong>
			</div>

			<div class="agenda-completar__monto-fila">
				<b-form-group
				label="Monto"
				class="agenda-completar__monto">
					<b-form-input
					type="number"
					min="0"
					step="0.01"
					v-model.number="expense.amount"
					data-testid="agenda-monto"
					@change="al_cambiar_monto"></b-form-input>
				</b-form-group>

				<!-- Sin la extension de dolares el gasto es siempre en pesos (moneda 1) y el select no se muestra. -->
				<b-form-group
				v-if="hasExtencion('ventas_en_dolares')"
				label="Moneda"
				class="agenda-completar__moneda">
					<b-form-select
					v-model="expense.moneda_id"
					:options="opciones_moneda"
					data-testid="agenda-moneda"
					@change="al_cambiar_moneda"></b-form-select>
				</b-form-group>
			</div>

			<multi-payment-methods
			v-model="expense.payment_methods"
			:payment_method_factory="payment_method_factory"
			:parent_modal_id="'agenda-completar'"
			:show_decimal_help="false"
			:address_id="address_id"
			:base_moneda="base_moneda"
			:show_cash_box="true"
			@changed="on_payment_methods_changed"></multi-payment-methods>

			<div class="agenda-completar__extras">
				<b-form-group
				label="Importe IVA (opcional)"
				description="Siempre en pesos. Impacta en el IVA crédito de Reportes."
				class="agenda-completar__iva">
					<b-form-input
					type="number"
					min="0"
					step="0.01"
					v-model.number="expense.importe_iva"
					data-testid="agenda-importe-iva"></b-form-input>
				</b-form-group>
				<b-form-group
				label="Observaciones (opcional)"
				class="agenda-completar__observaciones">
					<b-form-input
					v-model="expense.observations"
					data-testid="agenda-observaciones"></b-form-input>
				</b-form-group>
			</div>

		</template>

		<template #modal-footer>
			<div class="agenda-completar__footer">
				<b-button
				class="btn-modulo"
				variant="outline-secondary"
				:disabled="enviando"
				data-testid="agenda-sin-gasto"
				@click="sin_gasto">
					Hecha sin registrar el gasto
				</b-button>
				<b-button
				class="btn-modulo"
				variant="primary"
				:disabled="enviando"
				data-testid="agenda-confirmar-gasto"
				@click="confirmar">
					<b-spinner
					v-if="enviando"
					small
					class="m-r-5"></b-spinner>
					Confirmar y registrar el gasto
				</b-button>
			</div>
		</template>

	</b-modal>
</template>
<script>
/*
	"Marcar como hecha" de una tarea CON gasto asociado: pregunta como se pago y manda todo junto
	a POST pending-completed (seccion 2 del plan). La API crea el PendingCompleted y el gasto en
	una sola transaccion; un 422 (caja sin apertura, falta el metodo) no deja nada escrito, y el
	modal se queda abierto con lo cargado para corregir.

	El bloque de metodos de pago es el MISMO que usan Gastos, cuenta corriente, Vender y
	comisiones (components/common/payment-methods), con la configuracion del modal de Gastos
	(components/expenses/modals/payment-methods/Index.vue): factory, sincronizacion de cotizacion
	y sucursal por defecto se copian de ahi y no se reinventan.

	Monto y metodos de pago: el monto se precarga con el estimado de la tarea y arranca la primera
	fila con ese valor. Con una sola fila, editar el monto la actualiza y editar la fila actualiza
	el monto; con varias filas el monto pasa a ser la suma, y si el usuario lo pisa a mano y no
	coincide, se avisa antes de mandar en vez de elegir uno de los dos en silencio.
*/
import MultiPaymentMethods from '@/components/common/payment-methods/Index'
import metodos_de_pago_validacion from '@/mixins/metodos_de_pago_validacion'
import { fecha_relativa } from '@/components/agenda/fechas_agenda'

export default {
	mixins: [metodos_de_pago_validacion],
	components: {
		MultiPaymentMethods,
	},
	data() {
		return {
			expense: this.expense_vacio(),
			enviando: false,
		}
	},
	computed: {
		ocurrencia() {
			return this.$store.state.agenda.ocurrencia_a_completar
		},
		hoy() {
			return this.$store.state.agenda.hoy
		},
		texto_fecha() {
			return fecha_relativa(this.ocurrencia.fecha, this.hoy)
		},
		nombre_concepto() {
			if (this.ocurrencia.expense_concept && this.ocurrencia.expense_concept.name) {
				return this.ocurrencia.expense_concept.name
			}
			let concepto = this.$store.state.expense_concept.models.find(c => {
				return Number(c.id) === Number(this.ocurrencia.expense_concept_id)
			})
			return concepto ? concepto.name : '—'
		},
		opciones_moneda() {
			return this.$store.state.moneda.models.map(moneda => {
				return { value: moneda.id, text: moneda.name }
			})
		},
		/**
		 * Sucursal por defecto de las cajas del modal: la que esta puesta en Vender.
		 *
		 * 🔴 Sale del STORE y no de la cookie, y no es un detalle de estilo. Un computed cuya unica
		 * fuente es `this.$cookies.get(...)` NO TIENE NINGUNA DEPENDENCIA REACTIVA: Vue lo evalua la
		 * primera vez y se queda con ese valor mientras el componente viva. Si el usuario cambia la
		 * sucursal en Vender con esta pantalla ya montada, el modal seguiria ofreciendo las cajas de
		 * la sucursal anterior. Medido el 4/9/2026 escribiendo la cookie con el modal montado: el
		 * select no se movio.
		 *
		 * `vender.address_id` es la misma sucursal --el setter de mixins/vender.js escribe el store
		 * y la cookie a la vez, y start_methods.js lo inicializa al entrar-- pero reactiva. La
		 * cookie queda de respaldo por si el store todavia no se inicializo.
		 *
		 * (Copiado tal cual del modal de metodos de pago de Gastos, que es la referencia.)
		 *
		 * @returns {number|null}
		 */
		address_id() {
			let del_store = Number(this.$store.state.vender.address_id) || 0
			if (del_store) {
				return del_store
			}

			let de_la_cookie = Number(this.$cookies.get('address_id')) || 0
			if (de_la_cookie) {
				return de_la_cookie
			}

			return null
		},
		/**
		 * Moneda del gasto usada como base para metodos de pago y validacion de cajas.
		 * Sin extension ventas_en_dolares siempre es pesos (id 1); el campo no se muestra.
		 *
		 * @returns {number}
		 */
		base_moneda() {
			if (!this.hasExtencion('ventas_en_dolares')) {
				return 1
			}

			let moneda_id = Number(this.expense.moneda_id)
			if (Number.isNaN(moneda_id) || !moneda_id) {
				return 1
			}

			return moneda_id
		},
	},
	methods: {
		expense_vacio() {
			return {
				amount: 0,
				moneda_id: 1,
				importe_iva: 0,
				observations: '',
				payment_methods: [],
			}
		},
		/**
		 * Cada apertura arranca de cero con el monto estimado de la tarea y UNA fila de pago con
		 * ese monto (efectivo, la caja la propone el bloque por sucursal). Nada se arrastra de la
		 * tarea anterior.
		 */
		on_show() {
			let ocurrencia = this.ocurrencia
			let monto = ocurrencia ? (Number(ocurrencia.expense_amount) || 0) : 0

			this.expense = this.expense_vacio()
			this.expense.amount = monto
			this.expense.moneda_id = 1
			this.expense.payment_methods = [Object.assign(this.payment_method_factory(), {
				amount: monto > 0 ? monto : '',
			})]
			this.enviando = false

			this.$nextTick(() => {
				this.sync_cotizacion_payment_methods()
			})
		},
		payment_method_factory() {
			return {
				current_acount_payment_method_id: 3,
				amount: '',
				bank: '',
				payment_date: '',
				num: '',
				credit_card_id: 0,
				credit_card_payment_plan_id: 0,
				caja_id: 0,
				moneda_id: this.base_moneda,
				cotizacion: this.owner.dollar,
				amount_cotizado: '',
				cuota_id: 0,
			}
		},
		/**
		 * El usuario tipeo otro monto. Con una sola fila de pago, la fila lo sigue; con varias no
		 * hay forma de repartirlo sola y se deja para que lo ajuste (confirmar() avisa si no cierra).
		 */
		al_cambiar_monto() {
			let monto = Number(this.expense.amount) || 0
			let filas = this.expense.payment_methods
			if (!Array.isArray(filas) || filas.length !== 1) {
				return
			}
			this.expense.payment_methods = [Object.assign({}, filas[0], {
				amount: monto > 0 ? monto : '',
			})]
			this.$nextTick(() => {
				this.sync_cotizacion_payment_methods()
			})
		},
		/**
		 * Cambio la moneda del gasto: las filas se rearman con la moneda nueva (mismo criterio que
		 * el modal de Gastos, que remonta el bloque al abrir con la moneda del gasto).
		 */
		al_cambiar_moneda() {
			let monto = Number(this.expense.amount) || 0
			this.$nextTick(() => {
				this.expense.payment_methods = [Object.assign(this.payment_method_factory(), {
					amount: monto > 0 ? monto : '',
				})]
			})
		},
		/**
		 * Tras cualquier cambio emitido por MultiPaymentMethods (monto, moneda, cotizacion),
		 * recalcula `amount_cotizado` y lleva el monto del gasto a la suma de las filas.
		 */
		on_payment_methods_changed() {
			this.$nextTick(() => {
				this.sync_cotizacion_payment_methods()
				let total = this.total_de_filas()
				if (total > 0 && Math.abs(total - (Number(this.expense.amount) || 0)) > 0.009) {
					this.expense.amount = Number(total.toFixed(2))
				}
			})
		},
		/**
		 * Igual criterio que `check_moneda` en PaymentMethodsStep: si `moneda_id` de la fila
		 * coincide con la moneda del gasto (`base_moneda`), no hay conversion; si no,
		 * `amount_cotizado` en base. Copiado del modal de Gastos.
		 */
		sync_cotizacion_payment_methods() {
			let list = this.expense.payment_methods
			if (!Array.isArray(list) || !list.length) {
				return
			}

			let base = Number(this.base_moneda)
			if (Number.isNaN(base)) {
				return
			}

			list.forEach((pm, index) => {
				let moneda_pm = Number(pm.moneda_id)
				let amount = Number(pm.amount) || 0

				if (!moneda_pm || moneda_pm === base) {
					if (Number(pm.amount_cotizado) !== 0) {
						this.$set(this.expense.payment_methods, index, Object.assign({}, pm, { amount_cotizado: 0 }))
					}
					return
				}

				let cotizacion = Number(pm.cotizacion) || 0
				if (amount <= 0 || cotizacion <= 0) {
					if (Number(pm.amount_cotizado) !== 0) {
						this.$set(this.expense.payment_methods, index, Object.assign({}, pm, { amount_cotizado: 0 }))
					}
					return
				}

				let amount_cotizado = moneda_pm === 1
					? amount / cotizacion
					: amount * cotizacion

				if (Number(pm.amount_cotizado) !== Number(amount_cotizado)) {
					this.$set(this.expense.payment_methods, index, Object.assign({}, pm, { amount_cotizado: amount_cotizado }))
				}
			})
		},
		/**
		 * Total de las filas en la moneda del gasto: `amount` si la fila esta en esa moneda,
		 * `amount_cotizado` si esta en otra. Copiado de set_total_from_array del modal de Gastos.
		 *
		 * @returns {Number}
		 */
		total_de_filas() {
			let base = Number(this.base_moneda)
			let total = 0
			this.expense.payment_methods.forEach(pm => {
				let moneda_pm = Number(pm.moneda_id)
				if (moneda_pm && moneda_pm !== base) {
					total += Number(pm.amount_cotizado) || 0
				} else {
					total += Number(pm.amount) || 0
				}
			})
			return total
		},
		/**
		 * Payload comun a los dos botones.
		 *
		 * @param {Boolean} sin_gasto
		 * @returns {Object}
		 */
		payload_base(sin_gasto) {
			return {
				pending_id: this.ocurrencia.pending_id,
				fecha_realizacion: this.ocurrencia.fecha,
				sin_gasto: sin_gasto,
			}
		},
		confirmar() {
			if (!this.ocurrencia) {
				return
			}

			// Una fila con monto y sin metodo elegido la descarta el backend en silencio.
			if (this.hay_metodo_de_pago_sin_elegir(this.expense.payment_methods)) {
				return
			}

			this.sync_cotizacion_payment_methods()
			let total = this.total_de_filas()
			let monto = Number(this.expense.amount) || 0

			if (monto <= 0 || total <= 0) {
				this.$toast.error('Indicá el monto y cómo se pagó. Si no hubo gasto, usá "Hecha sin registrar el gasto".')
				return
			}
			if (Math.abs(total - monto) > 0.009) {
				this.$toast.error('Los métodos de pago suman ' + this.price(total) + ' y el monto es ' + this.price(monto) + '. Ajustá uno de los dos.')
				return
			}

			let self = this
			this.enviando = true

			let payload = Object.assign(this.payload_base(false), {
				expense: {
					amount: monto,
					moneda_id: this.base_moneda,
					importe_iva: Number(this.expense.importe_iva) || 0,
					observations: this.expense.observations ? String(this.expense.observations).trim() : '',
					payment_methods: this.expense.payment_methods,
				},
			})

			this.$store.dispatch('agenda/completar', payload)
			.then(res => {
				self.enviando = false
				let num = res && res.expense && res.expense.num ? ' N° ' + res.expense.num : ''
				self.$toast.success('Hecha. Gasto' + num + ' registrado')
				self.cerrar()
			})
			.catch(error => self.manejar_error(error))
		},
		/**
		 * "Hecha sin registrar el gasto": el pago se cargo por otro lado o no hubo. Se confirma
		 * porque es la excepcion y no la regla, y despues se ofrece deshacer como a cualquier
		 * tarea sin gasto.
		 */
		sin_gasto() {
			if (!this.ocurrencia) {
				return
			}
			let self = this
			this.$bvModal.msgBoxConfirm('¿Marcar "' + this.ocurrencia.detalle + '" como hecha sin registrar el gasto?', {
				title: 'Hecha sin gasto',
				okTitle: 'Sí, sin gasto',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				if (!confirmado) {
					return
				}
				self.enviando = true
				return self.$store.dispatch('agenda/completar', self.payload_base(true))
				.then(res => {
					self.enviando = false
					self.$store.commit('agenda/setUltimaHecha', {
						pending_completed_id: res && res.model ? res.model.id : null,
						detalle: self.ocurrencia.detalle,
						expense_id: null,
					})
					self.cerrar()
				})
				.catch(error => self.manejar_error(error))
			})
		},
		/**
		 * 409: alguien ya la marco (o fue un segundo clic); el store ya recargo, se cierra. 422 y
		 * el resto: el texto del back, y el modal queda abierto para corregir.
		 *
		 * @param {Object} error { status, message } que arma el store
		 */
		manejar_error(error) {
			this.enviando = false
			if (error && error.status == 409) {
				this.$toast.warning('Esta tarea ya estaba marcada como hecha')
				this.cerrar()
				return
			}
			this.$toast.error(error && error.message ? error.message : 'No se pudo marcar la tarea como hecha.')
		},
		cerrar() {
			this.$bvModal.hide('agenda-completar')
		},
	},
}
</script>
<style lang="sass">
.agenda-completar
	&__tarea
		margin-bottom: 12px

	&__detalle
		font-size: 1.15rem
		font-weight: 600
		color: var(--color-text-primary)
		overflow-wrap: anywhere

	&__fecha
		font-size: 0.85rem
		color: var(--color-text-secondary)

	&__concepto
		display: flex
		align-items: center
		gap: 8px
		padding: 8px 12px
		margin-bottom: 14px
		border-radius: 10px
		background: var(--bg-section)
		border: 1px solid var(--color-border-secondary)
		font-size: 0.9rem
		color: var(--color-text-secondary)
		i
			color: var(--color-primary)
		strong
			color: var(--color-text-primary)
			margin-left: auto

	&__monto-fila
		display: flex
		gap: 12px
		flex-wrap: wrap

	&__monto
		flex: 1
		min-width: 180px

	&__moneda
		width: 180px

	&__extras
		display: flex
		gap: 12px
		flex-wrap: wrap
		margin-top: 12px

	&__iva
		flex: 0 0 220px
		margin-bottom: 0

	&__observaciones
		flex: 1
		min-width: 200px
		margin-bottom: 0

	&__footer
		display: flex
		justify-content: flex-end
		gap: 8px
		flex-wrap: wrap
		width: 100%

@media (max-width: 575px)
	.agenda-completar
		&__iva
			flex: 1 1 100%
		&__footer
			flex-direction: column-reverse
			.btn
				width: 100%
</style>
