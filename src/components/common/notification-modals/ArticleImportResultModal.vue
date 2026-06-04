<template>
	<b-modal
	id="article-import-result-notification"
	size="lg"
	hide-footer
	centered
	:modal-class="modal_wrapper_class"
	body-class="article-import-result-modal__body"
	@hide="on_modal_hide">

		<!-- Cabecera con icono y mensaje principal -->
		<div
		class="article-import-result-modal__hero"
		:class="hero_variant_class">
			<div class="article-import-result-modal__hero-icon">
				<i :class="hero_icon_class"></i>
			</div>
			<div class="article-import-result-modal__hero-text">
				<p class="article-import-result-modal__hero-label">
					{{ hero_label }}
				</p>
				<h4 class="article-import-result-modal__hero-title">
					{{ message_text }}
				</h4>
			</div>
		</div>

		<!-- Estadísticas en tarjetas (éxito) -->
		<div
		v-if="is_success && stat_cards.length"
		class="article-import-result-modal__stats-grid m-t-20">
			<div
			v-for="(stat, index) in stat_cards"
			:key="index"
			class="article-import-result-modal__stat-card"
			:style="{ '--stat-color': stat.color }">
				<div class="article-import-result-modal__stat-value">
					{{ format_stat_value(stat.value) }}
				</div>
				<div class="article-import-result-modal__stat-label">
					{{ stat.label }}
				</div>
				<div
				v-if="stat_bar_max_value > 0"
				class="article-import-result-modal__stat-bar-track m-t-8">
					<div
					class="article-import-result-modal__stat-bar-fill"
					:style="{ width: stat_bar_width(stat.value) }">
					</div>
				</div>
			</div>
		</div>

		<!-- Gráfico de barras horizontales (distribución relativa) -->
		<div
		v-if="is_success && stat_cards.length && stat_bar_max_value > 0"
		class="article-import-result-modal__chart m-t-20">
			<p class="article-import-result-modal__chart-title">
				Distribución de la importación
			</p>
			<div
			v-for="(stat, index) in stat_cards"
			:key="'chart-' + index"
			class="article-import-result-modal__chart-row">
				<span class="article-import-result-modal__chart-label">
					{{ stat.label }}
				</span>
				<div class="article-import-result-modal__chart-track">
					<div
					class="article-import-result-modal__chart-fill"
					:style="{ width: stat_bar_width(stat.value), background: stat.color }">
					</div>
				</div>
				<span class="article-import-result-modal__chart-value">
					{{ format_stat_value(stat.value) }}
				</span>
			</div>
		</div>

		<!-- Detalle de error o texto legacy -->
		<div
		v-if="!is_success || extra_info_blocks.length"
		class="article-import-result-modal__details m-t-20">
			<div
			v-for="(info, index) in extra_info_blocks"
			:key="'info-' + index"
			class="article-import-result-modal__detail-block">
				<p
				v-if="info.title"
				class="article-import-result-modal__detail-title">
					{{ info.title }}
				</p>
				<div v-if="info.parrafos">
					<p
					v-for="(parrafo, p_index) in info.parrafos"
					:key="'p-' + p_index"
					class="article-import-result-modal__detail-text">
						{{ parrafo }}
					</p>
				</div>
				<p
				v-else-if="info.value"
				class="article-import-result-modal__detail-text article-import-result-modal__detail-text--mono">
					{{ info.value }}
				</p>
			</div>
		</div>

		<!-- Acciones -->
		<div class="article-import-result-modal__actions m-t-25">
			<b-button
			v-for="(action, index) in functions_to_execute"
			:key="'action-' + index"
			class="article-import-result-modal__action-btn"
			:variant="action.btn_variant || 'primary'"
			@click="call_action(action)">
				{{ action.btn_text }}
			</b-button>
		</div>

	</b-modal>
</template>

<script>
import global_notification_functions from '@/mixins/global_notification_functions'

