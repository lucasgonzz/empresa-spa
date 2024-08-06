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
		}
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {	

			console.log('setChart')

			if (typeof this.meses_anteriores == 'undefined') {
				return 
			}

			let labels = []

			let total_vendido = []
			let total_ingresos = []
			let total_vendido_a_cuenta_corriente = []
			let total_pagado_a_cuenta_corriente = []
			let total_pagado_mostrador = []
			
			this.meses_anteriores.forEach(meses_anteriores => {
				labels.push(meses_anteriores.fecha)
				total_vendido.push(meses_anteriores.total_vendido)	
				total_ingresos.push(meses_anteriores.total_ingresos)
				total_vendido_a_cuenta_corriente.push(meses_anteriores.total_vendido_a_cuenta_corriente)	
				total_pagado_a_cuenta_corriente.push(meses_anteriores.total_pagado_a_cuenta_corriente)	
				total_pagado_mostrador.push(meses_anteriores.total_pagado_mostrador)	
			})

			let datasets = [
				{
					label: 'Total vendido',
					backgroundColor: '#007bff',
					data: total_vendido,
				},
				{
					label: 'Vendido a C/C',
					backgroundColor: '#dc3545',
					data: total_vendido_a_cuenta_corriente,
				},
				{
					label: 'Ingresos por C/C',
					backgroundColor: '#28a745',
					data: total_pagado_a_cuenta_corriente,
				},
				{
					label: 'Ingresos mostrador',
					backgroundColor: '#ffc107',
					data: total_pagado_mostrador,
				},
				{
					label: 'Total ingresos',
					backgroundColor: '#9966FF',
					// backgroundColor: '#383838',
					data: total_ingresos,
				},
			]

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