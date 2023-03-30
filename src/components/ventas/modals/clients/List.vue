<template>
	<div>
		<table-component
		:loading="loading"
		:models="to_show"
		:model_name="model_name"
		:properties="properties"
		:model_name_spanish="model_name_spanish">
			<template v-slot:default="slotProps">
				<b-button
				@click="showCurrentAcounts(slotProps.model, true)"
				class="m-l-15"
				variant="success">
					C/C
				</b-button>
			</template>
		</table-component>
	</div>
</template>
<script>
import TableComponent from '@/common-vue/components/display/TableComponent'

import clients from '@/mixins/clients'
export default {
	name: 'ClientsList',
	mixins: [clients],
	components: {
		TableComponent,
	},
	computed: {
		model_name() {
			return 'client'
		},
		model_name_spanish() {
			return 'cliente'
		},
		display() {
			return this.$store.state[this.model_name].display
		},
		loading() {
			return this.$store.state[this.model_name].loading
		},
		to_show() {
			return this.$store.state[this.model_name].to_show
		},
		models() {
			return this.$store.state[this.model_name].models
		},
		model() {
			return this.$store.state[this.model_name].model
		},
		delete() {
			return this.$store.state[this.model_name].delete
		},
		text_delete() {
			if (this.delete) {
				return 'el '+this.delete.name
			}
			return ''
		},
		properties() {
			return require(`@/models/${this.model_name}`).default.properties 
		},
		// items() {
		// 	let items = []
		// 	this.clients_to_show.forEach(client => {
		// 		items.push({
		// 			name: client.name,
		// 			address: client.address,
		// 			cuit: client.cuit,
		// 			iva: client.iva ? client.iva.name : '-',
		// 			saldo: this.price(client.saldo),
		// 		})
		// 	})
		// 	return items
		// },
		clients() {
			return this.$store.state.clients.models
		},
		selected_seller() {
			return this.$store.state.clients.selected_seller
		},
		clients_to_show() {
			let clients_to_show = null
			if (!this.selected_seller) {
				clients_to_show = this.clients.filter(client => {
					return client.seller_id === null || client.seller_id === 0
				})
			} else {
				clients_to_show = this.clients.filter(client => {
					return client.seller_id == this.selected_seller.id
				})
			}
			if (this.search_query.length >= 3) {
				clients_to_show = clients_to_show.filter(client => {
					return client.name.toLowerCase().includes(this.search_query.toLowerCase())
				})
			}
			clients_to_show.sort((a, b) => (a.name > b.name) ? 1 : -1)
			clients_to_show = clients_to_show.slice(0, this.index_to_show * 10)
			console.log(clients_to_show)
			return clients_to_show
		},
		index_to_show() {
			return this.$store.state.clients.index_to_show
		},
	},
	methods: {
		addClientsToShow() {
			this.$store.commit('clients/incrementIndexToShow')
		},
		saldoInicial(client) {
			this.$store.commit('clients/setSaldoInicial', client)
			this.$bvModal.show('saldo-inicial-client')
		},
		deleteClient(client) {
			this.$store.commit('clients/setDelete', client)
			this.$bvModal.show('delete-client')
		}
	}
}
</script>