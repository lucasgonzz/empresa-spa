<template>
	<div>
		<ofertas></ofertas>
	</div>
</template>
<script>
/*
	Vista propia del motor de ofertas personalizadas por cliente (extension
	'motor_de_ofertas'), colgada del modulo IA. Mismo patron que
	views/SugerenciasDeCompra.vue: la vista solo monta el componente real.

	OJO, lo mas importante de esta pantalla: el MISMO componente se monta en un
	segundo lugar del menu, en components/online/components/promociones/Index.vue
	(Tienda Online -> Promociones). No son dos pantallas: es una sola, con dos
	entradas. Si vas a cambiar algo de lo que se ve, se cambia en
	components/ofertas/Index.vue y sale en los dos lados; no dupliques contenido
	aca.
*/
export default {
	components: {
		Ofertas: () => import('@/components/ofertas/Index'),
	}
}
</script>
