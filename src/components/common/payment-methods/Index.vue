<template>
    <div>

        <payment-methods-step
            :payment_methods="payment_methods_proxy"
            :payment_method_options="__payment_method_options"
            :total_a_repartir="total_a_repartir"
            :base_moneda="base_moneda"
            :address_id="address_id"
            :sobrante_a_repartir="sobrante_a_repartir"
            @add="add_payment_method"
            @remove="remove_payment_method"

            @update_amount="update_amount"
            @update_payment_method_id="update_payment_method_id"
            @update_moneda_id="update_moneda_id"
            @update_cotizacion="update_cotizacion"
            @update_amount_cotizado="update_amount_cotizado"
            @update_caja_id="update_caja_id"
        >
            <template v-slot:details="{ payment_method }">
                <slot name="details" :payment_method="payment_method"></slot>
            </template>
        </payment-methods-step>

        <!-- Mensajes ayuda -->
        <div v-if="show_decimal_help" class="m-t-15">
            <p class="m-b-0">Para indicar decimales utilice un . (punto).</p>
            <p class="m-b-0">Ejemplo: Para "1500 con 25", coloque 1500.25</p>
            <p class="m-b-0">No coloque 1500,25 ni 1.500,25</p>
        </div>
    </div>
</template>

<script>
import PaymentMethodsStep from '@/components/common/payment-methods/PaymentMethodsStep'

export default {
    name: 'MultiPaymentMethods',
    components: {
        PaymentMethodsStep,
    },
    props: {
        value: {
            type: Array,
            required: true,
        },
        total_a_repartir: {
            type: Number,
            default: null
        },
        total_repartido: {
            type: Number,
            default: null
        },
        sobrante_a_repartir: {
            type: Number,
            default: null
        },
        show_decimal_help: {
            type: Boolean,
            default: true,
        },
        payment_method_factory: {
            type: Function,
            required: true,
        },
        payment_method_options: {
            type: Array,
            default: () => []
        },



        // NUEVO
        base_moneda: {
            type: Number,
            required: true,
        },
        show_cash_box: {
            type: Boolean,
            default: true,
        },
        // desacoplado: el padre decide la compatibilidad caja/moneda
        validate_cash_box_moneda: {
            type: Function,
            default: null,
        },


        address_id: {
            type: Number,
            default: null
        },
    },
    computed: {
        __payment_method_options() {
            console.log('__payment_method_options:')
            if (this.payment_method_options.length) {
                console.log('usando los payment_method_options')
                console.log(this.payment_method_options)
                return this.payment_method_options
            }
            console.log(this.$store.state.current_acount_payment_method.models)
            return this.$store.state.current_acount_payment_method.models
        },


        // Fuente de verdad: el padre.
        payment_methods_proxy: {
            get() {
                return this.payment_methods_local
            },
            set(new_value) {
                this.is_emitting_update = true
                this.payment_methods_local = new_value

                console.log('actualizando payment_methods_proxy con:')
                console.log(new_value)

                this.$emit('input', new_value)

                this.$nextTick(() => {
                    this.is_emitting_update = false
                })
            },
        },
    },
    data() {
        return {
            payment_methods_local: [],
            is_emitting_update: false,
        }
    },
    watch: {
        value: {
            immediate: true,
            handler(new_value) {
                if (this.is_emitting_update) return
                    
                this.payment_methods_local = Array.isArray(new_value) ? new_value : []
            }
        }
    },
    mounted() {
        // Si viene vacío (vender), igual mostramos 1 fila lista para usar.
        if (!this.payment_methods_proxy || !this.payment_methods_proxy.length) {
            this.payment_methods_proxy = [this.payment_method_factory()]
        }
    },
    methods: {
        add_payment_method() {
            let next = this.payment_methods_proxy.slice()
            next.push(this.payment_method_factory())
            this.payment_methods_proxy = next
        },
        remove_payment_method(index) {
            let next = this.payment_methods_proxy.slice()
            next.splice(index, 1)
            if (!next.length) {
                next.push(this.payment_method_factory())
            }
            this.payment_methods_proxy = next
        },

        // Actualizaciones baratas (sin deep clone)
        update_amount(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.amount = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
        update_payment_method_id(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.current_acount_payment_method_id = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },

        to_number(value) {
            if (value === '' || value === null || typeof value === 'undefined') {
                return 0
            }
            return Number(value) || 0
        },
        format_number(value) {
            return Number(value || 0).toFixed(2)
        },



        // NUEVO
        update_moneda_id(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])

            pm.moneda_id = value

            // si vuelve a base_moneda, reseteo cotizacion
            // if (pm.moneda_id === this.base_moneda) {
            //     pm.cotizacion = 1
            // } else {
            //     // si no hay, lo dejamos editable (el padre puede setearlo)
            //     if (pm.cotizacion === null || typeof pm.cotizacion === 'undefined' || pm.cotizacion === '') {
            //         pm.cotizacion = ''
            //     }
            // }

            // si la caja deja de ser válida, el padre decide. Igual, podemos limpiarla acá si hay validador:
            // if (this.validate_cash_box_moneda && pm.caja_id) {
            //     let ok = this.validate_cash_box_moneda(pm.caja_id, pm.moneda_id)
            //     if (!ok) {
            //         pm.caja_id = null
            //     }
            // }

            console.log('Se actualizo moneda_id en padre con '+value)

            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$emit('update:moneda_id', { index: index, value: value, row: pm })
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
        update_cotizacion(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.cotizacion = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$emit('update:cotizacion', { index: index, value: value, row: pm })
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
        update_amount_cotizado(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.amount_cotizado = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$emit('update:amount_cotizado', { index: index, value: value, row: pm })
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
        update_caja_id(index, value) {
            let next = this.payment_methods_proxy.slice()
            let pm = Object.assign({}, next[index])
            pm.caja_id = value
            next.splice(index, 1, pm)
            this.payment_methods_proxy = next

            this.$emit('update:caja_id', { index: index, value: value, row: pm })
            
            // ✅ emit con data fresca
            this.$nextTick(() => this.$emit('changed', next))
        },
    }
}
</script>