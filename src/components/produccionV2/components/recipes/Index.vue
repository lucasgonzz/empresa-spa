<template>
	<div
	v-if="view == 'recetas'">
		<view-component
		model_name="recipe"
		show_filter_modal>
			<!-- <template #table-prop-article_image="props">
				<article-image
				:article="props.model.article"></article-image>
			</template> -->

			<template #model_modal_title>
				{{ modal_title }}
			</template>

			<!--
				Duplicar el modelo completo: crea el articulo nuevo Y su receta, con las rutas,
				los insumos y las cantidades. Es el caso de una fabrica que tiene 20 modelos del
				mismo producto y solo le cambian las cantidades.
			-->
			<template #table_right_options="props">
				<b-button
				class="m-l-15"
				variant="outline-primary"
				size="sm"
				title="Duplicar esta receta con un articulo nuevo"
				@click.stop="abrir_duplicar(props.model)">
					<i class="icon-clipboard m-r-5"></i>
					Duplicar
				</b-button>
			</template>
		</view-component>

		<duplicar-modal
		:receta="receta_a_duplicar"></duplicar-modal>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
		ArticleImage: () => import('@/components/produccion/components/recipes/ArticleImage'),
		DuplicarModal: () => import('@/components/produccionV2/components/recipes/DuplicarModal'),
	},
	data() {
		return {
			/* Receta sobre la que se apreto "Duplicar". El modal se reusa para todas las filas. */
			receta_a_duplicar: null,
		}
	},
	computed: {
		modal_title() {
			if (this.selected_recipe.article) {
				return 'Receta de '+this.selected_recipe.article.name
			}
		},
		selected_recipe() {
			return this.$store.state.recipe.model
		}
	},
	methods: {
		/**
		 * Abre el modal de duplicar con la receta de esa fila.
		 *
		 * @param {Object} model Receta de la fila.
		 * @returns {void}
		 */
		abrir_duplicar(model) {
			// 🔴 El show() va adentro de un $nextTick, por la misma razón que en
			// `Cobros.vue -> abrir_recordatorio()`: `$bvModal.show()` emite `show` de forma
			// SINCRÓNICA, así que `al_abrir()` del hijo corría antes de que Vue bajara
			// `receta_a_duplicar` al prop `receta`. El input "Nombre del artículo nuevo"
			// quedaba vacío en la primera apertura, y de la segunda en adelante traía
			// "<receta anterior> copia" mientras el párrafo de arriba ya nombraba la receta
			// nueva. El POST iba a la receta correcta, así que salía un artículo bien
			// duplicado con el nombre del modelo equivocado.
			// Encontrado el 31/8/2026 barriendo la familia del bug del recordatorio de cobro.
			let self = this
			this.receta_a_duplicar = model
			this.$nextTick(function() {
				self.$bvModal.show('duplicar-receta')
			})
		},
	},
}
</script>
