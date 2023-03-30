<template>
	<div 
	v-if="payment_method.current_acount_payment_method_id == 5 && modelsStoreFromName('credit_card').length"
	class="m-t-15">
		<b-form-group
		class="m-b-0"
		label="Tarjeta de credito">
			<b-form-select 
			class="m-b-15"
			v-model="payment_method.credit_card_id"
			:options="getOptions({key: 'credit_card_id', text: 'Tarjeta'})"></b-form-select>
		</b-form-group>
		<b-form-group
		v-if="payment_plans_options.length > 1"
		label="Plan de pago">
			<b-form-select 
			class="m-b-15"
			v-model="payment_method.credit_card_payment_plan_id"
			:options="payment_plans_options"></b-form-select>
		</b-form-group>
		<p
		v-if="payment_method.credit_card_payment_plan_id != 0">
			A pagar: <strong>{{ price(total_with_payment_plan) }}</strong>
		</p>
	</div>
</template>
<script>
export default {
	props: {
		payment_method: {
			type: Object,
		},
	},
	computed: {
		total_with_payment_plan() {
			if (typeof this.selected_credit_card != 'undefined') {
				let payment_plan = this.selected_credit_card.credit_card_payment_plans.find(model => {
					return model.id == this.payment_method.credit_card_payment_plan_id
				})
				if (typeof payment_plan != 'undefined') {
					return Number(this.payment_method.amount) + Number(this.payment_method.amount) * Number(payment_plan.surchage) / 100
				}
			}
		},
		credit_cards() {
			return this.$store.state.credit_card.models 
		},
		selected_credit_card() {
			return this.credit_cards.find(model => {
				return model.id == this.payment_method.credit_card_id 
			})
		},
		payment_plans_options() {
			let options = [{
				text: 'Seleccione Plan de pago',
				value: 0,
			}] 
			let credit_card = this.selected_credit_card
			if (typeof credit_card != 'undefined') {
				credit_card.credit_card_payment_plans.forEach(payment_plan => {
					options.push({
						text: payment_plan.installments+' cuotas con '+payment_plan.surchage+'% recargo',
						value: payment_plan.id 
					})
				})
			} 
			return options
		}
	}
}
</script>