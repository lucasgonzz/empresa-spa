<template> 
	<div
	v-if="view == 'clientes'">
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

			<template v-slot:table_right_options="slotProps">
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
		BtnCurrentAcounts: () => import('@/components/common/BtnCurrentAcounts'),
		ComercioCityUser: () => import('@/components/common/ComercioCityUser'),
		CreateBuyer: () => import('@/components/client/components/clients/CreateBuyer'),
		Import: () => import('@/components/client/components/clients/Import'),
	}
}
</script>