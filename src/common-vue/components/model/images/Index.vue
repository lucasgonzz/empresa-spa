<template>
	<div
	class="images m-b-15">

		<!-- <image-width 
		v-if="use_crop"></image-width> -->

		<upload-image 
		:prop="prop"
		@setImageUrl="setImageUrl"></upload-image>

		<search-image 
		@setImageUrl="setImageUrl"></search-image>

		<cropper
		:has_many_parent_model="has_many_parent_model"
		:has_many_prop="has_many_prop"
		:image_url="image_url"
		:model="model"
		:model_name="model_name"
		:prop="prop"></cropper>	

		<div>
			<one-image
			v-if="prop.type == 'image'"
			:has_many_parent_model="has_many_parent_model"
			:has_many_prop="has_many_prop"
			:model="model"
			:prop="prop"
			:model_name="model_name"></one-image>

			<carrousel
			v-else
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
export default {
	props: ['model', 'model_name', 'prop', 'has_many_parent_model', 'has_many_prop'],
	components: {
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
		}
	},
	computed: {
		use_crop() {
			return typeof this.prop.image_cropp == 'undefined' || this.prop.image_cropp
		},
	},
	methods: {
		setImageUrl(image_url) {
			this.image_url = image_url
			this.$bvModal.show('cropper-'+this.prop.key)
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