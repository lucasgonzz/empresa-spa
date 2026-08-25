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

			/*
			Resumen del procesamiento que termina mostrando el modal. El evento de Pusher solo
			trae contadores + batch_uuid (el detalle no cabe en el límite de Pusher con lotes
			grandes); esto se llena con la respuesta de article-image-search-attempts/summary,
			o con el payload liviano de Pusher tal cual si ese pedido falla.
			*/

			batch_result: null,

			/*
			batch_uuid de la corrida cuyo fetch a /summary está en vuelo. Sirve para descartar
			la respuesta si mientras tanto se disparó otra corrida (dos clics en "Asignar
			imágenes automáticamente" antes de que la primera termine).
			*/

			pending_batch_uuid: null,

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

				this.Echo.leaveChannel(channel_name)

				this.load_full_summary(payload)

			})

		},

		/**

		* El payload de Pusher solo trae contadores y el batch_uuid (no el detalle por artículo,

		* que puede superar el límite de Pusher con lotes grandes). Antes de abrir el modal se

		* pide el resumen completo por HTTP, mismo endpoint que ya usa el modal de historial.

		*

		* @param {Object} payload Payload liviano recibido por Pusher.

		* @return {void}

		*/

		load_full_summary(payload) {

			if (!payload || !payload.batch_uuid) {

				this.open_summary(payload)

				return

			}



			this.pending_batch_uuid = payload.batch_uuid



			this.$api.get('article-image-search-attempts/summary/' + payload.batch_uuid)

			.then((res) => {

				// Si mientras tanto se disparó otra corrida, esta respuesta ya no es la vigente:
				// no pisar lo que esté mostrando (o por mostrarse) la corrida más nueva.
				if (this.pending_batch_uuid !== payload.batch_uuid) {

					return

				}

				this.open_summary(res.data)

			})

			.catch(() => {

				if (this.pending_batch_uuid !== payload.batch_uuid) {

					return

				}

				this.$toast.error('No se pudo cargar el detalle del resumen de imágenes')

				this.open_summary(payload)

			})

		},

		/**

		* Setea el resultado del batch y recién entonces muestra el modal, para que se monte ya

		* con los datos definitivos.

		*

		* @param {Object} batch_result Resumen completo (o el payload liviano, si el detalle no se pudo cargar).

		* @return {void}

		*/

		open_summary(batch_result) {

			this.batch_result = batch_result

			this.batch_summary_visible = true

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

