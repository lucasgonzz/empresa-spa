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
			let address_result = {...address}
			let sales
			sales = this.sales.filter(sale => {
				return sale.address_id && sale.address_id == address.id 
			})
			if (sales.length) {
				address_result.street += ' ('+ sales.length + ')'
			}
			address_result.route_value = address.street
			return address_result
		},
	}
}
</script>