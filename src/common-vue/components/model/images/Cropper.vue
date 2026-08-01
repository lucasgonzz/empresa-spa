<template>
	<b-modal
	title="Recortar Imagen"
	hide-footer
	size="lg"
	@shown="onModalShown"
	@hidden="onModalHidden"
	:id="'cropper-'+model.id+'-'+model.nombre+'-'+prop.key">
		<cropper
		ref="cropper"
		class="cropper"
		:canvas="false"
		:src="image_url"
		:stencil-props="stencil_props"
		@ready="onCropperReady"
		@error="on_cropper_image_error"
		@change="change"/>

		<b-progress
	    class="m-t-15 m-b-10"
	    height="15px"
	    variant="primary"
	    :max="1"
	    :value="auto_crop_progress"
	    animated/>

	    <p
		    class="text-center text-muted m-t-5"
		    v-if="auto_save_enabled"
		>
		    Guardado automático en {{ auto_crop_seconds_left }} segundos…
		</p>

		<p
		    class="text-center m-t-5"
		    v-else
		>
		    Autoguardado cancelado — ajustá el recorte y guardá manualmente
		</p>

		<b-btn-group
		class="w-100">
			<btn-loader
			:block="false"
			class="m-t-15"
			variant="outline-primary"
			@clicked="uploadImage(false)"
			:loader="loading_not_cropp"
			text="Guardar SIN Recortar"></btn-loader>
			
			<btn-loader
			:block="false"
			class="m-t-15"
			@clicked="uploadImage(true)"
			:loader="loading_cropp"
			text="Guardar"></btn-loader>
		</b-btn-group>
	</b-modal>
</template>
<script>
import { Cropper } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

