<template>
	<b-button
	v-if="!model.sale_id"
	@click="setDelete"
	variant="danger">
		<i class="icon-trash"></i>
	</b-button>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		setDelete() {
			this.$store.commit('seller_commission/setDelete', this.model)
			this.$bvModal.show('delete-seller_commission')
		}
	}
}
</script>