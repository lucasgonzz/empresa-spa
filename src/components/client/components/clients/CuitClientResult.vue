<template>
	<b-modal
	:title="title"
	hide-footer
	id="afip-client-result-modal">
		<div v-if="afip_data">
			<h4>Resultados de AFIP</h4>
			<p
			v-for="(value, key) in afip_data" 
			:key="key">
				{{ key.replaceAll('_', ' ').toUpperCase() }}: {{ value }}
			</p>	
		</div>
		<hr>
		<div
		v-if="client_model">
			<h4>Cliente ya existente</h4>
			<p>
				Nombre en el sistema: {{ client_model.name }}
			</p>
			<p v-if="client_model.saldo_pesos">
				Saldo: {{ price(client_model.saldo_pesos) }}
			</p>
		</div>
		<div v-else-if="afip_data">
			<p>Este cliente no se encuentra registrado en el sistema.</p>
		</div>

		<hr>
		
		<b-button
		v-if="!client_model && afip_data"
		@click="useData"
		block
		variant="primary">
			Usar estos datos
		</b-button>

		<b-button
		@click="close"
		block
		variant="secondary">
			Cerrar
		</b-button>

	</b-modal>
</template>
<script>
export default {
	props: {
		afip_data: Object,
		client_model: Object,
	},
	computed: {
		title() {
			return this.client_model ? 'Cliente ya existente' : 'Resultados de Búsqueda'
		}
	},
	methods: {
		price(p) {
			return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p)
		},
		useData() {
			this.$emit('use-data', this.afip_data)
			this.close()
		},
		close() {
			this.$bvModal.hide('afip-client-result-modal')
		}
	}
}
</script>