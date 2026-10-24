<template>
	<!--
		Modal «Nuevo plan de pago» (misión planes-de-pago-saldo-y-dolares, 21/10/2026).

		Reemplaza al model-index genérico de `payment_plan`. Lo abre PaymentPlanBtn (fila de Ventas)
		con $bvModal.show('payment_plan') después de dejar la venta en store.sale.model: el id del
		modal se mantiene para no tocar el botón.

		El importe a financiar arranca en lo que falta saldar de la venta (GET
		payment-plan/saldo-de-venta/{id}) y se puede cambiar. La vista previa se arma en el navegador
		con cuotas_del_plan.js, espejo del cálculo del back: al guardar viajan el importe, la cantidad,
		la frecuencia, la fecha y la nota de cada cuota, y el back recalcula importes y fechas.
	-->
	<b-modal
	id="payment_plan"
	size="lg"
	scrollable
	modal-class="plan-de-pago-modal"
	title="Nuevo plan de pago"
	@show="al_abrir"
	@hidden="abierto = false">

		<resumen-venta
		:sale="sale"
		:saldo="saldo"
		:cargando="cargando_saldo"
		:moneda_id="moneda_id"></resumen-venta>

		<!-- Avisos de contexto: un plan previo con cuotas pendientes, o una venta ya saldada. -->
		<div
		v-if="saldo && saldo.planes_con_cuotas_pendientes > 0"
		class="plan-de-pago-modal__aviso plan-de-pago-modal__aviso--info"
		data-testid="plan-aviso-plan-previo">
			<i class="bi bi-info-circle"></i>
			<span>
				Esta venta ya tiene {{ saldo.planes_con_cuotas_pendientes == 1 ? 'un plan de pago' : saldo.planes_con_cuotas_pendientes + ' planes de pago' }}
				con cuotas pendientes. El plan nuevo se suma a {{ saldo.planes_con_cuotas_pendientes == 1 ? 'ese' : 'esos' }}.
			</span>
		</div>

		<div
		v-if="sale && !sale.client_id"
		class="plan-de-pago-modal__aviso plan-de-pago-modal__aviso--atencion"
		data-testid="plan-aviso-sin-cliente">
			<i class="bi bi-exclamation-triangle"></i>
			<span>La venta no tiene cliente: el plan de pago se arma sobre la cuenta corriente de un cliente.</span>
		</div>

		<div
		v-if="sale && sale.client_id && saldo && !saldo.en_cuenta_corriente"
		class="plan-de-pago-modal__aviso plan-de-pago-modal__aviso--atencion"
		data-testid="plan-aviso-fuera-de-la-cuenta">
			<i class="bi bi-exclamation-triangle"></i>
			<span>La venta no está en la cuenta corriente del cliente, así que no tiene deuda para financiar en cuotas. El plan de pago se arma sobre una venta que fue a la cuenta corriente.</span>
		</div>

		<div
		v-if="saldo && saldo.en_cuenta_corriente && saldo.saldo_pendiente <= 0"
		class="plan-de-pago-modal__aviso plan-de-pago-modal__aviso--atencion"
		data-testid="plan-aviso-saldada">
			<i class="bi bi-exclamation-triangle"></i>
			<span>La venta ya está saldada. Si igual querés armar un plan, escribí el importe a financiar.</span>
		</div>

		<!-- Datos del plan -->
		<div class="plan-de-pago-modal__seccion">
			<h6 class="plan-de-pago-modal__titulo-seccion">Datos del plan</h6>

			<div class="plan-de-pago-modal__grilla">

				<b-form-group
				class="plan-de-pago-modal__campo plan-de-pago-modal__campo--ancho"
				label="Importe a financiar"
				label-for="plan-importe">
					<b-input-group :prepend="simbolo">
						<b-form-input
						id="plan-importe"
						ref="importe"
						type="number"
						min="0"
						step="0.01"
						v-model="importe"
						data-testid="plan-importe"></b-form-input>
					</b-input-group>

					<!-- De dónde sale el importe propuesto: lo que falta saldar de la venta. -->
					<div
					v-if="saldo && leyenda_importe"
					class="plan-de-pago-modal__leyenda"
					data-testid="plan-leyenda-importe">
						<i class="bi bi-lightbulb"></i>
						<span>
							{{ leyenda_importe }}
							<a
							v-if="importe_editado"
							href="#"
							class="plan-de-pago-modal__restablecer"
							data-testid="plan-restablecer-importe"
							@click.prevent="restablecer_importe">
								Volver a {{ formatear(importe_propuesto) }}
							</a>
						</span>
					</div>
				</b-form-group>

				<b-form-group
				class="plan-de-pago-modal__campo"
				label="Cantidad de cuotas"
				label-for="plan-cantidad-cuotas">
					<b-form-input
					id="plan-cantidad-cuotas"
					type="number"
					min="1"
					:max="maximo_de_cuotas"
					step="1"
					v-model.number="cantidad_cuotas"
					data-testid="plan-cantidad-cuotas"></b-form-input>
				</b-form-group>

				<b-form-group
				class="plan-de-pago-modal__campo"
				label="Frecuencia"
				label-for="plan-frecuencia">
					<b-form-select
					id="plan-frecuencia"
					v-model="frequency"
					:options="frecuencias"
					data-testid="plan-frecuencia"></b-form-select>
				</b-form-group>

				<b-form-group
				class="plan-de-pago-modal__campo"
				label="Fecha de la primera cuota"
				label-for="plan-fecha-inicio">
					<b-form-input
					id="plan-fecha-inicio"
					type="date"
					v-model="fecha_inicio"
					data-testid="plan-fecha-inicio"></b-form-input>
				</b-form-group>

				<b-form-group
				class="plan-de-pago-modal__campo plan-de-pago-modal__campo--completo m-b-0"
				label="Notas del plan"
				label-for="plan-notas"
				description="Si una cuota no tiene nota propia, muestra esta.">
					<b-form-textarea
					id="plan-notas"
					v-model="notas"
					rows="2"
					max-rows="4"
					placeholder="Por ejemplo: acordado con el cliente por teléfono"
					data-testid="plan-notas"></b-form-textarea>
				</b-form-group>
			</div>
		</div>

		<!-- Vista previa de las cuotas -->
		<div class="plan-de-pago-modal__seccion m-b-0">
			<h6 class="plan-de-pago-modal__titulo-seccion">Vista previa de las cuotas</h6>

			<vista-previa-cuotas
			:cuotas="cuotas"
			:moneda_id="moneda_id"
			:problema="problema"
			@nota="poner_nota"></vista-previa-cuotas>
		</div>

		<template #modal-footer>
			<div class="plan-de-pago-modal__footer">
				<!-- Resumen de lo que se va a crear, para leerlo sin bajar hasta la tabla. -->
				<div
				class="plan-de-pago-modal__resumen-footer"
				data-testid="plan-resumen-footer">
					<template v-if="cuotas.length">
						<strong>{{ cuotas.length }} {{ cuotas.length == 1 ? 'cuota' : 'cuotas' }}</strong>
						de {{ formatear(cuotas[0].amount) }}
						<span v-if="ultima_distinta">(la última de {{ formatear(cuotas[cuotas.length - 1].amount) }})</span>
					</template>
				</div>

				<div class="plan-de-pago-modal__botones">
					<b-button
					class="btn-modulo"
					variant="outline-secondary"
					:disabled="guardando"
					@click="cerrar">
						Cancelar
					</b-button>
					<b-button
					class="btn-modulo"
					variant="primary"
					:disabled="guardando || cargando_saldo || !!problema || !puede_crear"
					:title="puede_crear ? '' : 'No tenés permiso para crear planes de pago'"
					data-testid="plan-crear"
					@click="guardar">
						<b-spinner
						v-if="guardando"
						small
						class="m-r-5"></b-spinner>
						Crear plan de pago
					</b-button>
				</div>
			</div>
		</template>

	</b-modal>
