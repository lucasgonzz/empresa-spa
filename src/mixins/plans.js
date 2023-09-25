export default {
	computed: {
		loading() {
			return this.$store.state.plan.loading 
		},
		plans() {
			return this.$store.state.plan.models 
		},
		plan_features() {
			return this.$store.state.plan_feature.models 
		},
	}
}