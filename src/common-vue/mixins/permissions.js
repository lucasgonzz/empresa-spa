import routes from '@/router/routes'
export default {
	methods: {
		getRouteName(route) {
			if (route.name) {
				return route.name 
			}
			if (route.model_name) {
				return route.model_name 
			}
		},
		can(permission_slug) {
			if (!this.authenticated) {
				return false
			}
			let has_permission = false
		    if (this.is_owner) {
		        has_permission = true
		    }
		    if (this.user.admin_access) {
		        has_permission = true
		    }
			if (!has_permission) {
				has_permission = this.hasPermissionTo(permission_slug)
			}
			// console.log('permiso para '+permission_slug+': '+has_permission)
			return has_permission
		},
		hasPermissionTo(permission_slug) {
			let has_permission = false
			this.user.permissions.forEach(permission => {
	            if (permission.slug == permission_slug) {
	                has_permission = true
	            }
	        })
	        return has_permission
		},
		checkPermissionForCurrentRoute() {
			if (this.$route.path == '/' || this.$route.path == '/login' || (this.use_home_page && this.route_name == 'home')) {
				// console.log('estaba en la ruta /')
				this.redirect()
			} else {
				// console.log('por llamar getRoutePermissionSlug con la ruta: '+this.$route.path)
				let route_name = this.getRoutePermissionSlug()
				if (this.can(route_name)) {
					return true 
				} else {
					this.redirect()
				}
			}
		},
		redirect() {
			// console.log('entro a redirect')
			let route 
			let route_to_redirect = null
			for (var i = 0; i < routes.length; i++) {
				route = routes[i]
				// console.log('viendo permiso para la ruta '+this.getRouteName(route)+', permission_slug: '+route.can) 
				if (route.check_is_owner && (this.is_owner || this.user.admin_access)) {
					route_to_redirect = route
					break
				} else if (route.can) {
					if (this.can(route.can)) {
						// console.log('tiene permiso para '+route.can)
						route_to_redirect = route
						break
					}
				} else {
					// console.log('la ruta no necesita permiso')
					route_to_redirect = route
					break
				} 
			}
			if (route_to_redirect) {
				if (route_to_redirect.params) {
					this.$router.push({name: this.getRouteName(route_to_redirect), params: route_to_redirect.params})
				} else {
					this.$router.push({name: this.getRouteName(route_to_redirect)})
				}
			} else {
				// console.log('NO TIENE PERMISO PARA NINGUNA RUTA')
			}
		},
		getRoutePermissionSlug(route_name = null) {
			if (route_name == 'abm') {
				return this.view+'.index' 
			}
			if (!route_name) {

				// let finded_route = routes.find(route => {
				// 	return this.getRouteName(route) == this.route_name 
				// })

				if (this.selected_route) {
					return this.selected_route.can
				}
				return null
			}
		}
	}
}