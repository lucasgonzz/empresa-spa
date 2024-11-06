<template>
	<div>
		<view-component 
		:show_btn_create="false"
		:usar_filtros="false"
		model_name_for_get_models="current_acount"
		v-if="view == 'pagos-de-clientes'"
		model_name="pago_de_cliente">

			<template v-slot:table_right_options="props">
				<!-- <btn-nota-credito
				:nota_credito="props.model"></btn-nota-credito>		 -->		
			</template>
		</view-component>
	</div>
</template> 
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		// BtnNotaCredito: () => import('@/components/comprobantes/components/notas-de-credito/table-buttons/BtnNotaCredito'),
	},
	created() {
		this.$store.dispatch('pago_de_cliente/getModels')
	}
}
</script>