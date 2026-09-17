<template>
    <div class="m-b-15">

        <multi-payment-methods
            v-model="pago.current_acount_payment_methods"
            :payment_method_factory="payment_method_factory"
            :parent_modal_id="parent_modal_id"
            :show_decimal_help="true"
            :address_id="address_id"
            @changed="update_total"


            :base_moneda="base_moneda"
            :show_cash_box="true"
            :validate_cash_box_moneda="validate_cash_box_moneda"

            :show_retencion="true"
            :show_datos_retencion="es_cobro_a_cliente"
        >
        </multi-payment-methods>
    </div>
</template>

<script>
import MultiPaymentMethods from '@/components/common/payment-methods/Index'
import CheckInfo from '@/components/common/current-acounts/pago/CheckInfo'
import CreditCard from '@/components/common/current-acounts/pago/CreditCard'
import cajas from '@/mixins/vender/cajas'

export default {
    name: 'CurrentAcountPagoPaymentMethods',
    mixins: [cajas],
    components: {
        MultiPaymentMethods,
        CheckInfo,
        CreditCard,
    },
    props: {
        pago: {
            type: Object,
            required: true,
        },
        /**
         * Id del `b-modal` que contiene este bloque; se reenvía a MultiPaymentMethods para refrescar al abrir.
         */
        parent_modal_id: {
            type: String,
            default: null,
        },
    },
    computed: {
        cajas() {
            return this.$store.state.caja.models
        },
        /**
         * Si este modal es un COBRO a un cliente y no un PAGO a un proveedor. Es el mismo
         * componente para las dos puntas y lo unico que cambia es `from_model_name`.
         *
         * 🔴 SOLO APAGA LOS CAMPOS DEL CERTIFICADO, NO EL METODO DE PAGO. Son dos cosas distintas
         * y mezclarlas romperia el circuito del proveedor:
         *
         *   - El METODO sigue disponible en las dos puntas (`show_retencion` va en `true`), y esta
         *     bien que asi sea. Si vos sos agente de retencion y le retenes a tu proveedor, le
         *     pagas menos plata y le cancelas la deuda completa: exactamente la misma mecanica.
         *   - El CERTIFICADO solo se pide al COBRAR. Cuando le pagas a un proveedor el agente de
         *     retencion sos VOS: esa es una retencion PRACTICADA, no sufrida, y
         *     `CurrentAcountController::guardar_retenciones_sufridas()` corta al principio con
         *     `if ($model_name != 'client') return 0;`. Lo que se cargara ahi no se guardaria en
         *     ningun lado.
         *
         * Antes los campos iban con `true` fijo y el modal de pago a proveedor dibujaba los seis,
         * con el texto "el certificado que te dio el cliente" cuando ahi no hay ningun cliente. Es
         * el mismo agujero que estos flags vinieron a tapar en Vender y en Gastos, en otra
         * pantalla.
         *
         * @returns {Boolean}
         */
        es_cobro_a_cliente() {
            return this.$store.state.current_acount.from_model_name == 'client'
        },
        /**
         * Sucursal por defecto de las cajas del modal: la que esta puesta en Vender.
         *
         * 🔴 Sale del STORE y no de la cookie, y no es un detalle de estilo. Un computed cuya unica
         * fuente es `this.$cookies.get(...)` NO TIENE NINGUNA DEPENDENCIA REACTIVA: Vue lo evalua la
         * primera vez y se queda con ese valor mientras el componente viva. Si el usuario cambia la
         * sucursal en Vender con esta pantalla ya montada, el modal seguia ofreciendo las cajas de
         * la sucursal anterior. Medido el 4/9/2026 escribiendo la cookie con el modal montado: el
         * select no se movio.
         *
         * `vender.address_id` es la misma sucursal --el setter de mixins/vender.js escribe el store
         * y la cookie a la vez, y start_methods.js lo inicializa al entrar-- pero reactiva. La
         * cookie queda de respaldo por si el store todavia no se inicializo.
         *
         * @returns {number|null}
         */
        address_id() {
            let del_store = Number(this.$store.state.vender.address_id) || 0
            if (del_store) {
                return del_store
            }

            let de_la_cookie = Number(this.$cookies.get('address_id')) || 0
            if (de_la_cookie) {
                return de_la_cookie
            }

            return null
        },
        base_moneda() {
            return this.from_credit_account.moneda_id
        },
        from_credit_account() {
            return this.$store.state.current_acount.from_credit_account
        },
    },
    mounted() {
        // Asegura que haya al menos 1 metodo y setea total inicial
        if (!this.pago.current_acount_payment_methods || !this.pago.current_acount_payment_methods.length) {
            this.$set(this.pago, 'current_acount_payment_methods', [this.payment_method_factory()])
        }
        this.set_total_from_array()
    },
    methods: {
        update_total(payment_methods) {
            console.log('update_total')
            let total = 0
            console.log(payment_methods)

            payment_methods.forEach(payment_method => {
                console.log(payment_method.amount_cotizado)
                if (
                    typeof payment_method.amount_cotizado != 'undefined'
                    && payment_method.amount_cotizado != ''
                    && Number(payment_method.amount_cotizado) > 0
                ) {

                    total += Number(payment_method.amount_cotizado)
                } else {

                    total += Number(payment_method.amount)
                }
            })

            this.pago.haber = total
        },
        validate_cash_box_moneda() {

        },
        payment_method_factory() {
            // Este objeto es el mismo “default” que vos ya usabas (incluye cheque/tarjeta)
            return {
                /*
                 * Identificador propio de la fila, para el :key del v-for de PaymentMethodsStep.
                 *
                 * 🔴 Sin esto, TODAS las filas se renderizan con :key undefined. Con un solo metodo
                 * de pago no se nota, pero al agregar el segundo Vue 2 reutiliza los nodos entre
                 * filas y los selects (metodo, moneda y sobre todo CAJA) se mezclan: el usuario
                 * elegia la caja en pesos del segundo metodo y terminaba sin impactar. Reportado el
                 * 21/8/2026 sobre una cuenta corriente en dolares pagada con efectivo en dolares +
                 * efectivo en pesos.
                 *
                 * El factory de vender (components/vender/modals/payment-methods/Index.vue) ya lo
                 * definia; este se habia quedado sin el.
                 */
                __row_id: Date.now() + '_' + Math.random().toString(16).slice(2),

                current_acount_payment_method_id: 3,
                amount: '',
                bank: '',
                payment_date: '',
                num: '',
                credit_card_id: 0,
                credit_card_payment_plan_id: 0,
                caja_id: 0,
                moneda_id: this.base_moneda, // o 'ARS'
                cotizacion: this.owner.dollar,
                amount_cotizado: '',
                

                // ✅ Cheque
                numero: '',
                banco: '',
                fecha_emision: '',
                fecha_pago: '',
                es_echeq: 0,

                // ✅ Tarjeta (ejemplo, ajustá a tu modelo real)
                credit_card_id: 0,
                credit_card_payment_plan_id: 0,

                cuota_id: 0,

                /*
                 * ✅ Retencion sufrida (mision compras-factura-manual-alicuotas, 17/9/2026).
                 *
                 * Los datos del certificado que da el cliente que te retiene. Van prefijados porque
                 * comparten la fila con los del cheque: sin el prefijo, `numero` y `fecha` serian
                 * el mismo campo para los dos.
                 *
                 * 🔴 El IMPORTE de la retencion NO esta aca: es el `amount` de esta misma fila, el
                 * mismo campo que el efectivo. Por eso suma al total del cobro y cancela la deuda
                 * entera (si te deben $100.000 y te retienen $2.000, te pagan $98.000 y la deuda se
                 * cancela por $100.000). Un segundo campo de monto abriria la puerta a que los dos
                 * numeros no coincidan.
                 *
                 * El impuesto arranca en `ganancias`, que es la retencion mas comun y la unica que
                 * cae en un renglon informativo de la Posicion Fiscal: si el usuario no lo toca, el
                 * dato flojo no le cambia el IVA ni el IIBB a pagar del periodo.
                 */
                retencion_impuesto: 'ganancias',
                retencion_numero_certificado: '',
                retencion_fecha: '',
                retencion_regimen: '',
                retencion_base_imponible: '',
                retencion_alicuota: '',
            }
        },

        default_caja_resolver(payment_method_id, address_id) {
            // Usa tu logica existente del mixin de cajas
            return this.get_caja_por_defecto(payment_method_id, address_id)
        },

        set_total(total) {
            this.pago.haber = total
        },

        set_total_from_array() {
            let total = 0
            this.pago.current_acount_payment_methods.forEach(pm => {
                total += Number(pm.amount) || 0
            })
            this.pago.haber = total
        },
    }
}
</script>