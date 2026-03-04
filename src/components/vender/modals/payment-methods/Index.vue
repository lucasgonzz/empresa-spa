<template>
    <b-modal
    title="Multiples metodos de pago"
    no-close-on-backdrop
    hide-header-close
    hide-footer
    @show="on_modal_show"
    id="payment-method-modal">

        <total-repartir
        :total_a_repartir="total_vender"
        :total_repartido="total_repartido"
        :sobrante_a_repartir="sobrante_a_repartir"></total-repartir>


        <multi-payment-methods
            :key="payment_methods_key"
            v-model="selected_payment_methods_"
            :payment_method_factory="payment_method_factory"
            :payment_method_options="payment_methods_with_discounts"
            :show_decimal_help="true"
            :total_a_repartir="total_vender"
            :total_repartido="total_repartido"
            :sobrante_a_repartir="sobrante_a_repartir"
            :address_id="address_id"


            :base_moneda="base_moneda"
            :show_cash_box="true"
            :validate_cash_box_moneda="validate_cash_box_moneda"
        >
        </multi-payment-methods>

        <buttons
            :selected_payment_methods_="selected_payment_methods_"
            :total_a_repartir="total_vender"
            :total_repartido="total_repartido"
            :sobrante_a_repartir="sobrante_a_repartir"
            @set_payment_methods_with_discounts="set_payment_methods_with_discounts"
            @set_selected_payment_methods="selected_payment_methods_ = $event"
        ></buttons> 
    </b-modal>
</template>

<script>
export default {
    name: 'SelectPaymentMethods',
    components: {
        MultiPaymentMethods: () => import('@/components/common/payment-methods/Index'),
        Buttons: () => import('@/components/vender/modals/payment-methods/Buttons'),
        TotalRepartir: () => import('@/components/vender/modals/payment-methods/TotalRepartir'),
    },
    data() {
        return {
            payment_methods_with_discounts: [],
            selected_payment_methods_: [],
            payment_methods_key: 0,
        }
    },
    computed: {
        address_id() {
            return Number(this.$store.state.vender.address_id) 
        },
        total_vender() {
            return this.$store.state.vender.total 
        },
        total_repartido() {

            let total = 0
            
            this.selected_payment_methods_.forEach(pay => {
                console.log('amount_cotizado')
                console.log(pay.amount_cotizado)
                if (
                    pay.amount_cotizado
                    && pay.amount_cotizado != ''
                    && Number(pay.amount_cotizado) > 0
                ) {
                    total += Number(pay.amount_cotizado)
                } else {
                    total += Number(pay.amount)
                }
            })

            return total
        },
        sobrante_a_repartir() {
            return this.total_vender - this.total_repartido
        },

        base_moneda() {
            return this.$store.state.vender.moneda_id
        },
    },
    methods: {
        on_modal_show() {
            // ✅ fuerza remount del MultiPaymentMethods
            this.payment_methods_key += 1
            
            this.selected_payment_methods_ = [this.payment_method_factory()]
            
            this.payment_methods_with_discounts = []
        },


        validate_cash_box_moneda(cash_box_id, moneda) {
            let box = this.cash_box_options.find(b => b.id === cash_box_id)
            if (!box) return true

            // OPCIÓN 1: caja tiene moneda única
            if (box.moneda) return box.moneda === moneda

            // OPCIÓN 2: caja soporta varias monedas
            if (Array.isArray(box.currencies)) return box.currencies.includes(moneda)

            // si no hay data, no bloqueamos
            return true
        },

        set_payment_methods_with_discounts(value) {
            this.payment_methods_with_discounts = value
            this.$store.commit('vender/set_modal_payment_methods', value)
            this.setTotal()
        },
        payment_method_factory() {
            // Objeto base para vender (agregá props extra si las necesitás)
            return {
                __row_id: Date.now() + '_' + Math.random().toString(16).slice(2),
                current_acount_payment_method_id: 3,
                amount: '',


                moneda_id: this.base_moneda, // o 'ARS'
                cotizacion: this.user.dollar,
                caja_id: 0,
                amount_cotizado: '',
            }
        },

        handle_invalid_split_total({ sobrante }) {
            // Acá podés usar tu toast/snackbar actual
            // Ejemplo genérico:
            this.$bvToast && this.$bvToast.toast(
                'Tenés que repartir el total exacto. Sobrante: ' + Number(sobrante || 0).toFixed(2),
                {
                    title: 'Métodos de pago',
                    variant: 'danger',
                    solid: true,
                }
            )
        },

        handle_go_to_discounts_step(payment_methods) {
            /**
             * Este evento se dispara al tocar “Calcular” y pasar al tab 2,
             * con el array ya validado (reparto OK).
             *
             * Si tu lógica actual “setea métodos con descuento” vive acá,
             * este es el lugar correcto para hacerlo.
             */


            let payment_method = {}
            let selected_payment_methods_ = []

            payment_methods.forEach(pay => {
                let with_discount = this.current_acount_payment_method_discounts.find(p => p.id == pay.id)

                if (typeof with_discount != 'undefined') {

                    let discount_amount = Number(pay.amount) * with_discount.discount_percentage / 100
                    pay.discount_amount = discount_amount 
                    payment_method = {
                        ...pay,
                        amount : '' 
                    }
                } else {

                    pay.amount = null 
                    payment_method = {
                        ...pay,
                        amount : '' 
                    }

                }

                selected_payment_methods_.push(payment_method)
            })

            console.log('selected_payment_methods_:')
            console.log(selected_payment_methods_)

            this.selected_payment_methods_ = selected_payment_methods_
        },

    }
}
</script>