<template>
	<div
	v-if="view == 'proveedores'">
    	<current-acounts></current-acounts>
    	<import></import>
		<!-- <update-prices></update-prices> -->
		
		<view-component 
		model_name="provider"
		show_filter_modal
		show_excel_drop_down
		:show_previus_days="false">

			<template v-slot:default="slotProps">
				<btn-current-acounts
				:model="slotProps.model"
				model_name="provider"></btn-current-acounts>
			</template>

			<template
			v-slot:modal_buttons="slotProps">
	    		<comercio-city-user  
	    		:model="slotProps.model"
	    		model_name="provider"></comercio-city-user>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		Import: () => import('@/components/provider/modals/providers/Import'),
		// UpdatePrices: () => import('@/components/ventas/modals/update-prices/Index'),
		
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnCurrentAcounts: () => import('@/components/common/BtnCurrentAcounts'),
		ComercioCityUser: () => import('@/components/common/ComercioCityUser'),
	},
}
</script>