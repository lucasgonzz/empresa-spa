<template>
	<!--
		Geometria del footer del sistema: la secundaria a la izquierda, la confirmatoria a la
		derecha, una sola accion con peso visual. Antes eran dos botones `block` apilados en el
		cuerpo del modal, con "Cancelar" en rojo macizo del mismo tamaño que el de confirmar.
	-->
	<div
	class="vender-multipago-footer">
		<b-button
		class="vender-multipago-footer__cancelar"
		variant="outline-secondary"
		data-testid="venta-multipago-cancelar"
		@click="cancelar">
			Cancelar
		</b-button>

		<!--
			🔴 Con descuentos por metodo de pago el reparto es de DOS PASOS: primero "Calcular" --que
			aplica el descuento de cada metodo sobre lo que se cobra con el-- y recien despues aparece
			"Listo". Sin descuentos configurados hay un solo "Listo" (la rama de mas abajo). Los dos
			llevan el mismo testid porque nunca se dibujan a la vez.
		-->
		<template v-if="payment_method_discounts.length">
			<b-button
			variant="primary"
			data-testid="venta-multipago-calcular"
			v-if="!calculado"
			@click="calcular">
				Calcular
			</b-button>
			<b-button
			variant="primary"
			data-testid="venta-multipago-listo"
			v-else
			data-tour="vender.boton_confirmar_venta"
			@click="terminar">
				Listo
			</b-button>
		</template>
		<b-button
		variant="primary"
		data-testid="venta-multipago-listo"
		data-tour="vender.boton_confirmar_venta"
		@click="terminar"
		v-else>
			Listo
		</b-button>
	</div>
</template>
<script>
import metodos_de_pago_validacion from '@/mixins/metodos_de_pago_validacion'
export default {
	mixins: [metodos_de_pago_validacion],
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
			// Una fila con monto y sin metodo elegido la descarta el backend en silencio.
			if (this.hay_metodo_de_pago_sin_elegir(this.selected_payment_methods_)) return

			if (!this.chequear_total_repartido()) return

			/*
				Las filas sin metodo elegido no viajan con la venta. La guarda de arriba ya freno las
				que tienen monto, asi que lo que queda es una fila en blanco y en cero --el usuario
				apreto "Agregar metodo de pago" y no la uso--. Sin este filtro llega igual al POST y
				PaymentMethodHelper::attach_payment_methods hace find(0) -> null -> continue con un
				Log::warning: no se pierde plata, pero la venta se guarda con una fila basura.
			*/
			let metodos = this.selected_payment_methods_.filter(pay => {
				return Number(pay.current_acount_payment_method_id)
			})

			this.$store.commit('vender/setSelectedPaymentMethods', metodos)

			this.$bvModal.hide('payment-method-modal')
		},
		calcular() {
		    /*
		    	Tambien acá y no solo en terminar(): con descuentos por metodo de pago el reparto es
		    	de dos pasos, y este es el PRIMERO. Sin la guarda, una fila sin metodo elegido entra
		    	al forEach de abajo, `payment_method` queda undefined y el spread `...payment_method`
		    	empuja una opcion vacia al select del segundo paso.
		    */
		    if (this.hay_metodo_de_pago_sin_elegir(this.selected_payment_methods_)) return

		    if (!this.chequear_total_repartido()) return

		    /* 
		    	Aca guardo los metodos de pago elegidos en la primer instancia de repartir el total,
		    	Seteo tambien el discount_amount para mostrar en el modal y calcular el total en mixins/vender_set_total.setTotal()
		    */
		    let modal_payment_methods = []
		    let next_selected = []

		    this.selected_payment_methods_.forEach(pay => {

		        /*
		        	Una fila sin metodo elegido se saltea. La guarda de arriba ya freno las que
		        	tienen monto, asi que lo que puede llegar acá es una fila en blanco y en cero:
		        	sin esto, `payment_method` queda undefined y el spread de mas abajo empuja al
		        	select del segundo paso una opcion con value y text en undefined.
		        */
		        if (!Number(pay.current_acount_payment_method_id)) {
		            return
		        }

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
<style lang="sass">
// Footer del modal de multiples metodos de pago de Vender. El componente es el unico hijo del
// slot #modal-footer, asi que tiene que ocupar la franja entera para que la geometria del sistema
// --secundaria a la izquierda, confirmatoria a la derecha-- se pueda ver.
.vender-multipago-footer
	display: flex
	align-items: center
	gap: 10px
	width: 100%

	.vender-multipago-footer__cancelar
		margin-right: auto

// 576px es el breakpoint `sm` de bootstrap, el mismo que usa el resto del sistema.
@media (max-width: 575.98px)
	.vender-multipago-footer
		flex-direction: column-reverse
		align-items: stretch

		.btn
			width: 100%

		.vender-multipago-footer__cancelar
			margin-right: 0
</style>
