import set_employee_vender from '@/mixins/set_employee_vender'
export default {
	mixins: [set_employee_vender],
	methods: {
		startMethods() {
			console.log('llamando startMethods')

			this.checkUserAppUrl()
			
			this.setEmployeeVender()
			
			this.checkAddressCookie()
			
			// this.checkUpdateFeaturesCookie()
			
			this.getUnconfirmedOrders()
			
			this.getProviderOrdersDaysToAdvise()
			
			this.get_ventas_sin_cobrar()

			this.get_deposit_movements_en_curso()

			this.get_buyers_and_set_messages_not_read()

			this.get_problemas_al_facturar()

			this.get_articles_por_defecto()

			this.get_ultimos_articulos_actualizados()

			// Llamo cada 1 minuto a peidos online
			this.escuchar_orders()
		},
		escuchar_orders() {
			if (this.owner.online) {

				setInterval(() => {
					if (this.$route.name != 'online') {
						
						this.$store.dispatch('order/getUnconfirmedModels')
					}
				}, 60000)
			}
		},
		get_ultimos_articulos_actualizados() {
			if (!this.download_articles) {

				this.$api.get('articles-ultimos-actualizados')
				.then(res => {
					this.$store.commit('article/addModels', res.data.models)
				})
				.catch(err => {
					this.$toast.error('error al cargar ultimos articulos actualizados')
				})
			}
		},
		get_articles_por_defecto() {
			if (this.hasExtencion('articles_default_in_vender') 
				&& !this.owner.download_articles) {

				this.$api.get('articles-por-defecto')
				.then(res => {
					console.log('articles-por-defecto:')
					console.log(res.data.models)
					this.$store.commit('article/addModels', res.data.models)
				})
				.catch(err => {
					this.$toast.error('error al cargar articulos por defecto')
				})
			}
		},
		get_deposit_movements_en_curso() {
			this.$store.dispatch('deposit_movement/en_curso/getModels')
		},
		get_ventas_sin_cobrar() {
			if (this.owner.dias_alertar_empleados_ventas_no_cobradas) {
				this.$store.dispatch('sale/ventas_sin_cobrar/getModels')
			}
		},
		checkUserAppUrl() {
			console.log('checkUserAppUrl')
			console.log(location.href)
			if (this.owner.app_url && this.owner.app_url != location.href) {
				alert('Su empresa tiene que ingresar desde el siguiente LINK: '+this.owner.app_url+'. Precio ACEPTAR para ser redirigido.')
				console.log('cerrando sesion')
				this.$store.dispatch('auth/logout')
				setTimeout(() => {
        			location.replace(this.owner.app_url)
				}, 2000)
			}
		},
		checkAddressCookie() {
			let cookie = this.$cookies.get('address_id')
			console.log('address_id cookie:')
			console.log(cookie)
			if (cookie) {
				this.$store.commit('vender/setAddressId', cookie)
			}
		},
		checkUpdateFeaturesCookie() {
			let cookie = this.$cookies.get('update_features_watched')
			console.log(cookie)
			if (cookie === null) {
				this.$cookies.set('update_features_watched', false, -1)
				cookie = this.$cookies.get('update_features_watched')
			}
			if (cookie == 'false') {
				this.$store.dispatch('update_feature/getModels')
				setTimeout(() => {
					this.$bvModal.show('update-features')
				}, 3000)
			} 
		},
		getUnconfirmedOrders() {
			if (this.has_online) {
				this.$store.dispatch('order/getUnconfirmedModels')
			}
		},
		getProviderOrdersDaysToAdvise() {
			this.$store.dispatch('provider_order/getDaysToAdvise')
		},
		get_buyers_and_set_messages_not_read() {
			console.log('get_buyers_and_set_messages_not_read')
			this.$store.dispatch('buyer/getModels')
			.then(() => {
				console.log('llegaron los buyers, mandando setChatsToShow')
				this.$store.commit('message/setChatsToShow')
				console.log('setChatsToShow mandado')
			})
		},
		get_problemas_al_facturar() {
			this.$store.dispatch('afip_ticket/get_problemas_al_facturar')
		}
	}
}