<template>
	<div
	class="m-b-10">

		<div
		class="m-b-10">
			
			<b-button
			@click="guardarMetodosPago"
			id="btn_guardar_payment_methods"
			block
			variant="primary">
				Guardar
			</b-button>
		</div>

		<b-button
			@click="cancelar"
			block
			variant="danger">
			Cancelar
		</b-button>
	</div>
</template>
<script>
import select_payment_methods from '@/mixins/expense/select_payment_methods'

export default {
	mixins: [select_payment_methods],
	methods: {
		cancelar() {
			this.total_repartido = 0
			this.$store.commit('expense/set_selected_payment_methods', [])
			this.$bvModal.hide('select-expense-payment-method-modal')
			// this.setTotal() // Not needed here as setModel will reset if cancelled
		}
	}
}
</script>