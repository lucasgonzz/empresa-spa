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
<style scoped lang="sass">
.images
	img 
		max-width: 100%
	.VueCarousel-slide
		position: relative
		display: flex
		align-items: center
		height: 300px
		&:hover > button 
			display: block
		button 
			position: absolute
			top: 50%
			transform: translateY(-50%)
			left: 50%
			transform: translateX(-50%)
			display: none 

	// .slide-img
	// 	max-width: 100%
	// 	@media screen and (max-width: 992px)
	// 		max-height: 70vh
	// 	@media screen and (min-width: 992px)
	// 		max-height: calc(100vh - 150px)
</style>