export default {
	props: {
		prop: Object,
		model: Object,
		image_url: String,
		model_name: String,
		has_many_parent_model: Object,
		has_many_prop: Object,
	    auto_crop: {
	        type: Boolean,
	        default: false,
	    },
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		Cropper,
	},
	computed: {
		stencil_props() {
			if (this.aspect_ratio_disabled) {
				return {
					aspectRatio: 0,
				}
			}
			if (
				this.prop.crop_aspect_ratio
				|| this.prop.crop_aspect_ratio == 0
			) {
				return {
					aspectRatio: this.prop.crop_aspect_ratio
				}	
			}
			return {
				aspectRatio: 1
			}
		},
		auto_crop_seconds_left() {
	        const remaining = Math.ceil(
	            (1 - this.auto_crop_progress) * (this.auto_crop_delay / 1000)
	        )
	        return remaining > 0 ? remaining : 0
	    },
	    /**
	    * Tiempo de autoguardado en milisegundos, sincronizado con la configuración del usuario.
	    * Usa el mismo valor `img_auto_timeout` que se edita desde el botón de configuración del carrusel.
	    *
	    * @return {Number}
	    */
	    auto_crop_delay() {
	    	/* Se toma el timeout guardado en owner; fallback a 5 segundos para compatibilidad. */
	    	const seconds = Number(this.owner && this.owner.img_auto_timeout ? this.owner.img_auto_timeout : 5)
	    	if (isNaN(seconds) || seconds <= 0) {
	    		return 5000
	    	}
	    	return seconds * 1000
	    },
	},
	data() {
		return {
			/* Estado de carga del botón guardar con recorte. */
			loading_cropp: false,
			/* Estado de carga del botón guardar sin recorte. */
			loading_not_cropp: false,
			/* Coordenadas actuales del stencil emitidas por el cropper. */
			coordinates: null,

	        // ⏱ auto recorte
	        /* Marca de tiempo de inicio para la barra de progreso de autoguardado. */
	        auto_crop_start: null,
	        /* Progreso visual del autoguardado entre 0 y 1. */
	        auto_crop_progress: 0,
	        /* Timer reservado para futuras extensiones de autoguardado. */
	        auto_crop_timer: null,
	        /* Id del requestAnimationFrame del progreso. */
	        raf_id: null,

	        /* Flag para distinguir setCoordinates programático de interacción manual. */
	        is_setting_coordinates: false,

	        /* Permite cancelar autoguardado cuando el usuario mueve el recorte. */
	        auto_save_enabled: true,
	        /* Indica que el modal está visible y habilitado para inicializar cropper. */
	        modal_is_visible: false,
	        /* Indica que vue-advanced-cropper ya notificó estado listo. */
	        cropper_is_ready: false,
	        /* Señala si hubo interacción manual (mouse/touch) sobre el área de recorte. */
	        has_manual_crop_interaction: false,
	        /* Referencia al elemento raíz del cropper para registrar/remover listeners. */
	        cropper_root_element: null,
		}
	},
	beforeDestroy() {
		this.detachCropperInteractionListeners()
		this.clearAutoCropRuntime()
	},
	methods: {
		/**
		* Marca que el usuario comenzó a interactuar manualmente con el área de recorte.
		*
		* @return {void}
		*/
		onCropperPointerDown() {
			this.has_manual_crop_interaction = true
		},
		/**
		* Registra listeners de interacción manual sobre el root del cropper.
		*
		* @return {void}
		*/
		attachCropperInteractionListeners() {
			/* Se limpia cualquier listener previo antes de registrar de nuevo. */
			this.detachCropperInteractionListeners()
			const cropper_component = this.$refs.cropper
			if (!cropper_component || !cropper_component.$el) {
				return
			}
			this.cropper_root_element = cropper_component.$el
			this.cropper_root_element.addEventListener('mousedown', this.onCropperPointerDown)
			this.cropper_root_element.addEventListener('touchstart', this.onCropperPointerDown, { passive: true })
		},
		/**
		* Remueve listeners de interacción manual para evitar duplicaciones/memory leaks.
		*
		* @return {void}
		*/
		detachCropperInteractionListeners() {
			if (!this.cropper_root_element) {
				return
			}
			this.cropper_root_element.removeEventListener('mousedown', this.onCropperPointerDown)
			this.cropper_root_element.removeEventListener('touchstart', this.onCropperPointerDown)
			this.cropper_root_element = null
		},
		/**
		* Limpia timers/animaciones del autoguardado para evitar ejecuciones duplicadas.
		*
		* @return {void}
		*/
		clearAutoCropRuntime() {
			if (this.raf_id) {
				cancelAnimationFrame(this.raf_id)
				this.raf_id = null
			}
			if (this.auto_crop_timer) {
				clearTimeout(this.auto_crop_timer)
				this.auto_crop_timer = null
			}
		},
		/**
		* Ejecuta inicialización de recorte solo cuando modal y cropper están listos.
		*
		* @return {void}
		*/
		tryInitializeCropper() {
			if (!this.modal_is_visible || !this.cropper_is_ready) {
				return
			}
			this.setInitialCrop()
		},
		onModalShown() {
			/* El modal quedó visible; se intenta inicializar cuando el cropper esté listo. */
			this.modal_is_visible = true
			this.clearAutoCropRuntime()
			this.auto_save_enabled = true
			this.auto_crop_progress = 0
			this.has_manual_crop_interaction = false
			this.$nextTick(() => {
				this.attachCropperInteractionListeners()
			})
			this.tryInitializeCropper()
	    },
	    /**
	    * Resetea estados al cerrar modal para evitar basura de una ejecución previa.
	    *
	    * @return {void}
	    */
	    onModalHidden() {
	    	this.modal_is_visible = false
	    	this.cropper_is_ready = false
	    	this.is_setting_coordinates = false
	    	this.auto_save_enabled = true
	    	this.auto_crop_progress = 0
	    	this.has_manual_crop_interaction = false
	    	this.detachCropperInteractionListeners()
	    	this.clearAutoCropRuntime()
	    },
	    /**
	    * Se dispara cuando el cropper terminó de montar y cargar la imagen.
	    *
	    * @return {void}
	    */
	    onCropperReady() {
	    	this.cropper_is_ready = true
	    	this.tryInitializeCropper()
	    },
	    /**
	    * Se dispara cuando vue-advanced-cropper no puede cargar la URL de la imagen.
	    *
	    * @return {void}
	    */
	    on_cropper_image_error() {
	    	this.notify_image_save_failed('No se pudo abrir la imagen para recortar. Probá con otra imagen de los resultados.')
	    },
	    /**
	    * Devuelve el mensaje de error que mando la API, o el texto de reserva si no vino ninguno.
	    *
	    * El endpoint set-image responde 422 con un `message` ya redactado para mostrarse tal cual
	    * (ver grupo 262, prompt 01). Cualquier otro error de red o de servidor cae en el fallback.
	    *
	    * @param {Object} err Error de axios.
	    * @param {String} fallback Texto a mostrar si la API no dijo nada util.
	    * @return {String}
	    */
	    get_backend_error_message(err, fallback) {
	    	if (
	    		err
	    		&& err.response
	    		&& err.response.data
	    		&& typeof err.response.data.message === 'string'
	    		&& err.response.data.message.length
	    	) {
	    		return err.response.data.message
	    	}
	    	return fallback
	    },
	    /**
	    * Cierra el modal de recorte, avisa al usuario y notifica al padre.
	    *
	    * A diferencia de la version anterior, el toast sale SIEMPRE: en el flujo automatico el
	    * usuario tambien tiene que enterarse de que la imagen no se guardo. El evento sigue
	    * emitiendose para que el padre pueda encadenar el reintento (grupo 262, prompt 03).
	    *
	    * @param {String} message Texto exacto a mostrar al usuario.
	    * @return {void}
	    */
	    notify_image_save_failed(message) {
	    	this.clearAutoCropRuntime()
	    	this.loading_cropp = false
	    	this.loading_not_cropp = false
	    	this.$bvModal.hide('cropper-'+this.model.id+'-'+this.model.nombre+'-'+this.prop.key)
	    	this.$toast.error(message)
	    	this.$emit('image-save-failed', {
	    		image_url: this.image_url,
	    		message: message,
	    	})
	    },

	    startAutoCropProgress() {
	    	this.clearAutoCropRuntime()
		    this.auto_crop_start = performance.now()
		    this.auto_crop_progress = 0

		    const animate = (now) => {
		    	if (!this.auto_save_enabled) return

		        const elapsed = now - this.auto_crop_start
		        this.auto_crop_progress = Math.min(
		            elapsed / this.auto_crop_delay,
		            1
		        )

		        if (this.auto_crop_progress < 1) {
		            this.raf_id = requestAnimationFrame(animate)
		        } else {
		            this.uploadImage(true)
		        }
		    }

		    this.raf_id = requestAnimationFrame(animate)
		},

	    setInitialCrop(attempt = 0) {
	        this.is_setting_coordinates = true
	        const cropper = this.$refs.cropper

	        if (!cropper || !this.modal_is_visible) return

	        /* Reintentos ampliados para cargas de imagen lentas o conexiones inestables. */
	        if (attempt > 120) {
	        	this.is_setting_coordinates = false
	        	/* La imagen nunca termino de cargar: antes esto se abandonaba en silencio en manual. */
	        	this.notify_image_save_failed('La imagen tardó demasiado en cargar y no se pudo recortar. Probá con otra imagen de los resultados.')
	        	return
	        }

	        const result = cropper.getResult()

	        // ⛔ todavía no está lista la imagen
	        if (!result || !result.image) {
	            this.auto_crop_timer = setTimeout(() => this.setInitialCrop(attempt + 1), 50)
	            return
	        }

	        const { width, height } = result.image

	        if (!width || !height) {
	            this.auto_crop_timer = setTimeout(() => this.setInitialCrop(attempt + 1), 50)
	            return
	        }

	        // 🔥 CUADRADO MÁXIMO POSIBLE
	        const size = Math.min(width, height)

	        cropper.setCoordinates({
	            width: size,
	            height: size,
	            left: (width - size) / 2,
	            top: (height - size) / 2,
	        })


		    /*
		    * Solo iniciar autoguardado cuando el flujo lo pide explícitamente.
		    * En modo manual el usuario define el recorte y guarda a demanda.
		    */
		    if (this.auto_crop) {
		    	this.startAutoCropProgress()
		    }

	    },
		change({ coordinates }) {
			this.coordinates = coordinates 

			/*
			* Solo se cancela el autoguardado cuando hay interacción manual real.
			* Cambios programáticos (setCoordinates / ajustes internos del cropper) no deben cancelarlo.
			*/
		    if (!this.is_setting_coordinates && this.has_manual_crop_interaction) {
		        this.auto_save_enabled = false
		        this.auto_crop_progress = 0

		        this.clearAutoCropRuntime()
		    }

		    this.is_setting_coordinates = false
		},
		uploadImage(cropped) {
			/*
			* Este componente muestra su propio toast en todas las ramas de error, asi que se apaga
			* el evento global: si no, el usuario ve el cartel generico ademas del mensaje bueno.
			*/
			const request_config = {
				skip_global_error_event: true,
			}

			let params = {}
			if (cropped) {
				this.loading_cropp = true
				params = {
					...this.coordinates,
				}
			} else {
				this.loading_not_cropp = true
			}
			params.image_url = this.image_url
			params.model_name = this.model_name
			params.model_id = this.model.id
			this.$api.post(this.getImageUploadUrl(this.prop), params, request_config)
			.then(res => {
				this.loading_cropp = false
				this.loading_not_cropp = false
				/* Notifica al componente padre para encadenar procesos batch. */
				this.$emit('image-saved')
				if (this.model_name == 'user') {
					this.$store.commit('auth/setUser', res.data.model)
					this.$toast.success('Imagen actualizada')
					this.$bvModal.hide('cropper-'+this.model.id+'-'+this.model.nombre+'-'+this.prop.key)
				} else {
					this.$bvModal.hide('cropper-'+this.model.id+'-'+this.model.nombre+'-'+this.prop.key)

					if (res.data.model) {
						this.$bvModal.hide(this.model_name)
						this.$store.commit(this.model_name+'/add', res.data.model)
						if (this.prop.type == 'images') {
							this.model[this.prop.key].push(res.data.image_model)
						}
						if (this.has_many_parent_model) {
							let index = this.has_many_parent_model[this.has_many_prop.key].findIndex(model => {
								return model.id == this.model.id 
							})
							if (index != -1) {
								this.has_many_parent_model[this.has_many_prop.key].splice(index, 1, res.data.model)
							}
						}
						this.$toast.success('Imagen actualizada')
					} else {
						if (this.prop.type == 'images') {
							if (this.model.childrens) {
								this.model.childrens.push({
									model_name: this.prop.key,
									temporal_id: res.data.image_model.temporal_id,
									is_imageable: true,
								})
							} else {
								// this.model.childrens = []
								this.$set(this.model, 'childrens', [])
								this.model.childrens.push({
									model_name: this.prop.key,
									temporal_id: res.data.image_model.temporal_id,
									is_imageable: true,
								})
							}
							console.log('childrens')
							console.log(this.model.childrens)
							this.model[this.prop.key].push(res.data.image_model)
						} else {
							console.log('aca')
							this.model[this.prop.key] = res.data.image_url
							this.setModel(this.model, this.model_name)
						}
					}
				}
			})
			.catch(err => {
				console.log(err)
				/* El backend manda el motivo real en `message`; el texto fijo queda solo de reserva. */
				const message = this.get_backend_error_message(
					err,
					'No se pudo guardar la imagen. Probá con otra imagen de los resultados.'
				)
				this.notify_image_save_failed(message)
			})
		},
	},
}
</script>
<style lang="sass">
.cropper 
	width: 100%
	height: 600px
	background: #DDD

</style>