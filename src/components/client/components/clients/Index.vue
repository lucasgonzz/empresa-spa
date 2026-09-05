<template> 
	<div
	v-if="view == 'clientes'">
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

			<template v-slot:limites_credito="slotProps">
				<limites-de-credito :model="slotProps.model"></limites-de-credito>
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

				<!--
					Cuarto de la fila, HERMANO y no anidado, por el mismo motivo que los dos de
					arriba.

					🔴 `@click.stop` NO ES DECORATIVO: el <tr> entero tiene su propio @click que
					abre el modal de edición del cliente (`common-vue/components/display/table/Tr.vue`).
					Sin `.stop` el operador termina con el modal de puntos Y el de edición
					encima. Es la misma razón por la que lo llevan sus tres vecinos.

					🔴 El gate es `hasExtencion('puntos_clientes')`, la MISMA extensión con la
					que el backend gatea las rutas del módulo: sin ella los endpoints contestan
					403 y el botón sería un click muerto.

					El botón va escrito acá y no en un componente propio de `common/` porque esa
					carpeta no es de esta unidad de trabajo. Si mañana el mismo acceso hace falta
					en otra pantalla, ahí sí conviene sacarlo a un `BtnPuntosCliente.vue`.
				-->
				<b-button
				v-if="hasExtencion('puntos_clientes')"
				class="m-l-15"
				variant="outline-warning"
				title="Ver los puntos de este cliente"
				@click.stop="abrir_puntos(slotProps.model)">
					<i class="bi bi-star m-r-5"></i>
					Puntos
				</b-button>
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
		LimitesDeCredito: () => import('@/components/client/components/clients/LimitesDeCredito'),
		SaldosClientesFiltrados: () => import('@/components/client/components/clients/SaldosClientesFiltrados'),
		BtnPdf: () => import('@/components/client/components/clients/BtnPdf'),
	},
	methods: {
		/**
		 * Abre el modal de puntos del cliente de la fila.
		 *
		 * 🔴 Va por el bus de $root y no por una prop: el modal se monta en `views/Client.vue`,
		 * como hermano de este componente, o sea en otro subárbol. Es el mismo mecanismo que ya
		 * usa el repo para cruzar subárboles (`vender:expand-stage1`,
		 * `open-change-provider-modal`).
		 *
		 * El pedido de datos NO se dispara acá: lo hace el propio modal, que es el único que
		 * sabe cómo se carga esa pantalla. Igual que `common/BtnActividadCliente.vue`.
		 *
		 * @param {Object} model - el cliente de la fila
		 */
		abrir_puntos(model) {
			this.$root.$emit('puntos-cliente:abrir', {
				client_id: model.id,
				nombre: model.name,
			})
		},
	},
}
</script>