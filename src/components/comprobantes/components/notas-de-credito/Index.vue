<template>
	<div>
		
		<sale-modal
		:show_btn_delete="show_btn_delete_sale"></sale-modal>

		<view-component 
		:usar_filtros="false"
		:show_btn_create="false"
		:show_btn_save="false"
		:show_btn_delete="false"
		model_name_for_get_models="current_acount"
		change_from_dates_option
		v-if="view == 'notas-de-credito'"
		model_name="nota_credito">

			<template #table-prop-sale_id="props">
				<btn-sale
				:nota_credito="props.model"></btn-sale>
			</template>

			<template v-slot:table_right_options="props">
				<div class="j-center">
					
					<btn-nota-credito
					:nota_credito="props.model"></btn-nota-credito>	
					<print-btn
					:model="props.model"></print-btn>			
				</div>
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
		PrintBtn: () => import('@/components/comprobantes/components/common/PrintBtn'),
	},
	computed: {
		show_btn_delete_sale() {
			return this.can('sale.delete')
		},
	},
	created() {
		this.$store.dispatch('nota_credito/getModels')
	}
}
</script>