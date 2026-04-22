<template>
	<div
	class="m-t-10"
	v-if="view == 'cheques'">
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
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/reportes/components/cheques/NavComponent'),
		List: () => import('@/components/reportes/components/cheques/list/Index'),
		/** Selector de columnas visibles, orden y ancho; persiste en API (`table-column-preference`). */
		PropsToShow: () => import('@/common-vue/components/view/header/props-to-show/Index'),
	},
}
</script>