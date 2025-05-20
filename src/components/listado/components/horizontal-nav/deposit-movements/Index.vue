<template>
	<div
	v-if="addresses.length">
		
		<deposit-movements-modal></deposit-movements-modal>

		<modal-button></modal-button>

	</div>
</template>
<script>
export default {
	components: {
		DepositMovementsModal: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/Index'),
		ModalButton: () => import('@/components/listado/components/horizontal-nav/deposit-movements/ModalButton'),
	},
	computed: {
		addresses() {
			return this.$store.state.address.models
		}
	}
}
</script>