/**
 * Lo comun a los dos graficos de la solapa Articulos de Reportes: Categorias y Proveedores.
 *
 * Los dos son el mismo grafico (unidades vendidas y beneficio por grupo) sobre filas distintas.
 * Vivian copiados en cada Chart.vue y se habian separado solos: el tooltip de Proveedores
 * formateaba las unidades como plata. Desde el 10/10/2026 la forma del grafico se escribe una sola
 * vez aca y cada Chart.vue solo dice que filas pinta y de que clave sale el nombre de cada barra.
 */
import chart_theme from '@/mixins/reportes/chart_theme'

/* Cuantos grupos se muestran con nombre propio antes de juntar el resto en «Otros (N)» */
export const TOPE_BARRAS = 12

/* Ids de los dos ejes Y (Chart.js 2: cada dataset elige el suyo con yAxisID) */
const EJE_BENEFICIO = 'eje-beneficio'
const EJE_UNIDADES = 'eje-unidades'

/* Ancho minimo por grupo (dos barras) para que las etiquetas de datos no se pisen con las del vecino */
const MIN_PX_POR_GRUPO_CON_ETIQUETAS = 80

/* Colores de siempre de las dos series; los titulos de los ejes los repiten para atarlos a su barra */
const COLOR_UNIDADES = '#007bff'
const COLOR_BENEFICIO = '#4CAF50'

/**
 * Redondea a dos decimales una suma de valores que pueden traer decimales (kg, plata).
 * Evita que la barra «Otros» muestre 0,30000000000000004.
 *
 * @param {number} valor
 * @returns {number}
 */
function redondear(valor) {
	return Math.round(valor * 100) / 100
}

/**
 * Las primeras `tope` filas tal cual vienen, y el resto sumado en una sola fila «Otros (N)».
 *
 * La API devuelve TODAS las categorias (o proveedores) del periodo, ya ordenadas segun
 * «Orden» (mayor-menor o menor-mayor): ese orden se respeta, no se reordena aca. El corte es solo
 * visual (decision de Lucas, 10/10/2026): la API no recorta nada.
 *
 * «Otros» aparece solo cuando junta 2 grupos o mas. Con `tope` filas o menos no hay nada que
 * juntar, y con `tope + 1` el resto seria un solo grupo: una barra «Otros (1)» ocupa el mismo
 * lugar que ese grupo y le esconde el nombre, asi que ahi se muestran las `tope + 1` filas tal cual.
 *
 * @param {Array} filas - categories o providers de la respuesta de article-purchase
 * @param {string} nombre_key - clave del nombre de cada fila (category_name / provider_name)
 * @param {number} [tope] - cuantas filas mostrar con nombre (por defecto TOPE_BARRAS)
 * @returns {Array} filas a graficar; la ultima es la de «Otros (N)» si el resto junto 2 o mas
 */
export function top_con_otros(filas, nombre_key, tope) {
	if (!Array.isArray(filas)) {
		return []
	}

	if (!tope) {
		tope = TOPE_BARRAS
	}

	// Sin resto, o con un resto de un solo grupo, no se arma «Otros» (ver arriba)
	if (filas.length <= tope + 1) {
		return filas.slice()
	}

	let primeras = filas.slice(0, tope)
	let resto = filas.slice(tope)

	let otros = {
		unidades_vendidas: 0,
		price: 0,
		cost: 0,
		beneficio: 0,
	}

	resto.forEach(fila => {
		otros.unidades_vendidas += Number(fila.unidades_vendidas) || 0
		otros.price += Number(fila.price) || 0
		otros.cost += Number(fila.cost) || 0
		otros.beneficio += Number(fila.beneficio) || 0
	})

	otros.unidades_vendidas = redondear(otros.unidades_vendidas)
	otros.price = redondear(otros.price)
	otros.cost = redondear(otros.cost)
	otros.beneficio = redondear(otros.beneficio)

	// N = cuantos grupos (categorias o proveedores) quedaron sumados adentro
	otros[nombre_key] = 'Otros (' + resto.length + ')'

	primeras.push(otros)

	return primeras
}

