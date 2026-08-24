<template>
	<b-col 
	md="6"
	cols="12">
		<b-form-group
		:description="description"
		label="Precio">
			<b-input-group
			v-if="hasExtencion('articles.percentage_gain')"
			class="m-b-10"
			prepend="Margen de ganancia %">
				<b-form-input
				id="article-percentage-gain"
				:disabled="disabled_percetange_gain"
				@keydown.enter="changeToProvider"
				placeholder="Ingresa el procentaje de ganancia"
				v-model="article.percentage_gain"
				autocomplete="off"></b-form-input>
			</b-input-group>
			<b-input-group
			class="m-b-10"
			prepend="Precio">
				<b-form-input
				id="article-price"
				:disabled="price_disabled"
				@keydown.enter="saveArticle"
				placeholder="Ingresa el precio del producto"
				v-model="article.price"
				autocomplete="off"></b-form-input>
			</b-input-group>
			<b-input-group
			v-if="route_name != 'Ingresar'"
			class="m-b-10"
			prepend="Precio final">
				<b-form-input
				id="article-price"
				disabled 
				v-model="article.final_price"
				autocomplete="off"></b-form-input>
			</b-input-group>
		</b-form-group>
	</b-col>
</template>
<script>
import { usa_margen_del_articulo, usa_precio_manual } from '@/utils/criterio_de_precio'

export default {
	props: ['article'],
	computed: {
		/*
		 * Mision 44: mismo criterio que el back (utils/criterio_de_precio.js). Antes
		 * alcanzaba con que el campo no fuera null ni cadena vacia, asi que un 0 guardado
		 * bloqueaba el otro input y el articulo quedaba sin forma de cambiarle el precio.
		 * Estos dos computed no los nombraba la mision, pero bloquean los mismos dos
		 * inputs con el mismo criterio equivocado.
		 */
		disabled_percetange_gain() {
			return usa_precio_manual(this.article)
		},
		price_disabled() {
			if (this.hasExtencion('articles.percentage_gain')) {
				return usa_margen_del_articulo(this.article)
			}
			return false
		},
		description() {
			if (this.hasExtencion('articles.percentage_gain')) {
				return 'Dejar MARGEN DE GANANCIA en blanco para utilizar el precio comun'
			}
			return null
		}
	},
	methods: {
		changeToProvider() {
			document.getElementById('article-provider').focus()
		},
		saveArticle() {
			this.$emit('saveArticle')
		}
	},
}
</script>
