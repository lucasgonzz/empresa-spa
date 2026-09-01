<template>
	<div
	class="m-t-15">
		<!--
			🔴 Con descuentos por metodo de pago el reparto es de DOS PASOS: primero "Calcular" --que
			aplica el descuento de cada metodo sobre lo que se cobra con el-- y recien despues aparece
			"Listo". Sin descuentos configurados hay un solo "Listo" (la rama de mas abajo). Los dos
			llevan el mismo testid porque nunca se dibujan a la vez.
		-->
		<div
		v-if="payment_method_discounts.length">

			<b-button
			block
			variant="primary"
			data-testid="venta-multipago-calcular"
			v-if="!calculado"
			@click="calcular">
				Calcular
			</b-button>
			<b-button
			block
			variant="primary"
			data-testid="venta-multipago-listo"
			v-else
			data-tour="vender.boton_confirmar_venta"
			@click="terminar">
				Listo
			</b-button>
		</div>
		<b-button
		block
		variant="primary"
		data-testid="venta-multipago-listo"
		data-tour="vender.boton_confirmar_venta"
		@click="terminar"
		v-else>
			Listo
		</b-button>

		<b-button
		class="m-t-10"
		block
		variant="danger"
		data-testid="venta-multipago-cancelar"
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
			

			/*
				🔴 Se REDONDEA a centavos, no se trunca.

				Truncar convertia una diferencia invisible en un centavo entero. Repartir 27.851,22
				en dos da 13.925,61 y 13.925,61, que en coma flotante no suman exactamente 27.851,22
				sino una billonesima menos; esa billonesima cae del otro lado del truncado y los dos
				totales pasan a diferir en un centavo PARA LA VALIDACION, mientras en pantalla
				muestran el mismo numero.

				El operador veia el peor sintoma posible: "Total a repartir" y "Total repartido" con
				el mismo importe, el sobrante en `NaN` --el residuo de 1e-12 se le va a notacion
				exponencial y `numeral` no lo sabe formatear-- y el boton sin responder ni explicar
				por que. Medido el 31/8/2026 armando el circuito e2e de multipago.

				Redondear es ademas lo que corresponde para plata: dos importes que redondean al
				mismo centavo SON el mismo importe.
			*/
			if (Math.round(this.total_repartido * 100) / 100 != Math.round(this.total_a_repartir * 100) / 100) {
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