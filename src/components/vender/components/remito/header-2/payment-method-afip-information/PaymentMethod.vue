<template>
<div
class="cont-select">
	<b-form-select
	v-model="current_acount_payment_method_id"
	@change="set_payment_methods_null"
	:options="getOptions({key: 'current_acount_payment_method_id', text: 'Metodo de pago'})">
	</b-form-select>


	<!-- Boton para metodoS de pago -->
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
</div>
</template>
<script>
import vender from '@/mixins/vender'
import select_payment_methods from '@/mixins/vender/select_payment_methods'
export default {
	mixins: [vender, select_payment_methods],
	computed: {
		selected_payment_methods() {
			return this.$store.state.vender.selected_payment_methods
		},
	},
	methods: {
		set_payment_methods() {
			this.$store.commit('vender/setCurrentAcountPaymentMethodId', 0)

			this.$store.commit('vender/current_acount_payment_methods/set_payment_methods', [])

			this.$store.commit('vender/current_acount_payment_methods_with_discounts/set_payment_methods', [])

			this.init_modal_payment_metohds()
			
			this.setTotal()
			
			this.$bvModal.show('payment-method-modal')
		},
		set_payment_methods_null() {
			this.$store.commit('vender/setSelectedPaymentMethods', [])
			this.setTotal()
		}
	}
}
</script>
  
  