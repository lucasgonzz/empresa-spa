<template>
<b-modal
hide-footer
size="lg"
title="Buscar imagenes"
id="search-image">
	<b-form-input
	class="m-b-15"
	id="search-image-input"
	placeholder="Buscar imagenes"
	@keyup.enter="search"
	v-model="query"></b-form-input>
	<div
	v-if="!loading">
		<div 
		v-if="images_result"
		class="cont-images">

			<vue-load-image
			class="s-2 apretable hoverable"
			v-for="image in images_result">
				<img 
				@click="setImage(image)"
				slot="image"
				class="b-r-1"
				:src="image">

				<div 
				slot="preloader"
				class="all-center-child">
			        <b-spinner
			        variant="primary"></b-spinner>
				</div>

				<div slot="error">Imagen no encontrada</div>
			</vue-load-image>	
		</div>
		<p 
		v-else
		class="text-with-icon">
			<i class="icon-eye-slash"></i>
			No se encontraron resultados
		</p>
	</div>
	<div
	v-else
	class="all-center-md">
	    <b-spinner 
	    variant="primary"></b-spinner>
	    <span
	    class="p-l-15">
	    	Buscando imagenes
	    </span>
	</div>
</b-modal>
</template>
<script>
import VueLoadImage from 'vue-load-image'
export default {
	components: {
		VueLoadImage,
	},
	data() {
		return {
			query: '',
			images_result: null,
			loading: false,
		}
	},
	methods: {
		async search() {
			this.images_result = null
			this.loading = true
			fetch('https://www.googleapis.com/customsearch/v1?key=AIzaSyC4sUC-MuEDsMNoIQqwUPmYWZmw74rsHOI&cx=c442e5f346f314951&searchType=image&q='+this.query)
			.then(res => {
				this.loading = false
				res.json()
				.then(body => {
					console.log(body.searchInformation.totalResults)
					if (body.searchInformation.totalResults == 0) {
						this.$toast.error('No se encontraron resultados, prueba con otras palabras por favor')
					} else if (body.items.length) {
						this.images_result = []
						body.items.forEach(item => {
							this.images_result.push(item.link)
						})
					} 
				})
			})
		},
		setImage(image_url) {
			this.$bvModal.hide('search-image') 
			this.$emit('setImageUrl', image_url) 
			// console.log('holas')
			// return 
			// this.loading = true
			// this.$api.post('save-pre-image', {
			// 	image_url: image_url 
			// })
			// .then(res => {
			// 	this.loading = false
			// 	if (res.data.image_saved) {
			// 		this.$bvModal.hide('search-image')
			// 		setTimeout(() => {
			// 			this.$emit('setImage', res.data.image_url)
			// 		}, 500)
			// 	} else {
			// 		this.$toast.error('Hubo un error al guardar la imagen')
			// 	}
			// })
			// .catch(err => {
			// 	this.loading = false
			// 	console.log(err)
			// 	this.$toast.error('Hubo un error al guardar la imagen')
			// })
		},
	}
}
</script>
<style lang="sass">
#search-image
	.cont-images
		display: flex
		flex-wrap: wrap 
		flex-direction: row
		align-items: flex-start
		.vue-load-image 
			width: 23%
			margin: 1%
			border-radius: 5px
			height: auto
			img 
				width: 100%
</style>