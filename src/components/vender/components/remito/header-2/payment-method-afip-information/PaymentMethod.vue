<template>
<div
class="cont-select">
	<b-form-select
	v-model="current_acount_payment_method_id"
	@change="set_payment_methods_null"
	:options="getOptions({key: 'current_acount_payment_method_id', text: 'Metodo de pago'})">
	</b-form-select>

	<b-button 
	class="mb-2" 
	variant="outline-primary"
	@click="set_payment_methods">
		<b-badge
		variant="primary"
		v-if="selected_payment_methods.length">
			{{ selected_payment_methods.length }}
		</b-badge>
		<i 
		v-else
		class="icon-plus"></i>
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
	computed: {
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
		// cantidad_de_metodos_de_pago() {
		// 	let array_limpio = this.metodos_de_pago_seleccionados.filter(monto => monto !== undefined && monto !== null && monto !== '')
		// 	return array_limpio.length
		// }
	},
	methods: {
		set_payment_methods() {
			this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0)
			this.$bvModal.show('payment-method-modal')
		},
		set_payment_methods_null() {
			this.$store.commit('vender/setSelectedPaymentMethods', [])
		}
	}
}
</script>
  
  