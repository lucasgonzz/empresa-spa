<template>
	<div
	v-if="hasExtencion('deposit_movements')">
		
		<deposit-movements-modal></deposit-movements-modal>

		<modal-button></modal-button>

	</div>
</template>
<script>
export default {
	components: {
		DepositMovementsModal: () => import('@/components/listado/components/deposit-movements/modal/Index'),
		ModalButton: () => import('@/components/listado/components/deposit-movements/ModalButton'),
	}
}
</script>