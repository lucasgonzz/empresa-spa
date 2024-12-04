<template>
	<b-row>
		<b-col
		xl="6"
		cols="12">
			<address-nav></address-nav>
		</b-col>
		<b-col
		class="m-t-10 m-xl-t-0"
		xl="6"
		cols="12">
			<afip-ticket-nav></afip-ticket-nav>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		AddressNav: () =>import('@/components/ventas/components/address-afip-ticket-ventas-cobradas-nav/AddressNav'),
		AfipTicketNav: () =>import('@/components/ventas/components/address-afip-ticket-ventas-cobradas-nav/AfipTicketNav'),
	},
}
</script>