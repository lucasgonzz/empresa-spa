<template>
	<div
	class="images m-b-15"
	v-if="model.id">

		<image-width 
		v-if="use_crop"></image-width>

		<upload-image 
		:prop="prop"
		:model_name="model_name"
		:model="model"
		:has_many_parent_model="has_many_parent_model"
		:has_many_prop="has_many_prop"></upload-image>

		<search-image 
		@setImage="setImage"></search-image>

		<my-upload 
		field="image_url"
		@srcFileSet="srcFileSet"
		@crop-success="cropSuccess"
		@crop-upload-success="cropUploadSuccess"
		@crop-upload-fail="cropUploadFail"
		@src-file-set="evento"
		v-model="show"
		:params="params"
		:headers="headers"
		:width="width"
		:height="width"
		:url="getImageUploadUrl(prop)"
		:langExt="langExt"
		:withCredentials="true"
		img-format="jpg"></my-upload>

		<div>
			<one-image
			v-if="prop.type == 'image'"
			:has_many_parent_model="has_many_parent_model"
			:has_many_prop="has_many_prop"
			@uploadImage="uploadImage"
			:model="model"
			:prop="prop"
			:model_name="model_name"></one-image>

			<carrousel
			v-else
			@uploadImage="uploadImage"
			:model="model"
			:prop="prop"
			:model_name="model_name"></carrousel>
			<b-button
			v-if="use_crop"
			v-b-modal="'crop-image-width'"
			class="m-t-15"
			size="sm"
			variant="primary">
				Tamaño: {{ width }}
			</b-button>
		</div>
	</div>
</template>
<script>
import myUpload from 'vue-image-crop-upload/upload-2.vue'
import OneImage from '@/common-vue/components/model/images/OneImage'
import Carrousel from '@/common-vue/components/model/images/Carrousel'
export default {
	props: ['model', 'model_name', 'prop', 'has_many_parent_model', 'has_many_prop'],
	components: {
		myUpload,
		OneImage,
		Carrousel,
		SearchImage: () => import('@/common-vue/components/model/images/SearchImage'),
		UploadImage: () => import('@/common-vue/components/model/images/UploadImage'),
		ImageWidth: () => import('@/common-vue/components/model/images/ImageWidth'),
	},
	data() {
		return {
			show: false,
			imgDataUrl: '',
			pre_image_url: null,
		}
	},
	computed: {
		width() {
			return this.$store.state.general.image_crop_width
		},
		height() {
			return this.$store.state.general.image_crop_height
		},
		params() {
			return {
				model_name: this.model_name,
				id: this.model.id,
				pre_image_url: this.pre_image_url,
			}
		},
		headers() {
			return {
				'X-XSRF-TOKEN': this.$cookies.get('XSRF-TOKEN')
			}
		},
		langExt() {
			return {
			    hint: 'Escoja un archivo o arrastrelo hasta aqui...',
			    loading: 'Subiendo..',
			    noSupported: 'Su navegador no tiene soporte, por favor, escoja otro navegador',
			    success: 'Subida exitosa',
			    fail: 'Error al subir',
			    preview: 'Pre-Vista',
			    btn: {
			    	off: 'Cancelar',
			    	close: 'Cerrar',
			    	back: 'Atras',
			    	save: 'Guardar'
			    },
			    error: {
			    	onlyImg: 'Image only',
			    	outOfSize: 'Image exceeds size limit: ',
			    	lowestPx: 'Image\'s size is too low. Expected at least: '
			    }
			}
		},
		use_crop() {
			return typeof this.prop.image_cropp == 'undefined' || this.prop.image_cropp
		},
	},
	methods: {
		evento() {
			console.log('eventoi')
		},
		srcFileSet(fileName, fileType, fileSize) {
			console.log(fileName)
			console.log(fileType)
			console.log(fileSize)
		},
		searchImage() {
			this.$bvModal.show('search-image')
		},
		uploadImage() {
			if (this.use_crop) {
				this.show = !this.show
			} else {
				this.$bvModal.show('upload-image')
			}
		},
		setImage(image) {
			setTimeout(() => {
				this.setCropImage(image)
			}, 100)
		},
		async setCropImage(image) {
			this.uploadImage()
			this.pre_image_url = image 
			let div = document.getElementsByClassName('vicp-drop-area')
			fetch(image, {
				mode: 'cors'
			})
			.then(response => {
				response.blob()
				.then(blob => {
					const file = new File([blob], 'image.jpeg', {type: 'image'})
					console.log(file)


					// setTimeout(() => {
						let input = div[0].children[3]
						console.log('input')
						console.log(input)
						const dataTransfer = new DataTransfer()
						dataTransfer.items.add(file)
						console.log('dataTransfer')
						console.log(dataTransfer)
						input.files = dataTransfer.files
						input.dispatchEvent(new Event('change'))
					// }, 500)
				})
			})
			.catch(err => {
				this.$toast.error('No se puede acceder a la imagen, intentelo con otra, por favor')
				this.uploadImage()
				this.$bvModal.show('search-image')
				setTimeout(() => {
					document.getElementById('search-image-input').focus()
				}, 200)
			})
		},
        
		cropSuccess(imgDataUrl, field){
			this.imgDataUrl = imgDataUrl;
		},
		
		cropUploadSuccess(jsonData, field){
			console.log('-------- upload success --------');
			console.log(jsonData)
			if (this.model_name == 'user') {
				this.$store.commit('auth/setUser', jsonData.model)
			} else {
				this.$store.commit(this.model_name+'/add', jsonData.model)
				this.$bvModal.hide(this.model_name)
				if (this.has_many_parent_model) {
					let index = this.has_many_parent_model[this.has_many_prop.key].findIndex(model => {
						return model.id == this.model.id 
					})
					if (index != -1) {
						this.has_many_parent_model[this.has_many_prop.key].splice(index, 1, jsonData.model)
					}
				}
				this.$toast.success('Imagen actualizada')
			}
		},
		
		cropUploadFail(status, field){
			console.log('-------- upload fail --------');
			console.log(status);
			console.log('field: ' + field);
		},
		upload() {
			this.$bvModal.show('upload-image')
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
		&:hover > button 
			display: block
		button 
			position: absolute
			top: 50%
			transform: translateY(-50%)
			left: 50%
			transform: translateX(-50%)
			display: none 

	.slide-img
		max-width: 100%
		@media screen and (max-width: 992px)
			max-height: 70vh
		@media screen and (min-width: 992px)
			max-height: calc(100vh - 150px)
</style>