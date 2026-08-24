import computed from '@/mixins/vender/computed'
export default {
	mixins: [computed],
    data() {
        return {
            intentos_volver_a_llamar_set_omitir_en_cuenta_corriente: 0,
        }
    },
	methods: {
        /**
         * Aplica siempre_omitir_en_cuenta_corriente del comercio a una venta NUEVA.
         *
         * @param {boolean} force_reset true: es una accion explicita (limpiar, guardar) y aplica
         *                              aunque se este editando un comprobante.
         */
        set_omitir_en_cuenta_corriente(force_reset = false) {
            /*
                Este es el default que produjo el bug de San Cayetano: la venta se guardo yendo a
                la cuenta corriente (omitir en 0) y, dos segundos despues de abrirla para editar,
                el reintento la ponia en 1. Al guardar, la API borraba el movimiento de cuenta
                corriente y no lo recreaba.

                El guard va adentro de la funcion porque es lo unico que frena los reintentos:
                los datos de la venta se aplican a los 500 ms y los reintentos van hasta los 10
                segundos.
            */
            if (!force_reset && (this.$store.getters['vender/previus_sales/editando_venta_previa'] || !!this.$store.state.vender.budget)) {
                return
            }
            if (this.authenticated) {
                if (this.owner.siempre_omitir_en_cuenta_corriente) {
                    this.$store.commit('vender/set_omitir_en_cuenta_corriente', 1)
                } 
            } else {
                this.volver_a_llamar_set_omitir_en_cuenta_corriente(force_reset)
            }

        },
        /**
         * Reintenta cuando la autenticacion todavia no esta lista.
         *
         * @param {boolean} force_reset Mismo criterio que set_omitir_en_cuenta_corriente.
         */
        volver_a_llamar_set_omitir_en_cuenta_corriente(force_reset = false) {
            if (this.intentos_volver_a_llamar_set_omitir_en_cuenta_corriente < 5) {
                setTimeout(() => {
                    this.intentos_volver_a_llamar_set_omitir_en_cuenta_corriente++
                    this.set_omitir_en_cuenta_corriente(force_reset)
                }, 2000)
            }
        },

	}
}