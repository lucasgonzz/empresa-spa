export default {
	methods: {
		startMethods() {
			if (!this.is_owner) {
				this.$store.commit('vender/setEmployeeId', this.user.id)
			} else {
				this.$store.commit('vender/setEmployeeId', 0)
			}
			this.checkUpdateFeaturesCookie()
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
	}
}