<template>
<b-modal
hide-footer
size="lg"
title="Buscar imagenes"
id="search-image">

	<div class="j-between">
		
		<b-form-input
		class="m-b-15"
		id="search-image-input"
		placeholder="Buscar imagenes"
		@keyup.enter="search"
		v-model="query"></b-form-input>

		<div
		class="busquedas-disponibles">
			{{ busquedas_disponibles }} busquedas disponibles
		</div>
	</div>

	<div
	class="cont-buttons">
		
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

		<b-input-group
		class="m-l-15"
		prepend="Segundos para seleccionar automaticamente">
			<b-form-input
			type="number"
			v-model="auto_select_timeout"></b-form-input>
		</b-input-group>
	</div>


	<div 
	v-if="flow_mode === 'auto'"
	@click="cancel_flow_model"
	:style="{ '--progress': auto_select_progress }"
	class="cancel-seleccion-automatica">
		<div class="text">
			Cancelar seleccion automatica
		</div>
	</div>

	<div
	v-if="!loading">
		<div 
		v-if="images_result"
		class="cont-images"
		:style="{ '--progress': auto_select_progress }">

			<vue-load-image
		    class="s-2 image-wrapper"
		    :class="getImageClass(index)"
			v-for="(image, index) in images_result"
    		@click.native="setImage(image)">
				<img 
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
		this.$root.$on('bv::modal::shown', (bvEvent, modalId) => {
			if (modalId == 'search-image') {
				// if (this.article.bar_code) {
				// 	this.query = this.article.bar_code
				// 	setTimeout(() => {
				// 		this.search() 
				// 	}, 300)
				// }
				this.get_current_geocoder_counter()

				// this.flow_mode = 'auto'
				// this.auto_select_progress = 0.6
			}
		})
	},
	data() {
		return {
			query: '',
			images_result: null,
			loading: false,
			current_geocoder_counter: null,

	        flow_mode: 'idle',               // 'idle' | 'auto' | 'manual'
	        // flow_mode: 'auto',               // 'idle' | 'auto' | 'manual'
	        auto_select_timer: null,
	        auto_select_start: null,
	        auto_select_progress: 0, // 0 → 1
	        // auto_select_progress: 0.6, // 0 → 1
	        raf_id: null,
		}
	},
	created() {
		console.log('SE CREO MODAL')
	},
	computed: {
		auto_select_timeout: {
	        get() {
	            // fallback por si el usuario aún no tiene el valor
	            return this.owner?.img_auto_timeout ?? 5
	        },
	        set(value) {
	            const seconds = Number(value)

	            if (isNaN(seconds) || seconds <= 0) return

	            this.$api.put('user/set-img-auto-timeout/'+seconds)
	        	.then(() => {
	        		let user = {...this.owner}
	        		user.img_auto_timeout = seconds
	        		this.$store.commit('user/setModel', {
	        			model: user,
	        			properties: [],
	        		})
	        	})
	        }
	    },
		article() {
			return this.$store.state.article.model 
		},
		google_api_key() {
			if (this.owner.google_custom_search_api_key) {
				console.log('google_api_key del owner: '+this.owner.google_custom_search_api_key)
				return this.owner.google_custom_search_api_key
			}
			return 'AIzaSyC4sUC-MuEDsMNoIQqwUPmYWZmw74rsHOI'
		},
		busquedas_disponibles() {
			if (this.current_geocoder_counter) {
				return this.owner.google_cuota - this.current_geocoder_counter.counter  
			}
		},
	},
	methods: {
		getImageClass(index) {
		    if (this.flow_mode === 'auto' && index === 0) {
		        return 'auto-select-border'
		    }
		    return ''
		},
		startAutoSelectProgress() {
		    this.auto_select_start = performance.now()

		    const animate = (now) => {
		        const elapsed = now - this.auto_select_start
		        this.auto_select_progress = Math.min(
		            elapsed / (this.auto_select_timeout * 1000),
		            1
		        )

		        if (this.auto_select_progress < 1 && this.flow_mode === 'auto') {
		            this.raf_id = requestAnimationFrame(animate)
		        }
		    }

		    this.raf_id = requestAnimationFrame(animate)
		},
		luckyFlow() {
			console.log('luckyFlow')

			if (this.article.bar_code) {
				this.query = this.article.bar_code
			} else if (this.article.name) {
				this.query = this.article.name
			} else {
				console.log('no se busco')
				return
			}

	        this.flow_mode = 'auto'
	        this.search()
	        .then(() => {

	                // Esperar unos segundos antes de seleccionar automáticamente
	        		this.startAutoSelectProgress()
	                this.auto_select_timer = setTimeout(() => {
	                    if (this.flow_mode === 'auto') {
	                        this.setImage(this.images_result[0])
	                    }
	                }, this.auto_select_timeout)
	        })
	    },
		async search() {
			if (this.busquedas_disponibles <= 0) {
				this.$toast.error('Ha alcanzado su limite de '+this.owner.google_cuota+' busquedas diarias')
				return
			}
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

						console.log('resultados de google:')
						console.log(body.searchInformation.totalResults)

						this.sumar_contador_de_busqueda()

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
		get_current_geocoder_counter() {

			this.$api.get('google/get-current')
			.then(res => {
				console.log('se inicio current_geocoder_counter')
				this.current_geocoder_counter = res.data.model
			})
			.catch(err => {
				console.log('error al actualizar contador de google')
			})
		},
		sumar_contador_de_busqueda() {
			this.$api.get('google/custom-search/aumentar-contador')
			.then(res => {
				this.current_geocoder_counter = res.data.model
			})
			.catch(err => {
				console.log('error al actualizar contador de google')
			})
		},
		setImage(image_url) {
			 if (this.flow_mode === 'auto') {
			 	this.cancel_flow_model()
		    }
			// this.$bvModal.hide('search-image') 
			this.$emit('setImageUrl', image_url) 
		},
		cancel_flow_model() {
	        this.flow_mode = 'manual'
	        cancelAnimationFrame(this.raf_id)
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

	.busquedas-disponibles
		width: 150px
		margin-left: 15px
		text-align: center
		font-weight: bold

	.cont-buttons
		display: flex  
		flex-direction: row 
		justify-content: flex-start
		align-items: center
		.input-group	
			width: 450px


	.cancel-seleccion-automatica
		width: 100%
		margin: 15px 0
		padding: 18px
		border-radius: 8px
		cursor: pointer
		position: relative
		overflow: hidden

		display: flex
		justify-content: center
		align-items: center

		font-size: 20px
		font-weight: bold
		color: #fff
		text-align: center

		background: conic-gradient(from 0deg,rgba(0, 123, 255, 0.85) 0%,rgba(255, 0, 0, 0.85) calc(var(--progress, 0) * 100%),rgba(200, 200, 200, 0.3) 0)

		transition: transform .15s ease, box-shadow .15s ease

		&:hover
			transform: scale(1.01)
			box-shadow: 0 4px 15px rgba(0,0,0,.25)

		&:active
			transform: scale(0.98)

		.text
			position: relative
			z-index: 2

			color: #fff

			// Stroke (Chrome, Edge, Safari)
			-webkit-text-stroke: .5px #000

			// Fallback para Firefox
			text-shadow: -.5px -.5px 0 #000,.5px -.5px 0 #000,-.5px  .5px 0 #000,.5px  .5px 0 #000


.image-wrapper

	transition: all .2s
	&::hover > img
		transform: scale(0.5)

.image-wrapper img
	position: relative
	z-index: 1


.image-wrapper.auto-select-border
	position: relative

	&::after
		padding: 10px
		z-index: 2
		content: ''
		position: absolute
		inset: -3px
		border-radius: 8px
		pointer-events: none

		background: conic-gradient(from 0deg, rgba(0, 123, 255, 0.9) 0%, rgba(255, 0, 0, 0.9) calc(var(--progress, 0) * 100%), rgba(0,0,0,0) 0)

		mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)
		mask-composite: exclude


</style>