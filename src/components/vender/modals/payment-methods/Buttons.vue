<template>
	<div
	class="m-t-15">
		<div
		v-if="payment_method_discounts.length">
			
			<b-button
			block
			variant="primary"
			v-if="!calculado"
			@click="calcular">
				Calcular
			</b-button>
			<b-button
			block
			variant="primary"
			v-else
			@click="terminar">
				Listo
			</b-button>
		</div>
		<b-button
		block
		variant="primary"
		@click="terminar"
		v-else>
			Listo
		</b-button>

		<b-button
		class="m-t-10"
		block
		variant="danger"
		@click="cancelar">
			Cancelar
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		selected_payment_methods_: Array,
		total_a_repartir: Number,
		total_repartido: Number,
		sobrante_a_repartir: Number,
	},
	data() {
		return {
			modal_payment_methods: [],
			calculado: false
		}
	},
	computed: {
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models 
		},
		payment_method_discounts() {
			return this.$store.state.current_acount_payment_method_discount.models 
		},
	},
	methods: {
		terminar() {
			if (!this.chequear_total_repartido()) return

			this.$store.commit('vender/setSelectedPaymentMethods', this.selected_payment_methods_)

			this.$bvModal.hide('payment-method-modal')
		},
		calcular() {
		    if (!this.chequear_total_repartido()) return

		    /* 
		    	Aca guardo los metodos de pago elegidos en la primer instancia de repartir el total,
		    	Seteo tambien el discount_amount para mostrar en el modal y calcular el total en mixins/vender_set_total.setTotal()
		    */
		    let modal_payment_methods = []
		    let next_selected = []

		    this.selected_payment_methods_.forEach(pay => {

		        let discount_amount = null
		        let surchage_amount = null
		        
		        let payment_method = this.payment_methods.find(p => p.id == pay.current_acount_payment_method_id)

		        if (pay.cuota_id) {
		        	let cuota = this.$store.state.cuota.models.find(c => c.id == pay.cuota_id)
		        	if (typeof cuota != 'undefined') {

		        		if (cuota.descuento) {

		            		discount_amount = Number(pay.amount) * Number(cuota.descuento) / 100

		        		} else if (cuota.recargo) {

		            		surchage_amount = Number(pay.amount) * Number(cuota.recargo) / 100
		        		}
		        	}
		        }
		        
		        let discount = this.payment_method_discounts.find(d => d.current_acount_payment_method_id == pay.current_acount_payment_method_id)

		        if (typeof discount != 'undefined') {
		            discount_amount = Number(pay.amount) * Number(discount.discount_percentage) / 100
		        }

		        // 1) options del select (si realmente las querés diferentes)
		        modal_payment_methods.push({
		            ...payment_method,
		            amount: '',
		            discount_amount: discount_amount,
		            surchage_amount: surchage_amount,
		            caja_id: pay.caja_id,
		        })

		        // 2) filas (source of truth del MultiPaymentMethods)
		        next_selected.push({
		            current_acount_payment_method_id: pay.current_acount_payment_method_id,
		            moneda_id: pay.moneda_id,
		            caja_id: pay.caja_id,
		            amount: '', // <-- acá se resetea lo que ves
		            cuota_id: pay.cuota_id,
		            discount_amount: discount_amount,
		            surchage_amount: surchage_amount,
		        })
		    })

		    this.$emit('set_modal_payment_methods', modal_payment_methods)
		    this.$emit('set_selected_payment_methods', next_selected) // <-- NUEVO

		    this.calculado = true
		},
		chequear_total_repartido() {

			console.log('total_repartido')
			console.log(this.total_repartido)
			console.log('total_a_repartir')
			console.log(this.total_a_repartir)
			console.log('sobrante_a_repartir')
			console.log(this.sobrante_a_repartir)
			

			if (Math.trunc(this.total_repartido * 100) / 100 != Math.trunc(this.total_a_repartir * 100) / 100) {
				this.$toast.error('El total repartido esta mal')
				return false
			}

			return true
		},
		cancelar() {
            this.$store.commit('vender/set_modal_payment_methods', [])
            this.$store.commit('vender/setSelectedPaymentMethods', [])
            this.setTotal()
            this.$bvModal.hide('payment-method-modal')
		}
	}
}
</script>