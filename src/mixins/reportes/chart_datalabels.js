/**
 * Mixin para gráficos de reportes que muestran etiquetas de datos (datalabels).
 * Registra el plugin solo en la instancia del chart, no de forma global.
 */
import chart_datalabels from '@/plugins/chart_datalabels'

export default {
	mounted() {
		// Registro por instancia vía vue-chartjs (addPlugin)
		this.addPlugin(chart_datalabels)
	},
}
