<template>
<b-modal
v-if="typeof prop.image_cropp != 'undefined' && !prop.image_cropp"
title="Subir Imagen"
hide-footer
id="upload-image">
	<b-form-file
	class="m-b-15"
	browse-text="Buscar"
	v-model="file"
	variant="primary"
	:state="Boolean(file)"
	placeholder="Seleccione la imagen o arrastrala hasta aquí"
	drop-placeholder="Solta la imagen aqui..."
	></b-form-file>
	<btn-loader
	:disabled="!file"
	@clicked="upload"
	text="Importar"
	:loader="loading"></btn-loader>
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	props: {
		prop: Object,
		model: Object,
		model_name: String,
		has_many_parent_model: Object,
		has_many_prop: Object,
	},
	data() {
		return {
			file: null,
			loading: false,
		}
	},
	methods: {
		upload() {
			this.loading = true
			let config = {headers: { 'content-type': 'multipart/form-data' }}
			let form_data = new FormData();
			form_data.append('image_url', this.file);
			form_data.append('model_name', this.model_name);
			form_data.append('id', this.model.id);
			this.$api.post(this.getImageUploadUrl(this.prop), form_data, config)
			.then(res => {
				this.loading = false
				this.file = null
				this.$store.commit(this.model_name+'/add', res.data.model)
				this.$bvModal.hide('upload-image')
				this.$bvModal.hide(this.model_name)
				if (this.has_many_parent_model) {
					let index = this.has_many_parent_model[this.has_many_prop.key].findIndex(model => {
						return model.id == this.model.id 
					})
					if (index != -1) {
						this.has_many_parent_model[this.has_many_prop.key].splice(index, 1, jsonData.model)
					}
				}
				this.$toast.success('Imagen actualizada')
			})
			.catch(err => {
				this.loading = false
				this.file = null
				console.log(err)
				this.$toast.error('Error al guardar Imagen')
			})
		}
	}
}
</script>