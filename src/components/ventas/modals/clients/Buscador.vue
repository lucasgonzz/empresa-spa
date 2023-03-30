<template>
	<div class="buscador m-b-15">

		<search-nav
		:models="models"
		:model_name="model_name"
		:properties_to_filter="properties"></search-nav>
		<b-dropdown 
		class="m-l-10" 
		text="Mas"
		right
		variant="primary">
			<b-dropdown-item
			v-if="can('client.store')"
			@click="setModel(null, 'client')">
				<i class="icon-plus"></i>
				Nuevo cliente
			</b-dropdown-item>
			<b-dropdown-item
			@click="updateClients">
				<i class="icon-redo"></i>
				Actualizar lista de clientes
			</b-dropdown-item>
			<b-dropdown-item
			v-b-modal="'import-clients'">
				<i class="icon-download"></i>
				Importar clientes
			</b-dropdown-item>
		</b-dropdown>
	</div>
</template>
<script>
import SearchNav from '@/components/common/search-nav/Index'

import clients from '@/mixins/clients'
import display from '@/mixins/display'
export default {
	name: 'BuscadorClients',
	mixins: [clients, display],
	components: {
		SearchNav,
	},
	computed: {
		model_name() {
			return 'client'
		},
		models() {
			return this.$store.state[this.model_name].models
		},
		properties() {
			return this.propsToFilter(this.model_name)
		},
	},
	methods: {
		updateClients() {
			this.$store.dispatch('client/getModels')
		},
		getResultValue(value) {
			return ''
		},
		search(value) {
			this.$store.commit('clients/setSearchQuery', value)
			return []
		},
	}
}
</script>
<style lang="sass">
.buscador 
	// width: 100%
	display: flex
	justify-content: space-between
	&>div
		width: 90%
	.dropdown
		width: auto
</style>