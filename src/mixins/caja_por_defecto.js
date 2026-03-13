export default {
	methods: {

        get_caja_por_defecto(method_id, address_id, moneda_id) {

            // let payment_method = this.$store.state.current_acount_payment_method.models.find(p => p.id == method_id)
            // console.log('set_caja_por_defecto para el payment_method: '+payment_method.name)

            // Obtengo las configuraciones de default_payment_method_caja que coinciden con el metodo y address utilizados
            let default_payment_method_cajas = this.$store.state.default_payment_method_caja.models.filter(default_caja => {
                if (
                    default_caja.current_acount_payment_method_id == method_id 
                    && default_caja.address_id == address_id
                ) {
                    return true
                }
                return false
            })

            console.log('config cajas por defecto: '+default_payment_method_cajas.length)


            // Obtengo los modelos de Caja en base a los default_payment_method_caja obtenidos
            let cajas_por_defecto = []

            default_payment_method_cajas.forEach(default_caja => {
                let caja = this.$store.state.caja.models.find(caja => caja.id == default_caja.caja_id)

                if (typeof caja != 'undefined') {
                    cajas_por_defecto.push(caja)
                }
            })


            let cajas_por_defecto_por_empleado = []

            cajas_por_defecto.forEach(caja => {
                if (caja.employee_id && caja.employee_id == this.user.id) {
                    cajas_por_defecto_por_empleado.push(caja)
                }
            })

            if (cajas_por_defecto_por_empleado.length) {
                console.log('se van a usar cajas por empleado: '+cajas_por_defecto_por_empleado.length)
                cajas_por_defecto = cajas_por_defecto_por_empleado
            }

            console.log('cajas_por_defecto: ')
            cajas_por_defecto.forEach(c => console.log(c.name))

            if (cajas_por_defecto.length) {

                let caja_por_defecto = cajas_por_defecto[0]

                if (this.hasExtencion('ventas_en_dolares')) {
                    caja_por_defecto = cajas_por_defecto.find(caja => caja.moneda_id == moneda_id)
                }

                if (typeof caja_por_defecto != 'undefined') {

                	return caja_por_defecto

                    this.$emit('update_caja_id', index, Number(caja_por_defecto.id))
                    console.log('Usando la caja por defecto:')
                    console.log(cajas_por_defecto)
                }
            }

            return null
        },
	}
}