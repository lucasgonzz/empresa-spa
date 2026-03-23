<template>
	<b-row
	v-if="user">
		<b-col>
			<horizontal-nav
			:items="items"
			set_view
			:show_display="false"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
import sale_por_estado from '@/mixins/sale_por_estado'
export default {
	mixins: [sale_por_estado],
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []

			this.$store.state.sale_status.models.forEach(sale_status => {

				let sales = this.get_sales_from_status(sale_status)

				items.push({
					name: sale_status.name,
					alert: sales.length
				})
			})

			return items
		}
	},
	created() {
		
		let sale_status = this.$store.state.sale_status.models[0]

		if (typeof sale_status != 'undefined') {

			this.$router.push({name: this.route_name, params: {view: this.routeString(sale_status.name)}})
		}
	}
}
</script>
