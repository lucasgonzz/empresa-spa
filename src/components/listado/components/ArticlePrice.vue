<template>
	<div>
		<!--
			Columna "Precio manual" del Listado. Sin redondear, y es a proposito: article.price NO
			es el precio final ni el costo (el costo es articles.cost / costo_real). Es el PRECIO
			MANUAL, el override opcional que el usuario carga para saltearse el calculo automatico,
			y el backend lo usa como BASE -- ArticleHelper.php:319 hace $final_price = $article->price
			y recien redondea el final_price derivado, en :352. O sea que este numero nunca paso por
			ArticleHelper::redondear(), y redondearlo aca era mostrar un precio que no existe en
			ningun lado.

			Hasta el 11/8/2026 esto tenia un v-if="is_local" cuya unica rama con redondeo era la de
			produccion, asi que en local se mostraba un numero y en produccion otro. Sacado el
			redondeo, las dos ramas quedaban identicas y la condicion dejo de tener sentido.
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