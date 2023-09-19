<template>
<b-modal
title="Subir Imagen"
hide-footer
:id="'upload-image-'+prop.key">
	<b-form-file
	id="input-file-selector"
	class="m-b-15"
	browse-text="Buscar"
	v-model="file"
	variant="primary"
	:state="Boolean(file)"
	@change="upload"
	placeholder="Seleccione la imagen o arrastrala hasta aquí"
	drop-placeholder="Solta la imagen aqui..."
	></b-form-file>
	<btn-loader
	:disabled="!file"
	@clicked="upload"
	:loader="loading"
	text="Guardar"></btn-loader>
	<!-- <b-button
	block 
	variant="primary"
	:disabled="!file"
	@click="upload">
		Importar
	</b-button> -->
</b-modal>
</template>
<script>
export default {
	props: {
		prop: Object,
		model: Object,
		model_name: String,
	},
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	data() {
		return {
			file: null,
			loading: false,
		}
	},
	methods: {
		upload() {
			var file    = document.getElementById('input-file-selector').files[0];
			if (this.prop.not_cropp) {
				this.saveImage(file)
			} else {
				var reader  = new FileReader();
				reader.readAsDataURL(file)
				let that = this
				reader.onloadend = function () {
					that.$emit('setImageUrl', reader.result)
					that.$bvModal.hide('upload-image-'+that.prop.key)
				}
			}
		},
		saveImage(file) {
			var formData = new FormData();
			formData.append('image', file);
			formData.append('prop_name', this.prop.key);
			formData.append('model_name', this.model_name);
			formData.append('model_id', this.model.id);

			this.loading = true
			this.$api.post('upload-image', formData)
			.then(res => {
				this.loading = false
				this.updateModelImage(res.data.image_url, res.data.image_model)
				this.$bvModal.hide('upload-image-'+this.prop.key)
			})
			.catch(err => {
				this.loading = false
				console.log(err);
			})
		},
		updateModelImage(image_url, image_model) {
			if (this.prop.type == 'image') {
				this.model[this.prop.key] = image_url
				this.setModel(this.model, this.model_name)
			} else {
				this.model[this.prop.key].push(image_model)
			}
		}
	}
}
</script>