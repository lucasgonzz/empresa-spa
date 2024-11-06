<template>
	<div>
		
		<sale-modal></sale-modal>

		<view-component 
		:usar_filtros="false"
		:show_btn_create="false"
		model_name_for_get_models="current_acount"
		change_from_dates_option
		v-if="view == 'notas-de-credito'"
		model_name="nota_credito">

			<template #table-prop-sale_id="props">
				<btn-sale
				:nota_credito="props.model"></btn-sale>
			</template>

			<template v-slot:table_right_options="props">
				<btn-nota-credito
				:nota_credito="props.model"></btn-nota-credito>				
			</template>
		</view-component>
	</div>
</template> 
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnSale: () => import('@/components/comprobantes/components/notas-de-credito/table-buttons/BtnSale'),
		BtnNotaCredito: () => import('@/components/comprobantes/components/notas-de-credito/table-buttons/BtnNotaCredito'),
        SaleModal: () => import('@/components/common/SaleModal'),
	},
	created() {
		this.$store.dispatch('nota_credito/getModels')
	}
}
</script>