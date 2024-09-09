<template>
	<b-modal 
	id="payment-method-modal" 
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
import select_payment_methods from '@/mixins/vender/select_payment_methods'
export default {
	mixins: [select_payment_methods],
	components: {
		Totales: () => import('@/components/vender/modals//payment-methods/select-payment-methods/Totales'),
		ListPaymentMethods: () => import('@/components/vender/modals//payment-methods/select-payment-methods/ListPaymentMethods'),
		Buttons: () => import('@/components/vender/modals/payment-methods/select-payment-methods/Buttons'),
	},
	computed: {
		sub_total_vender() {
			return this.$store.state.vender.sub_total
		},
		index_previus_sale() {
			return this.$store.state.vender.previus_sales.index
		},
		watch_activado() {
			return this.$store.state.vender.current_acount_payment_methods.watch_activado
		},
	},
	watch: {
        sub_total_vender() { 
        	console.log('watch de sub_total en select-payment-methods')
        	if (this.watch_activado) {
        		console.log('watch de sub_total')
	        	this.total_a_repartir = this.sub_total_vender
	        	
	        	if (this.index_previus_sale == 0) {

	        		this.total_repartido = 0
	        	} else {
	        		
	        		// this.set_total_desde_previus_sale()
	        	}
        	} else {
        		console.log('NO PASO NADA porque watch_activado esta en: '+this.watch_activado)
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
	