<template>
	<div
	class="images m-b-15">

		<select-image 
		:prop="prop"
		:model="model"
		:model_name="model_name"
		@setImageUrl="setImageUrl"></select-image>

		<upload-image 
		:prop="prop"
		:model_name="model_name"
		:model="model"
		@setImageUrl="setImageUrl"></upload-image>

		<search-image
		ref="searchImage"
		@no-image-available="on_no_image_available"
		@setImageUrl="setImageUrl"></search-image>

		<cropper
		:has_many_parent_model="has_many_parent_model"
		:has_many_prop="has_many_prop"
		:image_url="image_url"
		:model="model"
		:auto_crop="auto_crop"
		@image-saved="on_image_saved"
		@image-save-failed="on_image_save_failed"
		:model_name="model_name"
		:prop="prop"></cropper>

		<div>
			<one-image
			v-if="prop.type == 'image'"
			@uploadImage="uploadImage"
			@setImageUrl="setImageUrl"
			:has_many_parent_model="has_many_parent_model"
			:has_many_prop="has_many_prop"
			:model="model"
			:prop="prop"
			:model_name="model_name"></one-image>

			<carrousel
			v-else
			@uploadImage="uploadImage"
			@setImageUrl="setImageUrl"
			@callLuckyFlow="callLuckyFlow"
			:model="model"
			:prop="prop"
			:model_name="model_name"></carrousel>
		</div>
	</div>
</template>
<script>
import Cropper from '@/common-vue/components/model/images/Cropper'
import OneImage from '@/common-vue/components/model/images/OneImage'
import Carrousel from '@/common-vue/components/model/images/Carrousel'
/* Tope de reintentos por articulo en el flujo automatico. Sin tope, el modal se abre y cierra
   indefinidamente si toda la pagina de resultados es de sitios que bloquean la descarga. */
