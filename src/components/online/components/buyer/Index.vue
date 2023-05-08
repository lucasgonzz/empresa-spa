<template>
	<view-component
	v-if="view == 'clientes'"
	show_filter_modal
	model_name="buyer">
		<template
		v-slot:modal_buttons="slotProps">
    		<comercio-city-user  
    		model_name_to_attach="client"
    		prop_to_find_model="name"
    		prop_to_set="comercio_city_client"
    		text="Asignar a un cliente ya cargado en el sistema"
    		:placeholder="'Ingrese el nombre del cliente '+slotProps.model.name+' tal como figura en el sistema'"
    		:model="slotProps.model"
    		model_name="buyer"></comercio-city-user>
		</template>
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		ComercioCityUser: () => import('@/components/common/ComercioCityUser')
	},
}
</script>