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
			<!--
				Vínculo del comprador con un cliente del sistema (misión vincular-comprador-desde-pedidos,
				24/9/2026). Reemplaza al campo "Ingrese el nombre del cliente tal como figura en el
				sistema" (`ComercioCityUser`, que buscaba por igualdad exacta y tomaba el primero de varios
				homónimos): el botón abre el modal de vincular, montado una sola vez en views/Online.vue,
				donde se ven todas las coincidencias y se elige por id.
			-->
			<template
			v-slot:modal_buttons="slotProps">
				<vinculo-del-comprador
				:model="slotProps.model"></vinculo-del-comprador>
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
// Import estático: es un bloque de unas pocas líneas dentro del modal, y con uno diferido aparecería
// un instante después de abrirse el formulario.
import VinculoDelComprador from '@/components/online/components/vincular-comprador/VinculoDelComprador'

export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		VinculoDelComprador,
		BtnActividadCliente: () => import('@/components/common/BtnActividadCliente'),
		ActividadClienteModal: () => import('@/components/actividad-cliente/Modal'),
	},
}
</script>
