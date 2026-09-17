<template>
	<horizontal-nav
	:items="items"
	prop_name="street"
	:set_view="true"
	:show_display="false"></horizontal-nav>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
import sale from '@/mixins/sale'
export default {
	mixins: [sale],
	components: {
		HorizontalNav,
	},
	computed: {
		addresses() {
			return this.$store.state.address.models 
		},
		items() {
			let items = []

			if (this.can('sale.index.addresses.all')) {

				items.push({street: 'todas'})
				this.addresses.forEach(address => {
					items.push(this.countSales(address))
				})

			} else if (this.can('sale.index.addresses.only_your')) {

				let employee_address = this.addresses.find(address => address.id == this.user.address_id)

				if (typeof employee_address != 'undefined') {
					items.push(this.countSales(employee_address))
				}
			}

			return items
		},
	},
	methods: {
		countSales(address) {
			// El nombre visible se le agrega la cantidad de ventas mas abajo; el testid tiene que
			// quedarse con el nombre PELADO, si no cambia en cada corrida (ver horizontal-nav).
			let address_result = {...address, testid: address.street}
			// En modo paginado por fecha el conteo viene del servidor, sobre el día COMPLETO:
			// `this.sales` es solo la página cargada y contarla daría "(25)" en todas las solapas.
			// Sin totales del servidor (API vieja, modo filtrado) se cuenta en el navegador como
			// siempre.
			let cantidad = this.cantidad_del_dia_por_sucursal(address.id)
			if (cantidad === null) {
				cantidad = this.sales.filter(sale => {
					return sale.address_id && sale.address_id == address.id
				}).length
			}
			if (cantidad) {
				address_result.street += ' ('+ cantidad + ')'
			}
			address_result.route_value = address.street
			return address_result
		},
	}
}
</script>