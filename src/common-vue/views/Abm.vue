<template>
	<b-row
	v-if="authenticated">
		<b-col>
			<horizontal-nav
			:show_display="false"
			@setSelected="setSelected"
			set_view
			:items="items"></horizontal-nav>
			
			<view-component
			show_filter_modal
			:model_name="selected_model"></view-component>
		</b-col>
	</b-row>
</template>
<script>
import abm from '@/mixins/abm'
import routes from '@/router/routes'
export default {
	mixins: [abm],
	components: {
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	data() {
		return {
			selected_model: '',
		}
	},
	computed: {
		items() {
			let items = []
			this.models.forEach(model => {
				if (!model.check_permissions || typeof model.check_permissions == 'undefined' || this.can(model.replaceAll(' ', '_')+'.index')) {
					items.push({
						name: this.plural(model),
						call_models: model,
					})
				}
			})
			return items
		}
	},
	methods: {
		setSelected(item) {
			this.selected_model = item.call_models
		},
		setView() {
			let abm_route = routes.find(route => {
				return route.name == 'abm'
			})
			console.log('se seteo selected_model con '+abm_route.params.model_name )
			this.selected_model = abm_route.params.model_name 
		}
	},
	created() {
		this.setView()
	}
}
</script>