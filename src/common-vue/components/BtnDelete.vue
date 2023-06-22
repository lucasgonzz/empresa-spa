<template>
	<b-button
	v-if="model.id"
	variant="danger"
	@click="callDelete">
		Eliminar
	</b-button>
</template>
<script>
export default {
	props: ['model_name', 'model', 'modal', 'has_many_parent_model_name', 'has_many_prop'],
	methods: {
		callDelete() {
			if (!this.has_many_prop) {
				this.$store.commit(this.model_name+'/setDelete', this.model)
				this.$bvModal.show(this.modal)
			} else {
				let model_to_send = {
					...this.has_many_prop,
					id: this.model.id,
				}
				console.log(model_to_send)
				this.$store.commit(this.has_many_parent_model_name+'/setPropModelToDelete', model_to_send)
				this.$bvModal.show('delete-'+this.has_many_prop.key)
			}
		}
	}
}
</script>