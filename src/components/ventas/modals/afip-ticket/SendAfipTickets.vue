<template>
<div>

    <b-modal
    hide-footer
    title="Emitiendo facturas"
    size="md"
    id="send-afip-tickets">

    	<div 
    	v-for="afip_ticket in afip_tickets_for_make"
    	class="afip-ticket-for-make">
    		<div
    		class="cont-sale-info"
    		v-if="afip_ticket.sale">
	    		<i 
	    		v-if="afip_ticket.maked"
	    		class="icon-check text-success"></i>
	    		<b-spinner
	    		v-else
	    		variant="primary"></b-spinner>
	    		<span
	    		class="p-l-15">
	    			Venta N° {{ afip_ticket.sale.num }}
	    		</span>
	    		<strong
	    		class="p-l-5"
	    		v-if="afip_ticket.maked">| Factura emitida</strong>

	    		<strong
	    		class="p-l-5 text-danger"
	    		v-if="afip_ticket.errors">| Con errores</strong>
	    		<strong
	    		class="p-l-5 text-danger"
	    		v-if="afip_ticket.observations">| Con Observaciones</strong>
    		</div>
    	</div>

    </b-modal>
</div>
</template>
<script>
import afip_ticket from '@/mixins/sale/afip_ticket'
export default {
	mixins: [afip_ticket],
}
</script>	
<style lang="sass">
#send-afip-tickets
	.cont-sale-info
		display: flex 
		flex-direction: row 
		align-items: center
		justify-content: center
		.spinner-border 
			width: 20px !important
			height: 20px !important	
</style>