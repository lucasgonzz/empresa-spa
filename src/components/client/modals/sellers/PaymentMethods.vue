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
        >
        </multi-payment-methods>
    </div>
</template>

<script>
import MultiPaymentMethods from '@/components/common/payment-methods/Index'
import cajas from '@/mixins/vender/cajas'

export default {
    name: 'SellerPagoPaymentMethods',
    mixins: [cajas],
    components: {
        MultiPaymentMethods,
    },
    props: {
        pago: {
            type: Object,
            required: true,
        },
        /**
         * Moneda del ledger de comisiones activo (el seleccionado en el modal del prompt 04), NO
         * la de una cuenta corriente: un vendedor no tiene `from_credit_account`.
         */
        base_moneda: {
            type: Number,
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
    },
    mounted() {
        if (!this.pago.current_acount_payment_methods || !this.pago.current_acount_payment_methods.length) {
            this.$set(this.pago, 'current_acount_payment_methods', [this.payment_method_factory()])
        }
        this.set_total_from_array()
    },
    methods: {
        update_total(payment_methods) {
            let total = 0
            payment_methods.forEach(payment_method => {
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
            return {
                current_acount_payment_method_id: 3,
                amount: '',
                caja_id: 0,
                moneda_id: this.base_moneda,
                cotizacion: this.owner.dollar,
                amount_cotizado: '',
                cuota_id: 0,
            }
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
