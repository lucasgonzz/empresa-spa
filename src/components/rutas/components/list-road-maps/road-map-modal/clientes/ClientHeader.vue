<template>
	<div
	class="j-between align-center client-header">
		<div>
			<h4>
				<strong>{{ client.name }}</strong>
			</h4>
			<p>
				{{ total_productos(_client.sales) }} productos
			</p>
			<p>
				<a :href="'tel:+54'+client.phone">
					<i class="icon-phone"></i>
					{{ client.phone }}
				</a>
			</p>
			<p>
				{{ client.address }}
			</p>
			<p
			v-if="client.link_google_maps">
				<a 
				target="_blank" 
				:href="client.link_google_maps">
					Ver en el Mapa
				</a>
			</p>
		</div>


		<div
		class="cont-buttons">

			<div
			class="m-b-10"
			v-if="hasExtencion('road_map_detalle_por_articulos_y_no_por_venta')">
				
				<b-button
				v-if="!ventas_terminadas"
				@click="marcar_como_entregado"
				variant="success">
					<i class="icon-check"></i>
					Marcar como Entregado
				</b-button>

				<b-button
				v-else
				disabled
				variant="success">
					<i class="icon-check"></i>
					YA ESTA ENTREGADO
				</b-button>
			</div>

			<b-button
			disabled
			size="lg"
			variant="outline-danger"
			class="m-b-10">
				Total a cobrar: <strong>{{ price(total_a_cobrar) }}</strong>
			</b-button>
			

			<b-button
			v-if="total_a_cobrar"
			@click="registrar_pago"
			variant="primary">
				<i class="icon-dolar"></i>
				Registrar Pago
			</b-button>
		</div>
	</div>
</template>
<script>
import road_map from '@/mixins/road_map'
import marcar_como_terminada from '@/mixins/sale/marcar_como_terminada'
export default {
	mixins: [marcar_como_terminada, road_map],
	props: {
		_client: Object,
	},
	computed: {
		total_a_cobrar() {
			console.log('total_a_cobrar')
			let total = 0
			this._client.sales.forEach(sale => {
				console.log('venta N° '+sale.num)
				console.log(this.venta_cobrada(sale))
				console.log(sale.total)
				if (!this.venta_cobrada(sale)) {
					total += Number(sale.total) 
				}
			})
			return total
		},
		client() {
			return this._client.client 
		},
		ventas_terminadas() {
			let terminadas = 1
			this._client.sales.forEach(sale => {
				if (!sale.terminada) {
					terminadas = 0
				}
			})
			return terminadas
		},
	},
	methods: {
		marcar_como_entregado() {
			this._client.sales.forEach(sale => {
				this.terminada(sale)
				.then(() => {
					this.$store.dispatch('road_map/getModels')
					this.$bvModal.hide('road_map')
				})
			})
		},
		registrar_pago() {

			this.$store.commit('current_acount/setFromModelName', 'client')
			this.$store.commit('current_acount/setFromModel', this.client)
			this.$bvModal.show('current-acounts-pago')

		}
	}
}
</script>
<style lang="sass">
.client-header
	p  
		margin-bottom: 5px

	.cont-buttons
		display: flex   
		flex-direction: column  
</style>