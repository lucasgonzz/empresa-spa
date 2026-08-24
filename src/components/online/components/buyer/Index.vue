<template>
	<!--
		El v-if se movió del <view-component> a este wrapper (igual que hace
		client/components/clients/Index.vue) para poder colgar el modal de actividad como
		hermano de la tabla. Adentro del slot se instanciaría una vez por fila.
	-->
	<div
	v-if="view == 'clientes'">
		<view-component
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

			<!--
				🔴 Acá se entra por buyer_id y NO por client_id: el modelo de la fila es un
				Buyer, y un Buyer no es un Client (el vínculo comercio_city_client_id es
				opcional y manual). Ésta es la única puerta que alcanza a los compradores que
				todavía no están asociados a ningún cliente del sistema.
			-->
			<template v-slot:table_left_options="slotProps">
				<btn-actividad-cliente
				:buyer_id="slotProps.model.id"
				:nombre="slotProps.model.name"></btn-actividad-cliente>
			</template>
		</view-component>

		<actividad-cliente-modal></actividad-cliente-modal>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		ComercioCityUser: () => import('@/components/common/ComercioCityUser'),
		BtnActividadCliente: () => import('@/components/common/BtnActividadCliente'),
		ActividadClienteModal: () => import('@/components/actividad-cliente/Modal'),
	},
}
</script>
