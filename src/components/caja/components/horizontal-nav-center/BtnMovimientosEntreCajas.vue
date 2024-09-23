<template>
	<b-button
	class="m-l-15"
	@click="show">
		<i class="icon-refresh"></i>
		Mover entre cajas
	</b-button>
</template>
<script>
export default {
	methods: {
		show() {
			this.$bvModal.show('movimientos-entre-cajas')
		}
	}
}
</script>