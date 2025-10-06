<template>
	<div
	class="m-b-15">
		<p>
			<strong>
				Metodos de pago
			</strong>
		</p>

		<div
		v-for="(payment_method, index) in pago.current_acount_payment_methods"
		:key="index">
		
			<b-form-group
			:label="label(index)">
				<b-form-select
				@change="(value) => set_caja_id(value, payment_method)"
				v-model="payment_method.current_acount_payment_method_id"
				:options="options"></b-form-select> 
			</b-form-group>
			
			<b-form-group
			v-if="hasExtencion('cajas') && cajas.length && payment_method.current_acount_payment_method_id != 1">
				<b-form-select
				v-model="payment_method.caja_id"
				:options="get_caja_options(payment_method.current_acount_payment_method_id)"></b-form-select> 
			</b-form-group>

			<b-form-input
			@keyup.enter="hacerPago"
			@keyup="setTotal"
			v-model="payment_method.amount"
			class="payment-method-amount"
			placeholder="Monto"></b-form-input>

			<check-info
			:payment_method="payment_method"></check-info>

			<credit-card
			:payment_method="payment_method"></credit-card>

			<b-button
			v-if="index > 0"
			@click="remove(index)"
			size="sm"
			block
			class="m-t-15"
			variant="outline-danger">
				Quitar metodo de pago
			</b-button>

			<hr>
		</div>
		<b-button
		block 
		size="sm"
		variant="outline-primary"
		@click="add">
			Agregar metodo de pago
		</b-button>
		<hr>
	</div>
</template>
<script>
import CheckInfo from '@/components/common/current-acounts/pago/CheckInfo'
import CreditCard from '@/components/common/current-acounts/pago/CreditCard'
import cajas from '@/mixins/vender/cajas'
export default {
	mixins: [cajas],
	components: {
		CheckInfo,
		CreditCard,
	},
	props: ['pago'],
	computed: {
		cajas() {
			return this.$store.state.caja.models 
		},
		payment_methods() {
			return this.$store.state.current_acount_payment_method.models
		},
		options() {
			let options = []
			options.push({
				value: 0,
				text: 'Seleccione el metodo de pago'
			})
			this.payment_methods.forEach(item => {
				options.push({
					value: item.id,
					text: item.name
				})
			})
			return options
		},
	},
	data() {
		return {
			payment_method: {
				current_acount_payment_method_id: 0,
				amount: '',
                bank: '',
                payment_date: '',
                num: '',
                credit_card_id: 0,
                credit_card_payment_plan_id: 0,
                caja_id: 0,
			}
		}
	},
	mounted() {
		this.set_caja_id()
	},
	methods: {
	    set_all_caja_ids() {
	        this.pago.current_acount_payment_methods.forEach(pm => {
	            let caja_id = this.get_caja_por_defecto(pm.current_acount_payment_method_id, this.$cookies.get('address_id'))
	            if (caja_id) {
	                pm.caja_id = caja_id
	            }
	        })
	    },
		set_caja_id(payment_method_id, payment_method) {
			// let payment_method_id = this.payment_method.current_acount_payment_method_id
			let address_id = this.$cookies.get('address_id')

			console.log('set_caja_id')
			console.log('payment_method_id: '+payment_method_id)
			console.log('address_id: '+address_id)
			let caja_id = this.get_caja_por_defecto(payment_method_id, address_id)
			if (caja_id) {
				payment_method.caja_id = caja_id
			}
		},
		hacerPago() {
			this.$emit('hacerPago')
		},
		add() {
			this.pago.current_acount_payment_methods.push({
				...this.payment_method,
				caja_id: 0,
			})
		},
		remove(index) {
			this.pago.current_acount_payment_methods.splice(index, 1)
			this.setTotal()
		},
		label(index) {
			return 'Metodo de pago '+(index+1)
		},
		setTotal() {
			let total = 0

			this.pago.current_acount_payment_methods.forEach(payment_method => {
				total += Number(payment_method.amount)
			})

			this.pago.haber = total
		}
	}
}
</script>