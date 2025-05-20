<template>
	<div
	v-if="view == 'vendedores'">

		<has-many
		model_name="seller_commission">
			<template v-slot:default="props">
				<button-delete
				:model="props.model"></button-delete>
			</template>
			<template v-slot:footer_buttons>
				<button-pago></button-pago>
			</template>
		</has-many>

		<saldo-inicial></saldo-inicial>
		<pago></pago>

		<view-component
		show_filter_modal
		model_name="seller">
			<template v-slot:table_left_options="slotProps">
				<b-button
				variant="success"
				@click.stop="showSellerComissions(slotProps.model)">
					Comisiones
				</b-button>
			</template>
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		HasMany: () => import('@/common-vue/components/has-many/Index'),
		ButtonDelete: () => import('@/components/client/components/sellers/ButtonDelete'),
		ButtonPago: () => import('@/components/client/components/sellers/ButtonPago'),
		SaldoInicial: () => import('@/components/client/modals/sellers/SaldoInicial'),
		Pago: () => import('@/components/client/modals/sellers/Pago'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	methods: {
		showSellerComissions(model) {
			this.$store.commit('seller_commission/setSelectedModel', model)
			this.$store.dispatch('seller_commission/getModels')
			this.$bvModal.show('Comisiones de vendedor')
		},
	}
}
</script>