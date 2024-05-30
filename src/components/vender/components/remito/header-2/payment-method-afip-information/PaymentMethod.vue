<template>
	<div>
	  <b-form-select
		v-model="current_acount_payment_method_id"
		:options="getOptions({key: 'current_acount_payment_method_id', text: 'Metodo de pago'})">
	  </b-form-select>
	  <b-button class="btn btn-outline-primary mb-2" variant="outline-primary" @click="showModal"><i class="icon-plus"></i>Agregar métodos de pago</b-button>

	  <PaymentMethodModal ref="paymentMethodModal"></PaymentMethodModal>
	</div>
  </template>
  
  <script>
  	import vender from '@/mixins/vender'
	import PaymentMethodModal from './Modal/PaymentMethodModal.vue';

  
  export default {
	mixins: [vender],
	components: {
		PaymentMethodModal,	
	},
	methods: {
	  showModal() {
		this.$refs.paymentMethodModal.$bvModal.show('payment-method-modal');
	  }
	},

  }
  </script>
  
  