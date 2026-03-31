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
		Procesados: {{ progress_processed }} / {{ progress_total }}
	</p>

	<p class="m-b-0">
		Actualizados: {{ progress_updated_downloaded }} | Eliminados: {{ progress_deleted_processed }}
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

#offline-articles-progress
	width: 320px
	position: fixed
	top: 10px
	right: 20px
	border-radius: 8px
	padding: 12px
	background: #FFF
	border: 2px solid rgba(0, 0, 0, .1)
	z-index: 1000
	box-shadow: rgba(100, 100, 111, 0.2) 0px 7px 29px 0px

.offline-articles-progress-active
	right: 20px !important
</style>
