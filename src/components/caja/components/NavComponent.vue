<template>
	<b-row
	v-if="user">
		<b-col>
			<horizontal-nav
			:items="items"
			set_view
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
			if (this.can('caja.reports')) {
				items.push({name: 'reportes', action: 'report/getModels'})
			}
			if (this.can('caja.charts')) {
				items.push({name: 'estadisticas', action: 'chart/getModels'})
			} 
			return items
		}
	},
	methods: {
		setSelected(item) {
		},
	}
}
</script>
