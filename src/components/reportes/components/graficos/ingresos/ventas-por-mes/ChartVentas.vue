<script>
import { Bar } from 'vue-chartjs'
import moment from 'moment'
import font_control from '@/mixins/reportes/font_control'
export default {
	extends: Bar,
	mixins: [font_control],
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
			let deuda_clientes = []
			let ingresos_brutos = []
			let ingresos_netos = []
			let rentabilidad = []
			let gastos = []
			let total_vendido_a_cuenta_corriente = []
			let total_pagado_a_cuenta_corriente = []
			let total_pagado_mostrador = []
			let iva_vendido = []
			let iva_comprado = []
			let total_comprado = []
			let total_pagado_a_proveedores = []
			
			this.meses_anteriores.forEach(meses_anteriores => {
				labels.push(meses_anteriores.fecha)
				total_vendido.push(meses_anteriores.total_vendido)	
				deuda_clientes.push(meses_anteriores.deuda_clientes)	
				ingresos_brutos.push(meses_anteriores.total_vendido)
				ingresos_netos.push(meses_anteriores.ingresos_netos)
				rentabilidad.push(meses_anteriores.rentabilidad)
				gastos.push(meses_anteriores.total_gastos)
				total_vendido_a_cuenta_corriente.push(meses_anteriores.total_vendido_a_cuenta_corriente)	
				total_pagado_a_cuenta_corriente.push(meses_anteriores.total_pagado_a_cuenta_corriente)	
				total_pagado_mostrador.push(meses_anteriores.total_pagado_mostrador)	

				iva_vendido.push(meses_anteriores.total_facturado)	
				iva_comprado.push(meses_anteriores.total_iva_comprado)	
				total_comprado.push(meses_anteriores.total_comprado)	
				total_pagado_a_proveedores.push(meses_anteriores.total_pagado_a_proveedores)	
			})

			let datasets = [
				{
					label: 'Ingresos Brutos',
					backgroundColor: '#007bff',
					data: total_vendido,
				},
				{
					label: 'Deuda clientes',
					backgroundColor: '#4f4f4f',
					data: deuda_clientes,
					hidden: true,
				},
				{
					label: 'Vendido a C/C',
					backgroundColor: '#dc3545',
					data: total_vendido_a_cuenta_corriente,
					hidden: true,
				},
				{
					label: 'Ingresos por C/C',
					backgroundColor: '#662c29',
					data: total_pagado_a_cuenta_corriente,
					hidden: true,
				},
				{
					label: 'Ingresos mostrador',
					backgroundColor: '#ffc107',
					data: total_pagado_mostrador,
					hidden: true,
				},
				{
					label: 'Caja',
					backgroundColor: '#9966FF',
					// backgroundColor: '#383838',
					data: ingresos_brutos,
					hidden: true,
				},
				{
					label: 'Utilidad',
					backgroundColor: '#ff8b00',
					data: ingresos_netos,
				},
				{
					label: 'Gastos',
					backgroundColor: '#BA68C8',
					data: gastos,
				},
				{
					label: 'Ingresos Netos',
					backgroundColor: '#236b73',
					data: rentabilidad,
					hidden: true,
				},
				{
					label: 'Iva Venta',
					backgroundColor: '#E2C456',
					data: iva_vendido,
					hidden: true,
				},
				{
					label: 'Iva Compra',
					backgroundColor: '#118000',
					data: iva_comprado,
					hidden: true,
				},
				{
					label: 'Comprado Proveedores',
					backgroundColor: '#bf7c0f',
					data: total_comprado,
					hidden: true,
				},
				{
					label: 'Pagado Proveedores',
					backgroundColor: '#565485', 
					data: total_pagado_a_proveedores,
					hidden: true,
				},
			]

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
							size: this.font_size,
							weight: 'bold',
						},
						formatter: function(value, context) {
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
						// label: function(tooltipItem, data) {
						// 	let price = Math.round(tooltipItem.yLabel)

						// 	if (price != 0) {
						// 		return that.price(price)
						// 	}
						// 	return null
						// }
						label: function (tooltipItem, data) {
							const datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
							const value = tooltipItem.yLabel;
							return `${datasetLabel}: ${that.price(value)}`;
						},
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