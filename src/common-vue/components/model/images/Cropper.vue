<template>
	<b-modal
	title="Recortar Imagen"
	hide-footer
	size="lg"
	:id="'cropper-'+prop.key">
		<cropper
		ref="cropper"
		class="cropper"
		:canvas="false"
		:src="image_url"
		:stencil-props="stencil_props"
		@change="change"/>
		<btn-loader
		class="m-t-15"
		@clicked="uploadImage"
		:loader="loading"
		text="Guardar"></btn-loader>
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
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
		Cropper,
	},
	computed: {
		stencil_props() {
			if (this.prop.crop_aspect_ratio) {
				return {
					aspectRatio: this.prop.crop_aspect_ratio
				}	
			}
			return {
				aspectRatio: 1
			}
		},
	},
	data() {
		return {
			loading: false,
			coordinates: null,
		}
	},
	methods: {
		change({ coordinates, canvas }) {
			this.coordinates = coordinates 
			console.log(this.coordinates)
		},
		uploadImage() {
			this.loading = true
			this.$api.post(this.getImageUploadUrl(this.prop), {
				...this.coordinates,
				image_url: this.image_url,
				model_name: this.model_name,
				id: this.model.id,
			})
			.then(res => {
				this.loading = false
				if (this.model_name == 'user') {
					this.$store.commit('auth/setUser', res.data.model)
				} else {
					this.$store.commit(this.model_name+'/add', res.data.model)
					this.$bvModal.hide('cropper-'+this.prop.key)
					this.$bvModal.hide(this.model_name)
					if (this.has_many_parent_model) {
						let index = this.has_many_parent_model[this.has_many_prop.key].findIndex(model => {
							return model.id == this.model.id 
						})
						if (index != -1) {
							this.has_many_parent_model[this.has_many_prop.key].splice(index, 1, res.data.model)
						}
					}
					this.$toast.success('Imagen actualizada')
				}
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
			// return
			// this.canvas.toBlob((blob) => {
			// 	const url = URL.createObjectURL(blob);

			// 	var formdata  = new FormData();
			// 	formdata.append('image_url_to_delete', this.image_url);
			// 	formdata.append('image_url', blob);
			// 	formdata.append('model_name', this.model_name);
			// 	formdata.append('id', this.model.id);

			// 	let config = {headers: { 'content-type': 'multipart/form-data' }}

			// 	this.$api.post(this.getImageUploadUrl(this.prop), formdata, config)
			// 	.then(res => {
			// 		this.loading = false
			// 		console.log(res)
			// 	})
			// 	.catch(err => {
			// 		this.loading = false
			// 		console.log(err)
			// 	})
			// })

			// this.canvas.toBlob(blob => {
				// let reader = new FileReader()
				// reader.readAsDataURL(blob)
				// reader.onload = () => {
					// let base64 = reader.result 
					// this.$api.post(this.getImageUploadUrl(this.prop), {
					// 	image_url: this.canvas.toDataURL(),
					// 	model_name: this.model_name,
					// 	id: this.model.id,
					// })
					// .then(res => {
					// 	this.loading = false
					// 	console.log(res)
					// })
					// .catch(err => {
					// 	this.loading = false
					// 	console.log(err)
					// })
				// }
			// })
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