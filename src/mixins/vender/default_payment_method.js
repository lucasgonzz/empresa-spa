import computed from '@/mixins/vender/computed'
export default {
	mixins: [computed],
    data() {
        return {
            intentos_volver_a_llamar_default_payment_method: 0,
        }
    },
	methods: {

        /**
         * Asigna el método de pago por defecto del owner o el fallback (3).
         * @param {boolean} force_reset true: reemplaza el método actual (tras venta o reset explícito).
         *                            false: solo asigna si aún no hay método (id 0), p. ej. al entrar a Vender.
         */
        setDefaultPaymentMethod(force_reset = false) {
            // Sin forzar: conservar la selección del usuario al volver a Vender desde otro módulo
            if (!force_reset && this.current_acount_payment_method_id) {
                return
            }
            if (this.authenticated) {
                if (this.owner.default_current_acount_payment_method_id) {
                    this.$store.commit('vender/setCurrentAcountPaymentMethodId', this.owner.default_current_acount_payment_method_id)
                } else {
                    if (force_reset || !this.current_acount_payment_method_id) {
                        this.$store.commit('vender/setCurrentAcountPaymentMethodId', 3)
                    }
                }
            } else {
                this.volver_a_llamar_default_payment_method(force_reset)
            }
        },
        /**
         * Reintenta asignar el método por defecto cuando auth aún no está lista.
         * @param {boolean} force_reset Mismo criterio que setDefaultPaymentMethod.
         */
        volver_a_llamar_default_payment_method(force_reset = false) {
            if (this.intentos_volver_a_llamar_default_payment_method < 5) {
                setTimeout(() => {
                    this.intentos_volver_a_llamar_default_payment_method++
                    this.setDefaultPaymentMethod(force_reset)
                }, 2000)
            }
        },

        
        bloquear_metodo_de_pago() {
            if (!this.omitir_en_cuenta_corriente) {
                this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0)
                this.$store.commit('vender/setSelectedPaymentMethods', [])
            }
        },
        bloquear_caja() {
            if (!this.omitir_en_cuenta_corriente) {
                this.$store.commit('vender/set_caja_id', 0)
            }
        },
        habilitar_metodo_de_pago() {
            this.$store.commit('vender/setCurrentAcountPaymentMethodId', 3)
        },
	}
}