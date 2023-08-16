<template>
	<b-row
	v-if="authenticated">
		<b-col>
			<horizontal-nav
			v-if="has_views"
			:show_display="false"
			@setSelected="setSelectedView"
			set_view
			:items="views"></horizontal-nav>

			<horizontal-nav
			:show_display="false"
			@setSelected="setSelected"
			:set_view="has_views ? false : true"
			:set_sub_view="has_views ? true : false"
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
		has_views() {
			return typeof this.models == 'undefined'
		},
		views() {
			let views = []
			this.abm_views.forEach(view => {
				views.push({
					name: view.view,
				})
			})
			return views 
		},
		items() {
			let items = []
			if (this.has_views) {
				this.abm_views.forEach(view => {
					if (this.view == this.routeString(view.view)) {
						view.models.forEach(model => {
							if (this.checkModel(model)) {
								let item = {
									call_models: model,
								}
								if (this.idiom == 'es') {
									item.nombre = this.plural(model)
								} else {
									item.name = this.plural(model)
								}
								items.push(item)
							}
						})
					}
				})
			} else {
				this.models.forEach(model => {
					if (this.checkModel(model)) {
						let item = {
							call_models: model,
						}
						if (this.idiom == 'es') {
							item.nombre = this.plural(model)
						} else {
							item.name = this.plural(model)
						}
						items.push(item)
					}
				})
			}
			return items
		}
	},
	methods: {
		setSelectedView(item) {
			let view = this.abm_views.find(_view => this.routeString(_view.view) == this.view)
			let model_name = view.models[0]
			console.log('model_name: '+model_name)
			this.$router.push({params: {sub_view: (this.routeString(this.plural(model_name)))}})
			this.selected_model = model_name
		},
		checkModel(model, items) {
			return (!model.check_permissions || typeof model.check_permissions == 'undefined' || this.can(model.replaceAll(' ', '_')+'.index')) 
		},
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