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

	<b-button
	@click="setBarCode"
	variant="primary">
		Con el Codigo
	</b-button>
	<b-button
	class="m-l-15"
	@click="setName"
	variant="primary">
		Con el Nombre
	</b-button>

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
	mounted() {
		this.$root.$on('bv::modal::show', (bvEvent, modalId) => {
			if (modalId == 'search-image') {
				if (this.article.bar_code) {
					this.query = this.article.bar_code
				} else {
					this.query = this.article.name
				}
				setTimeout(() => {
					this.search() 
				}, 300)
			}
		})
	},
	data() {
		return {
			query: '',
			images_result: null,
			loading: false,
		}
	},
	created() {
		console.log('SE CREO MODAL')
	},
	computed: {
		article() {
			return this.$store.state.article.model 
		},
		google_api_key() {
			if (this.owner.google_custom_search_api_key) {
				console.log('google_api_key del owner: '+this.owner.google_custom_search_api_key)
				return this.owner.google_custom_search_api_key
			}
			return 'AIzaSyC4sUC-MuEDsMNoIQqwUPmYWZmw74rsHOI'
		}
	},
	methods: {
		async search() {
			if (!this.loading) {
				console.log('Bucando imagen')
				this.images_result = null
				this.loading = true
				let url = 'https://www.googleapis.com/customsearch/v1?key='+this.google_api_key+'&cx=c442e5f346f314951&searchType=image&q='+this.query
				fetch(url)
				// fetch('https://www.googleapis.com/customsearch/v1?key=AIzaSyDOdbUFHZhD0I2DWoYVR6CQnKurqYY5rcQ&cx=c442e5f346f314951&searchType=image&q='+this.query)
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
				.catch(err => {
					this.loading = false
					this.$toast.error('Limite de busqueda diaria')
				})
			}
		},
		setImage(image_url) {
			this.$bvModal.hide('search-image') 
			this.$emit('setImageUrl', image_url) 
		},
		setBarCode() {
			if (this.article.bar_code) {
				this.query = this.article.bar_code
				this.search()
			}
		},
		setName() {
			this.query = this.article.name
			this.search()
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