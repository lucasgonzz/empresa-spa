<template>
<b-modal 
v-if="from_model" 
id="current-acounts-pago" 
title="Pago" 
hide-footer>
    <b-form-group
    label="Fecha del pago">
        <b-form-checkbox
        :value="true"
        :unchecked-value="false"
        v-model="pago.current_date">
            Dia de hoy
        </b-form-checkbox>
        <b-form-datepicker
        class="m-t-10"
        placeholder="Ingrese la fecha en la que se hizo el pago"
        v-if="!pago.current_date"
        v-model="pago.created_at">
        </b-form-datepicker>
    </b-form-group>
    <b-form-group>
        <b-form-input
        disabled
        type="number"
        min="0"
        id="monto-pago"
        @keydown.enter="hacerPago"
        :placeholder="placeholder"
        v-model="pago.haber"></b-form-input>
        <b-button
        size="sm"
        variant="primary"
        class="m-t-10"
        v-if="route_name == 'vender' && maked_sale"
        @click="setTotalSale">
            <i class="icon-check"></i>
            Pago el total
        </b-button>
    </b-form-group>
    <b-form-group>
        <b-form-textarea
        @keydown.enter="hacerPago"
        placeholder="Ingrese una descripcion"
        v-model="pago.description"></b-form-textarea>
    </b-form-group>

    <b-form-group>
        <b-form-input
        @keydown.enter="hacerPago"
        placeholder="Numero orden de compra"
        v-model="pago.numero_orden_de_compra"></b-form-input>
    </b-form-group>

    <hr>
 
    <payment-methods
    @hacerPago="hacerPago"
    :pago="pago"></payment-methods>

	<btn-loader
    @clicked="hacerPago"
	:loader="loading"
	text="Registrar pago"></btn-loader>
</b-modal>
</template>
<script>
import PaymentMethods from '@/components/common/current-acounts/pago/PaymentMethods'
import BtnLoader from '@/common-vue/components/BtnLoader'

import clients from '@/mixins/clients'
import current_acounts from '@/mixins/current_acounts'
export default {
	name: 'CurrentAcountPago',
    mixins: [clients, current_acounts],
    components: {
        PaymentMethods,
    	BtnLoader,
    },
    mounted() {
        this.$root.$on('bv::modal::show', (bvEvent, modalId) => {
            if (modalId === 'current-acounts-pago') {
                console.log('pago creado')

                setTimeout(() => {
                    this.focus_primer_payment_method()
                }, 500)
            }
        })
    },
    data() {
        return {
        	pago: {
                current_date: true,
                description: '',
                created_at: '',
                haber: '',
                current_acount_payment_methods: [{
                    current_acount_payment_method_id: 3,
                    amount: '',
                    bank: '',
                    fecha_emision: '',
                    fecha_pago: '',
                    cobrado_at: '',
                    check_status_id: 0,
                    num: '',
                    credit_card_id: 0,
                    credit_card_payment_plan_id: 0,
                    caja_id: 0,
                }],
                // checks: [
                //     {
                //         bank: '',
                //         payment_date: '',
                //         amount: '',
                //         num: '',
                //     },
                // ],
            },
        	loading: false,
        }
    },
    computed: {
        title() {
            return `Cuentas corriente de ${this.from_model.name}`
        },
        placeholder() {
            return `Monto total del pago de ${this.from_model.name}`
        },
        to_pay() {
            return this.$store.state.current_acount.to_pay
        },
        maked_sale() {
            return this.$store.state.vender.sale 
        },
    },
    methods: {
        focus_primer_payment_method() {
            let input = document.getElementsByClassName('payment-method-amount')[0]          
            input.focus()
        },
        setTotalSale() {
            this.pago.haber = this.maked_sale.total

            let input = document.getElementsByClassName('payment-method-amount')[0]                
            input.value = this.maked_sale.total

            this.pago.current_acount_payment_methods[0].amount = this.maked_sale.total
        },
    	hacerPago() {
            if (this.check()) {
        		this.loading = true
        		this.$api.post('/current-acount/pago', {
                    model_name: this.from_model_name,
        			model_id: this.from_model.id,
        			...this.pago,
                    to_pay: this.to_pay,
        		})
        		.then(res => {
                    this.$store.dispatch('current_acount/getModels')
        			this.loading = false
        			this.$toast.success('Pago registrado')
                    this.$bvModal.hide('current-acounts-pago')
                    this.updateClient(this.from_model)
                    this.loadModel(this.from_model_name, this.from_model.id)
                    this.clear()

                    this.update_ventas()
        		})
        		.catch(err => {
        			this.loading = false
        			console.log(err)
        			this.$toast.error('Error al registrar pago')
        		})
            }
    	},
        update_ventas() {
            if (this.$store.state.sale.is_filtered) {
                // this.$store.dispatch()
            }
        },
        check() {
            if (this.pago.haber == '') {

                let input = document.getElementsByClassName('payment-method-amount')[0]                
               
                if (input.value != '') {
                    this.pago.haber = input.value
                    console.log('Se puso el pago de '+input.value)
                } else {

                    this.$toast.error('Ingrese el importe del pago')
                    return false
                }

            }
            this.pago.current_acount_payment_methods.forEach(payment_method => {

                if (payment_method.id == 1) {
                    if (payment_method.bank == '') {
                        this.$toast.error('Ingrese el banco del cheque')
                        return false 
                    }
                    if (payment_method.payment_date == '') {
                        this.$toast.error('Ingrese la fecha de corbo del cheque')
                        return false
                    } 
                    if (payment_method.amount == '') {
                        this.$toast.error('Ingrese imorte del cheque')
                        return false
                    }
                    if (payment_method.num == '') {
                        this.$toast.error('Ingrese el numero del cheque')
                        return false
                    }
                }
            })
            return true
        },
        clear() {
            this.pago = {
                current_date: true,
                created_at: '',
                haber: '',
                current_acount_payment_methods: [{
                    current_acount_payment_method_id: 0,
                    amount: '',
                    bank: '',
                    fecha_emision: '',
                    fecha_pago: '',
                    cobrado_at: '',
                    check_status_id: 0,
                    num: '',
                    credit_card_id: 0,
                    credit_card_payment_plan_id: 0,
                }],
            }
            this.$store.commit('current_acount/setToPay', null)
            this.$store.commit('current_acount/setSelected', [])
        }
    }
}
</script>
<style lang="sass">
</style>
