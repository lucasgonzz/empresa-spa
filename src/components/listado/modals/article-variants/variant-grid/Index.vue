<template>
<div class="variant-grid">

	<div class="variant-grid__header">
		<p class="variant-grid__title">
			Variantes
		</p>

		<div class="variant-grid__actions">
			<!-- Toggle: por defecto solo se muestran las disponibles (!oculta) -->
			<button
			type="button"
			class="variant-grid__link-btn"
			@click="show_all = !show_all">
				{{ show_all ? 'Ver solo disponibles' : 'Ver todas las posibles' }}
			</button>

			<!-- Acciones masivas de disponibilidad (prompt 519/521), extraidas a sub-componente en el 543 -->
			<bulk-availability
			:article_id="article.id"
			@disponibilidad-actualizada="onDisponibilidadActualizada"></bulk-availability>
		</div>
	</div>

	<!-- Estado vacio: sin variantes generadas, o sin ninguna disponible con el filtro actual -->
	<p
	v-if="!variants_to_show.length"
	class="variant-grid__empty">
		{{ empty_message }}
	</p>

	<div
	v-else
	class="variant-grid__table-wrapper">
		<table class="variant-grid__table">
			<thead>
				<tr>
					<th>Imagen</th>
					<th>Variante</th>
					<th>Disponible</th>
					<th>Precio</th>
					<th
					v-for="address in addresses"
					:key="address.id">
						{{ address.street }}
					</th>
				</tr>
			</thead>
			<tbody>
				<variant-row
				v-for="variant in variants_to_show"
				:key="variant.id"
				:variant="variant"
				:addresses="addresses"
				@editImage="openImagePicker"></variant-row>
			</tbody>
		</table>
	</div>

	<!--
		Modal unico compartido por todas las filas para elegir imagen desde las imagenes ya
		cargadas del articulo. Reusa el componente generico de common-vue (SelectImage) en vez
		de duplicar la logica de seleccion/guardado.
	-->
	<select-image
	v-if="editing_variant"
	:prop="image_prop"
	:model="editing_variant"
	model_name="article_variant"></select-image>

	<btn-save></btn-save>
</div>
</template>
<script>
export default {
	components: {
		VariantRow: () => import('@/components/listado/modals/article-variants/variant-grid/VariantRow'),
		BtnSave: () => import('@/components/listado/modals/article-variants/variant-grid/BtnSave'),
		SelectImage: () => import('@/common-vue/components/model/images/SelectImage'),
		// Acciones masivas de disponibilidad: extraido del orquestador en el prompt 543 para
		// que este no tenga llamadas directas a $api (regla de CLAUDE.md).
		BulkAvailability: () => import('@/components/listado/modals/article-variants/variant-grid/BulkAvailability'),
	},
	data() {
		return {
			// Si es true se muestran TODAS las variantes (incluidas las no disponibles) para poder
			// habilitarlas/deshabilitarlas. Por defecto false: solo las disponibles (oculta = false).
			show_all: false,
			// Variante que se esta editando en el selector de imagen compartido (una sola instancia
			// de modal reutilizada por todas las filas, en vez de una por fila).
			editing_variant: null,
		}
	},
	computed: {
		/** Articulo cuyas variantes se estan configurando. */
		article() {
			return this.$store.state.article.model
		},
		/** Depositos (address) globales del negocio: definen las columnas de stock. */
		addresses() {
			return this.$store.state.address.models
		},
		/** Variantes ya generadas para el articulo (cargadas en showVariants, ver Buttons.vue). */
		variants() {
			return this.$store.state.article_variant.models
		},
		/** Listado a renderizar segun el filtro "ver todas" vs "solo disponibles". */
		variants_to_show() {
			if (this.show_all) {
				return this.variants
			}
			return this.variants.filter(variant => !variant.oculta)
		},
		/** Mensaje de estado vacio, distinto segun si hay variantes ocultas para descubrir con "ver todas". */
		empty_message() {
			if (!this.variants.length) {
				return 'Este articulo todavia no tiene variantes generadas. Agrega valores a las propiedades de arriba.'
			}
			return 'No hay variantes disponibles todavia. Proba "Ver todas las posibles" para habilitar alguna.'
		},
		/**
		 * Definicion de prop reutilizada por el SelectImage generico: la imagen de la variante
		 * se elige entre las imagenes ya subidas al articulo (mismo patron que otros modelos).
		 */
		image_prop() {
			return {
				key: 'image_url',
				select_image_from: {
					model_name: 'article',
					images_prop: 'images',
				},
			}
		},
	},
	methods: {
		/**
		 * Abre el selector de imagen compartido para una variante puntual.
		 *
		 * @param {Object} variant Variante (article_variant) cuya imagen se va a cambiar.
		 */
		openImagePicker(variant) {
			this.editing_variant = variant
			// El modal recien se crea en el DOM cuando editing_variant deja de ser null (v-if),
			// por eso el show se pide en el siguiente tick.
			this.$nextTick(() => {
				this.$bvModal.show('select-image-image_url')
			})
		},
		/**
		 * Recarga la grilla de variantes cuando el sub-componente BulkAvailability termina una
		 * accion masiva de disponibilidad (habilitar todas / segun stock / deshabilitar todas).
		 * El orquestador ya no llama al endpoint directamente (prompt 543): solo toma los modelos
		 * actualizados que le pasa el evento y los guarda en el store, igual que antes.
		 *
		 * @param {Array} updated_models Variantes actualizadas devueltas por el endpoint de disponibilidad masiva.
		 */
		onDisponibilidadActualizada(updated_models) {
			this.$store.commit('article_variant/setModels', updated_models)
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.variant-grid
	width: 100%
	&__header
		display: flex
		flex-direction: row
		align-items: center
		justify-content: space-between
		flex-wrap: wrap
		gap: 10px
		margin-bottom: 12px
	&__title
		font-size: 0.95em
		font-weight: 600
		letter-spacing: 0.02em
		text-transform: uppercase
		color: rgba(0, 0, 0, .45)
		margin-bottom: 0
	&__actions
		display: flex
		flex-direction: row
		align-items: center
		gap: 10px
	&__link-btn
		border: none
		background: transparent
		color: $blue
		font-weight: 500
		font-size: 0.9em
		padding: 4px 6px
		cursor: pointer
		&:hover
			text-decoration: underline
	&__empty
		text-align: center
		color: rgba(0, 0, 0, .45)
		background: #F0F0F3
		border-radius: 12px
		padding: 18px
		margin: 0
	&__table-wrapper
		width: 100%
		overflow-x: auto
		border-radius: 14px
		border: 1px solid rgba(0, 0, 0, .06)
	&__table
		width: 100%
		border-collapse: collapse
		th
			text-align: left
			font-size: 0.8em
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.02em
			color: rgba(0, 0, 0, .45)
			background: #F7F7F9
			padding: 10px 12px
			white-space: nowrap
		td
			padding: 10px 12px
			border-top: 1px solid rgba(0, 0, 0, .06)
			vertical-align: middle
</style>
