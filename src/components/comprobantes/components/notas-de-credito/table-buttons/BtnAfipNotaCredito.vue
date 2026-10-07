<template>
	<div>


		<btn-factura
		v-if="nota_credito.afip_ticket"
		class="m-l-5"
		:print_url="print_url"
		:afip_ticket="nota_credito.afip_ticket"></btn-factura>

		<!--
			Nota guardada sin facturar (o con un intento que ARCA no autorizó): se factura desde acá
			sobre la factura de su venta. Ver BtnFacturarNotaCredito.vue.
		-->
		<btn-facturar-nota-credito
		v-if="puede_facturarse"
		:nota_credito="nota_credito"
		:facturas="facturas_de_la_venta"></btn-facturar-nota-credito>

		<!-- <b-button
		variant="primary"
		@click.stop="print" 
		v-if="nota_credito.afip_ticket">
			<i class="icon-print"></i>
			Factura N° {{ nota_credito.afip_ticket.cbte_numero }}
		</b-button> -->
	</div>

</template>
<script>
import { env } from '@/runtime_config'
export default {
	components: {
		BtnFactura: () => import('@/components/common/BtnFactura'),
		BtnFacturarNotaCredito: () => import('@/components/comprobantes/components/notas-de-credito/table-buttons/BtnFacturarNotaCredito'),
	},
	props: {
		nota_credito: Object,
	},
	computed: {
		print_url() {
			return '/current-acount/pdf/'+this.nota_credito.id
		},
		/**
		 * Facturas de la venta de la nota sobre las que se puede emitir: autorizadas (con CAE), de un
		 * tipo que el emisor soporta (A, B, C, sus equivalentes de crédito electrónico y exportación)
		 * y que no sean ellas mismas una nota de crédito.
		 */
		facturas_de_la_venta() {
			let tipos = ['1', '6', '11', '201', '206', '211', '19']
			let facturas = []

			if (!this.nota_credito.sale || !this.nota_credito.sale.afip_tickets) {
				return facturas
			}

			this.nota_credito.sale.afip_tickets.forEach(afip_ticket => {
				if (
					afip_ticket.cae
					&& !afip_ticket.nota_credito_id
					&& tipos.indexOf(String(afip_ticket.cbte_tipo)) != -1
				) {
					facturas.push(afip_ticket)
				}
			})

			return facturas
		},
		/**
		 * El botón de facturar sale cuando la nota tiene venta y cliente, la venta tiene alguna
		 * factura autorizada y la nota todavía no llegó a ARCA: sin comprobante, o con uno que no
		 * tiene ni CAE ni número (un intento rechazado). Con número ya se envió: se consulta.
		 */
		puede_facturarse() {
			if (!this.nota_credito.sale_id || !this.nota_credito.client_id || !this.facturas_de_la_venta.length) {
				return false
			}

			let afip_ticket = this.nota_credito.afip_ticket

			return !afip_ticket || (!afip_ticket.cae && !afip_ticket.cbte_numero)
		},
	},
	methods: {
		print() {
			let link = env('VUE_APP_API_URL')+'/current-acount/pdf/'+this.nota_credito.id
			window.open(link)
		},
	}
}
</script>