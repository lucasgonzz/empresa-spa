<template>
	<div>
		<view-component 
		:models_to_show="insumos"
		@modelSaved="insumo_saved"
		show_models_if_empty
		v-if="view == 'insumos'"
		model_name="article">
		</view-component>
	</div>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	data() {
		return {
			/* Lista de artículos insumo a mostrar en el listado reutilizable. */
			insumos: [],
			/* Flag para evitar descargar insumos repetidamente al alternar la vista. */
			insumos_loaded: false,
		}
	},
	created() {
		/* Cuando el componente ya entra apuntando a insumos, descargamos de una. */
		if (this.view == 'insumos') {
			this.get_insumos()
		}
	},
	watch: {
		view(new_view) {
			/* Si se navega/activa la vista insumos luego de creado, descargamos en ese momento. */
			if (new_view == 'insumos') {
				this.get_insumos()
			}
		},
	},
	methods: {
		/**
		 * Descarga desde la API los artículos marcados como insumos (es_insumo = 1)
		 * y los deja listos para pasarlos a `models_to_show`.
		 *
		 * @returns {void}
		 */
		get_insumos() {
			/* Evita requests duplicadas si el usuario vuelve a entrar a la misma vista. */
			if (this.insumos_loaded) {
				return
			}

			/* Feedback global (loading + mensaje) para mantener la UX consistente. */
			this.$store.commit('auth/setMessage', 'Cargando insumos')
			this.$store.commit('auth/setLoading', true)

			/* Endpoint específico de insumos (Producción V2). */
			const url = '/article/get-insumos'

			return this.$api.get(url)
			.then(res => {
				/* Paginación Laravel: models.data contiene el array. */
				this.insumos = res.data.models && res.data.models.data ? res.data.models.data : []
				this.insumos_loaded = true

				/* Limpieza del feedback al terminar correctamente. */
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')
			})
			.catch(() => {
				/* Si falla, dejamos lista vacía para que el listado muestre vacío sin romper. */
				this.insumos = []
				this.insumos_loaded = false

				/* Feedback de error + fin de loading. */
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', 'No se pudieron cargar los insumos')
			})
		},
		/**
		 * Maneja el guardado (create/update) de un artículo desde el `view-component`.
		 *
		 * Necesidad del módulo: los insumos NO deben quedar en el store `article`,
		 * porque ese store se alimenta desde un endpoint que omite `es_insumo = 1`.
		 *
		 * @param {Object} model Modelo guardado desde el modal.
		 * @returns {void}
		 */
		insumo_saved(model) {
			/* Si no es insumo, no hacemos nada en este módulo. */
			if (!model || model.es_insumo != 1) {
				return
			}

			/* Asegura que el insumo quede visible en la lista local ya descargada. */
			this.add_insumo_to_local_list(model)

			/* Si el common-vue lo agregó al store `article`, lo removemos. */
			this.remove_article_from_article_store(model)
		},
		/**
		 * Inserta o actualiza el insumo en `insumos` sin duplicar.
		 *
		 * @param {Object} model Insumo guardado.
		 * @returns {void}
		 */
		add_insumo_to_local_list(model) {
			const index = this.insumos.findIndex(item => {
				return item.id == model.id
			})
			if (index == -1) {
				this.insumos.unshift(model)
			} else {
				this.insumos.splice(index, 1, model)
			}

			/* Si ya guardamos/insertamos manualmente, consideramos la lista como cargada. */
			this.insumos_loaded = true
		},
		/**
		 * Elimina el artículo del store `article` si existe, para no mezclar con el listado general.
		 *
		 * @param {Object} model Artículo insumo recién guardado.
		 * @returns {void}
		 */
		remove_article_from_article_store(model) {
			const article_store = this.$store.state.article
			if (!article_store || !Array.isArray(article_store.models)) {
				return
			}

			const index = article_store.models.findIndex(item => {
				return item.id == model.id
			})
			if (index == -1) {
				return
			}

			/* En este store, la mutación `delete` elimina `state.delete` de `state.models`. */
			this.$store.commit('article/setDelete', model)
			this.$store.commit('article/delete')
		},
	},
}
</script>