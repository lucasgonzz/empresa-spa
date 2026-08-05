<template>
	<div
	class="cont-price-types">

		<!-- El precio de la lista es el dato que el usuario viene a ver: va primero y grande, con el
		     mismo criterio que el precio final unico en modal-props/FinalPrice.vue. -->
		<div class="price-type-card__precio">
			{{ price(article_price_type.pivot.final_price) }}
		</div>

		<!-- Una linea que dice de donde salio ese precio, para no tener que deducirlo del interruptor
		     ni de cual de los dos inputs quedo gris. -->
		<div class="price-type-card__origen">
			<template v-if="indicar_final_price">
				Precio fijado a mano
			</template>
			<template v-else>
				Margen de {{ percentage_texto }}
			</template>
		</div>

		<div class="price-type-card__campos">

			<!-- El campo que manda lleva --manda y el otro --derivado: asi la relacion entre los dos
			     se ve, en vez de depender solo del gris del disabled. -->
			<b-input-group
			v-if="can('article.percentage_gain')"
			class="price-type-card__campo"
			:class="indicar_percentage ? 'price-type-card__campo--manda' : 'price-type-card__campo--derivado'"
			prepend="%">
				<b-form-input
				type="number"
				:disabled="!indicar_percentage"
				v-model="article_price_type.pivot.percentage"
				placeholder="Porcentaje"></b-form-input>
			</b-input-group>

			<b-input-group
			class="price-type-card__campo"
			:class="indicar_final_price ? 'price-type-card__campo--manda' : 'price-type-card__campo--derivado'"
			prepend="$">
				<b-form-input
				:disabled="!indicar_final_price"
				type="number"
				v-model="article_price_type.pivot.final_price"
				placeholder="Precio final"></b-form-input>
			</b-input-group>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		article_price_type: Object,
	},
	computed: {
		indicar_percentage() {
			if (this.article_price_type.pivot.setear_precio_final) {
				return false
			}
			return true
		},
		indicar_final_price() {
			if (this.article_price_type.pivot.setear_precio_final) {
				return true
			}
			return false
		},
		/**
		 * El porcentaje del pivot puede venir como string, null, o con muchos decimales (cuando el
		 * backend lo calcula hacia atras a partir de un precio fijado a mano). Se muestra redondeado
		 * a dos decimales, solo para el texto: el input sigue mostrando el valor tal cual.
		 */
		percentage_texto() {
			let valor = this.article_price_type.pivot.percentage

			if (valor === null || valor === '' || typeof valor == 'undefined') {
				return '0%'
			}

			return Math.round(parseFloat(valor) * 100) / 100 + '%'
		},

	},
}
</script>
