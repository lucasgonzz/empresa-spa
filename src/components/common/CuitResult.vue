<template>
	<b-modal
	:title="title"
	hide-footer
	:id="'cuit-result-modal-'+model_name">
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
		v-if="model">
			<h4>{{ singular(model_name) | capitalize }} ya existente</h4>
			<p>
				Nombre en el sistema: {{ model.name }}
			</p>
			<p v-if="model.saldo_pesos">
				Saldo: {{ price(model.saldo_pesos) }}
			</p>
		</div>
		<div v-else-if="afip_data">
			<p>Este {{ singular(model_name) }} no se encuentra registrado en el sistema.</p>
		</div>

		<hr>
		
		<b-button
		v-if="!model && afip_data"
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
		model: Object,
		model_name: String,
	},
	computed: {
		title() {
			return this.model ? this.singular(this.model_name)+' ya existente' : 'Resultados de Búsqueda'
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
			this.$bvModal.hide('cuit-result-modal-'+this.model_name)
		}
	}
}
</script>