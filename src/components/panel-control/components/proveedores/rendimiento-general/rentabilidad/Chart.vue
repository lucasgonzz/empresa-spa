<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	extends: Bar,
	computed: { 
		current_page() {  
			return this.$store.state.panel_control.provider.rentabilidad.current_page
		},
		order_by() {  
			return this.$store.state.panel_control.provider.rentabilidad.order_by
		},
	},
	mounted() {
		this.setChart()
	},
	watch: {
		current_page() {
			this.setChart()
		},
		order_by() {
			this.setChart()
		},
	},
	data() {
		return {
			per_page: 10,
		}
	},
	methods: {
		setChart() {
			let labels = []
			let procentage_de_rentabilidad = []

			let providers = this.providers_formated

			let inicio = this.current_page * this.per_page
			let fin = inicio + this.per_page
			if (fin > providers.length) {
				fin = providers.length
			}

			if (this.order_by == 'mayor-a-menor') {	
				providers = providers.sort((a, b) => b.total_prices - a.total_prices)
			} else {
				providers = providers.sort((a, b) => a.total_prices - b.total_prices)
			}

			providers = providers.slice(inicio, fin)

			providers.forEach(model => {
				let total_rentabilidad = model.total_prices - model.total_costs
				labels.push(model.name)
				procentage_de_rentabilidad.push(total_rentabilidad * 100 / Number(model.total_prices))
			})		

			let that = this
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Porcentage de Rentabilidad',
						backgroundColor: '#007bff',
						data: procentage_de_rentabilidad,
					},
				],
			}, {
				maintainAspectRatio: false,
				onClick: function (event, elements, chart) {
					let provider = providers[elements[0]._index]
					that.setSelectedProvider(provider)
				},
				tooltips: {
					callbacks: {
						label: function(tooltipItem, data) {
							return Math.round(tooltipItem.yLabel)+'%'
						}
					}
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