<template>

	<div>

		<b-dropdown-divider></b-dropdown-divider>



		<dropdown-section-title

		title="Imágenes inteligentes"

		icon="icon-camera"></dropdown-section-title>



		<dropdown-option-item

		icon="bi bi-images"

		@click="start_batch_flow()">

			Asignar imágenes automáticamente

		</dropdown-option-item>



		<batch-images-summary-modal

		:visible.sync="batch_summary_visible"

		:batch_result="batch_result"

		@confirmed="on_batch_summary_confirmed"></batch-images-summary-modal>



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

		BatchImagesSummaryModal: () => import('@/components/listado/components/selected-filtered-options/BatchImagesSummaryModal'),

	},

	data() {

		return {

			/* Controla visibilidad del modal resumen al recibir el evento Pusher. */

			batch_summary_visible: false,

			/* Payload recibido desde Pusher con el resumen del procesamiento. */

			batch_result: null,

		}

	},

	methods: {

		/**

		* Determina la fuente según el dropdown activo, encola el batch y escucha Pusher.

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



			this.$api.post('google/batch-assign-images', {

				article_ids: article_ids,

			})

			.then(() => {

				this.$toast.success('Procesando imágenes en segundo plano...')

				this.start_pusher_listener()

			})

			.catch(() => {

				this.$toast.error('No se pudo iniciar el procesamiento de imágenes')

			})

		},

		/**

		* Suscribe el canal Pusher del owner para recibir el evento de finalización del batch.

		*

		* @return {void}

		*/

		start_pusher_listener() {

			const channel_name = 'article_batch_images.' + this.owner.id



			this.Echo.channel(channel_name)

			.listen('.ArticleBatchImagesProcessed', (payload) => {

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

