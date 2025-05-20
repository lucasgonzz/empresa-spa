<template>
<b-modal
title="Seleccionar ventas"
:hide-footer="!sales.length"
id="select-sales">
	<div
	v-if="sales.length">
		
		<b-form-checkbox
		class="card m-b-10"
		v-model="selected_sales"
		:value="sale.id"
		v-for="sale in sales">
			<div
			class="p-l-10">
				<p>
					N° {{ sale.num }}
				</p>
				<p>
					Creada el {{ date(sale.created_at) }}
				</p>
				<p
				v-if="sale.client">
					Cliente: {{ sale.client.name }}
				</p>
				<p>
					Total: {{ price(sale.total) }}
				</p>
			</div>
		</b-form-checkbox>

		<br>
	</div>
	<p 
	v-else
	class="text-with-icon">
		<i class="icon-eye-slash"></i>
		No hay ventas para la fecha de entrega seleccionada
	</p>

	<template 
	v-if="sales.length"
	#modal-footer>
		<b-button
		@click="save"
		block
		variant="primary">
			Aplicar cambios
		</b-button>
	</template>
</b-modal>	
</template>
<script>
import moment from 'moment'
export default {
	computed: {
		model() {
			return this.$store.state.road_map.model
		},
		sales() {
			return this.$store.state.road_map.search_sale.models
		},
	},
	watch: {
		sales() {
			this.set_selected_sales()
		}
	},
	data() {
		return {
			// sales: [],
			selected_sales: [],
		}
	},
	// created() {
	//     this.$root.$once('bv::modal::show', (bvEvent, modalId) => {
	//         if (modalId === 'select-sales') {
	//         	this.get_sales()
	//         }
	//     })
	// },
	methods: {
		set_selected_sales() {
			this.selected_sales = []
			this.model.sales.forEach(sale => {
				this.selected_sales.push(sale.id)
			})
		},
		save() {
			let sales = []

			this.selected_sales.forEach(selected_sale_id => {

				let finded_sale = this.sales.find(sale => {
					return sale.id == selected_sale_id
				})

				if (typeof finded_sale != 'undefined') {

					sales.push(finded_sale)
					
				}

			})

			this.model.sales = sales 

			// Agupo los clientes de las ventas
			let client_positions = this.get_client_positions(sales)

			this.$store.commit('road_map/setModel', {
				model: {
					...this.model,
					client_positions: client_positions
				},
				properties: []
			})

			this.$bvModal.hide('select-sales')
			console.log('se escondio modal')
		},
		get_client_positions(sales) {

			const created_client_positions = this.model.client_positions || [];

			// const client_positions = []

			let client_position_model

			sales.forEach(sale => {

				const client = sale.client;

				client_position_model = created_client_positions.find(position => position.client_id == client.id)

				if (typeof client_position_model == 'undefined') {

					created_client_positions.push({
						client_id: client.id,
						client: client,
						position: created_client_positions.length + 1
					})

				}
			});

			return created_client_positions

			// return Array.from(clientMap.values()).sort((a, b) => a.position - b.position);
		},
		// get_client_positions(sales) {

		// 	const client_positions = this.model.client_positions || [];

		// 	const clientMap = new Map();

		// 	sales.forEach(sale => {
		// 		const client = sale.client;

		// 		if (!clientMap.has(client.id)) {
		// 			const client_position_model = client_positions.find(p => p.client_id === client.id);
					
		// 			clientMap.set(client.id, {
		// 				id: client.id,
		// 				client: client,
		// 				name: client.name,
		// 				position: client_position_model ? client_position_model.position : 9999
		// 			});
		// 		}
		// 	});

		// 	return Array.from(clientMap.values()).sort((a, b) => a.position - b.position);
		// }
	},
}
</script>