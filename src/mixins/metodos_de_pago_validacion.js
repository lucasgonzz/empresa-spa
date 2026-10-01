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

		/**
		 * Guarda hermana de `hay_metodo_de_pago_sin_elegir`: acá el metodo SI esta elegido pero
		 * quedo sin caja. El backend (ExpenseHelper::crear, CurrentAcountPagoHelper) no rechaza
		 * este caso -- deja el metodo de pago guardado y solo loguea un warning, porque asi
		 * conviven casos donde de verdad no corresponde caja (ver el `metodo_id === 1` de abajo).
		 * Sin este chequeo del lado del usuario, la plata de esa fila no impacta en NINGUNA caja
		 * y el unico rastro es un log que nadie mira.
		 *
		 * @param {Array} payment_methods Filas del bloque de metodos de pago.
		 * @returns {boolean} true si hay alguna fila con monto y sin caja elegida (y ya avisó).
		 */
		hay_metodo_de_pago_sin_caja(payment_methods) {

			if (!Array.isArray(payment_methods)) {
				return false
			}

			for (let index = 0; index < payment_methods.length; index++) {

				let fila = payment_methods[index]

				if (!fila) {
					continue
				}

				let metodo_id = Number(fila.current_acount_payment_method_id) || 0

				/*
				 * Sin metodo elegido ya lo denuncia hay_metodo_de_pago_sin_elegir. Y el metodo 1
				 * es cuenta corriente: PaymentMethodsStep.show_caja_select() ni siquiera dibuja el
				 * select de caja para el, asi que pedirla acá dejaría al usuario sin forma de
				 * satisfacer el chequeo.
				 */
				if (!metodo_id || metodo_id === 1) {
					continue
				}

				let monto = Number(fila.amount) || 0
				let monto_cotizado = Number(fila.amount_cotizado) || 0

				if ((monto > 0 || monto_cotizado > 0) && !Number(fila.caja_id)) {

					this.$toast.error('Elegí la caja del método de pago ' + (index + 1))

					return true
				}
			}

			return false
		},

		/**
		 * Guarda hermana de las dos de arriba: una fila en OTRA moneda que la del comprobante y sin
		 * cotización. Vale para los circuitos donde el comprobante tiene su propia moneda (el pago de
		 * una cuenta corriente en pesos o en dólares).
		 *
		 * 🔴 Sin esta guarda la fila llega al backend sin con qué convertir, y en el cobro de una
		 * cuenta corriente el monto se guardaba NOMINAL en la moneda de la cuenta: USD 10 sobre una
		 * cuenta en pesos quedaba como un haber de $10, sin ningún error. Esta es la guarda del lado
		 * del usuario, donde todavía se puede corregir.
		 *
		 * `Number('')`, `Number(undefined)` y `Number(null)` no son > 1, así que la cotización
		 * vacía, ausente, en cero o en uno quedan todas dentro de la misma guarda.
		 *
		 * @param {Array} payment_methods Filas del bloque de metodos de pago.
		 * @param {number} moneda_base Moneda del comprobante (la de la cuenta corriente).
		 * @returns {boolean} true si hay alguna fila con monto, en otra moneda y sin cotización (y ya avisó).
		 */
		hay_moneda_sin_cotizacion(payment_methods, moneda_base) {

			if (!Array.isArray(payment_methods)) {
				return false
			}

			let base = Number(moneda_base) || 0

			// Sin moneda del comprobante no hay contra qué comparar: no se bloquea a nadie.
			if (!base) {
				return false
			}

			for (let index = 0; index < payment_methods.length; index++) {

				let fila = payment_methods[index]

				if (!fila) {
					continue
				}

				let moneda_fila = Number(fila.moneda_id) || 0

				// Una fila sin moneda es de la moneda del comprobante (PaymentMethodsStep la resuelve igual).
				if (!moneda_fila || moneda_fila === base) {
					continue
				}

				// Una fila vacía del todo no molesta a nadie: el backend la saltea sin perder plata.
				let monto = Number(fila.amount) || 0
				let monto_cotizado = Number(fila.amount_cotizado) || 0

				if (!(monto > 0 || monto_cotizado > 0)) {
					continue
				}

				/*
					Mayor a 1 y no solo a 0: una cotización de 1 entre pesos y dólares es lo que queda
					cuando no se cargó ninguna, y el backend la rechaza (CurrentAcountPagoMonedaHelper::
					COTIZACION_MINIMA). Caso real en 2R el 14/8/2026: $126.900 con cotización 1 acreditaron
					USD 126.900. Mismo límite acá para avisarle al usuario antes del POST.
				*/
				if (!(Number(fila.cotizacion) > 1)) {

					this.$toast.error('Falta la cotización del método de pago ' + (index + 1) + ': está en otra moneda que la cuenta y la cotización tiene que ser mayor a 1. Cargala para poder registrar el pago')

					return true
				}
			}

			return false
		},
	}
}
