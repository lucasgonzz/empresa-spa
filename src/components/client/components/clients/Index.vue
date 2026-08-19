<template> 
	<div
	v-if="view == 'clientes'">
		<import></import>

		<view-component
		show_filter_modal
		show_excel_drop_down
		model_name="client">

			<template #options_drop_down_seleccion>
				<btn-pdf></btn-pdf>
			</template>

			<template #options_drop_down_filtro>
				<btn-pdf></btn-pdf>
			</template>

			<template
			v-slot:modal_buttons="slotProps">
	    		<!-- <comercio-city-user  
	    		:model="slotProps.model"
	    		model_name="client"></comercio-city-user> -->

	    		<create-buyer  
	    		:model="slotProps.model"></create-buyer>
			</template>

		<template #horizontal_nav_center>
			<saldos-clientes-filtrados></saldos-clientes-filtrados>
		</template>

			<template v-slot:table_left_options="slotProps">
				<btn-current-acounts
				:model="slotProps.model"
				model_name="client"></btn-current-acounts>

				<!--
					🔴 Va como HERMANO de <btn-current-acounts>, nunca adentro suyo.
					Ese componente es un v-for sobre model.credit_accounts y dibuja un botón por
					moneda (pesos, dólares si el negocio tiene la extensión): metido ahí adentro,
					el de WhatsApp se repetiría una vez por cada cuenta corriente del cliente.
				-->
				<btn-whatsapp-chat
				:phone="slotProps.model.phone"
				:client_id="slotProps.model.id"
				:display_name="slotProps.model.name"></btn-whatsapp-chat>

				<!--
					Tercero de la fila, y también HERMANO y no anidado, por el mismo motivo que
					el de WhatsApp. Se entra por client_id: un cliente del ERP puede tener
					varios compradores en la tienda y la actividad viene sumada entre todos.
				-->
				<btn-actividad-cliente
				:client_id="slotProps.model.id"
				:nombre="slotProps.model.name"></btn-actividad-cliente>
			</template>
		</view-component>

		<!--
			El modal va como HERMANO del <view-component> y fuera del slot: adentro del slot se
			instanciaría una vez por fila de la tabla. Es una sola instancia por vista y el
			botón la alcanza por el id 'actividad-cliente'.
		-->
		<actividad-cliente-modal></actividad-cliente-modal>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnCurrentAcounts: () => import('@/components/common/BtnCurrentAcounts'),
		BtnWhatsappChat: () => import('@/components/common/BtnWhatsappChat'),
		BtnActividadCliente: () => import('@/components/common/BtnActividadCliente'),
		ActividadClienteModal: () => import('@/components/actividad-cliente/Modal'),
		ComercioCityUser: () => import('@/components/common/ComercioCityUser'),
		CreateBuyer: () => import('@/components/client/components/clients/CreateBuyer'),
		SaldosClientesFiltrados: () => import('@/components/client/components/clients/SaldosClientesFiltrados'),
		Import: () => import('@/components/client/components/clients/Import'),
		BtnPdf: () => import('@/components/client/components/clients/BtnPdf'),
	}
}
</script>