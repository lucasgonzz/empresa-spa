<template>
	<b-modal
	size="lg"
	title="Aperturas"
	hide-footer
	id="aperturas-caja">
		<view-component
		@clicked="clicked"
		:set_model_on_row_selected="false"
		:show_btn_create="false"
		model_name="apertura_caja">

			<template #table_right_options="props">
				<table-buttons
				:apertura_caja="props.model"></table-buttons>
			</template>
		</view-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		TableButtons: () => import('@/components/caja/modals/aperturas/table-buttons/Index'),
	},
	methods: {
		clicked(apertura_caja) {
			this.$store.commit('apertura_caja/setModel', {model: apertura_caja, properties: []})

			this.$store.commit('movimiento_caja/set_route_prefix', apertura_caja.id)
			this.$store.dispatch('movimiento_caja/getModels')

			this.$bvModal.show('movimientos-caja')
		}
	}
}
</script>