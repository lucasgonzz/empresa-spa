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
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	name: 'NavComponentOnline',
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
	},
	computed: {
		items() {
			let items = []
			items.push({
				name: 'proveedores',
			})
			return items 
		},
		loading() {
			return this.$store.state.panel_control.loading
		},
	},
	watch: {
		loading() {
			console.log('watch loading: '+this.loading)
			if (!this.loading) {
				this.setProvidersFormated()
			}
		},
	},
	methods: {
		setSelected(item) {
			if (item.name == 'proveedores') {
				this.$store.dispatch('panel_control/getModels', 12)
			}
		},
	}
}
</script>