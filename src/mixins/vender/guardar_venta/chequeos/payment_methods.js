export default {
	computed: {
		current_acount_payment_method_id() {
			return this.$store.state.vender.current_acount_payment_method_id
		},
		client() {
			return this.$store.state.vender.client
		},
		omitir_en_cuenta_corriente() {
			return this.$store.state.vender.omitir_en_cuenta_corriente
		},
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
		/* El catalogo de metodos de pago del comercio. Si esta vacio, el chequeo no aplica. */
		metodos_de_pago_del_catalogo() {
			return this.$store.state.current_acount_payment_method.models
		},
	},
	methods: {
		/**
		 * Una venta de CONTADO --sin cliente, o con cliente pero omitida en cuenta corriente-- no
		 * se guarda sin metodo de pago: ni el unico del select ni el reparto del modal.
		 *
		 * 🔴 Este chequeo estuvo APAGADO desde el 4/3/2026 (commit 3ec0a82a, mensaje "."), con un
		 * `return true` en la primera linea. Ese mismo commit mudo el reparto en varios metodos de
		 * pago al modal nuevo (modals/payment-methods/Index.vue) y `sobrante_a_repartir` --que
		 * check_sobrante_a_repartir() leia-- paso a existir SOLO como computed de ese modal. Desde
		 * BtnGuardar quedaba undefined, `undefined != 0` es true, y toda venta con reparto se
		 * frenaba con "Seleccione Metodo de Pago": se apago el chequeo entero en vez de migrar el
		 * guard, y nunca se volvio a prender.
		 *
		 * Consecuencia, hasta esta mision: una venta de contado con el select en "Seleccione
		 * metodo de pago" (valor 0) pasaba todos los chequeos, el back adjuntaba el 0 y
		 * SaleCajaHelper no creaba movimiento de caja: cobrada sin metodo y sin caja. Se llegaba
		 * ahi eligiendo el placeholder, cancelando el modal del boton verde (que pone metodo y caja
		 * en 0 antes de abrirlo) o guardando un presupuesto editado, que dejaba el metodo en 0 para
		 * la venta siguiente.
		 *
		 * El reparto ya no se valida aca (check_sobrante_a_repartir se fue): el modal exige que la
		 * suma de las filas de el total antes de commitear selected_payment_methods, asi que si hay
		 * reparto, el reparto esta bien.
		 *
		 * Solo aplica si el comercio TIENE metodos de pago cargados: una cuenta que no los usa
		 * vende sin elegir ninguno, y no hay nada que exigirle.
		 *
		 * @returns {boolean} true = seguir guardando. false = abortar, ya se mostro el aviso.
		 */
		check_payment_methods() {

			if (!this.metodos_de_pago_del_catalogo.length) {
				return true
			}

			// Venta de contado: sin cliente, o con cliente pero omitida en cuenta corriente.
			let es_de_contado = !this.client || this.omitir_en_cuenta_corriente

			if (
				es_de_contado
				&& !this.current_acount_payment_method_id
				&& !this.selected_payment_methods.length
			) {

				this.$toast.error('Seleccione un metodo de pago', {
					duration: 5000,
				})

				return false
			}

			return true
		},
	}
}
