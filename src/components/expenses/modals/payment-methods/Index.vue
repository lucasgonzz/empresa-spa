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
            parent-modal-id="payment-method-modal"
            :show_decimal_help="true"
            :address_id="address_id"


            :base_moneda="base_moneda"
            :show_cash_box="true"
            @changed="on_payment_methods_changed"
        >
        </multi-payment-methods>

        <b-button
        class="m-t-10"
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

            this.$nextTick(() => {
                this.sync_cotizacion_payment_methods()
            })
        },

        /**
         * Tras cualquier cambio emitido por MultiPaymentMethods (monto, moneda, cotización),
         * recalcula `amount_cotizado` en moneda del gasto cuando la moneda de la fila difiere.
         *
         * @returns {void}
         */
        on_payment_methods_changed() {
            this.$nextTick(() => {
                this.sync_cotizacion_payment_methods()
            })
        },

        /**
         * Igual criterio que `check_moneda` en PaymentMethodsStep: si `moneda_id` de la fila coincide
         * con la moneda del gasto (`base_moneda`), no hay conversión; si no, `amount_cotizado` en base.
         *
         * @returns {void}
         */
        sync_cotizacion_payment_methods() {
            const list = this.expense.payment_methods
            if (!Array.isArray(list) || !list.length) {
                return
            }

            const base = Number(this.base_moneda)
            if (Number.isNaN(base)) {
                return
            }

            list.forEach((pm, index) => {
                const moneda_pm = Number(pm.moneda_id)
                const amount = Number(pm.amount) || 0

                if (!moneda_pm || moneda_pm === base) {
                    if (Number(pm.amount_cotizado) !== 0) {
                        const next_pm = Object.assign({}, pm, { amount_cotizado: 0 })
                        this.$set(this.expense.payment_methods, index, next_pm)
                    }
                    return
                }

                const cotizacion = Number(pm.cotizacion) || 0
                if (amount <= 0 || cotizacion <= 0) {
                    if (Number(pm.amount_cotizado) !== 0) {
                        const next_pm = Object.assign({}, pm, { amount_cotizado: 0 })
                        this.$set(this.expense.payment_methods, index, next_pm)
                    }
                    return
                }

                let amount_cotizado = 0
                if (moneda_pm === 1) {
                    amount_cotizado = amount / cotizacion
                } else {
                    amount_cotizado = amount * cotizacion
                }

                const next_pm = Object.assign({}, pm, { amount_cotizado: amount_cotizado })
                if (Number(pm.amount_cotizado) !== Number(amount_cotizado)) {
                    this.$set(this.expense.payment_methods, index, next_pm)
                }
            })
        },
        terminar() {
            this.sync_cotizacion_payment_methods()
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
                cotizacion: this.owner.dollar,
                amount_cotizado: '',
                cuota_id: 0,
            }
        },

        /**
         * Total del gasto en moneda del comprobante (`expense.moneda_id`): suma `amount` si la fila
         * usa esa misma moneda; si la fila es en otra moneda, suma `amount_cotizado` (ya en base).
         *
         * @returns {void}
         */
        set_total_from_array() {
            const base = Number(this.base_moneda)
            const base_ok = !Number.isNaN(base)
            let total = 0

            this.expense.payment_methods.forEach(pm => {
                const moneda_pm = Number(pm.moneda_id)
                const use_cotizado = base_ok && moneda_pm && moneda_pm !== base

                if (use_cotizado) {
                    total += Number(pm.amount_cotizado) || 0
                } else {
                    total += Number(pm.amount) || 0
                }
            })

            console.log('total: '+total)
            this.$set(this.expense, 'amount', total)
        },
    }
}
</script>