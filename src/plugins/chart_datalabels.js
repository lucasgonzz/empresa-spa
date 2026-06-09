/**
 * Bootstrap del plugin chartjs-plugin-datalabels para Chart.js 2.
 * Desregistra el plugin global (evita que afecte todos los charts) y parchea
 * hooks que fallan si beforeEvent corre tras destroy() sin estado interno.
 */
import Chart from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'

// Clave interna que usa el plugin para guardar estado por instancia de chart
const EXPANDO_KEY = '$datalabels'

// El paquete se auto-registra al importarse; lo quitamos del registro global
Chart.plugins.unregister(ChartDataLabels)

/**
 * Envuelve un hook del plugin para ignorar charts sin estado inicializado.
 * @param {string} hook_name - Nombre del hook a parchear (beforeEvent, beforeUpdate, etc.)
 */
function guard_expando_hook(hook_name) {
	let original_hook = ChartDataLabels[hook_name]

	if (!original_hook) {
		return
	}

	ChartDataLabels[hook_name] = function(chart) {
		// Si el chart fue destruido o aún no pasó por beforeInit, no ejecutar el hook
		if (!chart[EXPANDO_KEY]) {
			return
		}

		// Reenviar todos los argumentos al hook original
		return original_hook.apply(this, arguments)
	}
}

guard_expando_hook('beforeUpdate')
guard_expando_hook('afterDatasetUpdate')
guard_expando_hook('afterUpdate')
guard_expando_hook('afterDatasetsDraw')
guard_expando_hook('beforeEvent')

export default ChartDataLabels
