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
		<!--
			Demo sin búsquedas (misión tope-serper-demos): la opción queda apagada y se dice por qué.
			Es un b-dropdown-item `disabled` con las mismas clases que dropdown-option-item (que no
			tiene estado apagado), así se ve igual pero no se puede tocar.
		-->
		<template v-if="tope_demo_agotado">
			<b-dropdown-item
			disabled
			class="article-dropdown-option"
			data-testid="imagenes-automaticas-tope-demo-agotado">
				<span class="article-dropdown-option__content">
					<span class="article-dropdown-option__icon-wrap">
						<i class="bi bi-images"></i>
					</span>
					<span class="article-dropdown-option__label">
						Asignar imágenes automáticamente
					</span>
				</span>
			</b-dropdown-item>
			<b-dropdown-text
			class="search-image-automatica__tope">
				{{ mensaje_tope_demo_agotado }}
			</b-dropdown-text>
		</template>

		<dropdown-option-item
		v-else
		icon="bi bi-images"
		data_tour="listado.opcion_imagenes_automaticas"
		@click="start_batch_flow()">
			Asignar imágenes automáticamente
		</dropdown-option-item>

	</div>
</template>
<script>
import listado_articles_source from '@/mixins/listado/listado_articles_source'
import { normalizar_tope_demo, aviso_de_tope_demo, mensaje_de_tope_demo_agotado } from '@/store/image_assignment'

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
	data() {
		return {
			/**
			 * Tope de búsquedas de la demo (misión tope-serper-demos, 23/10/2026): {aplica, tope,
			 * usadas, restantes}. Fuera de una demo, o con una API vieja (404), `aplica` es false y
			 * nada cambia.
			 */
			tope_demo: normalizar_tope_demo(null),
		}
	},
	computed: {
		/** true en una demo que ya usó todas sus búsquedas: la opción queda apagada. */
		tope_demo_agotado() {
			return this.tope_demo.aplica && this.tope_demo.restantes <= 0
		},
		mensaje_tope_demo_agotado() {
			return mensaje_de_tope_demo_agotado(this.tope_demo)
		},
	},
	/**
	 * El dropdown se monta cuando hay algo seleccionado: es el momento de preguntar cuántas búsquedas
	 * quedan, así la opción ya aparece apagada si no queda ninguna. El pedido nunca falla (ver
	 * `get_tope_demo` en el store).
	 */
	mounted() {
		this.actualizar_tope_demo()
		this.$root.$on('bv::dropdown::show', this.al_abrir_un_menu)
	},
	beforeDestroy() {
		this.$root.$off('bv::dropdown::show', this.al_abrir_un_menu)
	},
	methods: {
		/**
		 * Pide el tope de la demo y lo guarda.
		 *
		 * @return {Promise<Object>} El tope normalizado.
		 */
		/**
		 * El menú puede haberse montado con búsquedas y quedarse sin ellas después (la corrida de
		 * otro menú las gastó): en una demo se vuelve a preguntar cada vez que se abre un menú, así
		 * la opción no aparece activa con un estado viejo. Fuera de una demo no pide nada.
		 *
		 * @return {void}
		 */
		al_abrir_un_menu() {
			if (this.tope_demo.aplica) {
				this.actualizar_tope_demo()
			}
		},
		actualizar_tope_demo() {
			return this.$store.dispatch('image_assignment/get_tope_demo')
			.then(tope => {
				this.tope_demo = tope
				return tope
			})
		},
		/**
		 * Antes de lanzar: en una demo se vuelve a preguntar cuántas búsquedas quedan (pudieron
		 * gastarse desde que se abrió el menú) y se avisa cuántas son; con 0, no se lanza. Fuera de
		 * una demo sigue directo, como siempre.
		 *
		 * @return {void}
		 */
		start_batch_flow() {
			let articles_source = this.resolve_articles()

			if (!articles_source || !articles_source.length) {
				this.$toast.error('No hay artículos para procesar')
				return
			}

			this.actualizar_tope_demo()
			.then(tope => {
				if (!tope.aplica) {
					this.lanzar_lote(articles_source)
					return
				}
				if (tope.restantes <= 0) {
					this.$toast.error(mensaje_de_tope_demo_agotado(tope), { duration: 6000 })
					return
				}
				// Desde $root: si el menú se desmonta mientras el aviso está abierto, el aviso no se
				// cierra solo (BootstrapVue lo destruye junto con el componente que lo abrió).
				this.$root.$bvModal.msgBoxConfirm(aviso_de_tope_demo(tope), {
					title: 'Búsquedas de la demo',
					okTitle: 'Asignar imágenes',
					cancelTitle: 'Cancelar',
					centered: true,
				})
				.then(confirmado => {
					if (confirmado) {
						this.lanzar_lote(articles_source)
					}
				})
			})
		},
		/**
		* Encola el batch y avisa por el bus de `$root` para que el anfitrión se ponga a escuchar el
		* fin del lote.
		*
		* @param {Array} articles_source Los artículos a procesar.
		* @return {void}
		*/
		lanzar_lote(articles_source) {
			let article_ids = []
			articles_source.forEach(function (article) {
				article_ids.push(article.id)
			})

			this.$api.post('google/batch-assign-images', {
				article_ids: article_ids,
			})
			.then(res => {
				// Dice dónde queda el resultado: el aviso de fin solo le llega a esta pestaña, pero
				// la asignación (con lo que quedó para revisar) queda siempre en Alertas → Imágenes.
				// "Asignando" y no "Buscando": es la palabra de la opción del menú y la de la fila
				// que va a encontrar en Alertas (búsqueda es cada consulta al buscador).
				this.$toast.success('Asignando imágenes en segundo plano. El resultado va a quedar en Alertas → Imágenes.', {
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
				// 422 {message} (por ejemplo, la demo llegó a su límite de búsquedas): el interceptor
				// global ya mostró el motivo de la API; el genérico de abajo lo taparía.
				if (error && error.response && error.response.status === 422) {
					this.actualizar_tope_demo()
					return
				}
				this.$toast.error('No se pudo iniciar el procesamiento de imágenes')
			})
		},
	},
}
</script>
<style lang="sass">
// Sin scope: el menú del dropdown se dibuja fuera del componente.
.search-image-automatica__tope
	max-width: 280px
	font-size: 0.8rem
	line-height: 1.35
	white-space: normal
	color: var(--color-text-secondary, #6c757d)

// La opción apagada se tiene que VER apagada: dropdown-option-item no trae ese estado.
.article-dropdown-option .dropdown-item.disabled .article-dropdown-option__content
	opacity: 0.5
</style>
