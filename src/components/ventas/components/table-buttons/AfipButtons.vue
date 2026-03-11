<template>
	<div
	v-if="sale.afip_tickets.length"
	class="p-l-5">

		<btn-factura
		class="m-l-5"
		v-for="afip_ticket in sale.afip_tickets"
		:print_url="print_url(afip_ticket)"
		:afip_ticket="afip_ticket"></btn-factura>
	</div>
</template>
<script>
export default {
	components: {
		BtnFactura: () => import('@/components/common/BtnFactura'),
	},
	props: {
		sale: Object,
	},
	methods: {
		print_url(afip_ticket) {
			return '/sale/afip-ticket-pdf/'+afip_ticket.id
		},
	},
}
</script>