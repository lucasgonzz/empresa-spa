<template>
	<div>

		<movimientos-entre-cajas></movimientos-entre-cajas>	

		<aperturas></aperturas>	

		<movimientos></movimientos>	

		<sale-modal></sale-modal>

		<view-component
		:models_to_show="models_to_show"
		show_models_if_empty
		model_name="caja">

			<template #horizontal_nav_center>
				
				<horizontal-nav-center></horizontal-nav-center>
			</template>

			<template #table_left_options="props">
				<table-buttons
				:caja="props.model"></table-buttons>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		HorizontalNavCenter: () => import('@/components/caja/components/horizontal-nav-center/Index'),
		TableButtons: () => import('@/components/caja/components/table-buttons/Index'),

		SaleModal: () => import('@/components/common/SaleModal'),
		MovimientosEntreCajas: () => import('@/components/caja/modals/movimientos-entre-cajas/Index'),
		Aperturas: () => import('@/components/caja/modals/aperturas/Index'),
		Movimientos: () => import('@/components/caja/modals/movimientos/Index'),
	},
	computed: {
		cajas() {
			return this.$store.state.caja.models 
		},
		models_to_show() {

			if (this.is_admin) {

				console.log('es admin para cajas')

				return this.cajas 
			}

			let cajas = []

			this.cajas.forEach(caja => {

				let has_permission = caja.users.find(user => user.id == this.user.id)

				if (typeof has_permission != 'undefined') {

					console.log('agregando la caja '+caja.name)

					cajas.push(caja)
				}
			})

			return cajas 
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom'
.caja-abierta
	td 
		background: lighten($green, 25%) !important


.caja-cerrada
	td 
		background: lighten($red, 25%) !important
</style>