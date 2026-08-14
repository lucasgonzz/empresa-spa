import computed from '@/mixins/vender/computed'
export default {
	mixins: [computed],
    data() {
        return {
            intentos_volver_a_llamar_set_omitir_en_cuenta_corriente: 0,
        }
    },
	methods: {
        set_omitir_en_cuenta_corriente() {
            // Se esta editando una venta previa o un presupuesto: el default del comercio no tiene
            // que pisar el omitir_en_cuenta_corriente que trae la venta. El return va aca adentro y
            // no en el llamador porque es lo unico que frena los reintentos ya agendados por setTimeout.
            if (this.index_previus_sales > 0 || this.budget) {
                return
            }
            if (this.authenticated) {
                if (this.owner.siempre_omitir_en_cuenta_corriente) {
                    this.$store.commit('vender/set_omitir_en_cuenta_corriente', 1)
                } 
            } else {
                this.volver_a_llamar_set_omitir_en_cuenta_corriente()
            }

        },
        volver_a_llamar_set_omitir_en_cuenta_corriente() {
            if (this.intentos_volver_a_llamar_set_omitir_en_cuenta_corriente < 5) {
                setTimeout(() => {
                    this.intentos_volver_a_llamar_set_omitir_en_cuenta_corriente++
                    this.set_omitir_en_cuenta_corriente()
                }, 2000)
            }
        },

	}
}