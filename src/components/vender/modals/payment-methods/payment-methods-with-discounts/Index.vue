<template>
	<b-modal 
	id="payment-methods-with-discounts-modal" 
	no-close-on-backdrop
	title="Métodos de pago" 
	hide-footer>
	<!-- <b-modal 
	id="payment-method-modal" 
	no-close-on-backdrop
	title="Métodos de pago" 
	hide-header-close
	hide-footer> -->

		<totales></totales>	

		<hr>

		<list-payment-methods></list-payment-methods>

		<!-- Botón para guardar -->
		<buttons></buttons>

	</b-modal>
</template>
<script>
import payment_methods_with_discounts from '@/mixins/vender/payment_methods_with_discounts'
export default {
	mixins: [payment_methods_with_discounts],
	components: {
		Totales: () => import('@/components/vender/modals/payment-methods/payment-methods-with-discounts/Totales'),
		ListPaymentMethods: () => import('@/components/vender/modals//payment-methods/payment-methods-with-discounts/ListPaymentMethods'),
		Buttons: () => import('@/components/vender/modals/payment-methods/payment-methods-with-discounts/Buttons'),
	},
	computed: {
		total_vender() {
			return this.$store.state.vender.total
		},
		index_previus_sale() {
			return this.$store.state.vender.previus_sales.index
		},
		watch_activado() {
			return this.$store.state.vender.current_acount_payment_methods.watch_activado
		},
	},
	watch: {
        total_vender() { 
        	this.total_a_repartir_with_discounts = this.total_vender
        	
        	if (this.index_previus_sale == 0) {

        		this.total_repartido_with_discounts = 0
        	} 
        	
        },
    },
}
</script>
	
<style>
.total-a-repartir {
	font-size: 20px;
}
.btn-total {
	white-space: nowrap;
}
</style>
	