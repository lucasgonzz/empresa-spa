<template>
	<b-button
	variant="primary"
	@click.stop="pagar">
		Pagar
	</b-button>
</template>
<script>
export default {
	props: {
		payment_plan_cuota: Object,
	},
	methods: {
		pagar() {

			this.setModel(this.payment_plan_cuota, 'payment_plan_cuota', [], false)

			this.$store.commit('current_acount/setFromModelName', 'client')
			this.$store.commit('current_acount/setFromModel', this.payment_plan_cuota.client)
			this.$bvModal.show('current-acounts-pago')


            setTimeout(() => {

            	let monto_a_pagar = Number(this.payment_plan_cuota.amount)

            	if (this.payment_plan_cuota.amount_paid) {
            		monto_a_pagar -= Number(this.payment_plan_cuota.amount_paid)
            	}

                let input = document.getElementById('monto-pago')
                input.value = monto_a_pagar

                input = document.getElementsByClassName('payment-method-amount')[0]                
                input.value = monto_a_pagar
                input.focus()

            }, 500)
		}
	}
}
</script>