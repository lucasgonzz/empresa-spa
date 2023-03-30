<template>
	<b-row
	v-if="show">
		<b-col
		cols="12">
			<horizontal-nav
			:items="items"
			prop_name="street"
			:set_view="true"
			:show_display="false"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
import moment from 'moment'

import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
export default {
	name: 'AddressNav',
	components: {
		HorizontalNav,
	},
	computed: {
		show() {
			return this.addresses.length >= 2
		},
		sales() {
			return this.$store.state.sale.models 
		},
		addresses() {
			return this.$store.state.address.models 
		},
		items() {
			let items = []
			items.push({street: 'todas'})
			this.addresses.forEach(address => {
				items.push(this.countSales(address))
			})
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