<template>
	<div
	v-if="view == 'proveedores'">
    	<current-acounts></current-acounts>

		<!-- <update-prices></update-prices> -->
		
		<view-component 
		model_name="provider"
		show_filter_modal
		show_excel_drop_down
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