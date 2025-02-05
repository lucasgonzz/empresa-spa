<template>
	<div
	v-if="hasExtencion('combos')">
		
		<combos-modal></combos-modal>

		<modal-button></modal-button>

	</div>
</template>
<script>
export default {
	components: {
		CombosModal: () => import('@/components/listado/components/combos/modal/Index'),
		ModalButton: () => import('@/components/listado/components/combos/ModalButton'),
	}
}
</script>