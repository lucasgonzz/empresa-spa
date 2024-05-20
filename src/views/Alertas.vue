<template>
	<div>

		<horizontal-nav
		set_view
		:show_display="false"
		:items="nav_items"></horizontal-nav>

		<lista-de-alertas-table></lista-de-alertas-table>

	</div>
</template>
<script>
import alert_infos from '@/mixins/alert_infos'
export default {
	mixins: [alert_infos],
	components: {
		ListaDeAlertasTable: () => import('@/components/alertas/components/lista-de-alertas-table/Index'),
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		nav_items() {

			return [
				{
					name: 'Cobros',
					alert: this.ventas_sin_cobrar.length	
				},
				{
					name: 'Pedidos Proveedor',	
					alert: this.provider_order_days_to_advise.length	
				},
				{
					name: 'Pedidos Online',	
					alert: this.unconfirmed_orders.length	
				},
				{
					name: 'Mensajes',	
					alert: this.messages_not_read.length	
				},
			]
		},
		
	},
	methods: {
		clicked(model) {
		}
	}
}
</script>