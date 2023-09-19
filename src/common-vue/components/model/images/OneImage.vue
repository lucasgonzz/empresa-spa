<template>
<div>
    <confirm
    text="la imagen"
    :actions="actions"
    :id="'delete-'+model_name+'-image-'+prop.key"
    :model_name="model_name"
    emit="deleteFromHasMany"
    @deleteFromHasMany="deleteFromHasMany"
    toast="Imagen eliminada"></confirm>
	<div>
		<div
		v-if="model[prop.key]">
			<div
			class="j-center">
				<vue-load-image>
					<img
					slot="image"
					class="slide-img b-r-1 shadow m-b-10" 
					:src="model[prop.key]">

			        <b-spinner
					slot="preloader"
			        variant="success"></b-spinner>

					<div slot="error">
						<p
						class="m-b-0">
							Imagen no encontrada
						</p>
					</div>
				</vue-load-image>
			</div>

			<b-button
			size="sm"
			block
			class="m-b-10"
			@click="setDelete"
			variant="outline-danger">
				Eliminar imagen
			</b-button>
			<b-button
			size="sm"
			block 
			variant="outline-primary"
			@click="uploadImage">
				Cambiar imagen
			</b-button>
		</div>
		<div
		v-else>
			<p 
			class="text-with-icon">
				<i class="icon-eye-slash"></i>
				No hay imagen
			</p>

			<b-button
			size="sm"
			block 
			variant="outline-primary"
			@click="uploadImage">
				Agregar imagen
			</b-button>
		</div>

	</div>
</div>
</template>
<script>
import Confirm from '@/common-vue/components/Confirm'
import VueLoadImage from 'vue-load-image'
import { Carousel, Slide } from 'vue-carousel'
export default {
	props: ['model', 'prop', 'model_name', 'has_many_parent_model', 'has_many_prop'],
	components: {
		Confirm,
		VueLoadImage,
	    Carousel,
	    Slide,

	    BtnLoader: () => import('@/common-vue/components/BtnLoader')
	},
	computed: {
		actions() {
			if (this.model_name == 'user') {
				return ['auth/deleteImage']
			} 
			return [this.model_name+'/deleteImageProp']
		},
	},
	methods: {
		uploadImage() {
			this.$emit('uploadImage')
		},
		setDelete() {
			this.$store.commit(this.model_name+'/setDeleteImageProp', this.prop.key)
			this.$bvModal.show('delete-'+this.model_name+'-image-'+this.prop.key)
		},
		deleteFromHasMany() {
			if (this.has_many_parent_model) {
				let model = this.has_many_parent_model[this.has_many_prop.key].find(_model => {
					return _model.id == this.model.id 
				})
				model[this.prop.key] = null
			} else {
				this.actions.forEach(action => {
					console.log('dispatch '+action)
					this.$store.dispatch(action)
					// .then(() => {
					// 	console.log('se emitio')
					// 	this.setModel(this.model, this.model_name)
					// })
				})
				this.$bvModal.hide(this.model_name)
			}
		}
	}
}
</script>
<style scoped lang="sass">
.images
	img 
		max-width: 100%
		max-height: 500px 
</style>