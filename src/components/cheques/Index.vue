<template>
	<div
	class="m-t-10">
		<!--
			Misión cheques-endoso-y-bancos (21/9/2026): el módulo vivía en Reportes > Cheques y
			pasó a Tesorería > Cheques, con ruta propia (/cheques/:sub_view?/:sub_sub_view?). Acá
			ya no hay `view` que mirar: la vista que lo monta (views/Cheques.vue) es solo de
			cheques.

			La guarda de abajo reemplaza al `v-if="view == 'cheques'"` que había, y no es
			decorativa: el store de cheques nace como `[]` y recién después de `cheque/getModels`
			toma la forma {recibido: {...}, emitido: {...}} que leen NavComponent (badges de cada
			solapa) y list/Index (cheques_to_show). Dibujar las solapas antes de eso, o con la
			ruta todavía sin sub_view/sub_sub_view, era un TypeError en render.
		-->
		<div
		v-if="listo">
			<!--
				Barra superior: navegación entre sub-vistas de cheques y acceso a la configuración
				de columnas (mismo flujo que en vistas estándar con `view-header`).
			-->
			<b-row
			class="align-items-center m-b-10"
			no-gutters>
				<b-col>
					<nav-component></nav-component>
				</b-col>
				<b-col
				cols="auto"
				class="text-right">
					<props-to-show model_name="cheque"></props-to-show>
				</b-col>
			</b-row>

			<list></list>
		</div>

		<div
		v-else
		class="j-center p-15"
		data-testid="cheques-cargando">
			<b-spinner
			variant="primary"></b-spinner>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/cheques/NavComponent'),
		List: () => import('@/components/cheques/list/Index'),
		/** Selector de columnas visibles, orden y ancho; persiste en API (`table-column-preference`). */
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
	},
	computed: {
		/**
		 * Si ya se puede dibujar el módulo: el store tiene la forma agrupada que devuelve
		 * GET cheque y la ruta trae las dos solapas (views/Cheques.vue las completa con
		 * router.replace si faltan).
		 *
		 * @returns {Boolean}
		 */
		listo() {
			let cheques = this.$store.state.cheque.models
			return !!(cheques && cheques.recibido && this.sub_view && this.sub_sub_view)
		},
	},
}
</script>
