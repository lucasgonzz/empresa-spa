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

                let candidatas = cajas_por_defecto

                /*
                 * Filtro de moneda alineado con get_caja_options(), que es el que arma el desplegable,
                 * en sus DOS mitades: solo se filtra cuando hay una moneda concreta -con moneda_id en
                 * 0, null o undefined el desplegable no filtra nada y aca tampoco-, y una caja con
                 * moneda_id null sirve para cualquier moneda.
                 *
                 * Hasta el 29/8/2026 aca se pedia `caja.moneda_id == moneda_id` siempre. Eso rompia
                 * por los dos lados: descartaba las cajas de moneda null, y con moneda_id = 0 -que es
                 * lo que manda PaymentMethodsStep con `Number(pm.moneda_id) || 0`- no quedaba ninguna
                 * candidata. En los dos casos set_caja_por_defecto terminaba emitiendo
                 * update_caja_id(index, 0), borrando la caja que el usuario ya habia elegido.
                 *
                 * 🔴 La coincidencia exacta de moneda se prefiere SIEMPRE; las de moneda null son el
                 * segundo plato, no un empate. Si estuvieran mezcladas, un comercio que tenga la caja
                 * general configurada antes que la de dolares recibiria el egreso en dolares dentro de
                 * la caja en pesos y con el monto crudo -guardar_movimiento_caja usa pivot->amount sin
                 * convertir-. Es exactamente el error de plata que este hotfix vino a evitar.
                 */
                if (this.hasExtencion('ventas_en_dolares') && moneda_id) {

                    let de_la_moneda = cajas_por_defecto.filter(caja => caja.moneda_id == moneda_id)

                    let sin_moneda = cajas_por_defecto.filter(caja => caja.moneda_id === null)

                    candidatas = de_la_moneda.length ? de_la_moneda : sin_moneda
                }

                /*
                 * Se prefieren las cajas abiertas, que son las unicas que el desplegable ofrece:
                 * proponer una cerrada dejaba el select mostrando vacio pero con el caja_id igual
                 * cargado en el modelo, y si esa caja ademas nunca habia tenido apertura, el alta del
                 * gasto reventaba a mitad de camino (reportado el 29/8/2026 con una caja en dolares).
                 *
                 * 🔴 Es una preferencia y NO un filtro duro, a proposito. Si ninguna candidata esta
                 * abierta se devuelve la primera igual, como hasta ahora: el desplegable tampoco tiene
                 * nada para ofrecer en ese caso, asi que un filtro duro dejaria al comercio que carga
                 * gastos con la caja del dia ya cerrada sin default Y sin opciones, guardando gastos
                 * que no impactan en ninguna caja. Cambiariamos un bug por una regresion de plata.
                 * El caso de la caja que nunca se abrio lo corta el backend con un 422 que la nombra.
                 *
                 * Ojo: esto alinea el criterio de APERTURA, no todo get_caja_options(). El desplegable
                 * filtra ademas por la sucursal de la caja y por los permisos del usuario, y este mixin
                 * mira el address_id de la configuracion y el employee_id. Esas dos divergencias siguen
                 * en pie y quedan fuera del alcance de este hotfix.
                 */
                let abiertas = candidatas.filter(caja => caja.abierta)

                let caja_por_defecto = abiertas.length ? abiertas[0] : candidatas[0]

                if (typeof caja_por_defecto != 'undefined') {

                	return caja_por_defecto
                }
            }

            return null
        },
	}
}