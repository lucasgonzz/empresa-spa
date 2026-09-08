<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<dropdown-section-title
		title="Descripciones inteligentes"
		icon="icon-clipboard"></dropdown-section-title>

		<dropdown-option-item
		icon="bi bi-file-text"
		@click="start_batch_flow()">
			<div class="ai-desc-dropdown-option">
				<div class="ai-desc-dropdown-option__title">Generar para los que no tienen descripción</div>
				<small class="ai-desc-dropdown-option__hint">No toca los artículos que ya tienen una, sea generada por IA o cargada a mano.</small>
			</div>
		</dropdown-option-item>

		<dropdown-option-item
		icon="bi bi-arrow-repeat"
		@click="start_batch_flow(true)">
			<div class="ai-desc-dropdown-option">
				<div class="ai-desc-dropdown-option__title">Regenerar las descripciones de IA</div>
				<small class="ai-desc-dropdown-option__hint">Vuelve a buscar y reemplaza solo las que fueron generadas por IA. Nunca toca las cargadas a mano.</small>
			</div>
		</dropdown-option-item>
	</div>
</template>
<script>
import listado_articles_source from '@/mixins/listado/listado_articles_source'

/**
 * Disparador de la generación masiva de descripciones, y NADA MÁS que el disparador.
 *
 * 🔴 La escucha de Pusher, el modal de resumen y la bandeja de revisión NO viven acá, y no es
 * una decisión de prolijidad: este componente se renderiza adentro del dropdown de opciones del
 * listado (`OptionsDropdown.vue`, `v-if="show"` sobre la cantidad de seleccionados), así que se
 * DESMONTA apenas la selección queda vacía —que es justo lo que hace el usuario después de
 * largar el lote—. El callback de Echo sobrevivía al desmontaje (lo guarda `Vue.prototype.Echo`)
 * pero corría sobre una instancia destruida: el modal de resumen no aparecía nunca, sin error,
 * sin log y sin nada en la consola. Todo eso se mudó a
 * `components/common/AvisoDescripcionesAutomaticas`, que se monta en `App.vue` y está siempre
 * vivo. Es el mismo arreglo, y por el mismo motivo, que el de las imágenes inteligentes.
 *
 * 🔴 Y por eso mismo este componente SE QUEDA donde está: `resolve_articles()` distingue
 * "seleccionados" de "filtrados" leyendo el `inject` de `options_from_filter`, que lo provee
 * `OptionsDropdown.vue` (ver `common-vue/mixins/selected_filtered_source.js`). Sacarlo del
 * dropdown para "unificarlo" con el anfitrión rompería esa distinción en silencio: siempre
 * procesaría los seleccionados.
 */
export default {
	mixins: [listado_articles_source],
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
	methods: {
		/**
		* Determina la fuente según el dropdown activo, encola el batch y avisa por el bus de
		* `$root` para que el anfitrión se ponga a escuchar el fin del lote.
		*
		* Nunca pisa descripciones cargadas a mano: si overwrite es true, solo se borran (y
		* regeneran) las descripciones previas que fueron generadas por IA. En modo automático
		* (overwrite=false) tampoco se tocan los artículos que ya tienen descripción de IA: solo
		* se generan las faltantes.
		*
		* @param {Boolean} overwrite Si es true, borra y regenera las descripciones ya generadas por IA.
		* @return {void}
		*/
		start_batch_flow(overwrite) {
			let articles_source = this.resolve_articles()

			if (!articles_source || !articles_source.length) {
				this.$toast.error('No hay artículos para procesar')
				return
			}

			let article_ids = []
			articles_source.forEach(function (article) {
				article_ids.push(article.id)
			})

			this.$api.post('article-description-ai/batch-generate', {
				article_ids: article_ids,
				overwrite: overwrite ? true : false,
			})
			.then(res => {
				this.$toast.success('Generando descripciones en segundo plano...')
				/*
					Único vínculo con el anfitrión: se avisa por el bus y este componente se
					desentiende, porque puede estar desmontado mucho antes de que el lote termine.

					🔴 Va el `batch_uuid` que devolvió el POST, y es lo que le permite al anfitrión
					reconocer SU corrida. El canal de Pusher es público y se llama por el id del
					owner, así que dos instalaciones con el mismo owner sobre la misma app de
					Pusher están en el mismo canal; sin el uuid, la pestaña acepta el primer evento
					que pase, se da de baja y se queda sin el suyo. Lo mismo con dos lotes seguidos.

					Puede venir `undefined` contra una API todavía sin desplegar: el anfitrión lo
					contempla y en ese caso vuelve al comportamiento viejo.
				*/
				this.$root.$emit('descripciones-automaticas:lote-iniciado',
					res && res.data ? res.data.batch_uuid : null)
			})
			.catch(() => {
				this.$toast.error('No se pudo iniciar la generación de descripciones')
			})
		},
	},
}
</script>
<style lang="sass">
	/* Contenedor de cada opción del dropdown: título + línea aclaratoria en chico */
	.ai-desc-dropdown-option
		display: flex
		flex-direction: column
		gap: 1px
		white-space: normal
		line-height: 1.25

		&__title
			font-weight: 500

		&__hint
			color: #6c757d
			font-size: 0.78rem
</style>
