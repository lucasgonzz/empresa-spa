<template>
	<!--
		Sin margen propio (7/9/2026): la separacion respecto de la barra de botones la pone el `gap`
		del contenedor de Ventas.vue, que es el unico que sabe si la fila envolvio o no. El `m-l-10`
		que habia aca era un margen izquierdo suelto, y un margen izquierdo no se entera de que
		perdio al vecino de la izquierda: al partirse la fila en dos lineas, el boton bajaba corrido.
		La clase queda solo como enganche; no separa ni alinea por su cuenta.
	-->
	<b-button
	v-if="model.sale_modifications_count > 0"
	class="btn-sale-modifications"
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