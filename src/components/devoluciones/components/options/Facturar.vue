<template>
	<div>
		<div
		v-if="sale && sale.afip_tickets.length">
			
			<hr>

			<!--
				🔴 Este checkbox solo existe si la factura original tiene CAE (`v-if` de mas abajo): una
				nota de credito con ARCA solo se puede emitir sobre una venta que efectivamente se
				facturo. El testid lleva el id del comprobante porque una venta puede tener varios.
			-->
			<b-form-checkbox
			:data-testid="'devolucion-facturar-nota-credito-'+afip_ticket.id"
			v-for="afip_ticket in sale.afip_tickets"
			class="m-t-15"
			v-if="afip_ticket.cae"
			:value="afip_ticket.id"
			:unchecked-value="0"
			v-model="facturar_nota_credito">
				Facturar nota de credito con ARCA sobre Factura N° {{ afip_ticket.cbte_numero }} | ({{ price(afip_ticket.importe_total) }} facturados)
			</b-form-checkbox>
		</div>
	</div>
</template>
<script>
export default {
	computed: {
		se_puede_facturar() {
			if (this.sale) {
				if (this.sale.afip_tickets.length) {
					return true
				}
			}
			return false
		},
		client() {
			return this.$store.state.devoluciones.client
		},
		sale() {
			return this.$store.state.devoluciones.sale
		},
		facturar_nota_credito: {
			get() {
				return this.$store.state.devoluciones.facturar_nota_credito
			},
			set(value) {
				this.$store.commit('devoluciones/set_facturar_nota_credito', value)
			}
		},
	}
}
</script>