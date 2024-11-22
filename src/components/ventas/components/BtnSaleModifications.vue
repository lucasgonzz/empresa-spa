<template>
	<b-button
	class="m-l-10"
	@click.stop="show"
	size="sm"
	variant="outline-primary">
		Mod
	</b-button>
</template>
<script>
export default {
	props: {
		model: Object,
	},
	methods: {
		show() {
			console.log('se va a setear la venta con la N° '+this.model.num)
			this.setModel(this.model, 'sale', [], false, false)
			setTimeout(() => {
				this.$bvModal.show('sale-modifications')
			}, 500)
		}
	}
}
</script>