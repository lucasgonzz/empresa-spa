<template>
	<div
	class="cont-inputs-stock">

		<b-input-group
		prepend="Stock">
			<b-form-input
			class="input-address-stock"
			:id="'input-address-stock-'+address.id"
			:data-testid="'deposito-stock-'+address.id"
			:dusk="article.name+'-'+address.id"
			type="number"
			@click.stop
			v-if="renglon"
			v-model="renglon.pivot.amount"></b-form-input>
		</b-input-group>

		<b-input-group
		v-if="can('article.stock_min_max')"
		prepend="Min">

			<b-form-input
			class="input-address-stock"
			:id="'input-address-stock-stock-min-'+address.id"
			:data-testid="'deposito-stock-min-'+address.id"
			type="number"
			@click.stop
			v-if="renglon"
			v-model="renglon.pivot.stock_min"></b-form-input>
		</b-input-group>

		<b-input-group
		v-if="can('article.stock_min_max')"
		prepend="Max">

			<!-- El id decia "-stock-min-" igual que el input de arriba (copy-paste): dos ids
			     identicos en el DOM. Se corrige a "-stock-max-" en la exploracion de Alertas. -->
			<b-form-input
			class="input-address-stock"
			:id="'input-address-stock-stock-max-'+address.id"
			:data-testid="'deposito-stock-max-'+address.id"
			type="number"
			@click.stop
			v-if="renglon"
			v-model="renglon.pivot.stock_max"></b-form-input>
		</b-input-group>
	</div>
</template>
<script>
export default {
	props: {
		article: Object,
		address: Object
	},
	computed: {
		/*
			El renglón de esta sucursal en la edición del store (article/edit_addresses_stock), NO
			el pivot de `article.addresses` (misión stock-sucursal-desde-listado, 14/10/2026). Así
			lo tipeado no toca la fila: si se cancela, la celda vuelve a mostrar el stock real, y un
			re-render de la fila (un loadModel, un reload del listado) no pisa lo que se está
			escribiendo.
		*/
		renglon() {
			let renglon = this.$store.state.article.edit_addresses_stock.addresses.find(_renglon => _renglon.id == this.address.id)

			if (typeof renglon != 'undefined') {

				return renglon
			}

			return null
		}
	}
}
</script>
<style lang="sass">
.cont-inputs-stock
	width: 150px
	display: flex
	flex-direction: column 
	justify-content: space-between
	align-items: center

	.input-group
		width: 140px
		margin-bottom: 10px
		
		.input-address-stock
			font-size: 13px !important
			padding: 5px

		.input-group-text
			font-size: 13px !important
			padding: 5px

</style>