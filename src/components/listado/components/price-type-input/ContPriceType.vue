<template>
	<div
	class="cont-price-types">

		<!-- El precio de la lista es el dato que el usuario viene a ver: va primero y grande, con el
		     mismo criterio que el precio final unico en modal-props/FinalPrice.vue. Al lado, el
		     boton que explica de donde salio ese numero. -->
		<div class="price-type-card__encabezado">
			<div class="price-type-card__precio">
				{{ price(article_price_type.pivot.final_price) }}
			</div>

			<!-- Sin id de articulo no hay nada que explicar (alta nueva) y el endpoint contestaria
			     404, asi que el boton no se dibuja. -->
			<b-button
			v-if="article.id"
			class="price-type-card__info btn-explicacion"
			@click="info"
			variant="outline-secondary"
			title="Ver cómo se calculó este precio"
			size="sm">
				<i class="bi bi-question-lg"></i>
			</b-button>
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
import descripcion_de_lista from '@/components/listado/components/price-type-input/descripcion_de_lista'

export default {
	mixins: [descripcion_de_lista],
	props: {
		article_price_type: Object,
	},
	computed: {
		article() {
			return this.$store.state.article.model
		},
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

			return this.porcentaje_es(Math.round(parseFloat(valor) * 100) / 100) + '%'
		},

	},
	methods: {
		/**
		 * Pide el desglose del precio de ESTA lista y lo muestra en el mismo modal que ya usa el
		 * precio final unico (modal-props/FinalPrice.vue). El pedido y sus cuidados (modal que abre
		 * antes, contador de pedido) viven en el mixin, que comparte con PriceTypeMonedas.vue.
		 */
		info() {
			this.info_de_lista(this.article_price_type.id)
		},
	},
}
</script>
