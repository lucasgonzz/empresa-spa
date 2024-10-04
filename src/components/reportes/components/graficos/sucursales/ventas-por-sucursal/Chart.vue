<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import font_control from '@/mixins/reportes/font_control'
export default {
	extends: Bar,
	mixins: [font_control],
	computed: { 
		payment_methods() {  
			return this.$store.state.current_acount_payment_method.models
		},
		addresses_payment_methods() {  
			return this.$store.state.reportes.model.addresses_payment_methods_formated
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
		get_addresses_payment_methods() {
			if (this.can('reportes.sucursales.index.all')) {

				return this.addresses_payment_methods

			} else if (this.can('reportes.sucursales.index.only_your')) {


				return this.addresses_payment_methods.filter(address => {
					return address.address.id == this.user.address_id
				})
			}
		},
		setChart() {	

			console.log('setChart')

			if (typeof this.addresses_payment_methods == 'undefined') {
				return 
			}

			let labels = []

			let total_vendido = []

			let payment_methods_labes = []
			this.payment_methods.forEach(payment_method => {

				payment_methods_labes[payment_method.id] = {
					payment_method: payment_method,
					data: [],
				}
			})

			let addresses_payment_methods = this.get_addresses_payment_methods()

			
			addresses_payment_methods.forEach(address => {

				labels.push(address.address.street)

				total_vendido.push(address.total_vendido)

				let amount 

				address.payment_methods.forEach(payment_method => {

					if (typeof payment_method.total != 'undefined') {

						amount = payment_method.total
					} else {

						amount = payment_method.pivot.amount
					}

					payment_methods_labes[payment_method.id].data.push(amount) 
				})
			})

			let datasets = [
				{
					label: 'Total vendido',
					backgroundColor: '#007bff',
					data: total_vendido,
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
						// anchor: 'end',
						// align: 'top',
						color: '#000',
						font: {
							weight: 'bold',
							family: 'Roboto',
							size: this.font_size,
						},
						formatter: function(value) {
							if (that.is_mobile) {
								return null
							}
							let price = Math.round(value)

							if (price != 0) {
								return that.price(price)
							}
							return null
						},
						offset: function(context) {
							return -19	
						}
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