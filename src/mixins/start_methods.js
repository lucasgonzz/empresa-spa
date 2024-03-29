import set_employee_vender from '@/mixins/set_employee_vender'
export default {
	mixins: [set_employee_vender],
	methods: {
		startMethods() {
			this.checkUserAppUrl()
			this.setEmployeeVender()
			this.checkAddressCookie()
			this.checkUpdateFeaturesCookie()
			this.getUnconfirmedOrders()
			this.getProviderOrdersDaysToAdvise()
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
	}
}