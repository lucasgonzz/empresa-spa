<template>
	<b-row
	v-if="user">
		<b-col
		cols="12"
		class="col-nav">
			<horizontal-nav
			@setSelected="setSelected"
			set_view
			:show_display="false"
			:items="items"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
export default {
	name: 'MeLiNavComponent',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		/*
			Solapas del módulo (misión mercado-libre-integracion, 27/10/2026).

			"Cuenta" es nueva y va primera: ahí se conecta la cuenta y se ve la reputación. Los
			nombres de las otras pasaron a castellano llano, pero cada una conserva su `route_value`
			(y su `testid`) de siempre: la solapa activa vive en la URL (`/mercado-libre/:view`) y
			cada componente de solapa se muestra con `v-if="view == '<route_value>'"`, así que
			cambiar el nombre visible sin fijar el valor rompía la solapa y cualquier enlace guardado.
		*/
		items() {
			let items = [
				{
					name: 'Cuenta',
					route_value: 'cuenta',
					testid: 'cuenta',
				},
				{
					name: 'Pedidos',
					route_value: 'pedidos',
					testid: 'pedidos',
					action: 'meli_order/getModels',
				},
				{
					name: 'Publicaciones (salientes)',
					route_value: 'sinc-articulo-salientes',
					testid: 'sinc-articulo-salientes',
					action: 'sync_to_meli_article/getModels',
				},
				{
					name: 'Importar artículos de ML',
					route_value: 'sinc-articulo-entrantes',
					testid: 'sinc-articulo-entrantes',
					action: 'sync_from_meli_article/getModels',
				},
				{
					name: 'Importar pedidos de ML',
					route_value: 'sinc-pedido-entrantes',
					testid: 'sinc-pedido-entrantes',
					action: 'sync_from_meli_order/getModels',
				},
			]
			return items
		},
	},
	methods: {
		// La barra ya cambia la vista y dispara la `action` de cada solapa: no hay nada más que hacer
		setSelected() {
		}
	}
}
</script>
