<template>
	<div
	v-if="view == 'proveedores'">
    	<current-acounts></current-acounts>

		<!-- <update-prices></update-prices> -->
		
		<!--
			Mision descuentos-proveedor-propagar (4/9/2026): al guardar un proveedor se le pregunta
			si propaga los descuentos a sus articulos. El propio modal decide si aparece o no
			(consulta el preview y se calla si no hay nada que actualizar).
		-->
		<propagar-descuentos ref="propagar_descuentos"></propagar-descuentos>

		<!--
			Mision sincronizar-descuentos-proveedor (17/9/2026): el modal del boton "Sincronizar
			articulos" que vive al lado de "Agregar Descuento", en la tabla de descuentos del
			proveedor.

			No lleva ref ni lo abre nadie desde aca: se abre solo, escuchando en el bus de $root
			el evento que emite HasMany.vue a partir de la clave has_many.extra_button declarada
			en src/models/provider.js. Tiene que ser por el bus y no por un ref porque el boton se
			dibuja adentro del modal del formulario del proveedor, que bootstrap-vue monta en otro
			lugar del arbol: desde alla no hay como llegar a este componente.
		-->
		<sincronizar-articulos></sincronizar-articulos>

		<view-component
		model_name="provider"
		show_filter_modal
		show_excel_drop_down
		@modelSaved="providerGuardado"
		:show_previus_days="false">


			<template v-slot:table_left_options="slotProps">
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
		// UpdatePrices: () => import('@/components/ventas/modals/update-prices/Index'),

		ViewComponent: () => import('@/common-vue/components/view/Index'),
		BtnCurrentAcounts: () => import('@/components/common/BtnCurrentAcounts'),
		ComercioCityUser: () => import('@/components/common/ComercioCityUser'),
		PropagarDescuentos: () => import('@/components/provider/components/providers/PropagarDescuentos'),
		SincronizarArticulos: () => import('@/components/provider/components/providers/SincronizarArticulos'),
	},
	methods: {
		/*
			Mision descuentos-proveedor-propagar (4/9/2026): despues de guardar un proveedor se le
			ofrece propagar sus descuentos a los articulos que ya los tienen copiados.

			La decision de mostrar o no la ventana la toma el modal, que consulta el preview: se
			calla solo si la preferencia de la cuenta esta apagada o si no hay ningun articulo para
			actualizar. Se hace asi y no aca para no pedir el preview dos veces ni duplicar el
			criterio en dos lugares.
		*/
		providerGuardado(model) {
			if (model && model.id && this.$refs.propagar_descuentos) {
				this.$refs.propagar_descuentos.abrir(model)
			}
		},
	},
	created() {
		/*
			El catalogo de proveedores ya no se descarga al iniciar sesion (mision 43, 12/8/2026),
			asi que este listado --que es el ABM de proveedores-- tiene que pedirlo el.

			🔴 Medido en la aplicacion, no deducido: sin esto la tabla dice "No hay Proveedores"
			con 11 proveedores en la base. La tabla de la mision daba por hecho que los cinco
			lugares que usan el store ya lo pedian, y este NO lo hacia: funcionaba solo porque la
			entrada seguia colgada en call_methods.js desde el grupo 332.

			Se pide solo si el store esta vacio (mismo patron que
			panel-control/components/proveedores/Index.vue).
		*/
		if (!this.$store.state.provider.models.length) {
			this.$store.dispatch('provider/getModels')
		}
	},
}
</script>