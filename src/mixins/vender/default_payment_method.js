import computed from '@/mixins/vender/computed'
export default {
	mixins: [computed],
    data() {
        return {
            intentos_volver_a_llamar_default_payment_method: 0,
        }
    },
	methods: {

        setDefaultPaymentMethod() {
            if (this.authenticated) {
                if (this.owner.default_current_acount_payment_method_id) {
                    this.$store.commit('vender/setCurrentAcountPaymentMethodId', this.owner.default_current_acount_payment_method_id)
                } else {
                    if (!this.current_acount_payment_method_id) {
                        this.$store.commit('vender/setCurrentAcountPaymentMethodId', 3)
                    }
                }
            } else {
                this.volver_a_llamar_default_payment_method()
            }
        },
        volver_a_llamar_default_payment_method() {
            if (this.intentos_volver_a_llamar_default_payment_method < 5) {
                setTimeout(() => {
                    this.intentos_volver_a_llamar_default_payment_method++
                    this.setDefaultPaymentMethod()
                }, 2000)
            }
        },
	}
}