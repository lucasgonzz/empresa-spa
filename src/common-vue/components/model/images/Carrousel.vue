<template>
<div>
    <confirm
    text="la imagen"
    :actions="[model_name+'/deleteImageModel']"
    :id="'delete-'+model_name+'-images'"
    :model_name="model_name"
    toast="Imagen eliminada"></confirm>

	<carousel
	ref="carousel"
	class="m-b-10 m-l-40 m-r-40"
	v-if="model[prop.key].length"
	navigationEnabled
	navigationNextLabel="<i class='icon-right'></i>"
	navigationPrevLabel="<i class='icon-left'></i>"
	paginationColor="#A9A9A9"
	:paginationPadding="5"
	loop
	:perPage="1"
	:adjustableHeight="false">
		<slide
		v-for="(image, index) in model[prop.key]"
		:data-index="index"
		:key="image.id">
			<vue-load-image>
				<img
				@load="onImageLoaded"
				slot="image"
				class="s-2 b-r-1" 
				:src="image[image_url_prop_name]">
				
		        <b-spinner
				slot="preloader"
		        variant="success"></b-spinner>

				<div slot="error">
					Imagen no encontrada
				</div>
			</vue-load-image>
			<b-button
			class="btn-delete"
			@click="setDelete(image)"
			variant="danger">
				Eliminar imagen
			</b-button>
		</slide>
	</carousel>
	<p 
	v-else
	class="text-with-icon">
		<i class="icon-eye-slash"></i>
		No hay imagenes
	</p>
	<div
	class="cont-btn-input"
	v-if="show_btn_google">
		
		<b-button-group
		class="m-b-10">
			<b-button
		    variant="primary"
		    @click="launchLuckyFlow">
				<i class="icon-search"></i>
				Automatica
			</b-button>
			<b-button
			variant="outline-primary"
			@click="searchImage">
				<i class="icon-search"></i>
				Manual
			</b-button>
		</b-button-group>

		<b-form-file
		:id="input_file_name"
		class="file-reader-input-with-button"
		browse-text="Buscar en pc"
		v-model="file"
		variant="primary"
		:state="Boolean(file)"
		@change="upload"
		placeholder="Arrastre su imagen aquí..."
		drop-placeholder="Solta la imagen aqui..."
		></b-form-file>

	</div>
	<b-form-file
	v-else
	:id="input_file_name"
	class="file-reader-input"
	browse-text="Buscar"
	v-model="file"
	variant="primary"
	:state="Boolean(file)"
	@change="upload"
	placeholder="Seleccione la imagen o arrastrala hasta aquí"
	drop-placeholder="Solta la imagen aqui..."
	></b-form-file>
</div>
</template>
<script>
import Confirm from '@/common-vue/components/Confirm'
import VueLoadImage from 'vue-load-image'
import { Carousel, Slide } from 'vue-carousel'
export default {
	props: ['model', 'model_name', 'prop'],
	components: {
		Confirm,
		VueLoadImage,
	    Carousel,
	    Slide
	},
	computed: {
		show_btn_google() {
			return typeof this.prop.not_show_google_search_option == 'undefined'
		},
		input_file_name() {
			return this.model_name+'-'+this.prop.key+'-input-file-drop'
		}
	},
	data() {
		return {
			file: null,
			height_adjusted: false,
		}
	},
	methods: {
		// onImageLoaded() {
		// 	const img = event.target

		//     this.$nextTick(() => {	

		//         if (!this.$refs.carousel) return

		//         setTimeout(() => {

		//         })

		//         const carouselEl = this.$refs.carousel.$el

		//         const newHeight = img.clientHeight + 40 // padding vertical

		//         carouselEl.querySelector('.VueCarousel-inner').style.height = newHeight + 'px'
		//         alert('se puso en '+newHeight)
		//     })
		// },
		onImageLoaded(event) {

		    const img = event.target

		    this.$nextTick(() => {

		        if (!this.$refs.carousel) return

		        const carouselEl = this.$refs.carousel.$el
		        const inner = carouselEl.querySelector('.VueCarousel-inner')

		        const containerWidth = carouselEl.clientWidth

		        // Calculamos el alto real proporcional
		        const ratio = img.naturalHeight / img.naturalWidth
		        const calculatedHeight = containerWidth * ratio

		        inner.style.height = calculatedHeight + 'px'
		    })
		},
		upload(event) {
			var file = document.getElementById(this.input_file_name).files[0];
			if (typeof file == 'undefined') {
				file = event.dataTransfer.files[0];		
			}
			var reader  = new FileReader();
			reader.readAsDataURL(file)
			let that = this
			reader.onloadend = function () {
				that.$emit('setImageUrl', reader.result)
				that.$bvModal.hide('upload-image-'+that.model.id+'-'+that.model.nombre+'-'+that.prop.key)
				that.file = null

			}
		},
		setDelete(image) {
			this.$store.commit(this.model_name+'/setDeleteImageModel', image)
			this.$bvModal.show('delete-'+this.model_name+'-images')
		},
		searchImage() {
			this.$bvModal.show('search-image')
			setTimeout(() => {
				document.getElementById('search-image-input').focus()
			}, 200)
		},
		launchLuckyFlow() {
	        this.$bvModal.show('search-image')
	        this.$emit('callLuckyFlow')
	    },

	    handleImageSelected(image_url) {
	        this.image_url = image_url
	        this.showCropper = true
	    }
	}
}
</script>
<style scoped lang="sass">
.VueCarousel-inner
	// height: 50vh !important
.VueCarousel-slide
	position: relative
	display: flex
	align-items: center
	justify-content: center
	height: auto
	// height: 50vh !important
	padding: 20px 0
	&:hover > .btn-delete 
		display: block
	.btn-delete 
		position: absolute
		top: 50%
		transform: translateY(-50%)
		left: 50%
		transform: translateX(-50%)
		display: none 

	img 
		max-width: 100%
		object-fit: contain
		@media screen and (max-width: 992px)
			// max-height: 70vh
		@media screen and (min-width: 992px)
			// max-height: 50vh
			// max-height: 50vh
			// max-height: calc(100vh - 150px)

.cont-btn-input
	display: flex 
	flex-direction: column 
	align-items: center 
	justify-content: space-between
	
	// button 
	// 	width: 120px
	// 	font-size: 14px
	// 	margin-right: 10px

	.file-reader-input-with-button
		// width: 250px !important
		// margin: 15px 0

.file-reader-input
	width: 100% !important
	margin: 15px 0

</style>