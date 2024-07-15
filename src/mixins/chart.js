export default {
	methods: {
		get_chart_models_ordenados(module_name, models, prop_to_order) {

			let current_page = this.$store.state.chart[module_name].current_page
			let per_page = this.$store.state.chart[module_name].per_page
			let order_by = this.$store.state.chart[module_name].order_by

			let inicio = current_page * per_page
			let fin = inicio + per_page
			if (fin > models.length) {
				fin = models.length
			}

			if (order_by == 'mayor-a-menor') {	
				models = models.sort((a, b) => b[prop_to_order] - a[prop_to_order])
			} else {
				models = models.sort((a, b) => a[prop_to_order] - b[prop_to_order])
			}

			models = models.slice(inicio, fin)

			return models
		}
	}
}