<template>
	<b-modal
	title="Recortar Imagen"
	hide-footer
	size="lg"
	@shown="onModalShown"
	:id="'cropper-'+model.id+'-'+model.nombre+'-'+prop.key">
		<cropper
		ref="cropper"
		class="cropper"
		:canvas="false"
		:src="image_url"
		:stencil-props="stencil_props"
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
	},
	data() {
		return {
			loading_cropp: false,
			loading_not_cropp: false,
			coordinates: null,

	        // ⏱ auto recorte
	        auto_crop_delay: 5000, // ms (configurable)
	        auto_crop_start: null,
	        auto_crop_progress: 0,
	        auto_crop_timer: null,
	        raf_id: null,

	        is_setting_coordinates: false,

	        auto_save_enabled: true,
		}
	},
	beforeDestroy() {
	    cancelAnimationFrame(this.raf_id)
	    clearTimeout(this.auto_crop_timer)
	},
	methods: {
		onModalShown() {
			console.log('onModalShown')

			this.auto_save_enabled = true
		    this.setInitialCrop()
	    },

	    startAutoCropProgress() {
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
	        console.log('setInitialCrop 1')
	        this.is_setting_coordinates = true
	        const cropper = this.$refs.cropper

	        if (!cropper || attempt > 30) return

	        const result = cropper.getResult()

	        // ⛔ todavía no está lista la imagen
	        if (!result || !result.image) {
	            requestAnimationFrame(() => this.setInitialCrop(attempt + 1))
	            return
	        }

	        const { width, height } = result.image

	        if (!width || !height) {
	            requestAnimationFrame(() => this.setInitialCrop(attempt + 1))
	            return
	        }


	        console.log('setInitialCrop 2 is_setting_coordinates: '+this.is_setting_coordinates)

	        // 🔥 CUADRADO MÁXIMO POSIBLE
	        const size = Math.min(width, height)

	        cropper.setCoordinates({
	            width: size,
	            height: size,
	            left: (width - size) / 2,
	            top: (height - size) / 2,
	        })



		    // this.$nextTick(() => {
		    //     this.is_setting_coordinates = false
		    // })

		    this.startAutoCropProgress()

	    },
		change({ coordinates, canvas }) {
			this.coordinates = coordinates 

			console.log('change, is_setting_coordinates: '+this.is_setting_coordinates)

			// 🛑 solo si el usuario movió el crop
		    // if (!this.is_setting_coordinates && this.auto_save_enabled) {
		    if (!this.is_setting_coordinates) {
		        this.auto_save_enabled = false
		        this.auto_crop_progress = 0

		        if (this.raf_id) {
		            cancelAnimationFrame(this.raf_id)
		            this.raf_id = null
		        }
		    }

		    this.is_setting_coordinates = false
	        console.log('se puso is_setting_coordinates en false')
		},
		uploadImage(cropped) {

			let params = {}
			if (cropped) {
				this.loading_cropp = true
				params = {
					...this.coordinates,
				}
			} else {
				this.loading_not_cropp = true
			}
			params.image_url = this.image_url,
			params.model_name = this.model_name,
			params.model_id = this.model.id,
			this.$api.post(this.getImageUploadUrl(this.prop), params)
			.then(res => {
				this.loading_cropp = false
				this.loading_not_cropp = false
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
				this.loading = false
				this.loading_cropp = false
				this.loading_not_cropp = false
				console.log(err)
				this.$toast.error('Error al recortar, pruebe seleccionando otro area')
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