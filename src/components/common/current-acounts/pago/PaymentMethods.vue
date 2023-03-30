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
				v-model="payment_method.current_acount_payment_method_id"
				:options="options"></b-form-select> 
			</b-form-group>
			<b-form-input
			v-model="payment_method.amount"
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
export default {
	components: {
		CheckInfo,
		CreditCard,
	},
	props: ['pago'],
	computed: {
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
			}
		}
	},
	methods: {
		add() {
			this.pago.current_acount_payment_methods.push({...this.payment_method})
		},
		remove(index) {
			this.pago.current_acount_payment_methods.splice(index, 1)
		},
		label(index) {
			return 'Metodo de pago '+(index+1)
		}
	}
}
</script>