</template>
<script>
import moment from 'moment'
import {
	FORMATO,
	FRECUENCIAS,
	MAXIMO_DE_CUOTAS,
	MAXIMO_IMPORTE,
	con_moneda,
	cuotas_del_plan,
	redondear_a_centavos,
} from '@/components/common/payment-plan/cuotas_del_plan'

export default {
	components: {
		ResumenVenta: () => import('@/components/common/payment-plan/ResumenVenta'),
		VistaPreviaCuotas: () => import('@/components/common/payment-plan/VistaPreviaCuotas'),
	},
	data() {
		return {
			/* Respuesta de GET payment-plan/saldo-de-venta/{id}; null mientras carga o si falló. */
			saldo: null,
			cargando_saldo: false,
			/* Si el modal está abierto: el watcher de la venta solo recarga en ese caso. */
			abierto: false,
			guardando: false,
			/* Importe a financiar tal como está en el input (texto: el input type="number" devuelve string). */
			importe: '',
			cantidad_cuotas: 3,
			frequency: 'monthly',
			/* Fecha de la primera cuota, YYYY-MM-DD. */
			fecha_inicio: moment().format(FORMATO),
			notas: '',
			/* Nota propia de cada cuota, por número de cuota. Sobrevive a cambiar la cantidad. */
			notas_por_cuota: {},
			frecuencias: FRECUENCIAS,
			maximo_de_cuotas: MAXIMO_DE_CUOTAS,
		}
	},
	computed: {
		/* La venta que dejó PaymentPlanBtn en el store. */
		sale() {
			return this.$store.state.sale.model
		},
		/**
		 * Moneda del plan: la de la venta. La da la API (regla de Sale::EXPRESION_EN_PESOS: solo 2
		 * es dólares); mientras carga se lee de la venta con la misma regla.
		 *
		 * @returns {Number} 1 pesos, 2 dólares.
		 */
		moneda_id() {
			if (this.saldo) {
				return Number(this.saldo.moneda_id) == 2 ? 2 : 1
			}
			return this.sale && Number(this.sale.moneda_id) == 2 ? 2 : 1
		},
		/* Prefijo del input de importe. */
		simbolo() {
			return this.moneda_id == 2 ? 'USD' : '$'
		},
		/* El importe que se propone: lo que falta saldar (o el total, si la venta no va a la cuenta corriente). */
		importe_propuesto() {
			return this.saldo ? Number(this.saldo.saldo_pendiente) : 0
		},
		/* Si el usuario cambió el importe propuesto: habilita el link para volver a él. */
		importe_editado() {
			return this.saldo && this.importe_propuesto > 0 && this.importe_a_mandar != this.importe_propuesto
		},
		/**
		 * La explicación del importe propuesto, que Lucas pidió que se vea: de dónde sale.
		 *
		 * @returns {String}
		 */
		leyenda_importe() {
			if (!this.saldo) {
				return ''
			}
			// Fuera de la cuenta corriente no hay importe que proponer: lo dice el aviso de arriba.
			if (!this.saldo.en_cuenta_corriente) {
				return ''
			}
			if (Number(this.saldo.pagado) > 0) {
				return 'Es lo que falta saldar de la venta: ' + this.formatear(this.saldo.total)
					+ ' de total menos ' + this.formatear(this.saldo.pagado) + ' ya pagado.'
			}
			return 'Es lo que falta saldar de la venta: todavía no tiene pagos registrados.'
		},
		/**
		 * Por qué no se puede crear el plan todavía, con el mismo criterio que el 422 del back.
		 *
		 * @returns {String|null}
		 */
		problema() {
			if (this.sale && !this.sale.client_id) {
				return 'La venta no tiene cliente: el plan de pago se arma sobre la cuenta de un cliente.'
			}
			// Regla de Lucas (22/10/2026): solo sobre una venta que fue a la cuenta corriente. El back
			// devuelve 422 con el mismo criterio (PaymentPlanService::crear_plan_y_cuotas).
			if (this.saldo && !this.saldo.en_cuenta_corriente) {
				return 'La venta no está en la cuenta corriente del cliente: el plan de pago se arma sobre una venta que fue a la cuenta corriente.'
			}
			if (!(this.importe_a_mandar > 0)) {
				return 'Escribí un importe a financiar mayor a cero.'
			}
			if (this.importe_a_mandar > MAXIMO_IMPORTE) {
				return 'El importe a financiar es demasiado grande.'
			}
			if (!Number.isInteger(this.cantidad_cuotas) || this.cantidad_cuotas < 1) {
				return 'Indicá la cantidad de cuotas (un número entero desde 1).'
			}
			if (this.cantidad_cuotas > MAXIMO_DE_CUOTAS) {
				return 'Un plan puede tener hasta ' + MAXIMO_DE_CUOTAS + ' cuotas.'
			}
			if (!this.fecha_inicio || !moment(this.fecha_inicio, FORMATO, true).isValid()) {
				return 'Elegí la fecha de la primera cuota.'
			}
			if (Math.round(this.importe_a_mandar * 100) < this.cantidad_cuotas) {
				return 'El importe a financiar no alcanza para ' + this.cantidad_cuotas + ' cuotas.'
			}
			return null
		},
		/* El importe del input redondeado a centavos: es el que calcula la vista previa y el que viaja. */
		importe_a_mandar() {
			return redondear_a_centavos(this.importe)
		},
		/**
		 * Cuotas de la vista previa, con la nota que el usuario le haya puesto a cada una.
		 *
		 * @returns {Array<{numero_cuota: Number, fecha_vencimiento: String, amount: Number, notes: String}>}
		 */
		cuotas() {
			if (this.problema) {
				return []
			}
			let cuotas = cuotas_del_plan(this.importe_a_mandar, this.cantidad_cuotas, this.fecha_inicio, this.frequency)
			cuotas.forEach(cuota => {
				cuota.notes = this.notas_por_cuota[cuota.numero_cuota] || ''
			})
			return cuotas
		},
		/* Si la última cuota quedó distinta por el redondeo: el pie lo aclara. */
		ultima_distinta() {
			return this.cuotas.length > 1 && this.cuotas[0].amount != this.cuotas[this.cuotas.length - 1].amount
		},
		puede_crear() {
			return this.can('payment_plan.store')
		},
	},
	watch: {
		/**
		 * PaymentPlanBtn llama a setModel() y enseguida abre el modal, pero setModel() commitea la
		 * venta adentro de un setTimeout (common-vue/mixins/display.js): cuando se dispara @show,
		 * store.sale.model todavía es la venta ANTERIOR (o ninguna). Por eso el saldo se vuelve a
		 * pedir cuando la venta cambia con el modal abierto; cargar_saldo() descarta la respuesta
		 * de una venta que ya no es la que se está mirando.
		 */
		'sale.id'() {
			if (this.abierto) {
				this.saldo = null
				this.importe = ''
				this.cargar_saldo()
			}
		},
	},
	methods: {
		/**
		 * Cada apertura arranca de cero y pide el saldo de la venta: el modal se reusa para todas
		 * las ventas de la lista.
		 */
		al_abrir() {
			this.abierto = true
			this.saldo = null
			this.importe = ''
			this.cantidad_cuotas = 3
			this.frequency = 'monthly'
			this.fecha_inicio = moment().format(FORMATO)
			this.notas = ''
			this.notas_por_cuota = {}
			this.guardando = false
			this.cargar_saldo()
		},
		/**
		 * Trae total, pagado y saldo de la venta y propone el saldo como importe a financiar. Si
		 * falla, se propone el total de la venta para que el modal siga siendo usable.
		 */
		cargar_saldo() {
			if (!this.sale || !this.sale.id) {
				return
			}
			let self = this
			/* Venta por la que se preguntó: si cambia antes de que vuelva la respuesta, se descarta. */
			let sale_id = this.sale.id
			this.cargando_saldo = true
			this.$api.get('payment-plan/saldo-de-venta/' + sale_id)
			.then(res => {
				if (!self.sale || self.sale.id != sale_id) {
					return
				}
				self.cargando_saldo = false
				self.saldo = res.data
				// Fuera de la cuenta corriente no se propone nada: esa venta no admite plan.
				self.importe = res.data.en_cuenta_corriente ? String(res.data.saldo_pendiente) : ''
			})
			.catch(err => {
				if (!self.sale || self.sale.id != sale_id) {
					return
				}
				self.cargando_saldo = false
				self.importe = String(Number(self.sale.total) || '')
				self.$toast.error('No se pudo leer lo que falta saldar de la venta: se propone el total.')
				console.log(err)
			})
		},
		restablecer_importe() {
			this.importe = String(this.importe_propuesto)
		},
		/**
		 * Guarda la nota de una cuota (evento de la vista previa).
		 *
		 * @param {{numero_cuota: Number, notes: String}} cambio
		 */
		poner_nota(cambio) {
			this.$set(this.notas_por_cuota, cambio.numero_cuota, cambio.notes)
		},
		/**
		 * Importe con el símbolo de la moneda del plan ("$300.000" o "USD 250").
		 *
		 * @param {Number} importe
		 * @returns {String}
		 */
		formatear(importe) {
			return con_moneda(this.price(Number(importe)), this.moneda_id)
		},
		/**
		 * POST payment-plan. Viajan el importe y la nota de cada cuota; importes y fechas los
		 * recalcula el back con el mismo algoritmo que la vista previa.
		 */
		guardar() {
			if (this.problema) {
				this.$toast.error(this.problema)
				return
			}

			/* Solo número y nota de cada cuota: el resto lo decide el back. */
			let notas_de_cuotas = []
			this.cuotas.forEach(cuota => {
				notas_de_cuotas.push({
					numero_cuota: cuota.numero_cuota,
					notes: cuota.notes,
				})
			})

			let self = this
			this.guardando = true
			this.$api.post('payment-plan', {
				sale_id: this.sale.id,
				total_amount: this.importe_a_mandar,
				cantidad_cuotas: this.cantidad_cuotas,
				frequency: this.frequency,
				start_date: this.fecha_inicio,
				notes: this.notas,
				cuotas: notas_de_cuotas,
			})
			.then(res => {
				self.guardando = false
				let cantidad = res.data.model && res.data.model.cuotas ? res.data.model.cuotas.length : self.cantidad_cuotas
				self.$toast.success('Plan de pago creado: ' + cantidad + (cantidad == 1 ? ' cuota' : ' cuotas'))
				self.cerrar()
			})
			.catch(err => {
				self.guardando = false
				let mensaje = err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: 'No se pudo crear el plan de pago.'
				self.$toast.error(mensaje)
			})
		},
		cerrar() {
			this.$bvModal.hide('payment_plan')
		},
	},
}
</script>
<style lang="sass">
// Tokens de _dark_theme.sass con su literal claro de respaldo: el modal se monta colgando de
// <body> y los tokens viven en :root / html.dark-mode, así que llegan en los dos modos.
.plan-de-pago-modal

	// _modals.sass fuerza los .modal-lg al 90% del ancho con !important: en escritorio eso estira
	// el formulario a 1.300px y los campos quedan lejos unos de otros. Desde 992px el modal se
	// queda en 900px; por debajo sigue la regla general (90% / 96%).
	@media screen and (min-width: 992px)
		.modal-dialog.modal-lg
			max-width: 900px !important

	&__seccion
		margin-bottom: 20px

	&__titulo-seccion
		font-size: 0.78rem
		font-weight: 600
		letter-spacing: 0.04em
		text-transform: uppercase
		color: var(--color-text-secondary, #6c757d)
		margin-bottom: 10px

	// Cantidad, frecuencia y fecha en una fila en escritorio, de a dos en tablet y apiladas en
	// teléfono. El importe y las notas ocupan siempre la fila entera.
	&__grilla
		display: grid
		grid-template-columns: repeat(3, minmax(0, 1fr))
		column-gap: 16px

		@media screen and (max-width: 768px)
			grid-template-columns: repeat(2, minmax(0, 1fr))

		@media screen and (max-width: 576px)
			grid-template-columns: minmax(0, 1fr)

	&__campo

		label
			font-size: 0.85rem
			font-weight: 500
			color: var(--color-text-primary, #212529)

		&--ancho,
		&--completo
			grid-column: 1 / -1

	&__leyenda
		display: flex
		align-items: flex-start
		gap: 6px
		margin-top: 6px
		font-size: 0.82rem
		color: var(--color-text-secondary, #6c757d)

		i
			color: var(--color-primary, #007bff)
			margin-top: 1px

	&__restablecer
		margin-left: 4px
		white-space: nowrap

	&__aviso
		display: flex
		align-items: flex-start
		gap: 8px
		padding: 10px 12px
		margin-bottom: 16px
		border-radius: 8px
		font-size: 0.85rem
		border: 1px solid var(--color-border, #dee2e6)

		&--info
			background: var(--bg-info-soft, rgba(0, 123, 255, 0.06))
			color: var(--color-text-info-strong, #0c5460)

		&--atencion
			background: var(--bg-warning-soft, rgba(255, 193, 7, 0.10))
			color: var(--color-text-warning-strong, #856404)

	&__footer
		width: 100%
		display: flex
		align-items: center
		justify-content: space-between
		flex-wrap: wrap
		gap: 10px

	&__resumen-footer
		font-size: 0.88rem
		color: var(--color-text-secondary, #6c757d)

		strong
			color: var(--color-text-primary, #212529)

	&__botones
		display: flex
		gap: 8px
		margin-left: auto

	@media screen and (max-width: 576px)
		&__botones
			width: 100%

			.btn
				flex: 1 1 0
</style>
