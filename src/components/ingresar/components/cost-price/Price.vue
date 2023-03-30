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
export default {
	props: ['article'],
	computed: {
		disabled_percetange_gain() {
			if (this.article.price == null) {
				return false
			}
			if (this.article.price == '') {
				return false
			}
			return true
		},
		price_disabled() {
			if (this.hasExtencion('articles.percentage_gain')) {
				if (this.article.percentage_gain == null && this.article.percentage_gain == '') {
					return false
				} else if (this.article.percentage_gain == '' || this.article.percentage_gain == null) {
					return false
				}
				return true
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
