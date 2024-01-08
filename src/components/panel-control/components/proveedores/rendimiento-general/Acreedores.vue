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
			let data_2 = []

			let providers = this._providers
			providers = providers.filter(Boolean)
			console.log('acreedores')
			console.log(providers)
			providers.forEach(model => {
				labels.push(model.name)
				data.push(model.saldo)
				data_2.push(Number(model.saldo)-20)
			})		

			let that = this
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Acreedores',
						backgroundColor: '#007bff',
						data: data,
					}, 
					// {
					// 	label: 'Acreedores',
					// 	backgroundColor: '#333',
					// 	data: data_2,
					// },
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