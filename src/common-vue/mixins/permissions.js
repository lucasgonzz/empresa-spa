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

			if (this.is_admin) {
				return true
			}

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
				/* Antes de mandar a la ruta por defecto, intentar volver al destino original (ver redirectToIntendedRoute) */
				if (this.redirectToIntendedRoute()) {
					return true
				}
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
		redirectToIntendedRoute() {

			/*
				El guard global de router/index.js rebota una ruta privada al login antes de que
				auth/me resuelva, y arma la query redirect=<ruta original> (ver ese archivo). Ese
				redirect no lo consumia nadie, asi que el usuario terminaba en la ruta por defecto
				en vez de en el destino que pidio. Este metodo lo consume: si encuentra un destino
				valido, navega hacia el y devuelve true; si no hay nada que hacer, devuelve false y
				el flujo sigue normal (redirect() a la ruta por defecto).
			*/
			let destino = this.$route.query.redirect

			// sin query redirect, o con un valor que no es un string: no hay nada que consumir
			if (!destino || typeof destino != 'string') {
				return false
			}

			// solo rutas internas de esta SPA: si no empieza con "/" no es una ruta valida
			if (destino.charAt(0) != '/') {
				return false
			}

			// "//dominio.com" es una URL absoluta (protocol-relative): evita que se use el
			// sistema como trampolin hacia un sitio externo
			if (destino.charAt(1) == '/') {
				return false
			}

			// no rebotar contra si mismo
			if (destino == '/login' || destino.indexOf('/login?') == 0) {
				return false
			}

			// replace (no push): el rebote al login es un accidente tecnico, no tiene que quedar
			// en el historial del navegador
			this.$router.replace(destino).then(() => {
				this.$nextTick(() => {
					// el destino guardado puede ser una ruta para la que el usuario no tenga
					// permiso: se re-chequea con $route ya actualizado (entra por la rama else,
					// porque la ruta ya no es /login, y cae en redirect() si no hay permiso)
					this.checkPermissionForCurrentRoute()
				})
			}).catch(() => {})

			return true
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