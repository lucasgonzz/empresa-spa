<template>
	<!--
		Ya no es una b-col de ancho completo debajo del selector: desde la misión 33 vive a la derecha
		del control segmentado, en la misma fila (ver el .date-selector__fila de Index.vue). Sigue
		colgando de `rango_temporal == 'dia-actual'`, que es lo único que la hace aplicable: en modo
		rango la fila queda solo con el segmentado y los campos de fecha.
	-->
	<p
	v-if="rango_temporal == 'dia-actual'"
	class="date-selector__info">
		Ultima actualizacion:
		<strong class="date-selector__info-fecha">{{ date(company_performance.created_at, true) }}</strong>
		<span class="date-selector__info-desde">({{ since(company_performance.created_at) }})</span>
	</p>
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
	},
}
</script>
<style lang="sass">
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
