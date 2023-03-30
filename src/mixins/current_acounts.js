export default {
	computed: {
        from_model_name() {
            return this.$store.state.current_acount.from_model_name
        },
        from_model() {
            return this.$store.state.current_acount.from_model
        },
        current_acounts() {
            return this.$store.state.current_acount.models
        },
        selected_current_acounts() {
            return this.$store.state.current_acount.selected
        },
	}
}