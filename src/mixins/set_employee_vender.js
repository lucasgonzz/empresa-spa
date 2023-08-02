export default {
	methods: {
		setEmployeeVender() {
			if (!this.is_owner) {
				this.$store.commit('vender/setEmployeeId', this.user.id)
			} else {
				this.$store.commit('vender/setEmployeeId', 0)
			}
		},
	}
}