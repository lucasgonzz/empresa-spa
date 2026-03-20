<template>
    <div>
        <hr>
        <div
            v-for="(payment_method, index) in payment_methods"
            :key="payment_method.__row_id"
            class="m-b-20 s-2 payment-method-card"
        >

            <h5>
                <strong>
                    Metodo de pago {{ index + 1}}
                </strong>
            </h5>

            <div class="cont-pm cont-pm-payment-method-moneda">
                
                 <!-- METODO DE PAGO -->
                <b-form-group 
                label="Metodo de pago">
                        
                    <b-form-select
                        :value="payment_method.current_acount_payment_method_id"
                        :options="payment_method_select_options"
                        @change="set_payment_method_id(payment_method, index, $event)"
                    ></b-form-select>

                </b-form-group>


                 <!-- MONEDA -->
                <b-form-group 
                v-if="hasExtencion('ventas_en_dolares')"
                class="m-l-10"
                label="Moneda">
                    <b-form-select
                        :value="payment_method.moneda_id"
                        :options="moneda_options"
                        @change="set_moneda_id(payment_method, index, $event)"
                    ></b-form-select>
                </b-form-group>
            </div>



            <!-- COTIZACION -->
            <div class="cont-pm"
            v-if="payment_method.moneda_id && payment_method.moneda_id !== base_moneda">
                
                <b-form-group
                    label="Cotización"
                >
                    <b-form-input
                        :value="payment_method.cotizacion"
                        placeholder="Cotización"
                        inputmode="decimal"
                        @input="set_cotizacion(payment_method, index, $event)"
                    ></b-form-input>
                    <small class="text-muted">
                        Ingresá la cotización para convertir a {{ base_moneda }}.
                    </small>
                </b-form-group>

                <p
                class="">
                    <strong>
                        Cotizado: {{ price(payment_method.amount_cotizado) }}
                    </strong>
                </p>
            </div>



            <!-- MONTO -->
            <b-form-group label="Monto">

                <div class="cont-pm">
                    <b-form-input
                        class="payment-method-amount"
                        :value="payment_method.amount"
                        placeholder="Monto"
                        inputmode="decimal"
                        @paste.prevent
                        @input="set_amount(payment_method, index, $event)"
                    ></b-form-input>

                    <b-button
                    size="sm"
                    class="m-l-10"
                    v-if="total_a_repartir"
                    @click="completar(index)"
                    variant="outline-primary">
                        Completar
                    </b-button>
                </div>

                <p
                class="text-success m-t-10"
                v-if="payment_method.discount_amount">
                    Descuento: {{ price(payment_method.discount_amount) }}
                </p>
                <p
                class="text-danger m-t-10"
                v-if="payment_method.surchage_amount">
                    Recargo: {{ price(payment_method.surchage_amount) }}
                </p>
            </b-form-group>


            <cuotas
            @field_change="on_check_field_change(index, $event)"
            :payment_method="payment_method"></cuotas>
            

            <!-- CAJA -->
            <b-form-group
                v-if="cajas.length && payment_method.current_acount_payment_method_id != 1"
                label="Caja"
            >
                <b-form-select
                    :value="payment_method.caja_id"
                    :options="cajas_options()"
                    @change="update_caja_id(index, $event, payment_method)"
                ></b-form-select>

                <small
                    v-if="cash_box_moneda_error(payment_method)"
                    class="text-danger"
                >
                    La caja seleccionada no es compatible con la moneda elegida.
                </small>
            </b-form-group>

            <check-info
            @field_change="on_check_field_change(index, $event)"
            :payment_method="payment_method"></check-info>



            <slot name="details" :payment_method="payment_method"></slot>

            <b-button
                v-if="show_add_remove && index > 0"
                class="m-t-15"
                size="sm"
                block
                variant="outline-danger"
                @click="$emit('remove', index)"
            >
                Quitar método de pago
            </b-button>

            <!-- <hr> -->
        </div>

        <b-button
            v-if="show_add_remove"
            block
            size="sm"
            variant="outline-primary"
            @click="$emit('add')"
        >
            Agregar método de pago
        </b-button>

        <hr>
    </div>
</template>

