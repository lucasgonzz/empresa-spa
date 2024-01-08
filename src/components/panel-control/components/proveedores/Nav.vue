<template>
	<b-row
	v-if="user">
		<b-col
		cols="12"
		class="col-nav">
			<horizontal-nav
			@setSelected="setSelected"
			set_sub_view
			:show_display="false"
			:items="items"></horizontal-nav>
		</b-col>
	</b-row>
</template>
<script>
export default {
	name: 'NavComponentOnline',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []
			items.push({
				name: 'Rendimiento General',
			})
			items.push({
				name: 'Rendimiento por Proveedor',
			})
			return items 
		},
	},
	methods: {
		setSelected(item) {
			
		}
	}
}
</script>