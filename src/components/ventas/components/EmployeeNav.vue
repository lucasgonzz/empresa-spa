<template>
	<b-row
	v-if="show">
		<b-col
		cols="12">
			<horizontal-nav
			class="m-b-15"
			:items="items"
			set_sub_view
			:show_display="false"></horizontal-nav>
		</b-col>
	</b-row>
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
			let sales
			if (is_employee) {
				sales = this.sales.filter(sale => {
					return sale.employee_id && sale.employee_id == user.id 
				})
			} else {
				sales = this.sales.filter(sale => {
					return !sale.employee_id
				})
			}
			if (sales.length) {
				user_result.name += ' ('+ sales.length + ')'
			}
			user_result.route_value = user.name
			return user_result
		},
	}
}
</script>