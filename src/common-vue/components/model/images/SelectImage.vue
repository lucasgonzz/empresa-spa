<template>
<b-modal
v-if="prop.select_image_from"
title="Seleccionar Imagen"
hide-footer
size="lg"
:id="'select-image-'+prop.key">
	<div class="select-cont-images">
		<img 
		class="s-1 b-r-1 c-p apretable"
		v-for="image in images"
		@click="selectImage(image)"
		:src="image[image_url_prop_name]">
	</div>
</b-modal>
</template>
<script>
export default {
	props: {
		prop: Object,
		model_name: String,
		model: Object,
	},
	data() {
		return {
			loading: false,
		}
	},
	computed: {
		images() {
			return this.model_image[this.prop.select_image_from.images_prop]
		},
		model_image() {
			return this.$store.state[this.prop.select_image_from.model_name].model 
		},
	},
	methods: {
		selectImage(image) {
			this.loading = true 
			this.model[this.prop.key] = image[this.image_url_prop_name]
			this.$api.put(this.routeString(this.model_name)+'/'+this.model.id, this.model)
			.then(res => {
				this.loading = false 
				this.$store.commit(this.model_name+'/add', res.data.model)
				this.$bvModal.hide('select-image-'+this.prop.key)
			})
			.catch(err => {
				this.loading = false 
			})
		}
	}
}
</script>
<style lang="sass">
.select-cont-images
	display: flex
	flex-direction: row
	justify-content: flex-start
	img 
		width: 300px
		margin: 1em

</style>