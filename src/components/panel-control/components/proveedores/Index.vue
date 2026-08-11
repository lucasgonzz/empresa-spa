<template>
	<div
	v-if="view == 'proveedores'">
		<nav-component></nav-component>

		<loader></loader>	

		<rendimiento-general></rendimiento-general>

		<rendimiento-por-proveedor></rendimiento-por-proveedor>
	</div>
</template>
<script>
import article_performance from '@/mixins/article_performance'
export default {
	mixins: [article_performance],
	components: {
		NavComponent: () => import('@/components/panel-control/components/proveedores/Nav'),
		Loader: () => import('@/components/panel-control/components/proveedores/Loader'),
		RendimientoGeneral: () => import('@/components/panel-control/components/proveedores/rendimiento-general/Index'),
		RendimientoPorProveedor: () => import('@/components/panel-control/components/proveedores/rendimiento-por-proveedor/Index'),
	},
	created() {
		console.log('article_performances:')
		console.log(this.article_performances)
		if (!this.article_performances.length) {
			console.log('SE MANDO A LLAMAR article_performance')
			this.$store.dispatch('panel_control/getModels')
		}
		this.setProvidersFormated()
		// El chart de Acreedores (rendimiento-general/acreedores/Chart.vue) necesita
		// provider.saldo, que el catalogo liviano (options) no trae -- ver la nota en
		// _providers de mixins/article_performance.js. Con 'provider' fuera de la descarga
		// inicial de sesion, esta seccion tiene que pedirlo ella misma.
		if (!this.$store.state.provider.models.length) {
			this.$store.dispatch('provider/getModels')
		}
	},
	computed: {
		article_performances() {
			return this.$store.state.panel_control.models
		},
	},
}
</script>