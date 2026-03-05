<template>
    <div class="m-b-15">

        <multi-payment-methods
            v-model="pago.current_acount_payment_methods"
            :payment_method_factory="payment_method_factory"
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
    },
    computed: {
        cajas() {
            return this.$store.state.caja.models
        },
        address_id() {
            let address_id = this.$cookies.get('address_id')
            if (address_id) {
                return Number(address_id)
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
                current_acount_payment_method_id: 3,
                amount: '',
                bank: '',
                payment_date: '',
                num: '',
                credit_card_id: 0,
                credit_card_payment_plan_id: 0,
                caja_id: 0,
                moneda_id: this.base_moneda, // o 'ARS'
                cotizacion: this.user.dollar,
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