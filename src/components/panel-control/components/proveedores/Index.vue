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
		if (!this.article_performances.length) {
			console.log('SE MANDO A LLAMAR article_performance')
			this.$store.dispatch('panel_control/getModels')
		}
		this.setProvidersFormated()
	},
	computed: {
		article_performances() {
			return this.$store.state.panel_control.models
		},
	},
}
</script>