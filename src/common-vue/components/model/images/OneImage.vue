<template>
<!--
	Campo de imagen unica (prop.type == 'image'), rediseñado el 13/8/2026 junto con el de imagenes
	multiples (Carrousel.vue): mismo visor, mismo estado vacio y misma zona de arrastre, para que
	las dos props se vean como el mismo componente. El boton de eliminar dejo de ser una franja roja
	de ancho completo debajo de la foto: es un circulo en la esquina de la imagen, como en el carrusel.
-->
<div class="images-field">
	<!--
		El confirm solo pregunta: va por `emit`, así que no corre `actions` ni muestra su `toast`
		(por eso no se le pasan). El borrado y su aviso viven en deleteFromHasMany.
	-->
    <confirm
    text="la imagen"
    :id="'delete-'+model_name+'-image-'+prop.key"
    :model_name="model_name"
    emit="deleteFromHasMany"
    @deleteFromHasMany="deleteFromHasMany"></confirm>

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
		/**
		 * Lo que pasa al confirmar el borrado de la imagen.
		 *
		 * - Imagen de un registro de un has_many (`has_many_parent_model`): se quita localmente y se
		 *   guarda recién cuando se guarda el registro padre. Todavía no se borró nada, no hay aviso.
		 * - Imagen del registro mismo: se despacha la acción de borrado y se la ESPERA. Antes se
		 *   despachaba sin esperar y, como el confirm va por `emit`, su toast "Imagen eliminada" no
		 *   salía nunca: el borrado no avisaba nada, ni bien ni mal. Ahora avisa según el resultado
		 *   (la acción rechaza si el DELETE falla, ver deleteImageProp en store/__base_store.js) y el
		 *   modal del registro se cierra solo si salió bien, igual que el camino de borrado de
		 *   Confirm.vue.
		 *
		 * @returns {void}
		 */
		deleteFromHasMany() {
			if (this.has_many_parent_model) {
				let model = this.has_many_parent_model[this.has_many_prop.key].find(_model => {
					return _model.id == this.model.id 
				})
				model[this.prop.key] = null
				return
			}

			let self = this
			let borrados = this.actions.map(action => {
				return self.$store.dispatch(action)
			})
			Promise.all(borrados)
			.then(() => {
				self.$toast.success('Imagen eliminada')
				self.$bvModal.hide(self.model_name)
			})
			.catch(() => {
				// El interceptor global ya mostró el error del servidor; esto dice qué fue lo que no se hizo.
				self.$toast.error('No se pudo eliminar la imagen')
			})
		}
	}
}
</script>
<!-- Los estilos de .images-field viven en el orquestador (images/Index.vue), compartidos con Carrousel.vue. -->