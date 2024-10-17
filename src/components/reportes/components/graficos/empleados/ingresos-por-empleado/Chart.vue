<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import font_control from '@/mixins/reportes/font_control'
export default {
	extends: Bar,
	mixins: [font_control],
	props: {
		user_prop: Object,
	},
	computed: { 
		payment_methods() {  
			return this.$store.state.current_acount_payment_method.models
		},
		loading() {   
			return this.$store.state.reportes.loading
		},
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
			paleta_de_colores: ['#FF6384', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#FF6B6B', '#8C9EFF', '#FFD54F', '#4DB6AC', '#BA68C8', '#FF8A65'],
		}
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {	

			console.log('setChart user:')
			console.log(this.user_prop)

			// if (typeof this.addresses_payment_methods == 'undefined') {
			// 	return 
			// }

			let labels = []

			let total_ingresado = []

			let total_vendido = []

			let payment_methods_labes = []

			this.payment_methods.forEach(payment_method => {

				payment_methods_labes[payment_method.id] = {
					payment_method: payment_method,
					data: [],
				}
			})

			
			labels.push(this.user_prop.user.name)

			total_ingresado.push(this.user_prop.total_ingresado)
			total_vendido.push(this.user_prop.total_vendido)

			let amount 

			this.user_prop.payment_methods.forEach(payment_method => {

				if (typeof payment_method.total != 'undefined') {

					amount = payment_method.total
				} else {

					amount = payment_method.pivot.amount
				}

				payment_methods_labes[payment_method.id].data.push(amount) 
			})

			let datasets = [
				{
					label: 'Total vendido',
					backgroundColor: '#4CAF50',
					data: total_vendido,
				},
				{
					label: 'Total ingresos',
					backgroundColor: '#007bff',
					data: total_ingresado,
				},
			]

			let index = 0
			payment_methods_labes.forEach(payment_method => {

				datasets.push({

					label: payment_method.payment_method.name,
					backgroundColor: this.paleta_de_colores[index],
					data: payment_method.data,
				})

				index++
			})

			let that = this
			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, {
				plugins: {
					datalabels: { 
						color: '#000',
						font: {
							weight: 'bold',
							family: 'Roboto',
							size: this.font_size,
						},
						formatter: function(value) {
							let price = Math.round(value)
							
							if (price != 0) {
								return that.price(price)
							}
							return null
						},
					},
				},
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