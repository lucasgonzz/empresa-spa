<template>
	<div>
		<seleccionar-fecha></seleccionar-fecha>

		<nav-component></nav-component>

		<!-- Selector unico de moneda (grupo 227): aplica a Estado de Resultados, Flujo de Caja y Posicion Fiscal. Solo se muestra en esas 3 secciones. -->
		<selector-moneda v-if="muestra_selector_moneda"></selector-moneda>

		<estado-resultados></estado-resultados>

		<flujo-caja></flujo-caja>

		<posicion-fiscal></posicion-fiscal>

		<graficos></graficos>

		<articulos></articulos>

		<cheques></cheques>

		<!-- Modal de drill-down por concepto, compartido por las 3 secciones contables nuevas -->
		<detalle-modal></detalle-modal>

		<!-- Modales de comprobante que "Ver comprobante" del detalle abre por id via show_model.
		No se referencian desde el template: si parecen sin uso, no borrar. -->
		<sale-modal></sale-modal>
		<model-index model_name="provider_order"></model-index>
	</div>
</template>
<script>
export default {
	components: {
		SeleccionarFecha: () => import('@/components/reportes/components/seleccionar-fecha/Index'),
		NavComponent: () => import('@/components/reportes/components/nav-component/Index'),
		SelectorMoneda: () => import('@/components/reportes/components/SelectorMoneda'),
		EstadoResultados: () => import('@/components/reportes/components/estado-resultados/Index'),
		FlujoCaja: () => import('@/components/reportes/components/flujo-caja/Index'),
		PosicionFiscal: () => import('@/components/reportes/components/posicion-fiscal/Index'),
		DetalleModal: () => import('@/components/reportes/components/detalle-modal/Index'),
		Graficos: () => import('@/components/reportes/components/graficos/Index'),
		Articulos: () => import('@/components/reportes/components/articulos/Index'),
		Cheques: () => import('@/components/reportes/components/cheques/Index'),
		SaleModal: () => import('@/components/common/SaleModal'),
		ModelIndex: () => import('@/common-vue/components/model/Index'),
	},
	computed: {
		/* El selector de moneda unico solo tiene sentido en las 3 secciones contables nuevas */
		muestra_selector_moneda() {
			return ['estado-de-resultados', 'flujo-de-caja', 'posicion-fiscal'].indexOf(this.view) !== -1
		},
	},
	created() {
		/* Se traslada aca desde el ya eliminado components/general/Index.vue: Articulos y Graficos siguen leyendo state.reportes.model (poblado por esta action, que pega contra api/company-performance) para varios de sus graficos, asi que el fetch tiene que seguir disparandose siempre al entrar a Reportes, sin importar la seccion activa. */
		this.$store.dispatch('reportes/getReportes')
	},
}
</script>
