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
			@click="open_auto_timeout_config">
				<i class="icon-configuration"></i>
			</b-button>
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

	<b-modal
	:id="auto_timeout_modal_id"
	title="Configurar tiempo de selección automática"
	hide-footer>
		<p>
			Definí los segundos que espera el sistema antes de seleccionar automáticamente una imagen.
		</p>
		<b-input-group prepend="Segundos">
			<b-form-input
			type="number"
			min="1"
			v-model.number="config_timeout_value"></b-form-input>
		</b-input-group>
		<div class="d-flex justify-content-end m-t-15">
			<b-button
			variant="primary"
			@click="save_timeout_config">
				Guardar
			</b-button>
		</div>
	</b-modal>
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
		},
		/**
		* ID dinámico del modal de configuración para evitar colisiones entre instancias.
		*/
		auto_timeout_modal_id() {
			return 'config-auto-timeout-'+this.model_name+'-'+this.model.id+'-'+this.prop.key
		}
	},
	data() {
		return {
			file: null,
			height_adjusted: false,
			/* Valor editable para definir el tiempo del flujo automático en segundos. */
			config_timeout_value: 5,
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
		/**
		* Abre el modal y precarga el timeout actual del owner.
		*
		* @return {void}
		*/
		open_auto_timeout_config() {
			/* Se normaliza a Number para evitar que el input reciba string. */
			const owner_timeout = Number(this.owner && this.owner.img_auto_timeout ? this.owner.img_auto_timeout : 5)
			this.config_timeout_value = isNaN(owner_timeout) || owner_timeout <= 0 ? 5 : owner_timeout
			this.$bvModal.show(this.auto_timeout_modal_id)
		},
		/**
		* Persiste el timeout automático y actualiza el modelo de usuario en store.
		*
		* @return {void}
		*/
		save_timeout_config() {
			/* Valor solicitado por el usuario para timeout automático en segundos. */
			const seconds = Number(this.config_timeout_value)
			if (isNaN(seconds) || seconds <= 0) {
				this.$toast.error('Ingrese un tiempo válido mayor a 0')
				return
			}
			this.$api.put('user/set-img-auto-timeout/'+seconds)
			.then(() => {
				/* Usuario autenticado actual, fuente real de `owner` en los mixins globales. */
				let auth_user = this.user ? {...this.user} : null
				if (!auth_user) {
					this.$toast.error('No se pudo actualizar el usuario en memoria')
					return
				}

				/*
				* Si es empleado, el timeout vive en `auth_user.owner`.
				* Si es owner, vive en el propio `auth_user`.
				*/
				if (auth_user.owner_id) {
					/* Se clona owner para mantener reactividad en Vue 2. */
					let owner = {...(auth_user.owner || {})}
					owner.img_auto_timeout = seconds
					auth_user.owner = owner
				} else {
					auth_user.img_auto_timeout = seconds
				}

				/* Se actualiza `auth` porque de allí se calcula `owner` en toda la SPA. */
				this.$store.commit('auth/setUser', auth_user)
				this.$toast.success('Tiempo de espera actualizado')
				this.$bvModal.hide(this.auto_timeout_modal_id)
			})
			.catch(() => {
				this.$toast.error('No se pudo actualizar el tiempo de espera')
			})
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