export default {
	computed: {
		plans() {
			return this.$store.state.plan.models 
		},
		plan_features() {
			return this.$store.state.plan_feature.models 
		},
	}
}