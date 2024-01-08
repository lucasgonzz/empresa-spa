<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	extends: Bar,
	computed: { 
		current_page() {  
			return this.$store.state.panel_control.provider.acreedores.current_page
		},
		order_by() {  
			return this.$store.state.panel_control.provider.acreedores.order_by
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
			let data = []

			let providers = this._providers

			console.log('providers')
			console.log(providers)

			let inicio = this.current_page * this.per_page
			let fin = inicio + this.per_page
			if (fin > providers.length) {
				fin = providers.length
			}


			if (this.order_by == 'mayor-a-menor') {	
				providers = providers.sort((a, b) => b.saldo - a.saldo)
			} else {
				providers = providers.sort((a, b) => a.saldo - b.saldo)
			}
			console.log(providers)

			providers = providers.slice(inicio, fin)
			console.log(providers)

			providers.forEach(model => {
				labels.push(model.name)
				data.push(model.saldo)
			})		

			let that = this
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Saldo',
						backgroundColor: '#007bff',
						data: data,
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
							return that.price(tooltipItem.yLabel)
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