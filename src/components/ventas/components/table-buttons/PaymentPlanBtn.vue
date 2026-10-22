<template>
	<div>
		<!--
			Solo en ventas que fueron a la cuenta corriente de un cliente (regla de Lucas, 22/10/2026):
			un plan de pago financia la deuda de la venta, y sin su movimiento en la cuenta corriente no
			hay deuda ni contra qué imputar el pago de una cuota. `current_acount` lo trae la fila de
			Ventas (Sale::scopeWithAll y el listado de SaleController). El back lo valida igual.

			Se exige que sea un DÉBITO (debe cargado, haber vacío): `current_acount` es un hasOne sin
			filtro, y en una venta cobrada en el momento con una devolución trae la nota de crédito.
		-->
		<b-button
		v-if="tiene_debito_en_cuenta_corriente"
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
	computed: {
		/**
		 * Si la venta tiene cliente y su débito en la cuenta corriente: la condición para armarle un
		 * plan de pago.
		 *
		 * @returns {Boolean}
		 */
		tiene_debito_en_cuenta_corriente() {
			let movimiento = this.sale.current_acount
			return !!this.sale.client_id
				&& !!movimiento
				&& movimiento.debe !== null && typeof movimiento.debe != 'undefined'
				&& (movimiento.haber === null || typeof movimiento.haber == 'undefined')
		},
	},
	methods: {
		ver() {
			this.setModel(this.sale, 'sale', [], false)
			this.$bvModal.show('payment_plan')
		},
	},
}
</script>