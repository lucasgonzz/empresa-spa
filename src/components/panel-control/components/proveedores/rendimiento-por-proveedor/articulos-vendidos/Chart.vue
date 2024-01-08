<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	extends: Bar,
	mounted() {
		this.setChart()
	},
	computed: { 
		current_page() {  
			return this.$store.state.panel_control.provider.articulos_vendidos.current_page
		},
		order_by() {  
			return this.$store.state.panel_control.provider.articulos_vendidos.order_by
		},
	},
	watch: {
		unidades_vendidas() {
			this.setChart()
		},
		order_by() {
			this.setChart()
		},
		current_page() {
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
			console.log('--------------------------------------')
			console.log('setChart en articulos-vendidos')
			let labels = [] 
			let data = [] 


			let unidades_vendidas = [...this.unidades_vendidas]

			let inicio = this.current_page * this.per_page
			let fin = inicio + this.per_page
			if (fin > unidades_vendidas.length) {
				fin = unidades_vendidas.length
			}

			if (this.order_by == 'mayor-a-menor') {	
				unidades_vendidas = unidades_vendidas.sort((a, b) => b.amount - a.amount)
			} else {
				unidades_vendidas = unidades_vendidas.sort((a, b) => a.amount - b.amount)
			}

			unidades_vendidas = unidades_vendidas.slice(inicio, fin)

			console.log('unidades_vendidas')
			console.log(unidades_vendidas)

			unidades_vendidas.forEach(article_performance => {
				labels.push(article_performance.article_name)
				data.push(article_performance.amount)
			})		
			let that = this 
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Unidades vendidas durante todo un año',
						backgroundColor: '#007bff',
						data: data,
					}
				],
			}, {
				maintainAspectRatio: false,
				onClick: function (event, elements, chart) {
					let article = unidades_vendidas[elements[0]._index]
					that.setArticle(article)
				}
			})
			console.log('--------------------------------------')
		},
		setArticle(article) {
			this.$store.commit('panel_control/setSelectedArticle', article)
		}
	},
}
</script>