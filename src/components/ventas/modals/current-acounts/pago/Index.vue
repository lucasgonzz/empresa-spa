<template>
<b-modal v-if="client" id="current-acounts-pago" title="Pago" hide-footer>
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
        type="number"
        min="0"
        @keydown.enter="hacerPago"
        :placeholder="placeholder"
        v-model="pago.haber"></b-form-input>
    </b-form-group>
    <payment-method
    :pago="pago"></payment-method>
    <checks
    :pago="pago"></checks>   
    <b-form-group>
    	<b-button
        block
    	variant="primary"
    	@click="hacerPago">
    		<btn-loader
    		:loader="loading"
    		text="Registrar pago"></btn-loader>
    	</b-button>
    </b-form-group>
</b-modal>
</template>
<script>
import PaymentMethod from '@/components/ventas/modals/current-acounts/pago/PaymentMethod'
import Checks from '@/components/ventas/modals/current-acounts/pago/Checks'
import BtnLoader from '@/components/common/BtnLoader'

import clients from '@/mixins/clients'
import current_acounts from '@/mixins/current_acounts'
export default {
	name: 'CurrentAcountPago',
    mixins: [clients, current_acounts],
    components: {
        PaymentMethod,
        Checks,
    	BtnLoader,
    },
    data() {
        return {
        	pago: {
                current_date: true,
                created_at: '',
                haber: '',
                current_acount_payment_method_id: 0,
                checks: [
                    {
                        bank: '',
                        payment_date: '',
                        amount: '',
                        num: '',
                    },
                ],
            },
        	loading: false,
        }
    },
    computed: {
        title() {
            return `Cuentas corriente de ${this.client.name}`
        },
        placeholder() {
            return `Ingrese el pago de ${this.client.name}`
        },
        to_pay() {
            return this.$store.state.current_acount.to_pay
        },
    },
    methods: {
    	hacerPago() {
            if (this.check()) {
        		this.loading = true
        		this.$api.post('/current-acount/pago', {
        			client_id: this.client.id,
        			...this.pago,
                    to_pay: this.to_pay,
        		})
        		.then(res => {
                    this.$store.dispatch('current_acount/getModels')
        			this.loading = false
        			this.$toast.success('Pago registrado correctamente')
                    this.$bvModal.hide('current-acounts-pago')
                    this.updateClient(this.client)
                    this.clear()
        		})
        		.catch(err => {
        			this.loading = false
        			console.log(err)
        			this.$toast.error('Error al registrar pago')
        		})
            }
    	},
        check() {
            if (this.pago.haber == '') {
                this.$toast.error('Ingrese el importe del pago')
                return false
            }
            if (this.pago.current_acount_payment_method_id == 1) {
                this.pago.checks.forEach(check => {
                    if (check.bank == '') {
                        this.$toast.error('Ingrese el banco del cheque')
                        return false
                    }
                    if (check.payment_date == '') {
                        this.$toast.error('Ingrese la fecha de corbo del cheque')
                        return false
                    }
                    if (check.amount == '') {
                        this.$toast.error('Ingrese imorte del cheque')
                        return false
                    }
                    if (check.num == '') {
                        this.$toast.error('Ingrese el numero del cheque')
                        return false
                    }
                })
            }
            return true
        },
        clear() {
            this.pago = {
                current_date: true,
                created_at: '',
                haber: '',
                current_acount_payment_method_id: 0,
                checks: [
                    {
                        bank: '',
                        payment_date: '',
                        amount: '',
                        num: '',
                    },
                ],
            }
            this.$store.commit('current_acount/setToPay', null)
            this.$store.commit('current_acount/setSelected', [])
        }
    }
}
</script>
<style lang="sass">
</style>
