<template>
	<b-modal
	size="lg"
	:title="title"
	hide-footer
	id="movimientos-caja">
		<view-component
		@modelSaved="actualizar_info"
		@modelDeleted="actualizar_info"
		:set_model_on_row_selected="false"
		@clicked="clicked"
		:show_btn_save="show_btn_save"
		:props_to_send_on_save="props_to_send_on_save"
		model_name="movimiento_caja">
			<template #header>
				<info-apertura-caja></info-apertura-caja>
			</template>

			<template #table-prop-concepto_movimiento_caja_id="props">
				<btn-concepto
				:movimiento_caja="props.model"></btn-concepto>
			</template>
		</view-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		InfoAperturaCaja: () => import('@/components/caja/modals/movimientos/InfoAperturaCaja'),
		BtnConcepto: () => import('@/components/caja/modals/movimientos/BtnConcepto'),
	},
	computed: {
		caja() {
			return this.$store.state.caja.model 
		},
		movimiento_caja() {
			return this.$store.state.movimiento_caja.model 
		},
		title() {
			if (this.caja) {
				return 'Movimientos de '+this.caja.name
			}
		},
		show_btn_save() {
			return this.movimiento_caja.id === null 
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