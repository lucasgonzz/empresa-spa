<template>
<div
v-if="should_show"
id="offline-articles-progress"
class="offline-articles-progress-active">
	<div class="j-center align-center">
		<strong
		class="text-primary">
			{{ progress_title }}
		</strong>
		<circle-progress
		class="m-l-20"
		:size="40"
		:porcentaje="percentage"></circle-progress>
	</div>

	<p
	class="m-b-0 m-t-10">
		{{ progress_status_message }}
	</p>

	<p class="m-b-0">
		Procesados: {{ numero_es(progress_processed) }} / {{ numero_es(progress_total) }}
	</p>

	<p class="m-b-0">
		Actualizados: {{ numero_es(progress_updated_downloaded) }} | Eliminados: {{ numero_es(progress_deleted_processed) }}
	</p>
</div>
</template>

<script>
export default {
	props: {
		/**
		 * Estado de progreso de sincronización offline de artículos.
		 */
		offline_articles_sync_progress: {
			type: Object,
			default() {
				return {
					visible: false,
					loading: false,
					finished: false,
					title: '',
					status_message: '',
					total: 0,
					processed: 0,
					updated_downloaded: 0,
					deleted_processed: 0,
				}
			}
		}
	},
	components: {
		CircleProgress: () => import('@/components/listado/modals/inventory-performance/CircleProgress'),
	},
	computed: {
		/**
		 * Indica si la tarjeta debe mostrarse al usuario.
		 *
		 * @returns {Boolean}
		 */
		should_show() {
			return !!(this.offline_articles_sync_progress && this.offline_articles_sync_progress.visible)
		},
		/**
		 * Resuelve el titulo visible de la tarjeta.
		 *
		 * @returns {String}
		 */
		progress_title() {
			return this.offline_articles_sync_progress.title || 'Actualizando articulos offline'
		},
		/**
		 * Mensaje descriptivo del estado actual.
		 *
		 * @returns {String}
		 */
		progress_status_message() {
			return this.offline_articles_sync_progress.status_message || ''
		},
		/**
		 * Total de artículos esperados a procesar.
		 *
		 * @returns {Number}
		 */
		progress_total() {
			return Number(this.offline_articles_sync_progress.total) || 0
		},
		/**
		 * Cantidad procesada hasta el momento.
		 *
		 * @returns {Number}
		 */
		progress_processed() {
			return Number(this.offline_articles_sync_progress.processed) || 0
		},
		/**
		 * Cantidad de artículos actualizados descargados.
		 *
		 * @returns {Number}
		 */
		progress_updated_downloaded() {
			return Number(this.offline_articles_sync_progress.updated_downloaded) || 0
		},
		/**
		 * Cantidad de artículos eliminados en almacenamiento local.
		 *
		 * @returns {Number}
		 */
		progress_deleted_processed() {
			return Number(this.offline_articles_sync_progress.deleted_processed) || 0
		},
		/**
		 * Porcentaje total de avance para círculo de progreso.
		 *
		 * @returns {Number}
		 */
		percentage() {
			/** Evita división por cero en procesos sin registros. */
			if (!this.progress_total) {
				return this.offline_articles_sync_progress.finished ? 100 : 0
			}
			return Math.min(100, Math.round(this.progress_processed * 100 / this.progress_total))
		},
	}
}
</script>

<style lang="sass">
@import '@/sass/_custom'

// Esta tarjeta comparte esquina con la de recursos del arranque (.recursos-tarjeta): las dos se
// muestran al mismo tiempo y las dos viven en top ~10px / right 20px. Como esta se monta despues en
// App.vue, ganaba por orden de pintado y tapaba a la otra por completo: quedaba invisible y, desde
// que se le puede hacer clic para desplegar el panel de recursos, tambien inclickeable.
//
// Se resuelve del otro lado, subiendole el z-index a la pastilla de recursos (que es la unica de
// las dos que se clickea), y NO bajando esta. Bajarla se probo el 15/8/2026 --top: 72px-- y el
// remedio salio peor: a esa altura la tarjeta se apoya sobre el encabezado de la tabla del listado
// y le roba los clicks a los botones de filtro de las columnas.
#offline-articles-progress
	width: 320px
	position: fixed
	top: 10px
	right: 20px
	border-radius: 8px
	padding: 12px
	// Tokens del tema (7/9/2026). Estaban en literales de modo claro y esta tarjeta se monta
	// sobre cualquier pantalla: en modo oscuro era un rectangulo blanco de 320px flotando
	// arriba a la derecha, con los contadores en gris claro sobre blanco. El fallback deja el
	// modo claro exactamente como estaba.
	background: var(--bg-card, #FFF)
	border: 2px solid var(--color-border, rgba(0, 0, 0, .1))
	// El texto de los contadores no declara color propio: sin esto lo hereda del <body>, que
	// en oscuro ya es claro, pero sobre la tarjeta blanca de antes quedaba ilegible. Se fija
	// aca para que la tarjeta sea coherente sola, no por herencia.
	color: var(--color-text-primary, inherit)
	z-index: 1000
	box-shadow: 0px 7px 29px 0px var(--shadow-color, rgba(100, 100, 111, 0.2))

.offline-articles-progress-active
	right: 20px !important
</style>
