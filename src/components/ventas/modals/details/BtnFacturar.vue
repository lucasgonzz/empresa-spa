<template>
	<b-button
	v-if="!sale_details.afip_ticket || tiene_error_de_factura"
	id="btn_facturar"
	size="sm"
	@click="facturar"
	variant="primary">
		<i class="bi bi-receipt"></i>
		Emitir factura
		<b-badge
		variant="light"
		class="text-primary"
		v-if="sale_details.afip_tickets.length">
			{{ sale_details.afip_tickets.length }}
		</b-badge>
	</b-button>
</template>
<script>
import afip_ticket from '@/mixins/sale/afip_ticket'
export default {
	mixins: [afip_ticket],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		/**
		 * Venta cargada en el store del modal de detalle.
		 *
		 * @returns {Object}
		 */
		sale_details() {
			return this.$store.state.sale.model 
		},
		/**
		 * Indica si la factura AFIP quedó con error (sin CAE).
		 *
		 * @returns {boolean}
		 */
		tiene_error_de_factura() {
			return this.sale_details.afip_ticket && !this.sale_details.afip_ticket.cae
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		/**
		 * Abre el modal de confirmación para emitir comprobantes AFIP.
		 */
		facturar() {
			this.$store.commit('sale/setIsSelecteable', 1)
			this.$store.commit('sale/addSelected', this.sale_details)
			this.$bvModal.show('confirm-make-afip-tickets')

			this.set_punto_de_venta()
		},
		/**
		 * Preselecciona el punto de venta AFIP según la sucursal de la venta.
		 */
		set_punto_de_venta() {
			let address_id = this.sale_details.address_id

			console.log('set_punto_de_venta:')
			console.log(address_id)

			if (address_id) {
				let afip_information = this.$store.state.afip_information.models.find(model => model.address_id == address_id)

				console.log(afip_information)
				if (typeof afip_information != 'undefined') {

                	this.$store.commit('afip_ticket/set_afip_information_id', afip_information.id)
					console.log(afip_information.id)
				}
			}
		}
	}
}
</script>
