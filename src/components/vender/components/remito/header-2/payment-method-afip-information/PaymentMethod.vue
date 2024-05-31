<template>
<div>
	<b-form-select
	v-model="current_acount_payment_method_id"
	:options="getOptions({key: 'current_acount_payment_method_id', text: 'Metodo de pago'})">
	</b-form-select>
		<b-button 
		class="mb-2" 
		variant="outline-primary" 
		v-b-modal="'payment-method-modal'">
			<i class="icon-plus"></i>
			Agregar métodos de pago
		</b-button>

	<PaymentMethodModal ref="paymentMethodModal"></PaymentMethodModal>
</div>
</template>
<script>
import vender from '@/mixins/vender'
export default {
	mixins: [vender],
	components: {
		PaymentMethodModal: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/modal-payment-methods/Modal')	
	},
	methods: {
	},
}
  </script>
  
  