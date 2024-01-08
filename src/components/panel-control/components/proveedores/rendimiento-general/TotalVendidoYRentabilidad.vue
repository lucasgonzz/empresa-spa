<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	extends: Bar,
	computed: { 
		models() {  
			return this.$store.state.panel_control.models
		},
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {
			let labels = []
			let rentabilidad = []
			let total_vendido = []

			let providers = this.providers
			providers = providers.filter(Boolean)


			providers.forEach(model => {
				labels.push(model.name)
				rentabilidad.push(model.total_prices - model.total_costs) 
				total_vendido.push(model.total_prices) 
			})		

			let that = this
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Total Vendido',
						backgroundColor: '#333',
						data: total_vendido,
					},
					{
						label: 'Rentabilidad',
						backgroundColor: '#007bff',
						data: rentabilidad,
					},
				],
			}, {
				maintainAspectRatio: false,
				onClick: function (event, elements, chart) {
					let provider = providers[elements[0]._index]
					that.setSelectedProvider(provider)
				}
			})
		},
		setSelectedProvider(provider) {
			this.$router.push({params: {sub_view: 'rendimiento-por-proveedor'}})
			this.setProviderArticles(provider)
		}
	},
}
</script>