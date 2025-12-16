<template>
	<b-modal 
	id="select-expense-payment-method-modal" 
	no-close-on-backdrop
	title="Métodos de pago del gasto" 
	hide-footer>

		<totales></totales>	

		<hr>

		<list-payment-methods></list-payment-methods>

		<!-- Botón para guardar -->
		<buttons></buttons>

	</b-modal>
</template>
<script>
import select_payment_methods from '@/mixins/expense/select_payment_methods'
export default {
	mixins: [select_payment_methods],
	components: {
		Totales: () => import('@/components/expenses/modals/select-payment-methods/Totales'),
		ListPaymentMethods: () => import('@/components/expenses/modals/select-payment-methods/ListPaymentMethods'),
		Buttons: () => import('@/components/expenses/modals/select-payment-methods/Buttons'),
	},
	computed: {
		expense_amount() {
			return this.$store.state.expense.model.amount
		},
		watch_activado() {
			return this.$store.state.expense.payment_methods.watch_activado
		},
	},
	watch: {
        expense_amount() { 
        	if (this.watch_activado) {

        		this.$store.commit('expense/set_selected_payment_methods', []) 
	        	this.total_a_repartir = this.expense_amount
	        	this.total_repartido = 0
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