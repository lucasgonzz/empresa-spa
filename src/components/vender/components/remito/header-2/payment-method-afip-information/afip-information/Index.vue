<template>
	<div
	class="input-group">
		<select-afip-information></select-afip-information>
		
		<select-afip-tipo-comprobante></select-afip-tipo-comprobante>

		<select-incoterms
		@set_selected="set_incoterms"
		v-if="afip_tipo_comprobante_id == 8"></select-incoterms>
	</div>
</template>
<script>
export default {
	components: {
		SelectAfipInformation: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectAfipInformation'),
		SelectAfipTipoComprobante: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectAfipTipoComprobante'),
		SelectIncoterms: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectIncoterms'),
	},
	computed: {
		afip_tipo_comprobante_id() {
			return this.$store.state.vender.afip_tipo_comprobante_id
		},
	},
	methods: {
		set_incoterms(incoterms) {
			console.log(incoterms)
			this.$store.commit('vender/set_incoterms', incoterms)
		}
	}
}
</script>
