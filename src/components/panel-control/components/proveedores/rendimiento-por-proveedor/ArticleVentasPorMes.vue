<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	extends: Bar,
	mounted() {
		console.log('SE MONTO')
		this.setChart()
	},
	watch: {
		selected_article() {
			this.setChart()
		},
	},
	methods: {
		setChart() {
			console.log('setChart en Article ventas por mes')
			let labels = [] 
			let data = [] 
			let article_ventas_por_mes = this.provider_articles.filter(article_performance => {
				return article_performance.article_id == this.selected_article.article_id 
			})		
			console.log('article_ventas_por_mes')
			console.log(article_ventas_por_mes)
			article_ventas_por_mes.forEach(article_performance => {
				console.log(moment(article_performance.created_at).format('MMMM YY')) 
				labels.push(moment(article_performance.created_at).format('MMMM YY'))
				data.push(article_performance.amount)
			})		
			console.log(labels)
			console.log(data)
			let that = this 
			this.renderChart({
				labels: labels,
				datasets: [
					{
						label: 'Unidades vendidas en cada mes',
						backgroundColor: '#007bff',
						data: data,
					}
				],
			}, {
				maintainAspectRatio: false,
				onClick: function (event, elements, chart) {
					let article = that.unidades_vendidas[elements[0]._index]
					this.$store.commit('panel_control/setSelectedArticle', article)
				}
			})
		},
	},
}
</script>