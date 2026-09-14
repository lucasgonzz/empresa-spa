<template>
	<div>
		<agenda></agenda>
	</div>
</template>
<script>
/*
	Vista de Alertas -> Agenda (ruta /agenda/:view?, permiso pending.index). Mismo patron que
	views/Ofertas.vue: la vista solo monta el componente real, components/agenda/Index.vue.

	Hasta la mision agenda-tareas-calendario (14/9/2026) aca se montaban los tres componentes de
	components/pendings/ (nav con pestañas "Por realizar" / "Realizados", la tabla generica de
	pendientes y la de completados). Esa carpeta QUEDA EN EL REPO SIN MONTAR, a proposito: se
	retira en una limpieza posterior, cuando Lucas haya probado la agenda nueva. Si hay que volver
	atras, es restaurar este archivo y nada mas.
*/
export default {
	components: {
		Agenda: () => import('@/components/agenda/Index'),
	},
}
</script>
