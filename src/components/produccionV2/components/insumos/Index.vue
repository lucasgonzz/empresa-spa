<template>
	<div>
		<view-component 
		:models_to_show="insumos_a_mostrar"
		@modelSaved="insumo_saved"
		@modelDeleted="insumo_deleted"
		show_models_if_empty
		mostrar_models_que_vinienen_por_prop_siempre
		:extra_filters="filtros_de_insumos"
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
			/*
				Filtro fijo del buscador general de esta solapa: solo artículos con es_insumo = 1. Va al
				servidor con cada búsqueda. Sin él, el global-search devuelve una página de 50 artículos
				mezclados y el filtrado del lado del cliente podía dejar la tabla vacía aunque los insumos
				estuvieran en la página siguiente.
			*/
			filtros_de_insumos: [
				{ key: 'es_insumo', operator: '=', value: 1 },
			],
		}
	},
	created() {
		/* Cuando el componente ya entra apuntando a insumos, descargamos de una. */
		if (this.view == 'insumos') {
			this.get_insumos()
		}
	},
	computed: {
		/**
		 * Artículos que dibuja la tabla de esta solapa: SOLO insumos.
		 *
		 * 🔴 El view-component, sin `mostrar_models_que_vinienen_por_prop_siempre`, dibuja lo que haya en
		 * el store `article` (`filtered`) apenas éste queda "filtrado": el listado por defecto que se
		 * dispara al montar, o el que dejó el Listado de artículos al pasar por ahí antes. Eso
		 * mostraba el catálogo entero en la solapa Insumos (medido: 1 insumo, todos los artículos en pantalla).
		 * Con esa prop la tabla dibuja siempre lo que se le pasa por `models_to_show`.
		 *
		 * Como la tabla ya no sigue al store, el buscador de la cabecera dejaría de verse. Para que
		 * siga sirviendo, cuando hay una búsqueda del usuario activa (y no el listado por defecto) se
		 * muestran los resultados de esa búsqueda. El servidor ya los trae solo con es_insumo = 1 (ver
		 * `filtros_de_insumos`); el `filter` de acá es la red por si llega algo que no lo es.
		 *
		 * @returns {Array}
		 */
		insumos_a_mostrar() {
			let article = this.$store.state.article
			if (article.is_filtered && !article.listado_por_defecto) {
				return article.filtered.filter(item => item.es_insumo == 1)
			}
			return this.insumos
		},
		/**
		 * True cuando el store `article` quedó con el listado por defecto armado (no una búsqueda del
		 * usuario): lo deja el Listado de artículos al pasar por ahí, o el botón "Limpiar filtros".
		 *
		 * @returns {boolean}
		 */
		listado_por_defecto_en_el_store() {
			let article = this.$store.state.article
			return !!(article.is_filtered && article.listado_por_defecto)
		},
	},
	watch: {
		view(new_view) {
			/* Si se navega/activa la vista insumos luego de creado, descargamos en ese momento. */
			if (new_view == 'insumos') {
				this.get_insumos()
				this.limpiar_listado_por_defecto_del_store()
			}
		},
		/*
			El paginador y el contador "N resultados" de la tabla leen el store `article`, no lo que esta
			solapa dibuja: con el listado por defecto armado decían "49 resultados" arriba de una tabla de
			1 insumo. Se limpia apenas aparece, tanto al entrar como después de "Limpiar filtros".
		*/
		listado_por_defecto_en_el_store: {
			immediate: true,
			handler(activo) {
				if (activo && this.view == 'insumos') {
					this.limpiar_listado_por_defecto_del_store()
				}
			},
		},
	},
	methods: {
		/**
		 * Deja el store `article` sin el listado por defecto armado, si es eso lo que tiene.
		 *
		 * Es seguro hacerlo: ese estado no es de nadie, se regenera solo (el Listado de artículos lo pide de nuevo
		 * al montarse, que es lo mismo que hace cuando se entra por primera vez) y una búsqueda real del
		 * usuario NO se toca (esa tiene `listado_por_defecto` en false).
		 *
		 * @returns {void}
		 */
		limpiar_listado_por_defecto_del_store() {
			if (!this.listado_por_defecto_en_el_store) {
				return
			}
			this.$store.commit('article/setIsFiltered', false)
			this.$store.commit('article/setFiltered', [])
		},
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
			if (!model) {
				return
			}

			/* Si dejó de ser insumo, sale de la tabla: esta solapa muestra solo insumos. */
			if (model.es_insumo != 1) {
				this.remove_insumo_from_local_list(model)
				return
			}

			/* Asegura que el insumo quede visible en la lista local ya descargada. */
			this.add_insumo_to_local_list(model)

			/* Si el common-vue lo agregó al store `article`, lo removemos. */
			this.remove_article_from_article_store(model)
		},
		/**
		 * Saca de la tabla el insumo que se acaba de eliminar desde el modal.
		 *
		 * El view-component emite `modelDeleted` sin el modelo, pero la acción `article/delete` deja
		 * el eliminado en `state.delete`. Como la tabla ya no sigue al store (ver `insumos_a_mostrar`),
		 * sin esto el insumo borrado quedaba a la vista hasta recargar la solapa.
		 *
		 * @returns {void}
		 */
		insumo_deleted() {
			let deleted = this.$store.state.article.delete
			if (!deleted) {
				return
			}
			this.remove_insumo_from_local_list(deleted)
		},
		/**
		 * Quita el artículo de `insumos` si está.
		 *
		 * @param {Object} model Artículo que dejó de ser insumo o se eliminó.
		 * @returns {void}
		 */
		remove_insumo_from_local_list(model) {
			const index = this.insumos.findIndex(item => {
				return item.id == model.id
			})
			if (index != -1) {
				this.insumos.splice(index, 1)
			}
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