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
			:check_permissions="false"
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
				 
				if (view.if_has_extencion) {
					if (this.hasExtencion(view.if_has_extencion)) {

						views.push({
							name: view.view,
						})
					}
				} else {

					views.push({
						name: view.view,
					})
				}
				
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
			this.$router.push({params: {sub_view: (this.routeString(this.plural(model_name)))}})
			this.selected_model = model_name
		},
		checkModel(model, items) {
			return (!model.check_permissions || typeof model.check_permissions == 'undefined' || this.can(model.replaceAll(' ', '_')+'.index')) 
		},
		setSelected(item) {
			this.selected_model = item.call_models
		},
		/**
		 * Sincroniza `selected_model` con la URL (/abm/:view/:sub_view) o con el default del menú.
		 * Antes siempre se usaba routes.js (category), ignorando params al entrar desde un router-link.
		 */
		setView() {
			var route_view = this.$route.params.view
			var route_sub_view = this.$route.params.sub_view

			if (route_view && route_sub_view) {
				var resolved = this.resolveSelectedModelFromRoute(route_view, route_sub_view)
				if (resolved) {
					this.selected_model = resolved
					return
				}
			}

			if (route_view && !route_sub_view) {
				var first_in_view = this.firstModelInView(route_view)
				if (first_in_view) {
					this.selected_model = first_in_view
					return
				}
			}

			var abm_route = routes.find(function (r) {
				return r.name == 'abm'
			})
			if (abm_route && abm_route.params && abm_route.params.model_name) {
				this.selected_model = abm_route.params.model_name
			}
		},

		/**
		 * Obtiene el nombre interno del modelo cuyo plural en ruta coincide con sub_view.
		 *
		 * @param {string} route_view Valor de $route.params.view (ej. ventas).
		 * @param {string} route_sub_view Valor de $route.params.sub_view (ej. remitentes).
		 * @returns {string|null} model_name o null.
		 */
		resolveSelectedModelFromRoute(route_view, route_sub_view) {
			var self = this
			var i
			var j
			for (i = 0; i < self.abm_views.length; i++) {
				var v = self.abm_views[i]
				if (v.if_has_extencion && !self.hasExtencion(v.if_has_extencion)) {
					continue
				}
				if (self.routeString(v.view) !== route_view) {
					continue
				}
				for (j = 0; j < v.models.length; j++) {
					var model = v.models[j]
					if (!self.checkModel(model)) {
						continue
					}
					if (self.routeString(self.plural(model)) === route_sub_view) {
						return model
					}
				}
			}
			return null
		},

		/**
		 * Primer modelo permitido dentro de la pestaña ABM indicada por view (sin sub_view en la URL).
		 *
		 * @param {string} route_view Segmento view de la ruta.
		 * @returns {string|null}
		 */
		firstModelInView(route_view) {
			var self = this
			var i
			var j
			for (i = 0; i < self.abm_views.length; i++) {
				var v = self.abm_views[i]
				if (v.if_has_extencion && !self.hasExtencion(v.if_has_extencion)) {
					continue
				}
				if (self.routeString(v.view) !== route_view) {
					continue
				}
				for (j = 0; j < v.models.length; j++) {
					var model = v.models[j]
					if (self.checkModel(model)) {
						return model
					}
				}
			}
			return null
		},
	},
	watch: {
		'$route.params.view'() {
			this.setView()
		},
		'$route.params.sub_view'() {
			this.setView()
		},
	},
	created() {
		this.setView()
	}
}
</script>