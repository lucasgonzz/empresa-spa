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
            /*
                Editando un comprobante guardado no se aplica ningun default: la venta ya tiene su
                metodo de pago (o ninguno, a proposito, si va a la cuenta corriente).

                El guard va ACA ADENTRO y no en el llamador porque lo que produce el bug son los
                reintentos: cuando la autenticacion no esta lista, esta funcion se reagenda sola a
                los 2, 4, 6, 8 y 10 segundos, y la venta que se esta editando se aplica a los 500
                ms. Todos los reintentos caen despues. Un guard en el llamador no los frena.

                force_reset en true es una accion explicita -guardar una venta, limpiar, o el
                usuario tocando el checkbox de omitir cuenta corriente-, y ahi si tiene que
                aplicar, tambien en edicion.

                Ojo con por que no alcanza el guard de abajo: una venta a cuenta corriente tiene
                current_acount_payment_method_id en 0, que es falsy, o sea que justo el estado que
                hay que proteger es el que ese guard no distingue de "el usuario no eligio nada".
            */
            if (!force_reset && (this.$store.getters['vender/previus_sales/editando_venta_previa'] || !!this.$store.state.vender.budget)) {
                return
            }
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
                /* Sin reparto activo, los montos de descuento/recargo que dejo el reparto anterior no aplican mas */
                this.$store.commit('vender/set_modal_payment_methods', [])
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