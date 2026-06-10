<template>

<b-modal

scrollable

id="article-sales"

size="lg"

hide-footer

modal-class="article-sales-modal">



	<!-- Título del modal con nombre del artículo -->

	<template #modal-title>

		<div class="article-sales-modal__title">

			<span class="article-sales-modal__title-label">Ventas de</span>

			<strong class="article-sales-modal__title-name">{{ model.name }}</strong>

		</div>

	</template>



	<div class="article-sales-modal__body">



		<!-- Barra de filtros por rango de fechas -->

		<nav-component
		class="m-b-15"
		@getSales="getSales"></nav-component>



		<!-- Contenido según estado: resultados, carga o vacío -->

		<div

		v-if="results || loading"

		class="article-sales-modal__content">



			<!-- Resultados cargados -->

			<div

			v-if="!loading">

				<div

				v-if="results.length"

				class="article-sales-modal__results">



					<extra-information

					:results="results"></extra-information>



					<!-- Tabla de ventas (sin modificar el componente) -->

					<div class="article-sales-modal__table-wrap">

						<table-component

						model_name="sale"

						:usar_filtros="false"

						add_created_at

						:models="results">

							<template #table_right_options="data">

								<span class="p-l-15">

									Cantidad: {{ getArticleAmountInSale(data.model, model) }}

								</span>

							</template>

						</table-component>

					</div>

				</div>



				<!-- Sin ventas en el rango seleccionado -->

				<div

				v-else

				class="article-sales-modal__empty">

					<div class="article-sales-modal__empty-icon">

						<i class="icon-chart"></i>

					</div>

					<p class="article-sales-modal__empty-title">

						Sin ventas en el período

					</p>

					<p class="article-sales-modal__empty-text">

						No hay ventas de {{ model.name }} entre las fechas seleccionadas. Probá ampliando el rango.

					</p>

				</div>

			</div>



			<!-- Indicador de carga mientras consulta la API -->

			<div

			v-else

			class="article-sales-modal__loading">

				<b-spinner

				variant="primary"></b-spinner>

				<p class="article-sales-modal__loading-text">

					Buscando ventas...

				</p>

			</div>

		</div>



		<!-- Estado inicial: aún no se buscó -->

		<div

		v-else

		class="article-sales-modal__placeholder">

			<div class="article-sales-modal__empty-icon article-sales-modal__empty-icon--hint">

				<i class="icon-search"></i>

			</div>

			<p class="article-sales-modal__empty-title">

				Consultá las ventas del artículo

			</p>

			<p class="article-sales-modal__empty-text">

				Seleccioná el rango de fechas y presioná <strong>Buscar</strong>.

			</p>

		</div>



	</div>



</b-modal>

</template>

<script>

import article_sales from '@/mixins/article_sales'

export default {

	mixins: [article_sales],

	components: {

		NavComponent: () => import('@/components/listado/modals/article-sales/Nav'),

		ExtraInformation: () => import('@/components/listado/modals/article-sales/ExtraInformation'),

		TableComponent: () => import('@/common-vue/components/display/table/Index'),

        SaleDetails: () => import('@/components/ventas/modals/details/Index'),

	},

	computed: {

		/**

		 * Artículo seleccionado en el listado (contexto del modal).

		 */

		model() {

			return this.$store.state.article.model 

		},

	},

	data() {

		return {

			// Ventas devueltas por la API; null hasta la primera búsqueda

			results: null,

			// Indica si hay una petición de ventas en curso

			loading: false,

		}

	},

	mounted() {

		// Al abrir el modal se reinicia el estado para forzar una nueva búsqueda

		this.$root.$on('bv::modal::show', (bvEvent, modalId) => {

			this.results = null

		})

	},

	methods: {

		/**

		 * Consulta ventas del artículo en el rango de fechas indicado.

		 * @param {Object} dates - { from_date, until_date } en formato YYYY-MM-DD

		 */

		getSales(dates) {

			this.loading = true

			this.$api.get('article/sales/'+this.model.id+'/'+dates.from_date+'/'+dates.until_date)

			.then(res => {

				this.loading = false 

				this.results = res.data.result

			})

			.catch(err => {

				this.loading = false 

				this.$toast.error('Error al cargar ventas')

				console.log(err)

			})

		},

	}

}

</script>

<style lang="sass">

$as-accent: #2563eb

$as-border: #e2e8f0

$as-text: #0f172a

$as-muted: #64748b

$as-bg: #f8fafc



/* Contenedor del cuerpo del modal */

.article-sales-modal__body

	padding: 4px 2px 8px



/* Título personalizado del modal */

.article-sales-modal__title

	display: flex

	flex-direction: column

	line-height: 1.25

	gap: 2px



.article-sales-modal__title-label

	font-size: 0.75rem

	font-weight: 600

	color: $as-muted

	text-transform: uppercase

	letter-spacing: 0.05em



.article-sales-modal__title-name

	font-size: 1.05rem

	font-weight: 700

	color: $as-text



/* Zona de resultados y separación con la tabla */

.article-sales-modal__content

	margin-top: 4px



.article-sales-modal__results

	display: flex

	flex-direction: column

	gap: 20px



.article-sales-modal__table-wrap

	margin-top: 4px



/* Estados vacío, placeholder y carga */

.article-sales-modal__empty,

.article-sales-modal__placeholder,

.article-sales-modal__loading

	display: flex

	flex-direction: column

	align-items: center

	justify-content: center

	text-align: center

	padding: 36px 24px

	border-radius: 12px

	border: 1px dashed $as-border

	background: $as-bg

	min-height: 180px



.article-sales-modal__loading

	border-style: solid

	gap: 14px



.article-sales-modal__empty-icon

	width: 64px

	height: 64px

	border-radius: 50%

	display: flex

	align-items: center

	justify-content: center

	background: rgba($as-accent, 0.1)

	color: $as-accent

	margin-bottom: 16px



	i

		font-size: 1.75rem



		&:before

			margin-right: 0



.article-sales-modal__empty-icon--hint

	background: rgba($as-muted, 0.12)

	color: $as-muted



.article-sales-modal__empty-title

	font-size: 1.05rem

	font-weight: 700

	color: $as-text

	margin: 0 0 8px



.article-sales-modal__empty-text

	font-size: 0.9rem

	color: $as-muted

	margin: 0

	max-width: 360px

	line-height: 1.5



.article-sales-modal__loading-text

	font-size: 0.9rem

	color: $as-muted

	margin: 0



/* Ajustes del modal Bootstrap */

.article-sales-modal

	.modal-body

		padding: 16px 20px 20px



	.modal-header

		border-bottom: 1px solid $as-border

		padding: 14px 20px



</style>

