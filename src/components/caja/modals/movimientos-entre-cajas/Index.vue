<template>
	<b-modal
	size="lg"
	title="Movimientos entre Cajas"
	hide-footer
	id="movimientos-entre-cajas">
		<view-component
		@modelSaved="modelSaved"
		:set_model_on_row_selected="false"
		model_name="movimiento_entre_caja">
		</view-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	methods: {
		modelSaved(movimiento_entre_caja) {
			this.loadModel('caja', movimiento_entre_caja.from_caja_id)
			this.loadModel('caja', movimiento_entre_caja.to_caja_id)
		}
	}
}
</script>