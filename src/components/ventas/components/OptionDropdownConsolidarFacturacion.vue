<template>
	<div>
		<!-- Sin disabled: así el click dispara y se puede explicar el error con un toast. -->
		<b-dropdown-item
		v-if="hasExtencion('consolidar_ventas_en_factura')"
		@click.prevent="abrirConsolidar">
			<i class="icon-list"></i>
			Consolidar para facturar
		</b-dropdown-item>
	</div>
</template>

<script>
/**
 * Opción del menú "Selección" de ventas: abre el modal de consolidación AFIP
 * precargado con las filas actualmente seleccionadas en la grilla.
 */
export default {
	computed: {
		/**
		 * Ventas marcadas con la selección múltiple (ask_selectable en view-component).
		 */
		selected_sales() {
			return this.$store.state.sale.selected
		},

		/**
		 * Si hay error de validación, se guarda en esta cadena; null = ok.
		 */
		mensajeValidacion() {
			const sales = this.selected_sales
			if (!sales || sales.length === 0) {
				return 'No hay ventas seleccionadas.'
			}
			/** Misma regla de negocio: todas con el mismo cliente asignado. Comparación normalizada (API puede enviar número o string). */
			const firstCid = sales[0].client_id
			if (firstCid == null || firstCid === '' || firstCid === 0) {
				return 'Las ventas de mostrador (sin cliente) no se pueden consolidar.'
			}
			for (const s of sales) {
				if (s.client_id == null || s.client_id === '' || s.client_id === 0) {
					return 'No se pueden mezclar ventas con cliente y ventas de mostrador. Todas deben ser del mismo cliente.'
				}
				if (String(s.client_id) !== String(firstCid)) {
					return 'Solo se pueden consolidar ventas del mismo cliente. Elegí ventas que tengan el mismo cliente en todas las filas.'
				}
				if (s.is_consolidacion_facturacion) {
					return 'No se puede incluir una venta que ya es factura consolidada.'
				}
				// if (s.consolidacion_facturacion_id) {
				// 	return 'Una o más ventas ya fueron incluidas en otra consolidación.'
				// }
				/** Comprobante AFIP ya autorizado (con CAE). */
				// if (s.afip_tickets && s.afip_tickets.length) {
				// 	const conCae = s.afip_tickets.some(t => t.cae && String(t.cae).trim() !== '')
				// 	if (conCae) {
				// 		return 'Una o más ventas ya tienen factura AFIP autorizada.'
				// 	}
				// }
			}
			return null
		},
	},

	methods: {
		/**
		 * Valida, escribe en el módulo de consolidación y abre el modal.
		 */
		abrirConsolidar() {
			if (this.mensajeValidacion) {
				this.$bvToast && this.$bvToast.toast(this.mensajeValidacion, {
					title: 'Consolidar ventas',
					variant: 'warning',
					solid: true,
				})
				return
			}
			const sales = this.selected_sales
			const clientId = sales[0].client_id
			const ventas = sales
			const saleIds = sales.map(s => s.id)
			this.$store.commit('sale/consolidar_facturacion/prepararDesdeVentasSeleccionadas', {
				client_id: clientId,
				ventas,
				sale_ids: saleIds,
			})
			this.$bvModal.show('modal-consolidar-facturacion')
		},
	},
}
</script>
