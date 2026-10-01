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
/* El mismo armado de descuentos / recargos desde las filas que usa la reapertura de un presupuesto. */
import { ajustes_del_cobro_de_filas } from '@/mixins/vender/previus_sale/index'
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

			/*
				🔴 Si este reparto lo abrio el cartel de GUARDAR UN PRESUPUESTO (mision presupuesto-contado-
				o-cuenta-corriente, 1/10/2026), "Listo" tiene reglas propias y ademas GUARDA el presupuesto.
				Va por un camino aparte y no mezclado con el de abajo para que una venta comun --que usa este
				mismo modal con el boton verde, con la marca apagada-- no cambie en nada.
			*/
			if (this.$store.state.vender.budget_cobro_pendiente) {
				this.terminar_cobro_del_presupuesto()
				return
			}

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
		/**
		 * "Listo" del reparto que abrio el cartel de guardar un presupuesto: valida, deja el store con
		 * el reparto y el total definitivos, cierra el modal y avisa para que el cartel guarde.
		 *
		 * Lo que hace distinto de una venta, y por que:
		 *
		 * - 🔴 El AJUSTE del total se recalcula desde las filas FINALES. Una venta lo toma de
		 *   `modal_payment_methods`, que `calcular()` fija en el paso 1; si en el paso 2 se QUITA una
		 *   fila, el modal conserva su descuento / recargo y el total de la SPA queda distinto del que
		 *   calcula la API, que suma `discount_amount` / `surchage_amount` de las filas que llegan
		 *   (BudgetCobroHelper::ajuste_por_metodos_de_pago). Medido: bruto 2530, paso 1 Tarjeta con
		 *   recargo 122,40 y Transferencia con descuento 50 (total 2602,40); en el paso 2 se quita la
		 *   Transferencia y la Tarjeta toma todo: la SPA mandaba 2602,40 y la API calculaba 2652,40,
		 *   y el POST moria con "El total del presupuesto no corresponde". Reconstruir el modal desde
		 *   las filas deja los dos lados calculando de la misma fuente; si el total cambia y el reparto
		 *   ya no cierra, el chequeo de abajo frena y el vendedor vuelve a repartir.
		 * - Una fila sin plata (metodo elegido y monto en cero, como la que nace por defecto) se trata
		 *   como una fila quitada: no viaja y su descuento / recargo tampoco cuenta.
		 * - La CAJA es obligatoria como en Vender (chequeos/cajas.js::check_cajas), que acá no corre.
		 *   Sin esto, en un comercio con cajas se repartia Efectivo con "Seleccione caja", la API lo
		 *   aceptaba y al confirmar la venta nacia de contado sin movimiento de caja NI de cuenta
		 *   corriente: plata que no esta en ningun lado.
		 * - Despues de commitear el reparto y cerrar, apaga la marca y emite el aviso que escucha el
		 *   cartel (budget-cobro/Index.vue), que es quien guarda.
		 *
		 * Si algo falla muestra el toast y deja el modal abierto: no se cierra ni se guarda nada.
		 */
		terminar_cobro_del_presupuesto() {
			let filas = this.selected_payment_methods_.filter(pay => {
				return Number(pay.current_acount_payment_method_id) && this.fila_con_monto(pay)
			})

			// Sin ningun metodo con plata no hay nada que cobrar al confirmar: la API lo trataria como cuenta corriente.
			if (!filas.length) {
				this.$toast.error('Elegí al menos un método de pago, con su monto, para cobrar el presupuesto')
				return
			}

			// 1) El ajuste sale de las filas finales, y el total se recalcula con el.
			this.$store.commit('vender/set_modal_payment_methods', ajustes_del_cobro_de_filas(filas, this.payment_methods))
			this.setTotal()

			/*
				2) El reparto tiene que sumar el total YA recalculado. Se compara contra el store y no contra
				la prop `total_a_repartir`: la prop recien se actualiza cuando el padre vuelve a dibujar, y
				con el valor viejo el chequeo pasaria justo cuando no tiene que pasar.
			*/
			if (!this.chequear_total_repartido(this.$store.state.vender.total, this.sumar_reparto(filas))) return

			// 3) Cada metodo con caja necesita la suya. Se miran las filas del modal, no las filtradas, para que "metodo N" sea el de la pantalla.
			if (!this.chequear_cajas_del_cobro(this.selected_payment_methods_)) return

			this.$store.commit('vender/setSelectedPaymentMethods', filas)

			this.$bvModal.hide('payment-method-modal')

			// La marca se apaga ACA, antes de avisar: el cartel es el unico que escucha y quien guarda.
			this.$store.commit('vender/set_budget_cobro_pendiente', false)
			this.$root.$emit('vender:presupuesto-cobro-definido')
		},
		/**
		 * ¿La fila tiene plata? Se mira el monto en la moneda de la fila Y el cotizado, igual que
		 * hay_metodo_de_pago_sin_elegir / hay_metodo_de_pago_sin_caja.
		 *
		 * @param {Object} pay Fila del reparto.
		 * @returns {boolean}
		 */
		fila_con_monto(pay) {
			return (Number(pay.amount) || 0) > 0 || (Number(pay.amount_cotizado) || 0) > 0
		},
		/**
		 * Suma del reparto: por fila, el monto cotizado si lo hay (otra moneda) y si no el monto. Es la
		 * misma cuenta de `total_repartido` en payment-methods/Index.vue y la de la API (V3), pero
		 * sobre las filas que ya se decidio mandar.
		 *
		 * @param {Array} filas
		 * @returns {number}
		 */
		sumar_reparto(filas) {
			let total = 0

			filas.forEach(pay => {
				if (Number(pay.amount_cotizado) > 0) {
					total += Number(pay.amount_cotizado)
				} else {
					total += Number(pay.amount) || 0
				}
			})

			return total
		},
		/**
		 * La regla de caja de Vender (chequeos/cajas.js::check_cajas) para el reparto de un
		 * presupuesto. No se llama a check_cajas() porque lee `selected_payment_methods` del STORE, que
		 * a esta altura todavia no tiene el reparto nuevo, y porque pide caja hasta para las filas
		 * donde el select ni se dibuja.
		 *
		 * No se exige de mas: sin cajas cargadas no hay select (PaymentMethodsStep.show_caja_select) ni
		 * nada que elegir, y las filas sin plata y las del metodo 1 (que no mueve caja) las saltea
		 * hay_metodo_de_pago_sin_caja. Con cajas cargadas pero ninguna abierta se avisa lo mismo que
		 * Vender, porque el select estaria vacio y "elegi la caja" no se podria cumplir.
		 *
		 * @param {Array} filas Filas del modal, tal cual se ven.
		 * @returns {boolean} true si se puede seguir (si no, ya mostro el toast).
		 */
		chequear_cajas_del_cobro(filas) {
			if (!this.cajas.length) {
				return true
			}

			if (!this.cajas_abiertas.length) {
				this.$toast.error('Habra al menos una CAJA para poder indicarla en este presupuesto')
				return false
			}

			return !this.hay_metodo_de_pago_sin_caja(filas)
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
		            /*
		            	El __row_id se arrastra. Este objeto literal REEMPLAZA a la fila del
		            	MultiPaymentMethods, asi que sin el la fila vuelve a identificarse por indice
		            	en el :key del v-for --el bug del 21/8/2026 por el que Vue 2 reutiliza nodos
		            	entre filas y mezcla los selects de metodo, moneda y caja--. Y queda peor que
		            	uniforme: si en el segundo paso se agrega una fila, esa SI trae __row_id y las
		            	demas no, asi que conviven dos formas de key.
		            */
		            __row_id: pay.__row_id,
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
		/*
			Los dos totales son opcionales y valen lo que siempre: las props del padre. El reparto de un
			presupuesto (terminar_cobro_del_presupuesto) los pasa a mano porque acaba de recalcular el
			total y las props todavia no se actualizaron.
		*/
		chequear_total_repartido(total_a_repartir = this.total_a_repartir, total_repartido = this.total_repartido) {

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
			if (Math.round(total_repartido * 100) / 100 != Math.round(total_a_repartir * 100) / 100) {
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

			/*
				Si el modal lo abrio el cartel del presupuesto, cancelar NO guarda nada y devuelve la
				pantalla a como estaba antes de preguntar (omitir en cuenta corriente, metodo de pago,
				caja y total). Lo hace el cartel, que es quien sacó la foto de lo anterior; aca solo se
				le avisa. Cerrar el modal con Esc, que no pasa por este metodo, lo cubre el propio
				cartel escuchando el cierre del modal.
			*/
			if (this.$store.state.vender.budget_cobro_pendiente) {
				this.$root.$emit('vender:presupuesto-cobro-cancelado')
			}
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
