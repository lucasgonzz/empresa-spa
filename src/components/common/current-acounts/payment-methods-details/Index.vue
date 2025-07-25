<template>
<b-modal
title="Metodos de pago"
hide-footer
id="payment-methods-details">
	<payment-method
	v-for="(payment_method, index) in model.current_acount_payment_methods"
	:key="index"
	:model="payment_method"></payment-method>

	<p
	v-if="model.cheques && model.cheques.length">
		Cheques:
	</p>

	<div 
	v-for="cheque in model.cheques"
	class="card shadow-2 p-15 b-r-1">
		<p 
		class="j-between">
			Numero
			<strong>
				{{ cheque.numero }}
			</strong>
		</p>
		<p 
		class="j-between">
			Banco
			<strong>
				{{ cheque.banco }}
			</strong>
		</p>
		<p 
		class="j-between">
			Fecha de emision
			<strong>
				{{ date(cheque.fecha_emision) }}
			</strong>
		</p>
		<p 
		class="j-between">
			Fecha de pago
			<strong>
				{{ date(cheque.fecha_pago) }}
			</strong>
		</p>
	</div>
</b-modal>
</template>
<script>
import PaymentMethod from '@/components/common/current-acounts/payment-methods-details/PaymentMethod'
export default {
	components: {
		PaymentMethod,
	},
	computed: {
		model() {
			return this.$store.state.current_acount.to_show_payment_methods
		},
	},
}
</script>