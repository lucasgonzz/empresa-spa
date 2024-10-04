export default {
	computed: {
		font_size() {
			return this.$store.state.reportes.font.font_size
		},
	},
	watch: {
		font_size() {
			this.setChart()
		}
	}
}