<template>
	<b-modal
	size="lg"
	title="Movimientos"
	hide-footer
	id="movimientos-caja">
		<view-component
		@modelSaved="modelSaved"
		:set_model_on_row_selected="false"
		@clicked="clicked"
		:props_to_send_on_save="props_to_send_on_save"
		model_name="movimiento_caja">
			
			<template #header>
				<info-apertura-caja></info-apertura-caja>
			</template>
		</view-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		InfoAperturaCaja: () => import('@/components/caja/modals/movimientos/InfoAperturaCaja'),
	},
	computed: {
		caja() {
			return this.$store.state.caja.model 
		},
		props_to_send_on_save() {
			if (this.caja) {

				return [
					{
						key: 'caja_id',
						value: this.caja.id,
					},
					{
						key: 'apertura_caja_id',
						value: this.caja.current_apertura_caja_id,
					}
				]
			}
		},
	},
	methods: {
		clicked(movimiento_caja) {

			if (movimiento_caja.sale_id) {
				this.$toast.error('No pueden actualizar los movimientos originados desde una VENTA')
				return
			} 

			if (movimiento_caja.expense_id) {
				this.$toast.error('No pueden actualizar los movimientos originados desde un GASTO')
				return
			} 

			if (movimiento_caja.current_acount_id) {
				this.$toast.error('No pueden actualizar los movimientos originados desde un PAGO de Cuenta Corriente')
				return
			} 

			this.setModel(movimiento_caja, 'movimiento_caja')
		},
		modelSaved(movimiento_caja) {
			this.$store.dispatch('movimiento_caja/getModels')
			this.loadModel('caja', movimiento_caja.caja_id)
		}
	}
}
</script>