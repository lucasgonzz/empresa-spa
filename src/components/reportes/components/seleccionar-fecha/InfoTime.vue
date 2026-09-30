<template>
	<!--
		Ya no es una b-col de ancho completo debajo del selector: desde la misión 33 vive a la derecha
		del control segmentado, en la misma fila (ver el .date-selector__fila de Index.vue).

		El texto de "Última actualización" sigue colgando de `rango_temporal == 'dia-actual'`, que es lo
		único que lo hace aplicable. El botón Actualizar NO: aparece siempre (pedido de Lucas,
		29/9/2026), y fuerza la regeneración del reporte sin esperar a que venza DURACION_REPORTES.
		En modo rango los reportes ya se calculan en vivo, así que ahí simplemente los vuelve a pedir.
	-->
	<div class="date-selector__actualizar">
		<p
		v-if="rango_temporal == 'dia-actual'"
		class="date-selector__info">
			Ultima actualizacion:
			<strong class="date-selector__info-fecha">{{ date(company_performance.created_at, true) }}</strong>
			<span class="date-selector__info-desde">({{ since(company_performance.created_at) }})</span>
		</p>
		<b-button
		@click="actualizar"
		:disabled="loading"
		variant="outline-primary"
		size="sm"
		class="btn-actualizar-reportes"
		title="Volver a generar los reportes ahora, sin esperar la actualización automática">
			<b-spinner
			v-if="loading"
			small></b-spinner>
			<i
			v-else
			class="bi bi-arrow-clockwise"></i>
			Actualizar
		</b-button>
	</div>
</template>
<script>
export default {
	computed: {
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},
		company_performance() {
			return this.$store.state.reportes.model
		},
		/* Deshabilitado mientras alguno de los cuatro reportes se está pidiendo (evita doble click) */
		loading() {
			let reportes = this.$store.state.reportes
			return !!(reportes.loading || reportes.estado_resultados_loading || reportes.posicion_fiscal_loading || reportes.flujo_caja_loading)
		},
	},
	methods: {
		/**
		 * Regenera todos los reportes de la pantalla. El de company-performance va con `forzar` para
		 * saltear el tiempo de caché; los otros tres se calculan en vivo en cada pedido.
		 */
		actualizar() {
			if (this.loading) {
				return
			}
			this.$store.dispatch('reportes/getReportes', {forzar: true})
			this.$store.dispatch('reportes/getEstadoResultados')
			this.$store.dispatch('reportes/getPosicionFiscal')
			this.$store.dispatch('reportes/getFlujoCaja')
		},
	},
}
</script>
<style lang="sass">
// Grupo texto + botón: alineados al centro y a la derecha de la fila. En teléfono se apilan a la
// izquierda, igual que antes hacía el texto solo.
.date-selector__actualizar
	display: flex
	align-items: center
	justify-content: flex-end
	flex-wrap: wrap
	gap: 12px

	@media screen and (max-width: 768px)
		justify-content: flex-start

// Mismo alto y radio que el resto de los controles de la cabecera (Buscar, campos de fecha).
.btn-actualizar-reportes
	display: inline-flex
	align-items: center
	gap: 6px
	height: 34px
	padding: 0 14px !important
	font-weight: 500 !important
	font-size: 0.875rem !important
	border-radius: 8px !important
	white-space: nowrap

// Tipografía secundaria: es un dato de contexto, no una acción. La fecha se mantiene destacada
// porque es lo único que alguien viene a leer acá; el "hace unos segundos" va todavía más bajo.
.date-selector__info
	margin: 0
	font-size: 0.8125rem
	line-height: 1.3
	color: var(--color-text-secondary)
	text-align: right

	@media screen and (max-width: 768px)
		text-align: left

.date-selector__info-fecha
	color: var(--color-text-primary)
	font-weight: 600

.date-selector__info-desde
	margin-left: 4px
</style>
