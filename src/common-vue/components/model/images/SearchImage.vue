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
			:key="image+'-'+index"
    		@click.native="setImage(image)">
				<img 
				slot="image"
				class="b-r-1"
				:src="image"
				@error="on_image_error(image)">

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
			/* URLs de resultados que no pudieron cargarse en el navegador. */
			failed_image_urls: [],

	        flow_mode: 'idle',               // 'idle' | 'auto' | 'manual'
	        // flow_mode: 'auto',               // 'idle' | 'auto' | 'manual'
	        auto_select_timer: null,
	        auto_select_start: null,
	        auto_select_progress: 0, // 0 → 1
	        /* Índice actual candidato para selección automática (para feedback visual). */
	        auto_select_target_index: 0,
	        /* Queries candidatas para el flujo automático (ej: bar_code y fallback a name). */
	        auto_flow_queries: [],
	        /* Posición actual dentro de `auto_flow_queries`. */
	        auto_flow_query_index: 0,
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
	            if (this.user) {
	            	return this.owner.img_auto_timeout ?? 5
	            }
	            return 5
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
		/**
		* Registra una URL de imagen que falló al cargar para evitar seleccionarla en automático.
		*
		* @param {String} image_url URL de la imagen fallida.
		* @return {void}
		*/
		on_image_error(image_url) {
			if (!image_url) {
				return
			}
			if (this.failed_image_urls.indexOf(image_url) === -1) {
				this.failed_image_urls.push(image_url)
			}
			/* Si falló la candidata actual en modo auto, mover borde enseguida a la siguiente. */
			if (this.flow_mode === 'auto') {
				const failed_index = this.images_result ? this.images_result.indexOf(image_url) : -1
				if (failed_index === this.auto_select_target_index) {
					this.move_auto_select_target_to_next_available(failed_index + 1)
				}
			}
		},
		/**
		* Mueve el índice visual de selección automática a la próxima imagen disponible.
		*
		* @param {Number} start_index Índice desde donde buscar la siguiente candidata.
		* @return {void}
		*/
		move_auto_select_target_to_next_available(start_index = 0) {
			if (!this.images_result || !this.images_result.length) {
				return
			}
			for (let index = start_index; index < this.images_result.length; index++) {
				const image_url = this.images_result[index]
				if (this.failed_image_urls.indexOf(image_url) === -1) {
					this.auto_select_target_index = index
					return
				}
			}
			/* Si no hay candidatas válidas, deja el índice en el último para evitar saltos raros. */
			this.auto_select_target_index = this.images_result.length - 1
		},
		getImageClass(index) {
		    if (this.flow_mode === 'auto' && index === this.auto_select_target_index) {
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
		/**
		* Verifica programáticamente si una URL de imagen carga correctamente.
		*
		* @param {String} image_url URL a validar.
		* @return {Promise<Boolean>} true si carga, false si falla o timeout.
		*/
		validate_image_url(image_url) {
			return new Promise(resolve => {
				/* Imagen auxiliar en memoria para comprobar carga real antes de seleccionar. */
				const test_image = new Image()
				let resolved = false

				const finalize_validation = (result) => {
					if (resolved) {
						return
					}
					resolved = true
					resolve(result)
				}

				test_image.onload = () => {
					finalize_validation(true)
				}

				test_image.onerror = () => {
					this.on_image_error(image_url)
					finalize_validation(false)
				}

				/* Evita quedar esperando indefinidamente cuando el host no responde. */
				setTimeout(() => {
					this.on_image_error(image_url)
					finalize_validation(false)
				}, 4000)

				test_image.src = image_url
			})
		},
		/**
		* Recorre resultados en orden y selecciona la primera imagen que realmente carga.
		*
		* @return {Promise<Boolean>} true si logró seleccionar una imagen válida.
		*/
		async select_first_available_image() {
			if (!this.images_result || !this.images_result.length) {
				return false
			}
			/* Arranca desde el índice visual actual para respetar el feedback mostrado al usuario. */
			for (let index = this.auto_select_target_index; index < this.images_result.length; index++) {
				/* Mantiene sincronizado el borde animado con el candidato actual. */
				this.auto_select_target_index = index
				const image_url = this.images_result[index]
				if (this.failed_image_urls.indexOf(image_url) !== -1) {
					continue
				}
				const image_is_valid = await this.validate_image_url(image_url)
				if (image_is_valid) {
					this.setImage(image_url)
					return true
				}
			}
			return false
		},
		/**
		* Valida el dígito verificador GS1 (módulo 10) para códigos de 8, 12, 13 o 14 dígitos.
		*
		* @param {String} code Cadena solo numérica incluyendo el dígito de control al final.
		* @return {Boolean} true si el dígito verificador es correcto.
		*/
		validate_gs1_check_digit(code) {
			const len = code.length
			if ([8, 12, 13, 14].indexOf(len) === -1) {
				return false
			}
			const digits = code.split('').map(digit => {
				return parseInt(digit, 10)
			})
			const check_digit = digits[len - 1]
			let sum = 0
			for (let i = len - 2; i >= 0; i--) {
				const position_from_right = len - 1 - i
				const weight = position_from_right % 2 === 1 ? 3 : 1
				sum += digits[i] * weight
			}
			const calculated = (10 - (sum % 10)) % 10
			return calculated === check_digit
		},
		/**
		* Determina si el valor puede usarse como código de barras de producto en búsqueda automática.
		* Solo acepta GTIN numérico (EAN-8, UPC/EAN-12, EAN-13, GTIN-14) con dígito verificador válido.
		*
		* @param {String} normalized Valor ya normalizado con getBarCode (sin espacios).
		* @return {Boolean}
		*/
		is_valid_product_bar_code(normalized) {
			if (!normalized || normalized.length === 0) {
				return false
			}
			if (!/^\d+$/.test(normalized)) {
				return false
			}
			return this.validate_gs1_check_digit(normalized)
		},
		/**
		* Prepara el orden de búsqueda automática priorizando código de barras y fallback por nombre.
		*
		* @param {Boolean} use_bar_code indica si el código pasó validaciones GS1.
		* @param {String} normalized_bar_code código normalizado para consulta.
		* @return {void}
		*/
		prepare_auto_flow_queries(use_bar_code, normalized_bar_code) {
			/* Reinicio explícito para evitar arrastre de búsquedas automáticas previas. */
			this.auto_flow_queries = []
			this.auto_flow_query_index = 0

			/* Prioridad 1: código de barras válido. */
			if (use_bar_code) {
				this.auto_flow_queries.push(normalized_bar_code)
			}

			/* Prioridad 2: nombre, solo si existe y no duplica la query previa. */
			if (this.article.name) {
				const normalized_name = String(this.article.name).trim()
				if (normalized_name !== '' && this.auto_flow_queries.indexOf(normalized_name) === -1) {
					this.auto_flow_queries.push(normalized_name)
				}
			}
		},
		/**
		* Avanza al siguiente criterio automático si quedan opciones por intentar.
		*
		* @return {Boolean} true si disparó una nueva búsqueda.
		*/
		try_next_auto_query() {
			/* Solo aplica en modo automático con estrategia inicializada. */
			if (this.flow_mode !== 'auto' || !this.auto_flow_queries.length) {
				return false
			}

			const next_index = this.auto_flow_query_index + 1
			if (next_index >= this.auto_flow_queries.length) {
				return false
			}

			this.auto_flow_query_index = next_index
			this.query = this.auto_flow_queries[this.auto_flow_query_index]
			this.search()
			return true
		},
		luckyFlow() {
			console.log('luckyFlow')
			/* Reinicia el candidato visual al primer resultado para un nuevo flujo auto. */
			this.auto_select_target_index = 0

			/* Código de barras solo en automático si existe y cumple formato GS1 con dígito verificador. */
			let normalized_bar_code = ''
			if (this.article.bar_code != null && this.article.bar_code !== '') {
				normalized_bar_code = this.getBarCode(String(this.article.bar_code))
			}

			console.log('codigo validado: '+this.is_valid_product_bar_code(normalized_bar_code))
			const use_bar_code = normalized_bar_code.length > 0 && this.is_valid_product_bar_code(normalized_bar_code)

			/* Define secuencia de búsqueda automática: bar_code => name. */
			this.prepare_auto_flow_queries(use_bar_code, normalized_bar_code)
			if (!this.auto_flow_queries.length) {
				console.log('no se busco')
				return
			}

			/* Primera query automática de la secuencia preparada. */
			this.query = this.auto_flow_queries[this.auto_flow_query_index]
	        this.flow_mode = 'auto'
	        this.search()
	    },
	    seleccionar_imagen_automaticamente() {
	    	// alert('Seleccionando en '+this.auto_select_timeout)
	        // Esperar unos segundos antes de seleccionar automáticamente
			this.startAutoSelectProgress()
	        this.auto_select_timer = setTimeout(async () => {
	            if (this.flow_mode === 'auto') {
	            	if (this.images_result.length) {
	            		/* Valida cada resultado en orden para evitar seleccionar enlaces rotos. */
	            		const image_selected = await this.select_first_available_image()
	            		if (image_selected) {
	            			return
	            		}
	            		this.$toast.error('No se pudo cargar ninguna imagen para seleccionar automáticamente')
	            	}
	            }
	        }, this.auto_select_timeout * 1000)
	    },
		async search() {
			if (this.busquedas_disponibles <= 0) {
				this.$toast.error('Ha alcanzado su limite de '+this.owner.google_cuota+' busquedas diarias')
				return
			}
			if (!this.loading) {
				console.log('Bucando imagen')
				this.images_result = null
				/* Reinicia el tracking de errores para la nueva búsqueda actual. */
				this.failed_image_urls = []
				/* Reinicia índice visual de selección automática. */
				this.auto_select_target_index = 0
				this.loading = true
				let url = 'https://www.googleapis.com/customsearch/v1?key='+this.google_api_key+'&cx=c442e5f346f314951&searchType=image&q='+this.query
				return fetch(url)
				// fetch('https://www.googleapis.com/customsearch/v1?key=AIzaSyDOdbUFHZhD0I2DWoYVR6CQnKurqYY5rcQ&cx=c442e5f346f314951&searchType=image&q='+this.query)
				.then(res => {
					this.loading = false
					res.json()
					.then(body => {

						console.log('resultados de google:')
						console.log(body.searchInformation.totalResults)

						this.sumar_contador_de_busqueda()

						if (body.searchInformation.totalResults == 0) {
							/* En automático, si no hubo resultados, intentar siguiente criterio antes de cancelar. */
							if (this.try_next_auto_query()) {
								return
							}
							this.$toast.error('No se encontraron resultados, prueba con otras palabras por favor')
						} else if (body.items.length) {
							this.images_result = []
							body.items.forEach(item => {
								this.images_result.push(item.link)
							})

							if (this.flow_mode == 'auto') {
								this.seleccionar_imagen_automaticamente()
							}
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
			this.$bvModal.hide('search-image') 
			this.$emit('setImageUrl', image_url) 
		},
		cancel_flow_model() {
	        this.flow_mode = 'manual'
	        cancelAnimationFrame(this.raf_id)
	        clearTimeout(this.auto_select_timer)
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