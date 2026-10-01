<template>
<b-modal
id="variant-image-modal"
:title="title"
size="md"
hide-footer
modal-class="variant-image-modal">

	<div v-if="variant">

		<!--
			Mismo campo de imagen que usa el resto del sistema para un modelo con una sola imagen
			(common-vue/images/Index): vista previa, quitar, "Buscar en mi equipo" (arrastrar o elegir
			un archivo) y el recorte. Trae adentro el buscador de Google (modal "search-image").
			La imagen guardada vuelve por el store de article_variant, de ahi sale `variant`.
		-->
		<images
		:key="variant.id"
		:model="variant"
		model_name="article_variant"
		:prop="image_prop"></images>

		<!-- Buscar en Google: abre el mismo buscador del listado; la imagen elegida pasa al recorte. -->
		<div class="variant-image-modal__google-wrapper">
			<button
			type="button"
			class="variant-image-modal__google"
			@click="searchInGoogle">
				<i class="bi bi-search"></i>
				Buscar en Google
			</button>
		</div>
	</div>
</b-modal>
</template>
<script>
import Images from '@/common-vue/components/model/images/Index'

export default {
	components: {
		Images,
	},
	props: {
		/** Id de la variante (article_variant) cuya imagen se esta editando; null si no hay ninguna. */
		variant_id: {
			default: null,
		},
	},
	computed: {
		/**
		 * Variante que se esta editando, leida SIEMPRE del store por id. Al guardar o quitar la
		 * imagen el store reemplaza la variante por la copia que devuelve el back: leerla de ahi
		 * hace que la vista previa se actualice sola.
		 */
		variant() {
			if (this.variant_id === null) {
				return null
			}
			let variant = this.$store.state.article_variant.models.find(_variant => _variant.id == this.variant_id)
			return variant || null
		},
		title() {
			if (this.variant) {
				return 'Imagen de '+this.variant.variant_description
			}
			return 'Imagen de la variante'
		},
		/**
		 * Definicion de prop de imagen unica para el campo generico: la imagen se guarda en
		 * article_variants.image_url (POST set-image/image_url con model_name article_variant).
		 */
		image_prop() {
			return {
				key: 'image_url',
				type: 'image',
				text: 'Imagen',
			}
		},
	},
	methods: {
		/** Abre el buscador de imagenes de Google (el mismo del listado) y deja el cursor en el campo de busqueda. */
		searchInGoogle() {
			this.$bvModal.show('search-image')
			setTimeout(() => {
				let input = document.getElementById('search-image-input')
				if (input) {
					input.focus()
				}
			}, 200)
		},
	},
}
</script>
<style lang="sass">
.variant-image-modal
	// Mismo lenguaje que las acciones del campo de imagenes (.images-field__accion).
	&__google-wrapper
		margin-top: 12px
	&__google
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 7px
		width: 100%
		height: var(--toolbar-control-h, 36px)
		padding: 0 14px
		font-size: 0.85rem
		font-weight: 600
		line-height: 1
		border-radius: var(--toolbar-btn-radius, 10px)
		border: 1px solid var(--color-border, #dee2e6)
		background: var(--bg-card, #fff)
		color: var(--color-text-primary, #212529)
		cursor: pointer
		transition: background .15s ease, border-color .15s ease
		&:hover,
		&:focus
			background: var(--bg-hover, #f1f3f5)
			outline: none
</style>
