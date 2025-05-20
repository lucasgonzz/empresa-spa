<template>
	<div
	v-if="hasExtencion('vinoteca')">

		<modal></modal>	

		<delete-modal></delete-modal>	

		<b-button
		variant="primary"
		@click="abrir_modal"
		class="m-l-15">
			Promos
		</b-button>
	</div>
</template>
<script>
export default {
	components: {
		Modal: () => import('@/components/listado/components/horizontal-nav/promociones-vinoteca/Modal'),
		DeleteModal: () => import('@/components/listado/components/horizontal-nav/promociones-vinoteca/DeleteModal'),
	},
	methods: {
		abrir_modal() {
			this.$store.dispatch('promocion_vinoteca/getModels')
			this.$bvModal.show('promociones-vinoteca')
		}
	}
}
</script>