export default {

	mixins: [global_notification_functions],

	computed: {

		/*
		 * Texto principal de la notificación (store global_notification).
		 */
		message_text() {
			return this.$store.state.global_notification.message_text || ''
		},

		color_variant() {
			return this.$store.state.global_notification.color_variant || 'info'
		},

		functions_to_execute() {
			return this.$store.state.global_notification.functions_to_execute || []
		},

		info_to_show() {
			return this.$store.state.global_notification.info_to_show || []
		},

		import_stats() {
			return this.$store.state.global_notification.import_stats
		},

		/*
		 * True si la notificación es de éxito (importación OK).
		 */
		is_success() {
			return this.color_variant === 'success'
		},

		hero_label() {
			if (this.is_success) {
				return 'Importación completada'
			}
			return 'Importación con problemas'
		},

		hero_icon_class() {
			if (this.is_success) {
				return 'icon-check-circle'
			}
			return 'icon-alert-triangle'
		},

		hero_variant_class() {
			return 'article-import-result-modal__hero--' + (this.color_variant || 'info')
		},

		modal_wrapper_class() {
			return 'article-import-result-modal-wrapper'
		},

		/*
		 * Tarjetas de métricas a partir de import_stats o, en fallback, info_to_show.
		 */
		stat_cards() {
			let stats = this.import_stats

			if (stats && typeof stats === 'object') {
				return [
					{
						label: 'Filas procesadas',
						value: stats.filas_procesadas,
						color: '#6f42c1',
					},
					{
						label: 'Artículos creados',
						value: stats.articulos_creados,
						color: '#28a745',
					},
					{
						label: 'Artículos macheados',
						value: stats.articulos_macheados,
						color: '#17a2b8',
					},
					{
						label: 'Artículos actualizados',
						value: stats.articulos_actualizados,
						color: '#007bff',
					},
				]
			}

			return this.parse_stats_from_info_to_show()
		},

		/*
		 * Bloques de info extra (errores o compatibilidad).
		 */
		extra_info_blocks() {
			if (!this.is_success) {
				return this.info_to_show
			}

			/* En éxito solo mostramos info_to_show si no hay stats estructurados. */
			if (this.import_stats) {
				return []
			}

			return this.info_to_show
		},

		/*
		 * Valor máximo para calcular anchos de barras relativas.
		 */
		stat_bar_max_value() {
			let max = 0

			this.stat_cards.forEach(function(stat) {
				let value = Number(stat.value) || 0
				if (value > max) {
					max = value
				}
			})

			return max
		},

	},

	methods: {

		/*
		 * Ejecuta la acción del botón (mixin global_notification_functions).
		 */
		call_action(action) {
			if (action.function_name && typeof this[action.function_name] === 'function') {
				this[action.function_name]()
			}
			if (action.link) {
				window.open(action.link)
			}
			this.close_modal()
		},

		close_modal() {
			this.$bvModal.hide('article-import-result-notification')
		},

		on_modal_hide() {
			/* Sin estado extra que limpiar por ahora. */
		},

		/*
		 * Formatea números grandes con separador de miles.
		 */
		format_stat_value(value) {
			let number = Number(value) || 0
			return number.toLocaleString('es-AR')
		},

		/*
		 * Ancho de barra en porcentaje respecto al máximo.
		 */
		stat_bar_width(value) {
			let number = Number(value) || 0
			let max = this.stat_bar_max_value

			if (max <= 0) {
				return '0%'
			}

			let percent = Math.round((number / max) * 100)
			if (percent < 4 && number > 0) {
				percent = 4
			}

			return percent + '%'
		},

		/*
		 * Fallback: extrae números de parrafos legacy ("123 filas procesadas").
		 */
		parse_stats_from_info_to_show() {
			let cards = []
			let colors = ['#6f42c1', '#28a745', '#17a2b8', '#007bff']
			let color_index = 0

			this.info_to_show.forEach(function(info) {
				if (!info.parrafos) {
					return
				}

				info.parrafos.forEach(function(parrafo) {
					let match = String(parrafo).match(/^(\d+)\s+(.+)$/)
					if (match) {
						cards.push({
							label: match[2],
							value: parseInt(match[1], 10),
							color: colors[color_index % colors.length],
						})
						color_index++
					}
				})
			})

			return cards
		},

	},

}
</script>

