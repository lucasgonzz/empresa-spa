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
			@uploadImage="uploadImage"
			:has_many_parent_model="has_many_parent_model"
			:has_many_prop="has_many_prop"
			:model="model"
			:prop="prop"
			:model_name="model_name"></one-image>

			<carrousel
			v-else
			@uploadImage="uploadImage"
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
		
		uploadImage() {
			if (this.prop.select_image_from) {
				this.$bvModal.show('select-image-'+this.prop.key)
			} else {
				this.$bvModal.show('upload-image-'+this.prop.key)
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