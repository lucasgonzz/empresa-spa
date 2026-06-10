<template>
	<div
	class="m-t-10"
	v-if="view == 'articulos'">

		<!-- Aviso cuando el selector global está en «Hoy»: no se fuerza el cambio para no alterar otras vistas -->
		<b-alert
		v-if="requiere_seleccionar_rango"
		show
		variant="warning"
		class="articulos-rango-fechas-aviso">
			Para consultar la información de artículos, seleccioná
			<strong>Rango de fechas</strong>
			en el selector superior, indicá el período y presioná
			<strong>Buscar</strong>.
		</b-alert>

		<template v-if="!requiere_seleccionar_rango">
			<filtros></filtros>

			<graficos></graficos>

			<totales></totales>

			<lista></lista>
		</template>
	</div>
</template>
<script>
export default {
	components: {
		Filtros: () => import('@/components/reportes/components/articulos/filtros/Index'),
		Graficos: () => import('@/components/reportes/components/articulos/graficos/Index'),
		Totales: () => import('@/components/reportes/components/articulos/totales/Index'),
		Lista: () => import('@/components/reportes/components/articulos/lista/Index'),
	},
	computed: {
		/* Modo temporal activo en reportes (dia-actual | rango-de-fechas) */
		rango_temporal() {
			return this.$store.state.reportes.rango_temporal
		},

		/* Artículos solo admite búsqueda por rango; en «Hoy» se muestra aviso sin forzar el cambio global */
		requiere_seleccionar_rango() {
			return this.rango_temporal == 'dia-actual'
		},
	},
}
</script>
<style lang="sass">
.articulos-rango-fechas-aviso
	margin-bottom: 0
</style>