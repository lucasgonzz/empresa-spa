<template>
	<div>
		<!--
			Solo en ventas que fueron a la cuenta corriente de un cliente (regla de Lucas, 22/10/2026):
			un plan de pago financia la deuda de la venta, y sin su movimiento en la cuenta corriente no
			hay deuda ni contra qué imputar el pago de una cuota. `current_acount` lo trae la fila de
			Ventas (Sale::scopeWithAll y el listado de SaleController). El back lo valida igual.
		-->
		<b-button
		v-if="sale.client_id && sale.current_acount"
		size="sm"
		class="m-l-5"
		variant="outline-primary"
		title="Plan de pago"
		@click.stop="ver">
			<i class="bi bi-credit-card"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	methods: {
		ver() {
			this.setModel(this.sale, 'sale', [], false)
			this.$bvModal.show('payment_plan')
		},
	},
}
</script>