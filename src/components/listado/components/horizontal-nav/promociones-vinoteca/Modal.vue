<template>
	<b-modal
	title="Promociones"
	size="xl"
	hide-footer
	id="promociones-vinoteca">
		<view-component
		solo_emitir_delete
		@press_delete_btn="press_delete_btn"
		model_name="promocion_vinoteca"></view-component>
	</b-modal>
</template>
<script>
export default {
	components: {
		ViewComponent: () => import('@/common-vue/components/view/Index'),
	},
	computed: {
		model() {
			return this.$store.state.promocion_vinoteca.model 
		},
		se_puede_modificar() {
			if (this.model.id) {
				return false
			}
			return true
		},
	},
	methods: {
		press_delete_btn() {
			this.$bvModal.show('delete-promocion-vinoteca')
		}
	}
}
</script>