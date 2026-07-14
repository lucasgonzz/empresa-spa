<template>

	<div>



		<b-dropdown-divider></b-dropdown-divider>



		<dropdown-section-title

		title="Descripciones inteligentes"

		icon="icon-clipboard"></dropdown-section-title>



		<dropdown-option-item

		icon="bi bi-file-text"

		@click="start_batch_flow()">

			Generar descripciones automáticamente

		</dropdown-option-item>



		<dropdown-option-item

		icon="bi bi-arrow-repeat"

		@click="start_batch_flow(true)">

			Generar y reemplazar las generadas por IA (nunca pisa lo escrito a mano)

		</dropdown-option-item>



		<batch-descriptions-summary-modal

		:visible.sync="batch_summary_visible"

		:batch_result="batch_result"

		@confirmed="on_batch_summary_confirmed"

		@review="on_review_requested"></batch-descriptions-summary-modal>



		<ai-descriptions-review-modal

		:visible.sync="review_modal_visible"

		:initial_items="review_initial_items"></ai-descriptions-review-modal>



	</div>

</template>

<script>

import actualizar_lista_de_articulos from '@/mixins/listado/actualizar_lista_de_articulos'

import listado_articles_source from '@/mixins/listado/listado_articles_source'



export default {

	mixins: [actualizar_lista_de_articulos, listado_articles_source],
	components: {

		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),

		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),

		BatchDescriptionsSummaryModal: () => import('@/components/listado/components/selected-filtered-options/BatchDescriptionsSummaryModal'),

		AiDescriptionsReviewModal: () => import('@/components/listado/components/selected-filtered-options/AiDescriptionsReviewModal'),

	},
	data() {

		return {

			/* Controla visibilidad del modal resumen al recibir el evento Pusher. */

			batch_summary_visible: false,

			/* Payload recibido desde Pusher con el resumen del procesamiento. */

			batch_result: null,

			/* Controla visibilidad de la bandeja de revisión de baja confianza. */

			review_modal_visible: false,

			/* Items pre-cargados para la bandeja de revisión (vienen del resumen del batch, si existen). */

			review_initial_items: [],

		}

	},
	methods: {

		/**

		* Encola la generación masiva de descripciones y se suscribe a Pusher para recibir el resumen.
		* Nunca pisa descripciones cargadas a mano: si overwrite es true, solo se borran (y regeneran)
		* las descripciones previas que fueron generadas por IA.
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

			.then(() => {

				this.$toast.success('Generando descripciones en segundo plano...')

				this.start_pusher_listener()

			})

			.catch(() => {

				this.$toast.error('No se pudo iniciar la generación de descripciones')

			})

		},

		/**

		* Suscribe el canal Pusher del owner para recibir el evento de finalización del batch.
		*
		* @return {void}

		*/

		start_pusher_listener() {

			const channel_name = 'article_batch_descriptions.' + this.owner.id



			this.Echo.channel(channel_name)

			.listen('.ArticleBatchDescriptionsProcessed', (payload) => {

				this.batch_result = payload

				this.batch_summary_visible = true

				this.Echo.leaveChannel(channel_name)

			})

		},

		/**

		* Al confirmar el modal resumen, actualiza el listado si la ruta activa es article.
		*
		* @return {void}

		*/

		on_batch_summary_confirmed() {

			if (!this.is_on_article_list_view()) {

				return

			}

			this.get_ultimos_articulos_actualizados()

		},

		/**

		* Abre la bandeja de revisión con los items de baja confianza que trajo el resumen del batch.
		*
		* @param {Array} needs_review_items Items pendientes de revisión del payload de Pusher.
		* @return {void}

		*/

		on_review_requested(needs_review_items) {

			this.review_initial_items = needs_review_items || []

			this.review_modal_visible = true

		},

		/**

		* Indica si la ruta activa es el listado de artículos.
		*
		* @return {Boolean}

		*/

		is_on_article_list_view() {

			return this.$route && this.$route.name === 'article'

		},

	},
}

</script>

