<template>
	<b-row class="date-selector-row">
		<b-col cols="12">
			<div class="date-selector">

				<!-- Control segmentado: mismo patrón visual que horizontal-nav -->
				<div
				ref="horizontal_nav"
				class="horizontal-nav date-mode-selector"
				:class="{ 'has_horizontal_scroll': has_horizontal_scroll }">
					<div
					class="item apretable"
					:class="{ active: rango_temporal == 'dia-actual' }"
					@click="set_mode('dia-actual')">
						Hoy
					</div>
					<div
					class="item apretable"
					:class="{ active: rango_temporal == 'rango-de-fechas' }"
					@click="set_mode('rango-de-fechas')">
						Rango de fechas
					</div>
				</div>

				<!-- Campos de fecha: solo visibles en modo rango -->
				<div
				v-if="rango_temporal == 'rango-de-fechas'"
				class="date-range-fields">

					<div class="date-field-group">
						<label class="date-field-label">Desde</label>
						<input
						class="date-field-input"
						type="date"
						v-model="mes_inicio"
						:max="mes_fin || undefined">
					</div>

					<span class="date-range-sep">—</span>

					<div class="date-field-group">
						<label class="date-field-label">Hasta</label>
						<input
						class="date-field-input"
						type="date"
						v-model="mes_fin"
						:min="mes_inicio || undefined">
					</div>

					<b-button
					v-if="view != 'articulos'"
					@click="buscar"
					:disabled="disabled"
					variant="primary"
					class="btn-buscar-reporte">
						Buscar
					</b-button>
				</div>

				<!-- Aviso de rango inválido -->
				<p
				v-if="rango_temporal == 'rango-de-fechas' && fecha_invalida"
				class="date-range-error">
					La fecha de inicio no puede ser posterior a la fecha de fin.
				</p>

			</div>
		</b-col>

		<!-- Información de la última actualización (solo para 'Hoy') -->
		<info-time></info-time>
	</b-row>
</template>
<script>
import horizontal_nav_scroll from '@/common-vue/mixins/horizontal_nav_scroll'

export default {
	mixins: [horizontal_nav_scroll],
	components: {
		InfoTime: () => import('@/components/reportes/components/general/select-date/InfoTime'),
	},
	computed: {
		/* El botón Buscar se deshabilita si faltan fechas o el rango es inválido */
		disabled() {
			if (this.rango_temporal == 'rango-de-fechas') {
				return !this.mes_inicio || !this.mes_fin || this.fecha_invalida
			}
			return false
		},

		/* Fecha inicio seleccionada posterior a la fecha fin */
		fecha_invalida() {
			if (!this.mes_inicio || !this.mes_fin) {
				return false
			}
			return this.mes_inicio > this.mes_fin
		},

		rango_temporal: {
			get() {
				return this.$store.state.reportes.rango_temporal
			},
			set(value) {
				this.$store.commit('reportes/setRangoTemporal', value)
			},
		},

		/* Fecha inicio del rango (YYYY-MM-DD) */
		mes_inicio: {
			get() {
				return this.$store.state.reportes.mes_inicio
			},
			set(value) {
				this.$store.commit('reportes/setMesInicio', value)
			},
		},

		/* Fecha fin del rango (YYYY-MM-DD) */
		mes_fin: {
			get() {
				return this.$store.state.reportes.mes_fin
			},
			set(value) {
				this.$store.commit('reportes/setMesFin', value)
			},
		},
	},
	methods: {
		/**
		 * Cambia el modo activo del selector (dia-actual o rango-de-fechas).
		 * @param {string} mode - Valor del modo a activar
		 */
		set_mode(mode) {
			this.$store.commit('reportes/setRangoTemporal', mode)
		},

		/**
		 * Dispara la búsqueda de reportes con el rango de fechas seleccionado.
		 */
		buscar() {
			this.$store.dispatch('reportes/getReportes')
		},
	},
}
</script>
<style lang="sass">
/* Fila contenedora del selector */
.date-selector-row
	padding-top: 16px
	padding-bottom: 4px

/* Wrapper principal: hijos alineados al inicio, sin estirar al 100% */
.date-selector
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 14px

/* Pista gris segmentada — mismos estilos que horizontal-nav, ancho al contenido */
.date-mode-selector.horizontal-nav
	display: inline-flex
	width: fit-content
	min-width: 0
	max-width: 100%
	flex-shrink: 0
	gap: 6px
	padding: 4px
	overflow-x: auto
	overflow-y: hidden
	background-color: #E3E3E3
	border-radius: 8px

	.item
		border: none
		border-radius: 6px
		padding: 8px 12px
		cursor: pointer
		font-size: 0.875rem
		font-weight: 500
		line-height: 1.25
		color: #6c757d
		background-color: transparent
		white-space: nowrap
		transition: color 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease

		&:hover:not(.active):not(.is-disabled)
			color: #0d6efd
			background-color: #e7f1ff

		&:focus,
		&:focus-visible
			box-shadow: none
			outline: none

		&:focus-visible
			outline: 2px solid #0d6efd
			outline-offset: 2px

		&.active
			color: #fff
			background-color: #0d6efd
			font-weight: 600
			box-shadow: 0 1px 2px rgba(13, 110, 253, 0.28)

			&:hover
				color: #fff
				background-color: #0b5ed7

		&.is-disabled
			opacity: 0.4
			cursor: default
			pointer-events: none

/* Fila de campos de rango + botón buscar */
.date-range-fields
	display: flex
	align-items: flex-end
	flex-wrap: wrap
	gap: 12px

	@media screen and (max-width: 768px)
		flex-direction: column
		align-items: flex-start

/* Label + input de fecha */
.date-field-group
	display: flex
	flex-direction: column
	gap: 4px

.date-field-label
	font-size: 0.78rem
	font-weight: 500
	color: #64748B
	margin-bottom: 0
	text-transform: uppercase
	letter-spacing: 0.04em

.date-field-input
	border: 1px solid #E2E8F0
	border-radius: 8px
	padding: 7px 10px
	font-size: 0.875rem
	color: #1E293B
	background: #FFFFFF
	cursor: pointer
	transition: border-color 0.15s ease, box-shadow 0.15s ease
	height: 38px
	min-width: 150px

	&:focus
		outline: none
		border-color: #3B82F6
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12)

/* Separador entre las dos fechas */
.date-range-sep
	color: #CBD5E1
	font-size: 1rem
	padding-bottom: 9px
	user-select: none

/* Botón buscar alineado con los inputs */
.btn-buscar-reporte
	height: 38px !important
	padding: 0 22px !important
	font-weight: 500 !important
	font-size: 0.875rem !important
	border-radius: 8px !important

/* Mensaje de error de validación de rango */
.date-range-error
	font-size: 0.8rem
	color: #EF4444
	margin: 0
	padding: 0
</style>
