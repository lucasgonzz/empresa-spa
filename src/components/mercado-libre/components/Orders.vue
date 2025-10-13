<template>
	<view-component
	v-if="view == 'pedidos'"
	change_from_dates_option
	:show_btn_delete="false"
	:show_btn_create="false"
	model_name="meli_order">
		
		<template #table_left_options="data">
			<b-button
			@click.stop="crear_venta(data.model)"
			size="sm"
			variant="success"
			v-if="!data.model.sale">
				Crear venta
			</b-button>
			<p
			class="m-b-0"
			v-else>
				Venta N° {{ data.model.sale.num }}
			</p>
		</template>
	</view-component>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	methods: {
		crear_venta(meli_order) {
			if (confirm('¿Seguro que quiere crear una venta en base a este pedido de Mercado Libre?')) {

				this.$store.commit('auth/setMessage', 'Creando venta')
				this.$store.commit('auth/setLoading', true)
				
				this.$api.post('meli-order/create-sale/'+meli_order.id)
				.then(res => {
					this.$store.commit('meli_order/add', res.data.model)
					this.$store.commit('auth/setLoading', false)
					this.$toast.success('Venta creada')
				})
				.catch(err => {
					this.$store.commit('auth/setLoading', false)
					this.$toast.error(err)
				})
			}
		}
	}
}
</script>