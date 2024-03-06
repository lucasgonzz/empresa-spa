import moment from 'moment'
import routes from '@/router/routes'
export default {
	computed: {
        show_nav() {
            return this.authenticated && this.route_name != 'login' && this.route_name != 'passwordReset'
        },
        selected_route() {
        	return routes.find(route => {
        		return this.getRouteName(route) == this.route_name
        	})
        }
	},
	methods: {
        setConfig(config_model_name) {
            this.setModel(this.$store.state[config_model_name].models[0], config_model_name)
            this.$bvModal.show(config_model_name)
        },
		showRoute(route) {
			// console.log('--------------')
			let show = true 
			if (route.not_show) {
				return false
			}
			if (route.check_is_owner) {
				// console.log('check_is_owner para la ruta '+this.getRouteName(route))
				show = this.is_owner || this.user.admin_access
			}
			if (show && route.can) {
				if (typeof route.can == 'object') {
					// console.log('can array para la ruta '+this.getRouteName(route))
					show = false 
					route.can.forEach(_can => {
						if (!show) {
							show = this.can(_can)
						}
					})
				} else {
					// console.log('can para la ruta '+this.getRouteName(route))
					show = this.can(route.can)
				}
			}
			if (show && route.if_has_extencion) {
				if (typeof route.if_has_extencion == 'string') {
					// console.log('hasExtencion para la ruta '+this.getRouteName(route))
					show = this.hasExtencion(route.if_has_extencion)
				} else {
					// console.log('if_has_extencion array en '+this.getRouteName(route))
					route.if_has_extencion.forEach(extencion => {
						if (!this.hasExtencion(extencion)) {
							show = false
						}
					})
				}
			}
			return show 
		},
		routeText(route) {
			if (route.text) {
				return route.text 
			}
			return this.plural(route.model_name)
		},
		setRoute(route) {
			if (route.function) {
				this[route.function]()
			} else if (route.model_name) {
				let models = this.$store.state[route.model_name].models 
				if (!models.length && (!this.is_mobile || this.downloadOnMobile(route.model_name)) && (route.model_name != 'article' || this.download_articles)) {
					this.$store.dispatch(route.model_name+'/getModels')
					// console.log('No tiene models, llamando getModels')
				} 
				if (this.route_name == route.model_name) {
					this.$store.dispatch(route.model_name+'/getModels')
					if (this.$store.state[route.model_name].from_dates) {
						this.$store.commit(route.model_name+'/setFromDate', moment().format('YYYY-MM-DD'))
						this.$store.commit(route.model_name+'/setUntilDate', '')
					}
					// console.log('Ya estaba en la ruta, llamando getModels')
				} 
				if (this.route_name != route.model_name) {
					// console.log('No estaba en la ruta, redirigiendo')
					this.toRoute(route)
				} 
			} else {
				// console.log('Solo redirigiendo')
				this.toRoute(route)
			}
		},
		toRoute(route) {
			// console.log(route)
			let route_name = this.getRouteName(route)
			if (route_name == this.route_name) {
				return
			}
			if (route.params) {
				this.$router.push({name: route_name, params: route.params})
			} else {
				// console.log('llamando a '+route_name)
				this.$router.push({name: route_name})
			}
		},
		isActiveRoute(route) {
			if (this.route_name == this.getRouteName(route)) {
				return 'active-item'
			}  
			return ''
		},
		getRouteName(route) {
			if (route.model_name && typeof route.name == 'undefined') {
				return route.model_name
			} 
			return route.name
		},
		logout() {
			this.$store.dispatch('auth/logout')
			.then(() => {
				require('@/mixins/call_methods').default.forEach(model_name => {
					this.$store.commit(model_name+'/setModels', [])
				}) 
			})
		},
		toLogin() {
			this.$router.push({name: 'Login'})
		},
		toConfiguration() {
			this.$router.push({name: 'configuration', params: {view: 'general'}})
		}
	}
}