const MAX_AUTO_SAVE_RETRIES = 3
export default {
	props: ['model', 'model_name', 'prop', 'has_many_parent_model', 'has_many_prop'],
	components: {
		SelectImage: () => import('@/common-vue/components/model/images/SelectImage'),
		Cropper: () => import('@/common-vue/components/model/images/Cropper'),
		OneImage: () => import('@/common-vue/components/model/images/OneImage'),
		Carrousel: () => import('@/common-vue/components/model/images/Carrousel'),
		SearchImage: () => import('@/common-vue/components/model/images/SearchImage'),
		UploadImage: () => import('@/common-vue/components/model/images/UploadImage'),
	},
	data() {
		return {
			imgDataUrl: '',
			pre_image_url: null,
			image_url: '',
			auto_crop: false,
			/* Cuantas veces fallo el guardado en el servidor dentro del mismo flujo automatico. */
			auto_retry_count: 0,
		}
	},
	computed: {
		use_crop() {
			return typeof this.prop.image_cropp == 'undefined' || this.prop.image_cropp
		},
	},
	methods: {
		callLuckyFlow() {
			console.log('callLuckyFlow')
			/* Reinicia el contador de reintentos al arrancar un flujo automatico nuevo. */
			this.auto_retry_count = 0
	        this.$nextTick(() => {
				console.log('nextTick')
				this.auto_crop = true
	            this.$refs.searchImage.luckyFlow()
	        })
		},
		setImageUrl(image_url) {
			this.image_url = image_url
			this.$bvModal.show('cropper-'+this.model.id+'-'+this.model.nombre+'-'+this.prop.key)
			// this.$bvModal.show('cropper-'+this.prop.key)
		},
		/**
		* La imagen se guardo bien: se cierra el ciclo automatico.
		*
		* Esto es lo que antes intentaba hacer el binding @cancelAutoCrop, que nunca se disparaba
		* porque ningun componente emitia ese evento (grupo 262, prompt 03).
		*
		* @return {void}
		*/
		on_image_saved() {
			this.auto_crop = false
			this.auto_retry_count = 0
		},
		/**
		* El servidor no pudo guardar la imagen elegida automaticamente: se prueba la siguiente.
		*
		* En modo manual no se hace nada: el usuario ya vio el toast del Cropper y decide el.
		*
		* @param {Object} payload Con `image_url` (la que fallo) y `message`.
		* @return {void}
		*/
		on_image_save_failed(payload) {
			if (!this.auto_crop) {
				return
			}

			this.auto_retry_count++

			if (this.auto_retry_count > MAX_AUTO_SAVE_RETRIES) {
				this.auto_crop = false
				this.auto_retry_count = 0
				this.$toast.error('No se pudo guardar ninguna de las imágenes encontradas. Probá buscando con otras palabras.')
				return
			}

			const failed_url = payload && payload.image_url ? payload.image_url : this.image_url
			this.$refs.searchImage.retry_after_server_failure(failed_url)
		},
		/**
		* No quedaron imagenes para probar. SearchImage ya mostro el motivo, aca solo se cierra
		* el ciclo automatico para que un recorte manual posterior no se autoguarde solo.
		*
		* @return {void}
		*/
		on_no_image_available() {
			this.auto_crop = false
			this.auto_retry_count = 0
		},

		uploadImage() {
			if (this.prop.select_image_from) {
				this.$bvModal.show('select-image-'+this.prop.key)
			} else {
				this.$bvModal.show('upload-image-'+this.model.id+'-'+this.prop.key)
			}
		},
	}
}
</script>
<style lang="sass">
// Estilos del campo de imagenes de un modelo. Viven aca, en el orquestador, y no en Carrousel.vue
// ni en OneImage.vue, porque los dos hijos comparten el mismo chasis visual (.images-field) y solo
// uno de los dos se renderiza por vez: si el bloque viviera en el hijo, el otro caso se quedaria
// sin estilos el dia que estos componentes se carguen de forma diferida.
//
// El <style> NO es scoped: el carrusel (vue-carousel) genera su propio markup --.VueCarousel-slide,
// .VueCarousel-navigation-button, .VueCarousel-dot-- que no lleva el atributo de scope, igual que
// el markup interno del b-form-file de bootstrap-vue. Todo cuelga de .images-field para no pisar
// nada de afuera.
.images-field
	display: flex
	flex-direction: column
	gap: 12px

	// ─── Visor con imagenes ──────────────────────────────────────────────────
	.images-field__visor
		background: var(--bg-section, #f8f9fa)
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 12px
		padding: 8px 8px 4px

	.VueCarousel-slide
		position: relative
		display: flex
		align-items: center
		justify-content: center
		height: auto

	.images-field__slide
		position: relative
		display: flex
		align-items: center
		justify-content: center
		width: 100%
		padding: 6px 34px

	.images-field__img
		max-width: 100%
		max-height: 260px
		object-fit: contain
		border-radius: 8px

	.images-field__error
		display: flex
		flex-direction: column
		align-items: center
		gap: 6px
		padding: 32px 0
		font-size: 0.85rem
		color: var(--color-text-secondary, #6c757d)

		i
			font-size: 1.6rem

	// Eliminar: circulo chico arriba a la derecha de la imagen.
	.images-field__eliminar
		position: absolute
		top: 4px
		right: 34px
		display: flex
		align-items: center
		justify-content: center
		width: 30px
		height: 30px
		padding: 0
		border: none
		border-radius: 50%
		background: rgba(0, 0, 0, 0.35)
		color: #fff
		cursor: pointer
		opacity: 0.75
		box-shadow: none
		transition: background 0.15s ease, opacity 0.15s ease

		i
			font-size: 0.9rem
			line-height: 1

		&:hover,
		&:focus
			opacity: 1
			background: #b4443f
			outline: none

	.images-field__contador
		margin: 0
		padding-top: 6px
		text-align: center
		font-size: 0.75rem
		color: var(--color-text-secondary, #6c757d)

	// Flechas y puntos del carrusel, al tono del resto del sistema.
	//
	// El selector nombra .VueCarousel ademas del boton para quedar en (0,3,0): la regla propia de
	// vue-carousel (node_modules/vue-carousel/src/Navigation.vue) es (0,2,0) y empataria, y quien
	// gana dependeria del orden en que webpack meta los chunks.
	.VueCarousel .VueCarousel-navigation-button
		color: var(--color-text-secondary, #6c757d)
		padding: 0 6px !important

		&:focus
			outline: none

	// vue-carousel saca las flechas AFUERA de la caja del carrusel (left: 0 + translateX(-100%)).
	// Antes eso se compensaba con m-l-40/m-r-40 en el <carousel>; ahora el carrusel vive adentro de
	// una tarjeta con borde, asi que las flechas se dibujaban sobre la columna de al lado del
	// formulario. Se anula el corrimiento horizontal (el translateY vertical si se conserva) y las
	// flechas quedan sobre la imagen, en el espacio que .images-field__slide les reserva con su
	// padding lateral de 34px.
	.VueCarousel .VueCarousel-navigation-prev
		left: 6px
		transform: translateY(-50%) !important

	.VueCarousel .VueCarousel-navigation-next
		right: 6px
		transform: translateY(-50%) !important

	.VueCarousel .VueCarousel-navigation--disabled
		opacity: 0.35

	// ─── Estado vacio ────────────────────────────────────────────────────────
	// Reemplaza al texto azul con el ojo tachado de 4em (.text-with-icon), que gritaba mas que el
	// resto del formulario. Mismo lenguaje que el estado vacio del modal de busqueda.
	.images-field__vacio
		display: flex
		flex-direction: column
		align-items: center
		justify-content: center
		text-align: center
		padding: 26px 16px
		background: var(--bg-section, #f8f9fa)
		border: 1px dashed var(--color-border, #dee2e6)
		border-radius: 12px

	.images-field__vacio-icono
		display: flex
		align-items: center
		justify-content: center
		width: 46px
		height: 46px
		border-radius: 50%
		background: var(--bg-card, #fff)
		color: var(--color-text-secondary, #86868b)
		margin-bottom: 10px

		i
			font-size: 1.25rem

	.images-field__vacio-titulo
		margin: 0
		font-size: 0.95rem
		font-weight: 600
		color: var(--color-text-primary, #1d1d1f)

	.images-field__vacio-detalle
		margin: 4px 0 0
		font-size: 0.8rem
		color: var(--color-text-secondary, #86868b)

	// ─── Acciones ────────────────────────────────────────────────────────────
	// Antes eran tres botones azules soldados en un b-button-group, con el engranaje de
	// configuracion pesando lo mismo que la accion principal. Ahora la principal es la unica
	// llena, "Manual" es neutra y la configuracion es un icono suelto del mismo alto.
	.images-field__acciones
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 8px

	.images-field__accion
		display: inline-flex
		align-items: center
		justify-content: center
		gap: 7px
		height: var(--toolbar-control-h, 36px)
		padding: 0 14px
		font-size: 0.85rem
		font-weight: 600
		line-height: 1
		border-radius: var(--toolbar-btn-radius, 10px)
		border: 1px solid var(--color-border, #dee2e6)
		background: var(--bg-card, #fff)
		color: var(--color-text-primary, #212529)
		box-shadow: none
		cursor: pointer
		transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease

		i
			font-size: 0.95rem
			line-height: 1
			color: inherit

		&:hover,
		&:focus
			background: var(--bg-hover, #f1f3f5)
			outline: none

		&:focus-visible
			box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25)

	.images-field__accion--principal
		background: var(--color-primary, #007bff)
		border-color: var(--color-primary, #007bff)
		color: #fff

		i
			color: #fff

		&:hover,
		&:focus
			filter: brightness(0.94)
			background: var(--color-primary, #007bff)
			border-color: var(--color-primary, #007bff)
			color: #fff

	.images-field__accion--icono
		width: var(--toolbar-control-h, 36px)
		padding: 0

	// ─── Zona de arrastre ────────────────────────────────────────────────────
	.images-field__file
		width: 100%
		height: var(--toolbar-control-h, 36px)

		.custom-file-label
			display: flex
			align-items: center
			height: var(--toolbar-control-h, 36px)
			padding: 0 0.7rem
			font-size: 0.85rem
			line-height: 1
			color: var(--color-text-secondary, #6c757d)
			background: var(--bg-card, #fff)
			border: 1px dashed var(--color-border, #dee2e6)
			border-radius: 10px
			box-shadow: none

			&::after
				display: flex
				align-items: center
				height: calc(var(--toolbar-control-h, 36px) - 2px)
				padding: 0 0.85rem
				font-size: 0.8rem
				font-weight: 600
				color: var(--color-text-primary, #212529)
				background: var(--bg-section, #f8f9fa)
				border-left: 1px solid var(--color-border, #dee2e6)
				border-radius: 0 9px 9px 0

		.custom-file-input:focus ~ .custom-file-label
			border-color: var(--color-primary, #007bff)
			box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15)
</style>