<style lang="sass">
.article-import-result-modal-wrapper .modal-content
	border: none
	border-radius: 16px
	overflow: hidden
	box-shadow: 0 20px 50px rgba(0, 0, 0, 0.18)

.article-import-result-modal__body
	padding: 0 24px 24px

.article-import-result-modal__hero
	display: flex
	align-items: center
	gap: 16px
	margin: -1px -24px 0
	padding: 22px 24px
	color: #fff

	&--success
		background: linear-gradient(135deg, #28a745 0%, #20c997 100%)

	&--danger
		background: linear-gradient(135deg, #dc3545 0%, #e83e8c 100%)

	&--warning
		background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)
		color: #212529

	&--info
		background: linear-gradient(135deg, #007bff 0%, #6610f2 100%)

.article-import-result-modal__hero-icon
	font-size: 42px
	line-height: 1
	opacity: 0.95

.article-import-result-modal__hero-label
	margin: 0 0 4px
	font-size: 12px
	text-transform: uppercase
	letter-spacing: 0.06em
	opacity: 0.9

.article-import-result-modal__hero-title
	margin: 0
	font-size: 20px
	font-weight: 700
	line-height: 1.3

.article-import-result-modal__stats-grid
	display: grid
	grid-template-columns: repeat(2, 1fr)
	gap: 12px

@media (max-width: 576px)
	.article-import-result-modal__stats-grid
		grid-template-columns: 1fr

.article-import-result-modal__stat-card
	background: #f8f9fb
	border-radius: 12px
	padding: 14px 16px
	border-left: 4px solid var(--stat-color, #007bff)

.article-import-result-modal__stat-value
	font-size: 28px
	font-weight: 800
	color: #212529
	line-height: 1.1

.article-import-result-modal__stat-label
	font-size: 13px
	color: #6c757d
	margin-top: 4px

.article-import-result-modal__stat-bar-track
	height: 6px
	background: rgba(0, 0, 0, 0.06)
	border-radius: 4px
	overflow: hidden

.article-import-result-modal__stat-bar-fill
	height: 100%
	background: var(--stat-color, #007bff)
	border-radius: 4px
	transition: width 0.4s ease

.article-import-result-modal__chart
	background: #fff
	border: 1px solid rgba(0, 0, 0, 0.06)
	border-radius: 12px
	padding: 14px 16px

.article-import-result-modal__chart-title
	font-size: 13px
	font-weight: 600
	color: #495057
	margin: 0 0 12px

.article-import-result-modal__chart-row
	display: grid
	grid-template-columns: 120px 1fr 48px
	align-items: center
	gap: 10px
	margin-bottom: 8px

	&:last-child
		margin-bottom: 0

.article-import-result-modal__chart-label
	font-size: 12px
	color: #6c757d

.article-import-result-modal__chart-track
	height: 10px
	background: #eef1f5
	border-radius: 6px
	overflow: hidden

.article-import-result-modal__chart-fill
	height: 100%
	border-radius: 6px
	min-width: 2px
	transition: width 0.45s ease

.article-import-result-modal__chart-value
	font-size: 12px
	font-weight: 700
	text-align: right
	color: #343a40

.article-import-result-modal__detail-block
	background: #fff8f8
	border: 1px solid rgba(220, 53, 69, 0.15)
	border-radius: 10px
	padding: 12px 14px
	margin-bottom: 10px

.article-import-result-modal__detail-title
	font-weight: 600
	margin: 0 0 6px
	color: #343a40

.article-import-result-modal__detail-text
	margin: 0 0 4px
	font-size: 14px
	color: #495057

	&--mono
		font-family: monospace
		font-size: 13px
		white-space: pre-wrap

.article-import-result-modal__actions
	display: flex
	flex-wrap: wrap
	justify-content: center
	gap: 10px

.article-import-result-modal__action-btn
	min-width: 140px
	font-weight: 600
</style>
