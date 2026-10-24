<template>
	<!-- Movimientos entre depósitos: desde la segunda sucursal (misión sucursal-siempre, D1). -->
	<div
	v-if="muestra_sucursales">
		
		<deposit-movements-modal></deposit-movements-modal>

		<!-- <modal-button></modal-button> -->

	</div>
</template>
<script>
export default {
	components: {
		DepositMovementsModal: () => import('@/components/listado/components/horizontal-nav/deposit-movements/modal/Index'),
		// ModalButton: () => import('@/components/listado/components/horizontal-nav/deposit-movements/ModalButton'),
	},
	computed: {
		addresses() {
			return this.$store.state.address.models
		}
	}
}
</script>