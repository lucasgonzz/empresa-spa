<template>
<b-modal
title="Pago a vendedor"
hide-footer
id="seller-commission-pago">

	<div class="pago-vendedor__total">
		<span class="pago-vendedor__total-label">Total del pago</span>
		<span class="pago-vendedor__total-valor">{{ price(pago.haber) }}</span>
	</div>

	<b-alert
	:show="supera_saldo"
	variant="warning"
	class="m-t-10">
		El pago supera el saldo actual del vendedor. Va a quedar con saldo a favor.
	</b-alert>

	<b-form-group
	label="Fecha del pago"
	class="m-t-15">
		<b-form-checkbox
		:value="true"
		:unchecked-value="false"
		v-model="pago.current_date">
			Día de hoy
		</b-form-checkbox>
		<b-form-datepicker
		class="m-t-10"
		placeholder="Ingrese la fecha en la que se hizo el pago"
		v-if="!pago.current_date"
		v-model="pago.created_at">
		</b-form-datepicker>
	</b-form-group>

	<b-form-group label="Descripción (opcional)">
		<b-form-textarea
		v-model="pago.description"
		placeholder="Ingrese una descripción"></b-form-textarea>
	</b-form-group>

	<b-button
	v-if="saldo > 0"
	size="sm"
	variant="outline-primary"
	class="m-b-10"
	@click="pagarElTotal">
		Pagar el total ({{ price(saldo) }})
	</b-button>

	<payment-methods
	ref="paymentMethodComponent"
	:pago="pago"
	:base_moneda="moneda_id"
	parent-modal-id="seller-commission-pago"></payment-methods>

	<btn-loader
	@clicked="hacerPago"
	text="Registrar pago"
	:loader="loading"></btn-loader>
</b-modal>
</template>
<script>
import metodos_de_pago_validacion from '@/mixins/metodos_de_pago_validacion'
export default {
	mixins: [metodos_de_pago_validacion],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		PaymentMethods: () => import('@/components/client/modals/sellers/PaymentMethods'),
	},
	data() {
		return {
			pago: {
				current_date: true,
				created_at: '',
				description: '',
				haber: '',
				current_acount_payment_methods: [],
			},
			loading: false,
		}
	},
	computed:{
		selected_model() {
			return this.$store.state.seller_commission.selected_model
		},
		moneda_id() {
			return this.$store.state.seller_commission.moneda_id
		},
		saldo() {
			let totales = this.$store.state.seller_commission.totales || {}
			return Number(totales.saldo) || 0
		},
		supera_saldo() {
			return this.saldo > 0 && Number(this.pago.haber) > this.saldo
		},
	},
	methods: {
		pagarElTotal() {
			if (!this.pago.current_acount_payment_methods.length) {
				return
			}
			this.$set(this.pago.current_acount_payment_methods, 0, {
				...this.pago.current_acount_payment_methods[0],
				amount: this.saldo,
			})
			this.pago.haber = this.saldo
		},
		nombrePaymentMethod(current_acount_payment_method_id) {
			let payment_method = this.$store.state.current_acount_payment_method.models.find(model => {
				return model.id == current_acount_payment_method_id
			})
			return payment_method ? payment_method.name : 'el método de pago'
		},
		check() {
			// Una fila con monto y sin metodo elegido la descarta el backend en silencio.
			if (this.hay_metodo_de_pago_sin_elegir(this.pago.current_acount_payment_methods)) {
				return false
			}

			let metodos_con_monto = this.pago.current_acount_payment_methods.filter(payment_method => {
				return Number(payment_method.amount) > 0
			})

			if (!metodos_con_monto.length) {
				this.$toast.error('Ingrese al menos un método de pago con un monto mayor a cero')
				return false
			}

			for (const payment_method of metodos_con_monto) {

				if (!payment_method.caja_id || payment_method.caja_id == 0) {
					this.$toast.error('Elegí la caja de la que sale el pago de '+this.nombrePaymentMethod(payment_method.current_acount_payment_method_id))
					return false
				}

				if (
					payment_method.moneda_id
					&& Number(payment_method.moneda_id) != Number(this.moneda_id)
					&& !(Number(payment_method.cotizacion) > 0)
				) {
					this.$toast.error('Ingresá la cotización de '+this.nombrePaymentMethod(payment_method.current_acount_payment_method_id))
					return false
				}
			}

			return true
		},
		hacerPago() {
			if (!this.check()) {
				return
			}

			this.loading = true
			this.$api.post('seller-commission/pago', {
				seller_id: this.selected_model.id,
				moneda_id: this.moneda_id,
				created_at: this.pago.current_date ? null : this.pago.created_at,
				description: this.pago.description,
				current_acount_payment_methods: this.pago.current_acount_payment_methods,
			})
			.then(res => {
				this.loading = false
				this.$store.dispatch('seller_commission/getModels')
				this.$toast.success('Pago registrado')
				this.$bvModal.hide('seller-commission-pago')
				this.clear()
			})
			.catch(err => {
				this.loading = false
				let mensaje = 'Error al registrar el pago'
				if (err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				this.$toast.error(mensaje)
			})
		},
		clear() {
			this.pago = {
				current_date: true,
				created_at: '',
				description: '',
				haber: '',
				current_acount_payment_methods: [],
			}
		},
	}
}
</script>
<style scoped lang="sass">
.pago-vendedor
	&__total
		display: flex
		flex-direction: column
		gap: 2px
		margin-bottom: 8px

	// Colores por token: este bloque vive dentro de un modal de bootstrap-vue, que se monta
	// colgando de <body> y fuera de #app. Con los hexadecimales que habia hasta el 4/9/2026
	// (#94a3b8 y #0f172a) el valor del total quedaba casi negro sobre negro en modo oscuro.
	&__total-label
		font-size: 0.68rem
		font-weight: 600
		color: var(--color-text-secondary)
		text-transform: uppercase
		letter-spacing: 0.04em

	&__total-valor
		font-size: 1.9rem
		font-weight: 700
		color: var(--color-text-primary)
</style>
