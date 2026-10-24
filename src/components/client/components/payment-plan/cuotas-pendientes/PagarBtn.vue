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

			/*
				Cuotas de planes armados antes del 22/10/2026 sobre una venta que no estaba en la cuenta
				corriente: no hay débito ni cuenta contra la cual imputar el pago, y leer
				`sale.current_acount.credit_account` reventaba con un TypeError sin aviso. Desde esa
				fecha esos planes no se pueden crear (regla de Lucas).
			*/
			let sale = this.payment_plan_cuota.sale
			if (!sale || !sale.current_acount || !sale.current_acount.credit_account) {
				this.$toast.error('La venta de esta cuota no está en la cuenta corriente del cliente: registrá el cobro desde la cuenta corriente.')
				return
			}

			this.setModel(this.payment_plan_cuota, 'payment_plan_cuota', [], false)

			this.$store.commit('current_acount/setFromModelName', 'client')
			this.$store.commit('current_acount/setFromModel', this.payment_plan_cuota.client)
			this.$store.commit('current_acount/set_from_credit_account', this.payment_plan_cuota.sale.current_acount.credit_account)

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
                
                input.dispatchEvent(new Event('input', { bubbles: true }))

            }, 500)
		}
	}
}
</script>