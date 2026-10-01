<template>
	<!--
		Facturar la nota de crédito con ARCA sobre una factura de la venta. Un toggle por factura
		CON CAE: una nota de crédito con ARCA solo se puede emitir sobre una venta que
		efectivamente se facturó, y una venta puede tener varias facturas.

		Los toggles se comportan como opciones excluyentes: cada uno emite el id de SU factura al
		prenderse (`true_value`) y 0 al apagarse, sobre el mismo `facturar_nota_credito` del store.

		🔴 El testid `devolucion-facturar-nota-credito-<afip_ticket_id>` va en el <input
		type=checkbox> que VenderToggle envuelve en su <label>: el spec lo prende con
		poner_toggle(), que clickea ese label.
	-->
	<div
	v-if="facturas.length"
	class="dev-facturar">
		<vender-toggle
		v-for="afip_ticket in facturas"
		:key="afip_ticket.id"
		:input_id="'devolucion-facturar-nota-credito-'+afip_ticket.id"
		:true_value="afip_ticket.id"
		:false_value="0"
		v-model="facturar_nota_credito">
			Facturar con ARCA sobre la Factura N° {{ afip_ticket.cbte_numero }}
			<span class="dev-toggle__ayuda">
				{{ price(afip_ticket.importe_total) }} facturados.
			</span>
		</vender-toggle>
	</div>
</template>
<script>
export default {
	components: {
		VenderToggle: () => import('@/components/vender/components/VenderToggle'),
	},
	computed: {
		/**
		 * @returns {Object|null} Venta cargada.
		 */
		sale() {
			return this.$store.state.devoluciones.sale
		},
		/**
		 * Facturas de la venta con CAE (las únicas sobre las que se puede emitir la nota).
		 *
		 * @returns {Array}
		 */
		facturas() {
			if (!this.sale || !this.sale.afip_tickets) {
				return []
			}
			return this.sale.afip_tickets.filter(afip_ticket => afip_ticket.cae)
		},
		/**
		 * Id de la factura sobre la que se emite la nota, o 0 para no facturar.
		 */
		facturar_nota_credito: {
			get() {
				return this.$store.state.devoluciones.facturar_nota_credito
			},
			set(value) {
				this.$store.commit('devoluciones/set_facturar_nota_credito', value)
			},
		},
	},
}
</script>
<style lang="sass">
.devoluciones-modulo
	.dev-facturar
		display: flex
		flex-direction: column
		gap: 16px
</style>
