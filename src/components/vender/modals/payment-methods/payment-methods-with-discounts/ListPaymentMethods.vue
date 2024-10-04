<template>
	<div>
		
		<b-form-group
		v-for="payment_method in payment_methods_with_discounts"
		:key="payment_method.id"
		:label="payment_method.name+' ('+ price(payment_method.amount) +')'">
			<div class="d-flex">
				<b-form-input
				type="number"
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
				@click="agregarTotal(payment_method)"
				:disabled="total_a_repartir_with_discounts === 0">
					Agregar total
				</b-button>
			</div>
			
			<select-caja
			:payment_method="payment_method"></select-caja>
			
			<hr>
		</b-form-group>
	</div>
</template>
<script>
import payment_methods_with_discounts from '@/mixins/vender/payment_methods_with_discounts'
export default {
	mixins: [payment_methods_with_discounts],
	components: {
		SelectCaja: () => import('@/components/vender/modals/payment-methods/select-payment-methods/SelectCaja'),
	},
	methods: {

		set_total_repartido(payment_method) {

			/* 
				Si es undefined, es porque se llamo desde la liea 57
				O porque se llamo desde agregarTotal
				Entonces sigue de largo y setea	total_repartido_with_discounts con get_suma_de_metodos_de_pagos
			*/
			if (typeof payment_method != 'undefined') {

				this.check_supera_total_a_repartir(payment_method)

			}

			this.total_repartido_with_discounts = this.get_suma_de_metodos_de_pagos()

		},

		check_supera_total_a_repartir(payment_method) {

			let nuevo_total_repartido = this.get_suma_de_metodos_de_pagos()

			if (nuevo_total_repartido > this.total_a_repartir_with_discounts) {

				this.$toast.error('Con este monto estas superando el TOTAL A REPARTIR')

				payment_method.amount = ''
			}
		},

		get_suma_de_metodos_de_pagos() {
			let total_repartido_with_discounts = 0

			this.payment_methods_with_discounts.forEach(payment_method => {
				total_repartido_with_discounts += Number(payment_method.amount)
			})

			return total_repartido_with_discounts
		},

		get_metodos_de_pago_seleccionado(payment_method_id) {
			return this.payment_methods_with_discounts.find(payment_method => {
				return payment_method.id == payment_method_id
			})
		},

		
		agregarTotal(payment_method) {
			if (this.total_repartido_with_discounts < this.total_a_repartir_with_discounts) {

				// let modal_payment_method = this.get_metodos_de_pago_seleccionado(payment_method_id)

				let monto_previo = payment_method.amount

				if (typeof monto_previo == 'undefined') {
					monto_previo = 0
				} else {
					monto_previo = Number(monto_previo)
				}

				payment_method.amount = this.total_a_repartir_with_discounts - (this.total_repartido_with_discounts - monto_previo)

				this.set_total_repartido()
			}
		},
	}
}
</script>