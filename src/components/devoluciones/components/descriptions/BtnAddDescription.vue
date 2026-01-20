<template>
	<div class="j-end">
		<b-button
		class="m-t-10"
		@click="add"
		variant="primary">
			<i class="icon-plus"></i>
			Agregar descripcion
		</b-button>
	</div>
</template>
<script>
export default {
	methods: {
		add() {
			this.$store.commit('devoluciones/add_description')
		}
	}
}
</script>