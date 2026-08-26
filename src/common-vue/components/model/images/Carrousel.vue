<template>
<!--
	Campo de imagenes de un modelo (prop.type == 'images'), rediseñado el 13/8/2026.

	Antes era una pila suelta: un texto azul gigante de "No hay imagenes" con un ojo tachado de 4em,
	un grupo de tres botones soldados donde el engranaje de configuracion pesaba igual que la accion
	principal, y el input de archivo colgando abajo. Ahora hay tres bloques con jerarquia: el visor
	(carrusel o estado vacio), la fila de acciones y la zona de arrastre.
-->
<div class="images-field">
    <confirm
    text="la imagen"
    :actions="[model_name+'/deleteImageModel']"
    :id="'delete-'+model_name+'-images'"
    :model_name="model_name"
    toast="Imagen eliminada"></confirm>

	<!-- Visor: carrusel cuando ya hay imagenes cargadas -->
	<div
	v-if="model[prop.key].length"
	class="images-field__visor">
		<carousel
		ref="carousel"
		navigationEnabled
		navigationNextLabel="<i class='bi bi-chevron-right'></i>"
		navigationPrevLabel="<i class='bi bi-chevron-left'></i>"
		paginationColor="#c7c9cc"
		paginationActiveColor="#007bff"
		:paginationPadding="4"
		:paginationSize="7"
		loop
		:perPage="1"
		:adjustableHeight="false">
			<slide
			v-for="(image, index) in model[prop.key]"
			:data-index="index"
			:key="image.id">
				<div class="images-field__slide">
					<vue-load-image>
						<img
						@load="onImageLoaded"
						slot="image"
						class="images-field__img"
						:src="image.hosting_url">

				        <b-spinner
						slot="preloader"
				        variant="primary"></b-spinner>

						<div
						slot="error"
						class="images-field__error">
							<i class="bi bi-image-alt"></i>
							Imagen no encontrada
						</div>
					</vue-load-image>

					<!--
						Eliminar: boton redondo en la esquina de la imagen, no una barra roja tapando
						el centro. Se ve siempre (semitransparente) para que no haya que descubrirlo
						pasando el mouse, y se enciende al hover.
					-->
					<button
					type="button"
					class="images-field__eliminar"
					title="Eliminar esta imagen"
					@click="setDelete(image)">
						<i class="bi bi-trash"></i>
					</button>
				</div>
			</slide>
		</carousel>

		<p class="images-field__contador">
			{{ model[prop.key].length }}
			{{ model[prop.key].length == 1 ? 'imagen cargada' : 'imagenes cargadas' }}
		</p>
	</div>

	<!-- Visor: estado vacio -->
	<div
	v-else
	class="images-field__vacio">
		<div class="images-field__vacio-icono">
			<i class="bi bi-images"></i>
		</div>
		<p class="images-field__vacio-titulo">
			Sin imagenes
		</p>
		<p class="images-field__vacio-detalle">
			Subi una desde tu equipo, o buscala en internet.
		</p>
	</div>

	<!-- Acciones de busqueda en internet -->
	<div
	v-if="show_btn_google"
	class="images-field__acciones">
		<button
		type="button"
		class="images-field__accion images-field__accion--principal"
		@click="launchLuckyFlow">
			<i class="bi bi-magic"></i>
			Automatica
		</button>
		<button
		type="button"
		class="images-field__accion"
		@click="searchImage">
			<i class="bi bi-search"></i>
			Manual
		</button>
		<button
		type="button"
		class="images-field__accion images-field__accion--icono"
		title="Tiempo de espera de la seleccion automatica"
		@click="open_auto_timeout_config">
			<i class="bi bi-gear"></i>
		</button>
	</div>

	<!-- Zona de arrastre / seleccion desde el equipo -->
	<!--
		Sin :state: valia Boolean(file), y como el archivo se limpia apenas se sube, el campo
		quedaba SIEMPRE en estado invalido (borde rojo) sin que nada estuviera mal.
	-->
	<b-form-file
	:id="input_file_name"
	class="images-field__file"
	browse-text="Buscar en mi equipo"
	v-model="file"
	@change="upload"
	placeholder="Arrastra una imagen hasta aca"
	drop-placeholder="Solta la imagen aca"
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
		/**
		* Ajusta el alto del carrusel al de la imagen que se acaba de cargar.
		*
		* Mide el alto REAL de la imagen ya renderizada. Antes lo calculaba proyectando la relacion
		* de aspecto sobre el ancho del carrusel (ancho * naturalHeight / naturalWidth), cuenta que
		* ignoraba el max-height del CSS: con una foto vertical el carrusel se estiraba cientos de
		* pixeles de mas y quedaba un hueco blanco enorme debajo de la imagen.
		*
		* De paso fuerza a vue-carousel a recalcular su ancho. La libreria lo mide una sola vez al
		* montarse (node_modules/vue-carousel/src/Carousel.vue), y este carrusel vive dentro de un
		* modal que todavia esta oculto en ese momento: mide 0 y le queda visibility:hidden al
		* .VueCarousel-inner para siempre, sin ninguna imagen visible aunque el modal ya se haya
		* abierto. Para cuando la imagen termina de cargar el modal ya esta visible, asi que este es
		* el primer momento seguro para volver a medir.
		*
		* @param {Event} event Evento load del <img>.
		* @return {void}
		*/
		onImageLoaded(event) {

		    const img = event.target

		    this.$nextTick(() => {

		        if (!this.$refs.carousel) return

		        this.$refs.carousel.computeCarouselWidth()

		        const carouselEl = this.$refs.carousel.$el
		        const inner = carouselEl.querySelector('.VueCarousel-inner')

		        if (!inner) return

		        /* Alto ocupado por la imagen ya dibujada. */
		        const rendered_height = img.clientHeight || img.offsetHeight

		        if (!rendered_height) return

		        /* + el padding vertical del slide (6px arriba y 6px abajo, ver images/Index.vue). */
		        inner.style.height = (rendered_height + 12) + 'px'
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
