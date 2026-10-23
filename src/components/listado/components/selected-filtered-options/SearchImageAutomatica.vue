<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>

		<dropdown-section-title
		title="Imágenes inteligentes"
		icon="icon-camera"></dropdown-section-title>

		<!--
			Literal, sin condicional por modelo: este componente vive solo en el dropdown de
			opciones del LISTADO, o sea que ya es exclusivo de articulos.
		-->
		<dropdown-option-item
		icon="bi bi-images"
		data_tour="listado.opcion_imagenes_automaticas"
		@click="start_batch_flow()">
			Asignar imágenes automáticamente
		</dropdown-option-item>

	</div>
</template>
<script>
import listado_articles_source from '@/mixins/listado/listado_articles_source'

/**
 * Disparador de la asignación automática de imágenes, y NADA MÁS que el disparador.
 *
 * 🔴 La escucha de Pusher, el pedido del resumen y el modal NO viven acá, y no es una decisión
 * de prolijidad: este componente se renderiza adentro del dropdown de opciones del listado
 * (`OptionsDropdown.vue`, `v-if="show"` sobre la cantidad de seleccionados), así que se DESMONTA
 * apenas la selección queda vacía —que es justo lo que hace el usuario después de largar el
 * lote—. El callback de Echo sobrevivía al desmontaje (lo guarda `Vue.prototype.Echo`) pero
 * corría sobre una instancia destruida: el modal de resumen no aparecía nunca, sin error, sin
 * log y sin nada en la consola. Todo eso se mudó a `components/common/AvisoImagenesAutomaticas`,
 * que se monta en `App.vue` y está siempre vivo.
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
		* @return {void}
		*/
		start_batch_flow() {
			let articles_source = this.resolve_articles()

			if (!articles_source || !articles_source.length) {
				this.$toast.error('No hay artículos para procesar')
				return
			}

			let article_ids = []
			articles_source.forEach(function (article) {
				article_ids.push(article.id)
			})

			/*
				`skip_global_validation_toast`: desde el 23/10/2026 la API responde 422 (con forma
				de validación) cuando TODOS los elegidos ya tienen imagen y no se buscó nada. Ese
				caso no es un error: se muestra acá como aviso, sin el toast global de validación.
			*/
			this.$api.post('google/batch-assign-images', {
				article_ids: article_ids,
			}, {
				skip_global_validation_toast: true,
			})
			.then(res => {
				// Dice dónde queda el resultado: el aviso de fin solo le llega a esta pestaña, pero
				// la asignación (con lo que quedó para revisar) queda siempre en Alertas → Imágenes.
				// "Asignando" y no "Buscando": es la palabra de la opción del menú y la de la fila
				// que va a encontrar en Alertas (búsqueda es cada consulta al buscador).
				this.$toast.success(this.mensaje_de_inicio(res && res.data ? res.data : null), {
					duration: 6000,
				})
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
				this.$root.$emit('imagenes-automaticas:lote-iniciado',
					res && res.data ? res.data.batch_uuid : null)
			})
			.catch(error => {
				// 403 (ej: la sesion es vieja y la cuenta ya no tiene "Agentes de IA"): el interceptor
				// global (main.js) ya mostro el mensaje del API, asi que no se lo pisa con uno generico.
				if (error && error.response && error.response.status === 403) {
					return
				}
				/*
					422: todos los elegidos ya tenían imagen y la API no creó nada (o un rechazo de
					validación del pedido). Se avisa con el mensaje de la API, sin el error genérico
					y SIN emitir `imagenes-automaticas:lote-iniciado`: no hay ningún lote que esperar.
				*/
				if (error && error.response && error.response.status === 422) {
					this.$toast.info(this.mensaje_de_validacion(error.response.data), {
						duration: 6000,
					})
					return
				}
				this.$toast.error('No se pudo iniciar el procesamiento de imágenes')
			})
		},
		/**
		* El aviso de que arrancó la asignación. Desde el 23/10/2026 la API no busca los que ya
		* tienen imagen y lo dice en `articulos` y `saltados_con_imagen`; contra una API vieja,
		* que no los manda, queda el aviso de siempre.
		*
		* @param {Object|null} data La respuesta del POST.
		* @return {String}
		*/
		mensaje_de_inicio(data) {
			let cierre = 'El resultado va a quedar en Alertas → Imágenes.'

			if (!data || typeof data.articulos !== 'number') {
				return 'Asignando imágenes en segundo plano. ' + cierre
			}

			let articulos = data.articulos
			let saltados = typeof data.saltados_con_imagen === 'number' ? data.saltados_con_imagen : 0

			let mensaje = 'Asignando imágenes para ' + articulos + (articulos === 1 ? ' artículo' : ' artículos') + ' en segundo plano. '

			if (saltados > 0) {
				mensaje += saltados === 1
					? '1 ya tenía imagen y se salteó. '
					: saltados + ' ya tenían imagen y se saltearon. '
			}

			return mensaje + cierre
		},
		/**
		* El texto del aviso de un 422: el mensaje del campo `article_ids` si viene, si no el
		* `message` general de Laravel.
		*
		* @param {Object|undefined} data El cuerpo de la respuesta 422.
		* @return {String}
		*/
		mensaje_de_validacion(data) {
			if (data && data.errors && data.errors.article_ids && data.errors.article_ids.length) {
				return data.errors.article_ids[0]
			}

			if (data && data.message) {
				return data.message
			}

			return 'No se buscó ninguna imagen.'
		},
	},
}
</script>
