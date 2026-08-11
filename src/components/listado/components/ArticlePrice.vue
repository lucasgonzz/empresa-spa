<template>
	<div>
		<!--
			Columna "Precio" del Listado. Sin redondear, y es a proposito: article.price es el
			COSTO, y el backend no lo redondea nunca -- ArticleHelper::redondear() se aplica sobre
			el precio final de catalogo. Hasta el 11/8/2026 esto tenia un v-if="is_local" cuya
			unica rama con redondeo era la de produccion, asi que en local se mostraba un numero y
			en produccion otro. Sacado el redondeo, las dos ramas quedaban identicas y la condicion
			dejo de tener sentido.
		-->
		<span>
			{{ price(article.price) }}
		</span>
	</div>
</template>
<script>
export default {
	props: {
		article: Object,
	},
}
</script>