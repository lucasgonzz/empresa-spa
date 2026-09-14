<template>
	<!--
		Sin b-row/b-col desde la misión 32: este nav ahora vive adentro de una fila flex junto a los
		filtros de facturación (ver address-afip-ticket-ventas-cobradas-nav/Index.vue), y los
		márgenes negativos de una b-row rompían esa fila. El margen inferior también se fue: lo pone
		la fila que lo contiene, una sola vez para los dos.
	-->
	<div
	v-if="show"
	class="employee-nav">
		<horizontal-nav
		:items="items"
		set_sub_view
		:show_display="false"></horizontal-nav>
	</div>
</template>
<script>
import moment from 'moment'

import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
import sale from '@/mixins/sale' 
export default {
	name: 'EmployeeNav',
	mixins: [sale],
	components: {
		HorizontalNav,
	},
	computed: {
		employees() {
			return this.$store.state.employee.models
		},
		selected_employee() {
			return this.$store.state.sale.selected_employee
		},
		show() { 
			return this.employees.length
		},
		items() {
			let items = []
			let text 

			if (this.can('sale.index.employees.all')) {
				items.push({name: 'todos'})
				if (this.is_owner) {
					items.push(this.countSales(this.user, false))
				}
				this.employees.forEach(employee => {
					items.push(this.countSales(employee))
				})

			} else if (this.can('sale.index.employees.only_your')) {

				items.push(this.countSales(this.user))

			}

			return items
		},
		selected_address() {
			return this.$store.state.sale.selected_address
		},
	},
	methods: {
		countSales(user, is_employee = true) {
			let user_result = {...user}
			// Mismo criterio que AddressNav: en modo paginado por fecha el conteo lo da el servidor
			// sobre el día completo (`this.sales` es una sola página); sin totales del servidor se
			// cuenta en el navegador como siempre. `is_employee = false` es la solapa del dueño:
			// las ventas sin empleado.
			let cantidad = is_employee
				? this.cantidad_del_dia_por_empleado(user.id)
				: this.cantidad_del_dia_sin_empleado()
			if (cantidad === null) {
				if (is_employee) {
					cantidad = this.sales.filter(sale => {
						return sale.employee_id && sale.employee_id == user.id
					}).length
				} else {
					cantidad = this.sales.filter(sale => {
						return !sale.employee_id
					}).length
				}
			}
			if (cantidad) {
				user_result.name += ' ('+ cantidad + ')'
			}
			user_result.route_value = user.name
			return user_result
		},
	}
}
</script>
<style lang="sass">
// El min-width: 0 va también acá adentro: el que tiene que poder encogerse es la pista del nav, no
// solo el contenedor. Sin esto, el `width: max-content` que arma la lista de empleados empuja igual
// aunque el padre ya haya cedido.
.employee-nav
	min-width: 0

	.horizontal-nav
		min-width: 0
</style>