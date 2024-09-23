<template>
	<b-row>
		<b-col>
			<horizontal-nav
			:items="items"
			set_sub_view
			:show_display="false"
			@setSelected="setSelected"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []
			if (this.is_owner || this.is_admin) {
				items.push({
					name: 'Todos',
					route_value: 'todos'
				})
				this.$store.state.employee.models.forEach(employee => {
					items.push({
						name: employee.name,
						route_value: employee.id
					})
				})
			} else {
				items.push({
					name: this.user.name,
					route_value: this.user.id
				}) 
			}
			console.log('items')
			console.log(items)
			return items
		}
	},
	methods: {
		setSelected(item) {
			console.log(item)
			this.$store.commit('report/setEmployeeId', item.route_value)
			this.$store.dispatch('report/getModels')
		},
	}
}
</script>
