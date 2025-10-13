<template>
	<div>
		<b-form-group
		v-for="(payment_method, index) in modal_payment_methods"
		:key="payment_method.id"
		:label="payment_method.name+' ('+ price(payment_method.amount) +')'">
			<div class="d-flex">
				<b-form-input
				type="number"
				:id="'input_payment_method_'+payment_method.id"
				@keyup="set_total_repartido(payment_method)"
				@change="set_total_repartido(payment_method)"
				:min="0"
				v-model.number="payment_method.amount"
				placeholder="Ingrese el monto">
				</b-form-input>

				<b-button	
				variant="outline-primary"
				class="ml-2 p-2 btn-total"
				size="sm"
				:id="'btn_agregar_total_payment_method_'+payment_method.id"
				@click="agregarTotal(payment_method)"
				:disabled="total_a_repartir === 0">
					Agregar total
				</b-button>
			</div>
			
			<select-caja
			v-if="cajas.length > 0 && !payment_methods_with_discounts.length"
			:payment_method="payment_method"></select-caja>

			<p
			class="m-t-10 m-l-10"
			v-if="payment_method.monto_descuento">
				<strong
				class="text-success">
					Descuento: {{ price(payment_method.monto_descuento) }}
				</strong>
			</p>
			<hr>
		</b-form-group>
	</div>
</template>
<script>
import select_payment_methods from '@/mixins/vender/select_payment_methods'
export default {
	mixins: [select_payment_methods],
	components: {
		SelectCaja: () => import('@/components/vender/modals/payment-methods/select-payment-methods/SelectCaja'),
	},
	computed: {
		cajas() {
			return this.$store.state.caja.models 
		},
		payment_methods_with_discounts() {
			return this.$store.state.current_acount_payment_method_discount.models
		},
	},
	methods: {

		set_total_repartido(payment_method) {

			/* 
				Si es undefined, es porque se llamo desde la liea 57
				O porque se llamo desde agregarTotal
				Entonces sigue de largo y setea	total_repartido con get_suma_de_metodos_de_pagos
			*/
			if (typeof payment_method != 'undefined') {

				this.check_supera_total_a_repartir(payment_method)

			}

			this.total_repartido = this.get_suma_de_metodos_de_pagos()

			this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_payment_methods', [])

		},

		check_supera_total_a_repartir(payment_method) {

			let nuevo_total_repartido = this.get_suma_de_metodos_de_pagos()

			if (nuevo_total_repartido > this.total_a_repartir) {

				this.$toast.error('Con este monto estas superando el TOTAL A REPARTIR')

				payment_method.amount = ''

				// this.set_total_repartido()

				// return false
			}
		},

		get_suma_de_metodos_de_pagos() {
			let total_repartido = 0

			this.modal_payment_methods.forEach(payment_method => {
				total_repartido += Number(payment_method.amount)
			})

			return total_repartido
		},

		get_metodos_de_pago_seleccionado(payment_method_id) {
			return this.modal_payment_methods.find(payment_method => {
				return payment_method.id == payment_method_id
			})
		},

		
		agregarTotal(payment_method) {
			if (this.total_repartido < this.total_a_repartir) {

				// let modal_payment_method = this.get_metodos_de_pago_seleccionado(payment_method_id)

				let monto_previo = payment_method.amount

				if (typeof monto_previo == 'undefined') {
					monto_previo = 0
				} else {
					monto_previo = Number(monto_previo)
				}

				payment_method.amount = this.total_a_repartir - (this.total_repartido - monto_previo)

				this.set_total_repartido()
			}
		},
	}
}
</script>