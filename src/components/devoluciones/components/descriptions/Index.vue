<template>
	<div class="descriptions">
		<hr>
		<h3
		class="m-40">
			Descripciones
		</h3>

		<nc-description
		v-for="description in descriptions"
		:description="description"></nc-description>

		<btn-add-description></btn-add-description>
	</div>
</template>
<script>
export default {
	components: {
		NcDescription: () => import('@/components/devoluciones/components/descriptions/NcDescription'),
		BtnAddDescription: () => import('@/components/devoluciones/components/descriptions/BtnAddDescription'),
	},
	computed: {
		descriptions() {
			return this.$store.state.devoluciones.descriptions 
		},
	},
	created() {
		this.$store.commit('devoluciones/set_descriptions', [])
		this.$store.commit('devoluciones/add_description')
	}
}
</script>