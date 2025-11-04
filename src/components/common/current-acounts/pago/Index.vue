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

    <b-form-group
    description="Si se activa, solo quedara registrado en la cuenta corriente, pero no impactara en el saldo del cliente"
    v-if="hasExtencion('pagos_provisorios')">
        <b-form-checkbox
        :value="1"
        :unchecked-value="1"
        v-model="pago.is_provisorio">
            Pago Provisorio
        </b-form-checkbox>
    </b-form-group>

    <hr>
 
    <payment-methods
    ref="paymentMethodComponent"
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
        this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
            if (modalId === 'current-acounts-pago') {
                console.log('pago creado')

                setTimeout(() => {
                    this.focus_primer_payment_method()
                    this.$refs.paymentMethodComponent.set_all_caja_ids()
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
                is_provisorio: 0,
                current_acount_payment_methods: [{
                    current_acount_payment_method_id: 3,
                    amount: '',
                    numero: '',
                    banco: '',
                    fecha_emision: '',
                    fecha_pago: '',
                    es_echeq: 0,
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
        payment_plan_cuota() {
            if (this.view == 'planes-de-pago') {
                return this.$store.state.payment_plan_cuota.model 
            } else {
                return null
            }
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
                    credit_account_id: this.from_credit_account.id,
                    model_name: this.from_model_name,
        			model_id: this.from_model.id,
        			...this.pago,
                    to_pay: this.to_pay,
                    payment_plan_cuota: this.payment_plan_cuota,
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

                    this.update_payment_plan_cuotas()
        		})
        		.catch(err => {
        			this.loading = false
        			console.log(err)
        			this.$toast.error('Error al registrar pago')
        		})
            }
    	},
        update_payment_plan_cuotas() {
            if (this.view == 'planes-de-pago') {
                this.$store.dispatch('payment_plan_cuota/getModels')
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
            
            for (const payment_method of this.pago.current_acount_payment_methods) {

                if (payment_method.id == 1) {
                    if (payment_method.bank == '') {
                        this.$toast.error('Ingrese el banco del cheque')
                        return false 
                    }
                    if (payment_method.payment_date == '') {
                        this.$toast.error('Ingrese la fecha de cobro del cheque')
                        return false
                    } 
                    if (payment_method.amount == '') {
                        this.$toast.error('Ingrese importe del cheque')
                        return false
                    }
                    if (payment_method.num == '') {
                        this.$toast.error('Ingrese el número del cheque')
                        return false
                    }
                }

                let ok = this.validarNumero(payment_method.amount)

                console.log(ok)
                
                if (!ok.ok) {

                    this.$toast.error(ok.reason)
                    return false
                }
            }

            return true
        },


        /**
         * Valida números en formato estricto: [-]1234 o [-]1234.56
         * - Sin separadores de miles
         * - Punto como separador decimal
         * - Hasta `maxDecimals` decimales (por defecto 2)
         */
        validarNumero(input, maxDecimals = 2) {
          if (input == null) return { ok: false, reason: "Vacío" };

          let s = String(input).trim();
          if (s === "") return { ok: false, reason: "Vacío" };

          // No permitimos comas, espacios ni símbolos raros
          if (/[,\s]/.test(s)) 
            return { ok: false, reason: "Usá punto decimal y sin comas ni espacios" };

          // Construimos regex: entero o entero.dec
          const decPart = maxDecimals > 0 ? `(\\.\\d{1,${maxDecimals}})?` : ""; // <-- opcional
          const re = new RegExp(`^-?\\d+${decPart}$`);

          if (!re.test(s)) {
            if (s.includes(",")) return { ok: false, reason: "No se permite coma, usá punto decimal" };
            if ((s.match(/\./g) || []).length > 1) return { ok: false, reason: "No uses puntos de miles, solo un punto decimal" };
            if (/\.\d{3,}$/.test(s)) return { ok: false, reason: `Máximo ${maxDecimals} decimales` };
            if (/\.$/.test(s)) return { ok: false, reason: "Luego del punto deben ir decimales" };

            return { ok: false, reason: "Formato inválido. Ej: 1234.50 o 1234" };
          }

          const n = Number(s);
          if (!Number.isFinite(n)) return { ok: false, reason: "Número inválido" };

          return { ok: true };
        },

        clear() {
            this.pago = {
                current_date: true,
                created_at: '',
                haber: '',
                is_provisorio: 0,
                current_acount_payment_methods: [{
                    current_acount_payment_method_id: 3,
                    amount: '',
                    numero: '',
                    banco: '',
                    fecha_emision: '',
                    fecha_pago: '',
                    es_echeq: 0,
                    credit_card_id: 0,
                    credit_card_payment_plan_id: 0,
                    caja_id: 0,
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
