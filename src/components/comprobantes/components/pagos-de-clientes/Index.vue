<template>
	<div>
		<view-component 
		:show_btn_create="false"
		:usar_filtros="false"
		:models_to_show="models_to_show"
		show_models_if_empty
		:show_btn_save="false"
		:show_btn_delete="false"
		model_name_for_get_models="current_acount"
		v-if="view == 'pagos-de-clientes'"
		model_name="pago_de_cliente">
			<template #body>
				<address-nav></address-nav>

				<total></total>
			</template>

			<template #table_right_options="props">
				<print-btn
				:model="props.model"></print-btn>
			</template>
		</view-component>
	</div>
</template> 
<script>
import mixin from '@/mixins/comprobantes/pagos_de_clientes'
export default {
	mixins: [mixin],
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		AddressNav: () => import('@/components/comprobantes/components/pagos-de-clientes/AddressNav'),
		Total: () => import('@/components/comprobantes/components/pagos-de-clientes/Total'),
		PrintBtn: () => import('@/components/comprobantes/components/common/PrintBtn'),
	},
	created() {
		this.$store.dispatch('pago_de_cliente/getModels')
		this.$router.push({params: {sub_view: 'todas'}})
	},
}
</script>