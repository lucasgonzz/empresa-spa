<template>
<b-modal
scrollable
id="mercado-libre-category-predictor"
title="Mercado Libre Predictor de Categoria"
size="lg"
hide-footer
@shown="al_mostrar_modal">
	<div class="cont-busqueda">
		<b-form-input
		v-model="query"
		placeholder="Nombre del artículo o lo que querés buscar"
		@keydown.enter.prevent="get_category_predictor"></b-form-input>
		<b-button
		variant="primary"
		@click="get_category_predictor">
			Buscar
		</b-button>
	</div>

	<div
	v-for="category in categories_predictor"
	:key="category.category_id"
	@click="select_category(category)"
	class="category s-1">
		{{ category.category_name }}
		<small
		v-if="category.path"
		class="category-path">
			{{ category.path }}
		</small>
	</div>
</b-modal>
</template>
<script>
export default {
	components: {
	},
	computed: {
		model() {
			return this.$store.state.article.model
		},
		categories_predictor() {
			return this.$store.state.meli.categories_predictor
		}
	},
	data() {
		return {
			query: null,
		}
	},
	methods: {
		// Se dispara con el @shown del propio modal, una vez que ya esta pintado.
		al_mostrar_modal() {
			this.set_query()

			this.get_category_predictor()
		},
		set_query() {
			this.query = this.model.name
		},
		/*
			Misión mercado-libre-integracion (27/10/2026): pasa a la ruta nueva
			`meli-category-predictor?q=`, con el texto como parámetro. La vieja
			(`meli-category-predictor/{nombre}`) sigue existiendo con la misma respuesta, pero
			con el nombre en la URL se rompía con cualquier artículo que tuviera una barra
			("Llave 1/2"). Además, ahora el campo de texto busca de verdad (Enter o "Buscar"):
			antes cambiarlo no hacía nada.
		*/
		get_category_predictor() {
			let query = (this.query || '').trim()
			if (!query) {
				this.$store.commit('meli/set_categories_predictor', [])
				return
			}
			this.$store.commit('auth/setMessage', 'Buscando categorías en Mercado Libre')
			this.$store.commit('auth/setLoading', true)
			this.$api.get('meli-category-predictor', {
				params: { q: query },
			})
			.then(res => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				this.$store.commit('meli/set_categories_predictor', res.data.categories || [])
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
			})
		},
		select_category(category) {

			this.$store.commit('auth/setMessage', 'Asignando categoría')
			this.$store.commit('auth/setLoading', true)
			this.$api.get('meli-category-predictor/asignar-meli-category/'+this.model.id+'/'+category.category_id, {
				skip_global_error_event: true,
			})
			.then(res => {

				/*
					🔴 Bug viejo (misión mercado-libre-integracion, 27/10/2026): la API devolvía el
					artículo en `article` y acá se leía `model`, así que el artículo quedaba
					`undefined` y el modal se rompía al elegir. La API nueva devuelve las dos
					claves; se lee `model` y, si no está (API vieja), `article`.
				*/
				let article = res.data.model || res.data.article

				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				if (!article) {
					this.$toast.error('No se pudo asignar la categoría')
					return
				}

				this.$store.commit('article/add', article)

				this.setModel(article, 'article', [], false)

				this.$toast.success('Categoria asignada')

				this.$store.commit('meli/set_categories_predictor', [])

				this.$bvModal.hide('mercado-libre-category-predictor')
				this.$bvModal.show('mercado-libre')
			})
			.catch(err => {
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
				console.log(err)
				let mensaje = 'No se pudo asignar la categoría'
				if (err && err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				this.$toast.error(mensaje)
			})
		}
	}
}
</script>
<style lang="sass">
#mercado-libre-category-predictor
	.cont-busqueda
		display: flex
		gap: 10px
		margin-bottom: 10px

	.category
		font-size: 20px
		margin: 20px
		padding: 10px
		border-radius: 7px
		cursor: pointer

	.category-path
		display: block
		font-size: 12px
		opacity: .75

</style>
