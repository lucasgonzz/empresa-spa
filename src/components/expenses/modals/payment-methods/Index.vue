<template>
    <b-modal 
    title="Indicar Metodos de Pago"
    hide-footer
    @show="on_modal_show"
    id="payment-method-modal">

        <multi-payment-methods
            :key="payment_methods_key"
            v-model="expense.payment_methods"
            :payment_method_factory="payment_method_factory"
            :show_decimal_help="true"
            :address_id="address_id"


            :base_moneda="base_moneda"
            :show_cash_box="true"
        >
        </multi-payment-methods>

        <b-button
        block
        variant="primary"
        @click="terminar">
            Listo
        </b-button>
    </b-modal>
</template>

<script>
import MultiPaymentMethods from '@/components/common/payment-methods/Index'

export default {
    name: 'CurrentAcountexpensePaymentMethods',
    components: {
        MultiPaymentMethods,
    },
    computed: {
        expense() {
            return this.$store.state.expense.model 
        },
        address_id() {
            let address_id = this.$cookies.get('address_id')
            if (address_id) {
                return Number(address_id)
            }
            return null
        },
        base_moneda() {
            return this.expense.moneda_id
        },
    },
    data() {
        return {
            payment_methods_key: 0,
        }
    },
    // mounted() {
    //     this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
    //         if (
    //             modalId == 'payment-method-modal'
    //         ) {

    //             this.$set(this.expense, 'payment_methods', [this.payment_method_factory()])

    //         }
    //     })
    // },
    // mounted() {
    //     this.$set(this.expense, 'payment_methods', [this.payment_method_factory()])
    //     this.set_total_from_array()
    // },
    methods: {
        on_modal_show() {
            // ✅ fuerza remount del MultiPaymentMethods
            this.payment_methods_key += 1

            // ✅ resetea el array con la moneda actual (base_moneda ya viene de expense)
            this.$set(this.expense, 'payment_methods', [this.payment_method_factory()])
        },
        terminar() {
            this.set_total_from_array()
            console.log('quedaron asi:')
            console.log(this.expense.payment_methods)
            this.$bvModal.hide('payment-method-modal')
        },
        payment_method_factory() {
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
            }
        },

        set_total_from_array() {
            let total = 0
            this.expense.payment_methods.forEach(pm => {
                total += Number(pm.amount) || 0
            })
            console.log('total: '+total)
            this.$set(this.expense, 'amount', total)
        },
    }
}
</script>