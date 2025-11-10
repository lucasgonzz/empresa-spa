<template>
	<b-modal
	size="lg"
	title="Resumenes"
	hide-footer
	id="resumen-caja">

		<view-component
		:show_btn_save="show_btn_save"
		model_name="resumen_caja">
			
			<template #table_left_options="props">
				<btn-pdf
				model_name="resumen_caja"
				:model="props.model"></btn-pdf>
			</template>
		
		</view-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnPdf: () => import('@/common-vue/components/BtnPdf'),
	},
	computed: {
		show_btn_save() {
			return !this.$store.state.resumen_caja.model.id
		},
	},
	methods: {
		clicked(movimiento_caja) {

			console.log('clicked')
			console.log('movimiento_caja:')
			console.log(movimiento_caja)
			console.log('caja:')
			console.log(this.caja)

			if (movimiento_caja.apertura_caja_id != this.caja.current_apertura_caja_id) {

				this.$toast.error('No se pueden editar movimientos de una apertura ya cerrada')
				return
			}

			// if (movimiento_caja.sale_id) {
			// 	this.$toast.error('No pueden actualizar los movimientos originados desde una VENTA')
			// 	return
			// } 

			// if (movimiento_caja.expense_id) {
			// 	this.$toast.error('No pueden actualizar los movimientos originados desde un GASTO')
			// 	return
			// } 

			// if (movimiento_caja.current_acount_id) {
			// 	this.$toast.error('No pueden actualizar los movimientos originados desde un PAGO de Cuenta Corriente')
			// 	return
			// } 

			this.setModel(movimiento_caja, 'movimiento_caja')
		},
		actualizar_info(movimiento_caja) {
			console.log('actualizar_info, movimiento_caja:')
			console.log(movimiento_caja)

			if (typeof movimiento_caja == 'undefined') {
				// Es porque se elimino y no viene por parametro
				movimiento_caja = this.$store.state.movimiento_caja.delete
				console.log('ahora:')
				console.log(movimiento_caja)
			}

			this.$store.dispatch('movimiento_caja/getModels')
			this.loadModel('caja', movimiento_caja.caja_id)
			this.loadModel('apertura_caja', movimiento_caja.apertura_caja_id, '/show/')
			.then(() => {

				let current_apertura_caja = this.$store.state.apertura_caja.models[0]
				this.$store.commit('apertura_caja/setModel', {model: current_apertura_caja, properties: []})
			})


			// this.$bvModal.hide('movimientos-caja')
			// this.$bvModal.show('movimientos-caja')
		}
	}
}
</script>