export default {
	mixins: [chart_theme],
	methods: {
		/**
		 * Pinta el grafico de barras de unidades vendidas y beneficio para las filas dadas.
		 *
		 * Dos ejes: Beneficio a la izquierda en pesos y Unidades vendidas a la derecha en cantidad.
		 * Hasta el 10/10/2026 compartian un solo eje y, al lado de un beneficio de millones, las
		 * barras de unidades no se veian. La grilla es solo la del eje de Beneficio.
		 *
		 * @param {Array} filas - categories o providers del store
		 * @param {string} nombre_key - clave del nombre de cada fila (category_name / provider_name)
		 */
		render_grafico_articulos(filas, nombre_key) {
			if (typeof filas == 'undefined' || !filas) {
				return
			}

			let barras = top_con_otros(filas, nombre_key)

			let labels = []
			let unidades_vendidas = []
			let beneficio = []

			barras.forEach(barra => {
				labels.push(barra[nombre_key])
				unidades_vendidas.push(barra.unidades_vendidas)
				beneficio.push(barra.beneficio)
			})

			let datasets = [
				{
					label: 'Unidades vendidas',
					backgroundColor: COLOR_UNIDADES,
					data: unidades_vendidas,
					yAxisID: EJE_UNIDADES,
				},
				{
					label: 'Beneficio',
					backgroundColor: COLOR_BENEFICIO,
					data: beneficio,
					yAxisID: EJE_BENEFICIO,
				}
			]

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
						},
						// Con menos de ~80 px por grupo las etiquetas se pisan (medido: 1254/13 se lee, 708/13 y 319/13 no); el valor sigue en el tooltip
						display: function(context) {
							let grupos = context.chart.data.labels.length
							return grupos > 0 && context.chart.width / grupos >= MIN_PX_POR_GRUPO_CON_ETIQUETAS
						},
						formatter: function(value, context) {
							if (context.dataset.label == 'Beneficio') {

								return that.price(Math.round(value))
							}
							// El unico otro dataset de este grafico es 'Unidades vendidas'
							// (se arman los dos mas arriba), asi que este branch es siempre una
							// cantidad: va con numero_es, no con price
							// (mision del 21/8/2026 — separadores de numeros).
							return that.numero_es(value)
						},
					},
				},
				maintainAspectRatio: false,
				scales: {
					yAxes: [
						{
							id: EJE_BENEFICIO,
							type: 'linear',
							position: 'left',
							scaleLabel: {
								display: true,
								labelString: 'Beneficio',
								fontColor: COLOR_BENEFICIO,
							},
							ticks: {
								beginAtZero: true,
								// Compacto ($2,5M, $800K): el monto entero se come el ancho en un telefono
								callback: function(value) {
									if (value < 0) {
										return '-$' + that.format_chart_axis_value(-value)
									}
									return '$' + that.format_chart_axis_value(value)
								},
							},
						},
						{
							id: EJE_UNIDADES,
							type: 'linear',
							position: 'right',
							scaleLabel: {
								display: true,
								labelString: 'Unidades vendidas',
								fontColor: COLOR_UNIDADES,
							},
							ticks: {
								beginAtZero: true,
								callback: function(value) {
									return that.format_chart_axis_value(value)
								},
							},
							// Una sola grilla (la de Beneficio): dos grillas cruzadas no se leen
							gridLines: {
								drawOnChartArea: false,
							},
						},
					],
				},
				tooltips: {
					callbacks: {
						label: function(tooltipItem, data) {

							const datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';

							if (datasetLabel == 'Beneficio') {

								return datasetLabel + ': ' + that.price(Math.round(tooltipItem.yLabel))
							}

							// Igual que en el formatter: el otro dataset es 'Unidades vendidas', una cantidad.
							return datasetLabel + ': ' + that.numero_es(tooltipItem.yLabel)
						}
					}
				}
			})
		},
	},
}
