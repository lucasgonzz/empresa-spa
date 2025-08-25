<template>
	<div
	class="input-group">
		<select-afip-information></select-afip-information>
		
		<select-afip-tipo-comprobante></select-afip-tipo-comprobante>
	</div>
</template>
<script>
export default {
	components: {
		SelectAfipInformation: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectAfipInformation'),
		SelectAfipTipoComprobante: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/afip-information/SelectAfipTipoComprobante'),
	}
}
</script>
