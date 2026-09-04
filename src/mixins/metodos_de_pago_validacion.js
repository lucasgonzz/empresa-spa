/**
 * Guarda del bloque de multiples metodos de pago (components/common/payment-methods/).
 *
 * 🔴 Por que existe, y por que no se puede sacar sin volver a romper algo:
 *
 * Desde el 4/9/2026 la fila que se AGREGA con "Agregar método de pago" nace en blanco
 * (current_acount_payment_method_id = 0) en vez de precargada en Efectivo. Antes de ese cambio el
 * 0 era inalcanzable: los cuatro factories devolvian 3 y el select nunca volvia a la opcion
 * "Seleccione el método de pago".
 *
 * Con el 0 alcanzable, una fila con monto cargado y sin metodo elegido llega al backend, y ahi
 * `PaymentMethodHelper::attach_payment_methods` (empresa-api) hace
 * `CurrentAcountPaymentMethod::find(0)` -> null -> `continue` con un `Log::warning`. O sea: la
 * fila se descarta, el gasto/pago/venta se guarda igual, la operacion devuelve EXITO y el monto
 * de esa fila desaparece sin que nadie vea un error. Es exactamente el modo de falla silenciosa
 * que el comentario de aquel helper describe para el caso del `return` (3/8/2026).
 *
 * Por eso la fila en blanco y esta validacion son la misma unidad de trabajo: la primera abre el
 * agujero, la segunda lo tapa del lado del usuario, donde todavia se puede corregir.
 */
export default {
	methods: {

		/**
		 * @param {Array} payment_methods Filas del bloque de metodos de pago.
		 * @returns {boolean} true si hay alguna fila con monto y sin metodo elegido (y ya avisó).
		 */
		hay_metodo_de_pago_sin_elegir(payment_methods) {

			if (!Array.isArray(payment_methods)) {
				return false
			}

			for (let index = 0; index < payment_methods.length; index++) {

				let fila = payment_methods[index]

				if (!fila) {
					continue
				}

				if (Number(fila.current_acount_payment_method_id)) {
					continue
				}

				/*
				 * Se mira el monto en la moneda de la fila Y el cotizado: una fila en otra moneda
				 * puede tener amount en 0 por como quedo el reparto y amount_cotizado con valor.
				 * Una fila vacia del todo no molesta a nadie: el backend la saltea sin perder plata.
				 */
				let monto = Number(fila.amount) || 0
				let monto_cotizado = Number(fila.amount_cotizado) || 0

				if (monto > 0 || monto_cotizado > 0) {

					this.$toast.error('Elegí el método de pago ' + (index + 1) + ', o borrá esa fila')

					return true
				}
			}

			return false
		},
	}
}
