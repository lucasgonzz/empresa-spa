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
			let data = []
			console.log(this.models)
			let providers = this.providers_formated
			providers.forEach(model => {
				labels.push(model.name)
				data.push(model.unidades_vendidas)
			})		
			let that = this
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Unidades vendidas',
						backgroundColor: '#007bff',
						data: data,
					}
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