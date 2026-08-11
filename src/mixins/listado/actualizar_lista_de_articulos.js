export default {
	methods: {
		/**
		 * Refresca el listado de artículos volviendo a pedirlo por el mismo camino que lo armó.
		 *
		 * 🔴 Antes esto pegaba a `articles-ultimos-actualizados`, commiteaba `article/setModels`
		 * con un array vacío y después `article/add` uno por artículo. O sea: vaciaba y rellenaba
		 * `models`, que es la lista que la tabla dejó de mirar — display/Index.vue renderiza
		 * `filtered` mientras `is_filtered` esté en true, y eso ahora se prende con sólo entrar al
		 * módulo. Lo único que se veía era que las filas YA visibles se refrescaban en el lugar
		 * (para esas el id existe en `filtered` y `add` las reemplaza); todo lo demás caía en el
		 * vacío, y por eso el listado seguía apareciendo desactualizado.
		 *
		 * Tres cosas más que se arreglaron solas al sacar aquel loop, y conviene no reintroducirlas:
		 *
		 * 1. El store de `article` tiene `features.local_storage`, y el wrapper de `add` serializa
		 *    el array entero de `models` a localStorage en CADA commit. Una apretada del botón eran
		 *    50+ JSON.stringify de toda la lista.
		 * 2. El `setModels([])` borraba los artículos `default_in_vender` que start_methods.js carga
		 *    al arrancar y de los que depende Vender; sólo se salvaban porque el endpoint los volvía
		 *    a mandar mezclados. `runGlobalSearch` no toca `models`, así que ya no corren riesgo.
		 * 3. El endpoint devolvía los 50 más NUEVOS, no los más modificados (el orderBy por
		 *    updated_at está comentado en el backend), así que el tooltip mentía.
		 *
		 * Se refresca la página en la que está parado el usuario, NO la 1: un botón de actualizar
		 * que te teletransporta a la primera página es peor que uno que no hace nada. (Es lo
		 * contrario del refresco después de un alta, y a propósito: ahí el usuario acaba de crear
		 * algo y quiere verlo; acá sólo quiere datos frescos de lo que tiene delante.)
		 *
		 * @return {Promise}
		 */
		get_ultimos_articulos_actualizados() {
			let store_state = this.$store.state.article
			/** Página en la que está parado el usuario; si no hay ninguna, la primera. */
			let page = store_state.filter_page || 1

			// Mismo criterio que refresh_filter_results: si lo que se ve es el listado por defecto
			// se refresca por ahí, y si hay una búsqueda real del usuario se re-ejecuta esa
			// búsqueda. "Actualizar" nunca borra lo que el usuario estaba mirando.
			if (store_state.listado_por_defecto) {
				return this.$store.dispatch('article/runListadoPorDefecto', { page: page })
			}

			return this.$store.dispatch('article/runGlobalSearch', { page: page })
		},
	}
}
