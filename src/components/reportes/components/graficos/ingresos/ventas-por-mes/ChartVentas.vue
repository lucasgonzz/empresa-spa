<script>
import { Bar } from 'vue-chartjs'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'

export default {
	extends: Bar,
	mixins: [font_control, chart_theme],
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
			this.setChart()
		},
		loading() {
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
		/**
		 * Crea un dataset con estilo visual unificado para el gráfico de rendimiento mensual.
		 * @param {string} label - Nombre de la serie
		 * @param {string} color - Color de la barra
		 * @param {Array} data - Valores por mes
		 * @param {boolean} hidden - Si la serie inicia oculta en la leyenda
		 * @returns {Object}
		 */
		build_monthly_dataset(label, color, data, hidden) {
			return {
				label: label,
				backgroundColor: color,
				hoverBackgroundColor: color,
				borderWidth: 0,
				barPercentage: 0.68,
				categoryPercentage: 0.82,
				data: data,
				hidden: hidden || false,
			}
		},
		setChart() {
			if (typeof this.meses_anteriores == 'undefined') {
				return
			}

			/* Variables para acumular los valores de cada serie por mes */
			let labels = []
			let total_vendido = []
			/* deuda_clientes y deuda_proveedores son stock (no flujo): se empuja null si no hay snapshot */
			let deuda_clientes = []
			let deuda_proveedores = []
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

			this.meses_anteriores.forEach(mes => {
				labels.push(mes.fecha)
				total_vendido.push(mes.total_vendido)

				/* Si no hay snapshot para el mes, pushear null para que Chart.js no dibuje la barra */
				deuda_clientes.push(
					mes.snapshot_disponible ? mes.deuda_clientes : null
				)
				deuda_proveedores.push(
					mes.snapshot_disponible ? mes.deuda_proveedores : null
				)

				ingresos_brutos.push(mes.total_vendido)
				ingresos_netos.push(mes.ingresos_netos)
				rentabilidad.push(mes.rentabilidad)
				gastos.push(mes.total_gastos)
				total_vendido_a_cuenta_corriente.push(mes.total_vendido_a_cuenta_corriente)
				total_pagado_a_cuenta_corriente.push(mes.total_pagado_a_cuenta_corriente)
				total_pagado_mostrador.push(mes.total_pagado_mostrador)
				iva_vendido.push(mes.total_facturado)
				iva_comprado.push(mes.total_iva_comprado)
				total_comprado.push(mes.total_comprado)
				total_pagado_a_proveedores.push(mes.total_pagado_a_proveedores)
			})

			let datasets = [
				this.build_monthly_dataset('Ingresos Brutos', '#3B82F6', total_vendido, false),
				/* Deuda al cierre del mes: ocultas por defecto, el usuario las activa si las quiere ver */
				this.build_monthly_dataset('Deuda Clientes (cierre)', '#64748B', deuda_clientes, true),
				this.build_monthly_dataset('Deuda Proveedores (cierre)', '#D97706', deuda_proveedores, true),
				this.build_monthly_dataset('Vendido a C/C', '#EF4444', total_vendido_a_cuenta_corriente, true),
				this.build_monthly_dataset('Ingresos por C/C', '#B91C1C', total_pagado_a_cuenta_corriente, true),
				this.build_monthly_dataset('Ingresos mostrador', '#F59E0B', total_pagado_mostrador, true),
				this.build_monthly_dataset('Caja', '#8B5CF6', ingresos_brutos, true),
				this.build_monthly_dataset('Utilidad', '#F97316', ingresos_netos, false),
				this.build_monthly_dataset('Gastos', '#EC4899', gastos, false),
				this.build_monthly_dataset('Ingresos Netos', '#0D9488', rentabilidad, true),
				this.build_monthly_dataset('Iva Venta', '#EAB308', iva_vendido, true),
				this.build_monthly_dataset('Iva Compra', '#22C55E', iva_comprado, true),
				this.build_monthly_dataset('Comprado Proveedores', '#D97706', total_comprado, true),
				this.build_monthly_dataset('Pagado Proveedores', '#6366F1', total_pagado_a_proveedores, true),
			]

			let that = this

			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, this.get_reportes_bar_chart_options({
				plugins: {
					datalabels: {
						display: false,
					},
				},
				tooltips: {
					callbacks: {
						label: function(tooltip_item, data) {
							let dataset_label = data.datasets[tooltip_item.datasetIndex].label || ''
							let value = tooltip_item.yLabel
							return dataset_label + ': ' + that.price(value)
						},
					},
				},
			}))
		},
	},
}
</script>
