<template>
	<div>
		<!-- <make-afip-tickets></make-afip-tickets> -->
		
		<btn-loader
		v-if="!sale_details.afip_ticket || tiene_error_de_factura"
		class="m-l-15"
		text="Emitir Factura"
		icon="clipboard"
		id="btn_facturar"
		:block="false"
		@clicked="facturar"
		:loader="loading"
		variant="primary">
		</btn-loader>
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
		}
	}
}
</script>