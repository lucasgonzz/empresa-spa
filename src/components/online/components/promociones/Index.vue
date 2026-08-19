<template>
	<ofertas v-if="view == 'promociones'"></ofertas>
</template>
<script>
/*
	Tienda Online -> Promociones. Wrapper fino: lo unico que hace es el v-if por
	$route.params.view (igual que los otros tres hijos de views/Online.vue) y
	montar el componente real.

	OJO: el contenido NO se duplica. El componente que monta es exactamente el
	mismo que monta views/Ofertas.vue (modulo IA -> Ofertas): una sola vista en
	dos entradas de menu, que es lo que se pidio. Cualquier cambio de la pantalla
	va en components/ofertas/Index.vue y aparece en los dos lados.

	Aca nunca hay :id en la ruta (/online/:view?/...), asi que el componente
	siempre resuelve al listado; no hace falta ningun condicional extra.
*/
export default {
	components: {
		Ofertas: () => import('@/components/ofertas/Index'),
	},
}
</script>
