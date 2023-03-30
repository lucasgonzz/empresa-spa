<template>
<b-modal
id="afip-details"
title="Detalles de la boleta"
v-if="sale"
hide-footer>
	<importes-details></importes-details>
	<client-warnings></client-warnings>
	<b-button
	class="m-t-15"
	:disabled="has_warnings"
	@click="boleta"
	variant="primary"
	block>
		<btn-loader
		:loader="loading_boleta"
		text="Generar boleta"></btn-loader>
	</b-button>
</b-modal>
</template>
<script>
import afip from '@/mixins/afip'
import ImportesDetails from '@/components/ventas/modals/afip/ImportesDetails'
import ClientWarnings from '@/components/ventas/modals/afip/ClientWarnings'
import BtnLoader from '@/components/common/BtnLoader'
export default {
	mixins: [afip],
	components: {
		ImportesDetails,
		ClientWarnings,
		BtnLoader,
	},
	data() {
		return {
			loading_boleta: false,
		}
	},
	methods: {
		boleta() {
			this.loading_boleta = true
			this.$api.post('afip/'+this.sale.id)
			.then(res => {
				this.loading_boleta = false
				this.printAfipTicket(this.sale)
				this.$store.dispatch('sales/getSales')
			})
			.catch(err => {
				this.loading_boleta = false
				console.log(err)
			})
		}
	}
}
</script>