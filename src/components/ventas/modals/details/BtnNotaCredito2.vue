<template>
	<btn-loader
	v-if="sale_details.afip_ticket && sale_details.afip_ticket.cae && !tiene_nota_de_credito_facturada(sale_details)"
	class="m-l-15"
	text="Nota de credito"
	icon="clipboard"
	:block="false"
	@clicked="nota_credito"
	:loader="loading"
	variant="outline-danger">
	</btn-loader>
</template>
<script>
import afip_ticket from '@/mixins/sale/afip_ticket'
export default {
	mixins: [afip_ticket],
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	computed: {
		sale_details() {
			return this.$store.state.sale.model 
		},
	},
	data() {
		return {
			loading: false,
		}
	},
	methods: {
		nota_credito() {
			if (confirm('¿Seguro que quiere emitir una NOTA DE CREDITO con AFIP para esta venta?')) {

				this.loading = true
				this.$api.post('sale/nota-credito-afip/'+this.sale_details.id)
				.then(res => {
					this.$toast.success('Nota de credito generada correctamente')
					this.loading = false
					this.loadModel('sale', this.sale_details.id)
					this.$bvModal.hide('sale')
				})
				.catch(err => {
					this.$toast.error('Error al generar Nota de credito')
					this.loading = false
				})
			}
		}
	}
}
</script>