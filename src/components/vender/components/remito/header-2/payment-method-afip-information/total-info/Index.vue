<template>
	<div>
		<total-modal></total-modal>

		<btn-modal></btn-modal>
	</div>
</template>
<script>
export default {
	components: {
		TotalModal: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/total-info/modal/Index'),
		BtnModal: () => import('@/components/vender/components/remito/header-2/payment-method-afip-information/total-info/BtnModal'),
	},
}
</script>