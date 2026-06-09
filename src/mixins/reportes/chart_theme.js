/**
 * Tema visual compartido para gráficos de reportes (Chart.js 2).
 * Centraliza colores, ejes, leyenda, tooltips y datalabels sin alterar el cálculo de datos.
 */
export default {
	data() {
		return {
			// Paleta principal para series múltiples y barras por categoría
			chart_color_palette: [
				'#3B82F6',
				'#06B6D4',
				'#10B981',
				'#8B5CF6',
				'#F59E0B',
				'#EF4444',
				'#EC4899',
				'#6366F1',
				'#14B8A6',
				'#F97316',
				'#84CC16',
				'#A855F7',
			],
			// Color destacado para la serie principal (totales)
			chart_primary_color: '#3B82F6',
			chart_primary_hover_color: '#2563EB',
			// Tipografía usada en ejes y leyenda
			chart_font_family: 'Inter, system-ui, -apple-system, sans-serif',
			// Color de texto secundario en ejes
			chart_axis_color: '#64748B',
			// Color de líneas de grilla
			chart_grid_color: 'rgba(148, 163, 184, 0.18)',
		}
	},
	methods: {
		/**
		 * Obtiene un color de la paleta según el índice (cíclico).
		 * @param {number} index - Posición de la serie o categoría
		 * @returns {string} Color hexadecimal
		 */
		get_chart_color(index) {
			return this.chart_color_palette[index % this.chart_color_palette.length]
		},

		/**
		 * Genera un arreglo de colores para N barras o series.
		 * @param {number} count - Cantidad de colores necesarios
		 * @returns {string[]}
		 */
		get_chart_colors(count) {
			let colors = []
			for (let i = 0; i < count; i++) {
				colors.push(this.get_chart_color(i))
			}
			return colors
		},

		/**
		 * Formatea valores del eje Y para montos grandes (K / M).
		 * @param {number} value - Valor numérico del eje
		 * @returns {string|number}
		 */
		format_chart_axis_value(value) {
			let abs_value = Math.abs(value)

			if (abs_value >= 1000000) {
				let formatted = (value / 1000000).toFixed(abs_value >= 10000000 ? 0 : 1)
				return formatted.replace(/\.0$/, '') + 'M'
			}

			if (abs_value >= 1000) {
				let formatted = (value / 1000).toFixed(abs_value >= 10000 ? 0 : 1)
				return formatted.replace(/\.0$/, '') + 'K'
			}

			return value
		},

		/**
		 * Opciones base de estilo para gráficos de barras en reportes.
		 * @param {Object} custom_options - Opciones adicionales que sobrescriben las base
		 * @returns {Object} Configuración para renderChart de vue-chartjs
		 */
		get_reportes_bar_chart_options(custom_options) {
			let that = this

			let base_options = {
				maintainAspectRatio: false,
				responsive: true,
				legend: {
					display: true,
					position: 'top',
					labels: {
						fontFamily: this.chart_font_family,
						fontColor: '#334155',
						fontSize: 12,
						usePointStyle: true,
						padding: 18,
						boxWidth: 8,
					},
				},
				scales: {
					xAxes: [{
						gridLines: {
							display: false,
							drawBorder: false,
						},
						ticks: {
							fontFamily: this.chart_font_family,
							fontColor: this.chart_axis_color,
							fontSize: 11,
							padding: 6,
						},
					}],
					yAxes: [{
						gridLines: {
							color: this.chart_grid_color,
							drawBorder: false,
							zeroLineColor: 'rgba(148, 163, 184, 0.35)',
						},
						ticks: {
							fontFamily: this.chart_font_family,
							fontColor: this.chart_axis_color,
							fontSize: 11,
							padding: 8,
							beginAtZero: true,
							callback: function(value) {
								return that.format_chart_axis_value(value)
							},
						},
					}],
				},
				tooltips: {
					mode: 'index',
					intersect: false,
					backgroundColor: '#1E293B',
					titleFontFamily: this.chart_font_family,
					bodyFontFamily: this.chart_font_family,
					titleFontColor: '#F8FAFC',
					bodyFontColor: '#E2E8F0',
					cornerRadius: 8,
					xPadding: 12,
					yPadding: 10,
					caretSize: 6,
				},
			}

			return Object.assign({}, base_options, custom_options || {})
		},

		/**
		 * Configuración estándar del plugin datalabels con soporte de precio.
		 * @param {Object} component_context - Instancia del componente (this)
		 * @param {Object} overrides - Ajustes puntuales (align, anchor, formatter, etc.)
		 * @returns {Object}
		 */
		get_reportes_datalabels_options(component_context, overrides) {
			let that = component_context
			let font_size = component_context.font_size || 11

			let datalabels_options = {
				color: '#1E293B',
				font: {
					weight: '600',
					family: this.chart_font_family,
					size: font_size,
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
			}

			return Object.assign({}, datalabels_options, overrides || {})
		},

		/**
		 * Callbacks de tooltip para mostrar montos formateados.
		 * @param {Object} component_context - Instancia del componente (this)
		 * @returns {Object}
		 */
		get_reportes_price_tooltip_callbacks(component_context) {
			let that = component_context

			return {
				label: function(tooltip_item, data) {
					let dataset_label = ''

					if (data.datasets[tooltip_item.datasetIndex]) {
						dataset_label = data.datasets[tooltip_item.datasetIndex].label || ''
					}

					let price = Math.round(tooltip_item.yLabel)

					if (price == 0) {
						return null
					}

					if (dataset_label) {
						return dataset_label + ': ' + that.price(price)
					}

					return that.price(price)
				},
			}
		},

		/**
		 * Estilo por defecto para datasets de barras simples.
		 * @param {number} bar_count - Cantidad de barras en el dataset
		 * @param {boolean} use_palette - Si true, asigna un color por barra
		 * @returns {Object}
		 */
		get_reportes_bar_dataset_style(bar_count, use_palette) {
			let background_color = this.chart_primary_color
			let hover_background_color = this.chart_primary_hover_color

			if (use_palette && bar_count > 1) {
				background_color = this.get_chart_colors(bar_count)
				hover_background_color = background_color
			}

			return {
				backgroundColor: background_color,
				hoverBackgroundColor: hover_background_color,
				borderWidth: 0,
				barPercentage: 0.68,
				categoryPercentage: 0.82,
			}
		},
	},
}
