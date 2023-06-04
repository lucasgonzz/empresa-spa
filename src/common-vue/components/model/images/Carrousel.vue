<template>
<div>
    <confirm
    text="la imagen"
    :actions="[model_name+'/deleteImageModel']"
    :id="'delete-'+model_name+'-images'"
    :model_name="model_name"
    toast="Imagen eliminada"></confirm>

	<carousel
	class="m-b-10 m-l-40 m-r-40"
	v-if="model[prop.key].length"
	navigationEnabled
	navigationNextLabel="<i class='icon-right'></i>"
	navigationPrevLabel="<i class='icon-left'></i>"
	paginationColor="#A9A9A9"
	:paginationPadding="5"
	loop
	:perPage="1"
	:adjustableHeight="true">
		<slide
		v-for="(image, index) in model[prop.key]"
		:data-index="index"
		:key="image.id">
			<vue-load-image>
				<img
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
	<b-button-group>
		<b-button
		size="sm"
		variant="outline-primary"
		@click="searchImage">
			Buscar imagen en Google
		</b-button>
		<b-button
		size="sm"
		variant="outline-primary"
		@click="uploadImage">
			Buscar imagen en este equipo 
		</b-button>
	</b-button-group>
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
	methods: {
		uploadImage() {
			this.$emit('uploadImage')
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
	}
}
</script>
<style scoped lang="sass">
.VueCarousel-inner
	height: 50vh !important
.VueCarousel-slide
	position: relative
	display: flex
	align-items: center
	justify-content: center
	height: 50vh !important
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
		@media screen and (max-width: 992px)
			max-height: 70vh
		@media screen and (min-width: 992px)
			max-height: 50vh
			// max-height: 50vh
			// max-height: calc(100vh - 150px)
</style>