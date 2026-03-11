<template>
<div>

    <send-afip-tickets></send-afip-tickets>
	
	<b-modal
	@shown="set_modal_open"
	@hidden="set_modal_closed"
	size="lg"
	id="afip-reenviar-facturas"
	title="Facturas no autorizadas"
	hide-footer>
		<h5>
			Ocurrieron problemas al autorizar las siguientes ventas
		</h5>
		<p>
			Vuelva a enviar a autorizar todas estas ventas
		</p>

	    <list-sales></list-sales>

	    <!-- <btn></btn> -->
	</b-modal>
</div>
</template>
<script>
export default {
	components: {
        SendAfipTickets: () => import('@/components/ventas/modals/afip-ticket/SendAfipTickets'),
		ListSales: () => import('@/components/alertas/components/lista-de-alertas-table/problemas-al-facturar/ListSales'),
		Btn: () => import('@/components/common/afip-reenviar-facturas/Btn'),
	},
	methods: {
		set_modal_open() {
			this.$store.commit('afip_ticket/set_modal_afip_errors_abierto', true)
		},
		set_modal_closed() {
			this.$store.commit('afip_ticket/set_modal_afip_errors_abierto', false)
		},
	}
}
</script>