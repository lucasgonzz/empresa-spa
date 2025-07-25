<template>
	<b-button
	variant="primary"
	block
	@click="reenviar_facturas">
		Reenviar ventas
	</b-button>
</template>
<script>
import afip_ticket from '@/mixins/sale/afip_ticket'
export default {
	mixins: [afip_ticket],
	computed: {
		problemas_al_facturar() {
			return this.$store.state.afip_ticket.problemas_al_facturar
		},
	},
	methods: {
		reenviar_facturas() {

            this.afip_information_id = 0
            this.afip_tipo_comprobante_id = 0

			this.$store.commit('sale/setSelected', this.problemas_al_facturar)
			this.enviar_afip_tickets()
		}
	}
}
</script>