<script>
import caja_por_defecto from '@/mixins/caja_por_defecto'
export default {
    mixins: [caja_por_defecto],
    name: 'PaymentMethodsStep',
    components: {

        CheckInfo: () => import('@/components/common/payment-methods/CheckInfo'),
        Cuotas: () => import('@/components/common/payment-methods/Cuotas'),
    },
    props: {
        payment_methods: {
            type: Array,
            required: true,
        },
        payment_method_options: {
            type: Array,
            required: true,
        },
        show_add_remove: {
            type: Boolean,
            default: true,
        },
        total_a_repartir: Number,
        total_repartido: Number,
        sobrante_a_repartir: Number,

        // NUEVO
        base_moneda: {
            type: Number,
            required: true,
        },
        show_cash_box: {
            type: Boolean,
            default: true,
        },
        validate_cash_box_moneda: {
            type: Function,
            default: null,
        },
        address_id: Number,
    },
    computed: {
        payment_method_select_options() {
            let options = [{
                value: 0,
                text: 'Seleccione el método de pago',
            }]
            this.payment_method_options.forEach(item => {
                options.push({
                    value: item.id,
                    text: item.name,
                })
            })
            return options
        },
        moneda_options() {
            return this.get_options_simple('moneda')
        },
        cajas() {
            return this.$store.state.caja.models
        },
    },
    mounted() {
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            if (
                modalId == 'payment-method-modal'
                ||modalId == 'current-acounts-pago'
            ) {
                let payment_method = this.payment_methods[0]
                this.set_caja_por_defecto(0, payment_method.current_acount_payment_method_id, payment_method.moneda_id)
            }
        })
    },
    methods: {


        on_check_field_change(index, payload) {
            // payload = { key, value }
            this.$emit('update_payment_method_field', index, payload.key, payload.value)
        },

        set_payment_method_id(row, index, new_value) {
            let method_id = Number(new_value) || 0

            this.$emit('update_payment_method_id', index, method_id)

            this.$nextTick(() => {
                let moneda_id = Number(this.payment_methods[index]?.moneda_id) || 0
                this.set_caja_por_defecto(index, method_id, moneda_id)
            })
        },

        set_moneda_id(row, index, new_value) {
            console.log('set_moneda_id con '+new_value)
            let moneda_id = Number(new_value) || 0

            this.$emit('update_moneda_id', index, moneda_id)

            this.$nextTick(() => {
                let pm = this.payment_methods[index]
                if (!pm) return

                let method_id = Number(pm.current_acount_payment_method_id) || 0

                // Caja por defecto en base al estado real post-update
                this.set_caja_por_defecto(index, method_id, Number(pm.moneda_id) || 0)

                // Recalcular cotizado si ya hay monto cargado
                let amount = Number(pm.amount) || 0
                if (amount > 0) {
                    this.check_moneda(pm, index, amount)
                }
            })
        },

        set_amount(row, index, new_value) {
            console.log('set_amount')
            let amount = Number(new_value) || 0

            this.$emit('update_amount', index, Number(amount))

            this.$nextTick(() => {
                this.check_moneda(this.payment_methods[index], index, Number(amount))
            })
        },

        set_cotizacion(row, index, new_value) {
            console.log('set_cotizacion')
            let cotizacion = Number(new_value) || 0

            this.$emit('update_cotizacion', index, Number(cotizacion))

            this.$nextTick(() => {
                this.check_moneda(this.payment_methods[index], index, Number(this.payment_methods[index].amount))
            })
        },

        check_moneda(payment_method, index, amount) {

            console.log('check_moneda')

            if (payment_method.moneda_id != this.base_moneda) {
                console.log('cotizando')
                let amount_cotizado = 0
                let cotizacion = Number(this.payment_methods[index].cotizacion)

                if (payment_method.moneda_id == 1) {
                    console.log('dividiendo por '+cotizacion)
                    amount_cotizado = amount / cotizacion
                } else {
                    console.log('multiplicando por '+cotizacion)
                    amount_cotizado = amount * cotizacion
                }
                this.$emit('update_amount_cotizado', index, amount_cotizado)
            }
        },



        cajas_options() {
            let options = [{
                value: 0,
                text: 'Seleccione Caja'
            }]
            this.cajas.filter(c => c.abierta).forEach(caja => {
                options.push({
                    value: caja.id,
                    text: caja.name
                })
            })
            return options
        },

        set_caja_por_defecto(index, method_id, moneda_id) {
            
        
            let caja_por_defecto = this.get_caja_por_defecto(method_id, this.address_id, moneda_id) 

            if (caja_por_defecto) {
                this.$emit('update_caja_id', index, Number(caja_por_defecto.id))
            } else {
                this.$emit('update_caja_id', index, 0)
            }
        },

        completar(index) {

            // 1) setear el amount en la fila
            this.$emit('update_amount', index, this.sobrante_a_repartir)

            console.log('update_amount con sobrante: '+this.sobrante_a_repartir)
            // 2) recalcular cotizado si corresponde (esperamos a que el padre actualice)
            this.$nextTick(() => {
                let pm = this.payment_methods[index]
                if (!pm) return
                this.check_moneda(pm, index, this.sobrante_a_repartir)
            })
        },



        cash_box_moneda_error(payment_method) {
            if (!this.validate_cash_box_moneda) return false
            if (!payment_method.caja_id) return false
            if (!payment_method.moneda_id) return false
            return !this.validate_cash_box_moneda(payment_method.caja_id, payment_method.moneda_id)
        },

        update_caja_id(index, value, payment_method) {
            let caja_id = value === null || value === '' ? null : Number(value)

            // Permitir "sin caja"
            if (!caja_id) {
                this.$emit('update_caja_id', index, null)
                return
            }

            let caja = this.cajas.find(c => Number(c.id) === Number(caja_id))
            if (!caja) {
                // Caja inexistente: no cambiamos nada
                this.$toast.error('Caja inválida')
                // fuerza que vuelva al valor anterior (opcional)
                this.$emit('update_caja_id', index, Number(payment_method.caja_id) || null)
                return
            }

            // ✅ VALIDACIÓN CORRECTA: moneda de caja vs moneda del método
            if (caja.moneda_id !== null && Number(caja.moneda_id) !== Number(payment_method.moneda_id)) {
                this.$toast.error('La caja seleccionada debe ser de la misma moneda que este método de pago')

                // Fuerza a que el select vuelva al valor anterior (opcional, pero deja el UI perfecto)
                this.$emit('update_caja_id', index, Number(payment_method.caja_id) || null)
                return
            }

            // OK: actualizar
            this.$emit('update_caja_id', index, caja_id)
        }
    }
}
</script>
<style lang="sass">
.cont-pm
    display: flex  
    flex-direction: row
    align-items: center
    justify-content: space-between

.payment-method-card
    padding: 10px
    border-radius: 7px
    background: rgba(0,0,0,.1)


.cont-pm-payment-method-moneda

    // input 
    //     width: 350px
</style>
