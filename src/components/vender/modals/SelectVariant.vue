<template>
<!--
	Selector de variantes al escanear un articulo con variantes disponibles (Prompt 525).
	Se abre desde ArticleBarCode.vue cuando el back responde "has_variants: true".
	Tarjetas grandes y tappables (estetica Apple/POS), pensadas para tocar con el dedo o el mouse
	sin tener que apuntar con precision.
-->
<b-modal id="select-variant" title="Seleccionar modelo" size="lg" hide-footer>
	<div class="cont-article-cards">
		<b-card
		@click="selectVariant(variant)"
		class="card-article-variant c-p border-radius shadow-2"
		no-body
		v-for="variant in variants"
		:key="variant.variant_id">
			<!-- Imagen propia de la variante o, si no tiene, la del articulo padre (ver get_variant_images en el back) -->
			<img
			v-if="variant.images && variant.images.length"
			:src="variant.images[0].hosting_url"
			alt="Imagen de la variante">
			<i
			v-else
			class="icon-camera no-image-icon"></i>
			<p class="name">
				{{ article.name }} {{ variant.variant_description }}
			</p>
		</b-card>
	</div>
</b-modal>
</template>
<script>
// set_item_vender vive en mixins/vender/index.js (no confundir con mixins/vender.js,
// que es otro mixin distinto sin ese metodo)
import vender from '@/mixins/vender/index'
// Arma el item de la variante elegida (con su precio propio): funcion pura, ver el archivo
import { armar_item_de_variante } from '@/utils/item_de_variante'

export default {
	mixins: [vender],
	computed: {
		/**
		 * Articulo padre para el que se esta eligiendo variante. Lo deja en el store
		 * ArticleBarCode.vue (getArticleFromApi) via vender/setArticleForSale, junto con
		 * la lista de variantes disponibles que manda el back.
		 */
		article() {
			return this.$store.state.vender.article_for_sale
		},
		/**
		 * Lista de variantes disponibles del articulo, tal como las manda el back
		 * (shape real: variant_id / variant_description / images / final_price /
		 * precios_por_metodo_pago opcional). `final_price` es el precio propio de la variante o, si
		 * no tiene uno, el del articulo; `precios_por_metodo_pago` no lo manda un back viejo.
		 */
		variants() {
			return this.article.variants || []
		},
	},
	methods: {
		/**
		 * Se elige una variante puntual desde el selector: arma el item de venta con el
		 * shape real del back (variant_id, no id/description) y lo agrega por el flujo
		 * estandar del vender (set_item_vender ya traduce variant_id -> article_variant_id).
		 *
		 * El item lo arma armar_item_de_variante (utils/item_de_variante.js): el articulo padre +
		 * la marca de variante + el PRECIO PROPIO de la variante (final_price y, si llega,
		 * precios_por_metodo_pago). Antes salia con el precio del articulo aunque la variante
		 * tuviera uno propio, y el mismo producto se vendia a precios distintos segun se
		 * escaneara el codigo del articulo (este selector), el de la variante o se buscara por
		 * nombre. Stock y sucursales siguen siendo los del articulo; el porque esta en el helper.
		 *
		 * @param {Object} variant - Variante elegida (variant_id, variant_description, images,
		 *                           final_price, precios_por_metodo_pago opcional)
		 */
		selectVariant(variant) {

			// Item a agregar: el articulo padre + la marca de que es una variante puntual
			// (variant_description incluida: la explica el helper) + su precio propio
			let item = armar_item_de_variante(this.article, variant)

			this.$bvModal.hide('select-variant')

			this.set_item_vender(item)
		},
	},
}
</script>
<style scoped lang="sass">
.cont-article-cards
	display: flex
	flex-wrap: wrap
	gap: 15px

.card-article-variant
	width: 160px
	min-height: 160px
	display: flex
	align-items: center
	justify-content: center
	flex-direction: column
	transition: transform .15s ease, opacity .15s ease
	text-align: center

	&:hover
		transform: scale(1.03)
		opacity: .9

	img
		width: 100%
		height: 110px
		object-fit: cover

	.no-image-icon
		height: 110px
		width: 100%
		display: flex
		align-items: center
		justify-content: center
		font-size: 2em
		color: var(--color-text-secondary, rgba(0, 0, 0, .25))
		background: var(--bg-section, #F0F0F3)

	.name
		padding: 10px
		margin-bottom: 0
		font-weight: 500
		color: var(--color-text-primary, #1d1d1f)
</style>
