<script>
import { Bar } from 'vue-chartjs'
import font_control from '@/mixins/reportes/font_control'
import chart_theme from '@/mixins/reportes/chart_theme'
import chart_datalabels from '@/mixins/reportes/chart_datalabels'

export default {
	extends: Bar,
	mixins: [font_control, chart_theme, chart_datalabels],
	props: {
		// Clientes de la pagina vigente. Ya vienen filtrados (solo deudores), ordenados y paginados por el
		// servidor (graficos/clientes/Index.vue): este grafico solo los dibuja.
		clients: {
			type: Array,
			default() {
				return []
			},
		},
	},
	watch: {
		clients() {
			this.setChart()
		},
	},
	mounted() {
		this.setChart()
	},
	methods: {
		setChart() {
			let labels = []
			let data = []

			// Se grafica `saldo_pesos`, el saldo vivo en pesos (el mismo dato que muestra la lista de Clientes). La
			// columna vieja `saldo` es de antes de las cuentas por moneda y ningun movimiento la mantiene al dia:
			// queda congelada, o en NULL en un cliente nuevo, y el grafico mostraba deudas que no eran las reales.
			// El grafico es en pesos: los dolares (`saldo_dolares`) no se suman ni comparten eje con ellos.
			// El orden y la pagina los resuelve el servidor (ver graficos/clientes/Index.vue).
			this.clients.forEach(client => {
				labels.push(client.name)
				// Los decimales llegan como string ("1234.50") o null: Number() || 0 los vuelve un numero graficable.
				data.push(Number(client.saldo_pesos) || 0)
			})

			let bar_style = this.get_reportes_bar_dataset_style(data.length, true)
			let datasets = [{
				// Con la extension de dolares tambien puede haber deuda en USD: el rotulo aclara que esta barra es solo la de pesos.
				label: this.hasExtencion('ventas_en_dolares') ? 'Deuda en pesos' : 'Deuda',
				data: data,
				...bar_style,
			}]

			let that = this

			this.renderChart({
				labels: labels,
				datasets: datasets,
			}, this.get_reportes_bar_chart_options({
				plugins: {
					datalabels: this.get_reportes_datalabels_options(that, {
						align: 'end',
						anchor: 'end',
						offset: 4,
					}),
				},
				tooltips: {
					callbacks: this.get_reportes_price_tooltip_callbacks(that),
				},
			}))
		},
	},
}
</script>
