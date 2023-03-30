<template> 
	<div>
		<current-acounts></current-acounts>

		<import></import>

		<view-component
		show_filter_modal
		show_excel_drop_down
		model_name="client">

			<template
			v-slot:modal_buttons="slotProps">
	    		<comercio-city-user  
	    		:model="slotProps.model"
	    		model_name="client"></comercio-city-user>

	    		<create-buyer  
	    		:model="slotProps.model"></create-buyer>
			</template>

			<template v-slot:default="slotProps">
				<btn-current-acounts
				:model="slotProps.model"
				model_name="client"></btn-current-acounts>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		CurrentAcounts: () => import('@/components/common/current-acounts/Index'),
		BtnCurrentAcounts: () => import('@/components/common/BtnCurrentAcounts'),
		ComercioCityUser: () => import('@/components/common/ComercioCityUser'),
		CreateBuyer: () => import('@/components/client/components/CreateBuyer'),
		Import: () => import('@/components/client/components/Import'),
	}
}
</script>