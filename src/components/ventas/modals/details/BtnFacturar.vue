<template>
	<div>
		<!-- <make-afip-tickets></make-afip-tickets> -->
		
		<b-button
		v-if="!sale_details.afip_ticket || tiene_error_de_factura"
		class="m-l-15"
		id="btn_facturar"
		@click="facturar"
		variant="primary">
			<i class="icon-clipboard"></i>
			Emitir Factura

			<b-badge
			variant="danger"
			v-if="sale_details.afip_tickets.length">
				{{ sale_details.afip_tickets.length }}
			</b-badge>
		</b-button>
	</div>
</template>
<script>
import afip_ticket from '@/mixins/sale/afip_ticket'
export default {
	mixins: [afip_ticket],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		// MakeAfipTickets: () => import('@/components/ventas/modals/afip-ticket/MakeAfipTickets'),
	},
	computed: {
		sale_details() {
			return this.$store.state.sale.model 
		},
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
		facturar() {
			this.$store.commit('sale/setIsSelecteable', 1)
			this.$store.commit('sale/addSelected', this.sale_details)
			this.$bvModal.show('confirm-make-afip-tickets')

			this.set_punto_de_venta()
		},
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