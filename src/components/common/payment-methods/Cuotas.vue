<template>
	<div 
	v-if="_es_credito && cuotas.length"
	class="m-t-15">
		

		<p
		v-if="payment_method.cuota_id != 0 && !cuotas_ya_aplicadas">
			A pagar: <strong>{{ price(total_con_cuotas) }}</strong>
		</p>

		<b-input-group
		class="cont-payment-methods m-t-5 m-b-15"
		prepend="Cuotas">
			<b-form-select
			:disabled="cuotas_ya_aplicadas"
			v-model="payment_method.cuota_id" 
			:options="cuotas_options"></b-form-select> 
		</b-input-group>
	</div>
</template>
<script>
import cuotas from '@/mixins/cuotas'
export default {
	mixins: [cuotas],
	props: {
		payment_method: {
			type: Object,
		},
	},
	computed: {
		cuotas_ya_aplicadas() {
			if (
				typeof this.payment_method.surchage_amount != 'undefined'
				|| typeof this.payment_method.discount_amount != 'undefined'
			) {
				return true
			}
			return false
		},
		_es_credito() {
			let payment_method = this.$store.state.current_acount_payment_method.models.find(p => p.id == this.payment_method.current_acount_payment_method_id)
			if (
				typeof payment_method != 'undefined'
				&& payment_method.type
				&& payment_method.type.slug == 'tarjeta_de_credito'
			) {
				return true 
			}
			return false
		},
		cuotas() {
			return this.$store.state.cuota.models 
		},
		total_con_cuotas() {
			if (typeof this.selected_cuota != 'undefined') {
				
				if (this.selected_cuota.descuento) {

					return Number(this.payment_method.amount) - Number(this.payment_method.amount) * Number(this.selected_cuota.descuento) / 100

				} else if (this.selected_cuota.recargo) {
					
					return Number(this.payment_method.amount) + Number(this.payment_method.amount) * Number(this.selected_cuota.recargo) / 100

				}
				return null
			}
		},
		credit_cards() {
			return this.$store.state.credit_card.models 
		},
		selected_cuota() {
			return this.cuotas.find(model => {
				return model.id == this.payment_method.cuota_id 
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