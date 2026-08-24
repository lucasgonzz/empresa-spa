<template>
<!--
	Campo de imagen unica (prop.type == 'image'), rediseñado el 13/8/2026 junto con el de imagenes
	multiples (Carrousel.vue): mismo visor, mismo estado vacio y misma zona de arrastre, para que
	las dos props se vean como el mismo componente. El boton de eliminar dejo de ser una franja roja
	de ancho completo debajo de la foto: es un circulo en la esquina de la imagen, como en el carrusel.
-->
<div class="images-field">
    <confirm
    text="la imagen"
    :actions="actions"
    :id="'delete-'+model_name+'-image-'+prop.key"
    :model_name="model_name"
    emit="deleteFromHasMany"
    @deleteFromHasMany="deleteFromHasMany"
    toast="Imagen eliminada"></confirm>

	<div
	v-if="model[prop.key]"
	class="images-field__visor">
		<div class="images-field__slide">
			<vue-load-image>
				<img
				slot="image"
				class="images-field__img"
				:src="model[prop.key]">

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

			<button
			type="button"
			class="images-field__eliminar"
			title="Eliminar la imagen"
			@click="setDelete">
				<i class="bi bi-trash"></i>
			</button>
		</div>
	</div>

	<div
	v-else
	class="images-field__vacio">
		<div class="images-field__vacio-icono">
			<i class="bi bi-image"></i>
		</div>
		<p class="images-field__vacio-titulo">
			Sin imagen
		</p>
		<p class="images-field__vacio-detalle">
			Subila desde tu equipo.
		</p>
	</div>

	<!-- Sin :state, por el mismo motivo que en Carrousel.vue: dejaba el campo siempre en rojo. -->
	<b-form-file
	class="images-field__file"
	:id="input_file_name"
	browse-text="Buscar en mi equipo"
	v-model="file"
	@change="upload"
	placeholder="Arrastra una imagen hasta aca"
	drop-placeholder="Solta la imagen aca"
	></b-form-file>
</div>
</template>
<script>
import Confirm from '@/common-vue/components/Confirm'
import VueLoadImage from 'vue-load-image'
export default {
	props: ['model', 'prop', 'model_name', 'has_many_parent_model', 'has_many_prop'],
	components: {
		Confirm,
		VueLoadImage,
	},
	computed: {
		actions() {
			if (this.model_name == 'user') {
				return ['auth/deleteImage']
			} 
			return [this.model_name+'/deleteImageProp']
		},
		input_file_name() {
			return this.model_name+'-'+this.prop.key+'-input-file-drop'
		}
	},
	data() {
		return {
			file: null,
		}
	},
	methods: {
		uploadImage() {
			this.$emit('uploadImage')
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
				// that.$bvModal.hide('upload-image-'+that.model.id+'-'+that.model.nombre+'-'+that.prop.key)
				that.file = null

			}
		},
		setDelete() {
			this.$store.commit(this.model_name+'/setDeleteImageProp', this.prop.key)
			this.$bvModal.show('delete-'+this.model_name+'-image-'+this.prop.key)
		},
		deleteFromHasMany() {
			console.log('deleteFromHasMany')
			if (this.has_many_parent_model) {
				let model = this.has_many_parent_model[this.has_many_prop.key].find(_model => {
					return _model.id == this.model.id 
				})
				model[this.prop.key] = null
			} else {
				this.actions.forEach(action => {
					console.log('dispatch '+action)
					this.$store.dispatch(action)
				})
				this.$bvModal.hide(this.model_name)
			}
		}
	}
}
</script>
<!-- Los estilos de .images-field viven en el orquestador (images/Index.vue), compartidos con Carrousel.vue. -->