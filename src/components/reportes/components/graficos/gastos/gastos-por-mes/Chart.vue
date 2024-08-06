<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
export default {
	extends: Bar,
	computed: { 
		meses_anteriores() {  
			return this.$store.state.reportes.meses_anteriores
		},
		loading() {  
			return this.$store.state.reportes.loading
		},
		expense_concepts() {
			return this.$store.state.expense_concept.models 
		}
	},
	watch: {
		meses_anteriores() {
			console.log('wacth chart')
			this.setChart()
		},
		loading() {
			console.log('wacth chart')
			this.setChart()
		},
	},
	data() {
		return {
			per_page: 10,
			// paleta_de_colores: ['#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
			paleta_de_colores: ['#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6B6B', '#8C9EFF', '#FFD54F', '#4DB6AC', '#BA68C8', '#FF8A65'],
		}
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {	

			if (typeof this.meses_anteriores == 'undefined') {
				return
			}

			let labels = []
			let total_gastos = []

			let datasets_expense_concepts = []

			this.expense_concepts.forEach(expense_concept => {
				
				datasets_expense_concepts[expense_concept.id] = {
					expense_concept_name: expense_concept.name,
					meses: [] 
				}

			})
			
			this.meses_anteriores.forEach(meses_anterior => {
				labels.push(meses_anterior.fecha)
				total_gastos.push(meses_anterior.total_gastos)

				meses_anterior.expense_concepts.forEach(expense_concept => {

					datasets_expense_concepts[expense_concept.id].meses.push(expense_concept.pivot.amount)
				})	

			})

			console.log('data total_gastos:')
			console.log(total_gastos)

			console.log('data datasets_expense_concepts:')
			console.log(datasets_expense_concepts)

			let datasets = [{
				label: 'Total gastado',
				backgroundColor: '#007bff',
				data: total_gastos,
			}]

			let index = 0
			datasets_expense_concepts.forEach(dataset => {
				
				datasets.push({
					label: dataset.expense_concept_name,
					backgroundColor: this.paleta_de_colores[index],
					data: dataset.meses 
				})

				index++
			})

			let that = this
			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, {
				maintainAspectRatio: false,
				onClick: function (event, elements, chart) {
					// let provider = providers[elements[0]._index]
					// that.setSelectedProvider(provider)
				},
				tooltips: {
					callbacks: {
						label: function(tooltipItem, data) {
							// console.log('entorooooo')
							return that.price(Math.round(tooltipItem.yLabel))
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