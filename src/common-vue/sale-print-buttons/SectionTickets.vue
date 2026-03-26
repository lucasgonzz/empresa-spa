<template>
	<div>
		<b-dropdown-text>
			Tickets
		</b-dropdown-text>
		<b-dropdown-divider></b-dropdown-divider>

		<b-dropdown-item
		@click.stop="$emit('ticket_pdf')">
			Ticket venta
		</b-dropdown-item>

		<b-dropdown-item
		v-for="afip_ticket in afip_tickets_with_cae"
		:key="'afip-ticket-'+afip_ticket.id"
		@click.stop="$emit('factura_ticket_pdf', afip_ticket.id)">
			Ticket Fac N°{{ afip_ticket.cbte_numero }}
		</b-dropdown-item>

		<b-dropdown-item class="p-0">
			<div class="sale-print-remito-profile-row">
				<span
				class="sale-print-remito-profile-label"
				role="button"
				@click.stop="$emit('ticket_2')">
					Ticket 2.0
				</span>
				<b-button
				variant="link"
				size="sm"
				class="sale-print-remito-profile-config p-0"
				title="Configurar ancho de impresora"
				aria-label="Configurar ancho de impresora"
				@click.stop="$emit('set_ancho_impresora')">
					<i class="icon-configuration"></i>
				</b-button>
			</div>
		</b-dropdown-item>
	</div>
</template>

<script>
export default {
	props: {
		afip_tickets_with_cae: {
			type: Array,
			default() {
				return []
			},
		},
	},
}
</script>
