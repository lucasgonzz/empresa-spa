<template>
<b-modal
title="Tamaño de Imagen"
hide-footer
id="crop-image-width">
	<b-form-group
	label="Tamaño de la imagen para subir">
		<b-form-input
		@keyup.enter="close"
		v-model="width"
		placeholder="Ingrese el Tamaño"></b-form-input>
	</b-form-group>
	<b-button
	@click="close"
	block 
	variant="primary">
		Listo
	</b-button>
</b-modal>
</template>
<script>
export default {
	computed: {
		width: {
			get() {
				return this.$store.state.general.image_crop_width
			},
			set(value) {
				this.$store.commit('general/setImageCropWidth', Number(value))
				// this.$store.commit('general/setImageCropHeigth', Number(value))
			}
		}
	},
	methods: {
		close() {
			this.$bvModal.hide('crop-image-width')
		}
	}
}
</script>