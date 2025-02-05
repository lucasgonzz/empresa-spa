<template>
	<div
	class="m-b-10">

		<div
		class="m-b-10">
			<div
			v-if="current_acount_payment_method_discounts.length">
				
				<b-button
				v-if="!payment_methods_with_discounts.length"
				@click="guardarMetodosPago"
				block
				variant="primary">
					Calcular
				</b-button>

				<div
				v-else>
					
					<h4
					class="text-center m-b-20">
						Nuevo Total: {{ price(total_vender) }}
					</h4>

					<b-button
					@click="show_payment_methods_with_discounts"
					block
					variant="primary">
						Continuar
					</b-button>
				</div>


			</div>
			
			<b-button
			v-else 
			@click="guardarMetodosPago"
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
import select_payment_methods from '@/mixins/vender/select_payment_methods'
import default_payment_method from '@/mixins/vender/default_payment_method'
// import vender from '@/mixins/vender'

export default {
	mixins: [select_payment_methods, default_payment_method],
	computed: {
		payment_methods_with_discounts() {
			return this.$store.state.vender.current_acount_payment_methods_with_discounts.payment_methods
		},

		total_vender() {
			return this.$store.state.vender.total 
		},
	},
	methods: {

		show_payment_methods_with_discounts() {
			this.$bvModal.show('payment-methods-with-discounts-modal')
		},

		cancelar() {

			this.setDefaultPaymentMethod()

			this.total_repartido = 0

			this.$store.commit('vender/setSelectedPaymentMethods', [])
			// this.$store.commit('vender/current_acount_payment_methods/setPaymentMethods', [])
			this.$bvModal.hide('payment-method-modal')
			this.setTotal()
		}
	}
}
</script>