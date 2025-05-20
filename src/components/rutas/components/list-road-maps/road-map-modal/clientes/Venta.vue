<template>
	<div
	@click="show_sale"
	class="venta s-1">
		<p
		class="m-0">
			<strong>Venta N° {{ sale.num }}</strong>
		</p>
		<hr>
		<p>
			Total: {{ price(sale.total, false) }}
		</p>
		<p>
			{{ sale.articles.length }} articulos
		</p>

		<b-button
		v-if="!sale.terminada"
		block
		@click.stop="call_terminada(sale)"
		size="sm"
		variant="success">
			Marcar como Entregada
		</b-button>
		<b-button
		block
		size="sm"
		v-else
		disabled>
			<i class="icon-check"></i>
			Ya se entrego
		</b-button>
	</div>
</template>
<script>
import marcar_como_terminada from '@/mixins/sale/marcar_como_terminada'
export default {
	mixins: [marcar_como_terminada],
	props: {
		sale: Object,
	},
	methods: {
		show_sale() {
            this.show_model('sale', this.sale.id)
		},
		call_terminada() {
			this.terminada(this.sale)
			.then(() => {
				this.$store.dispatch('road_map/getModels')
				this.$bvModal.hide('road_map')
			})
		}
	}
}
</script>
<style lang="sass">
.venta
	background: #FFF
	margin: 10px
	padding: 20px
	border-radius: 10px
	cursor: pointer

	@media screen and (max-width: 768px)
		width: 94%
	@media screen and (min-width: 768px)
		width: 300px
</style>