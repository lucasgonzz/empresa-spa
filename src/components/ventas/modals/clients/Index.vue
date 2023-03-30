<template>
<div>
	<import></import>

	<model
	:modal_title="'Nuevo '+model_name_spanish"
	:model="model"
	:model_name="model_name"
	:text_delete="text_delete"
	:properties="properties"
	check_can_delete></model>

	<b-modal 
	id="clients" 
	title="Clientes" 
	hide-footer 
	size="xl">
		<buscador></buscador>
		<clients-nav></clients-nav>
		<list></list>
	</b-modal>
</div> 
</template>
<script>
import Confirm from '@/common-vue/components/Confirm.vue'
import Model from '@/components/common/model/Index'
import Import from '@/components/ventas/modals/clients/Import.vue'
import Buscador from '@/components/ventas/modals/clients/Buscador'
import ClientsNav from '@/components/ventas/modals/clients/Nav'
import List from '@/components/ventas/modals/clients/List'
export default {
	name: 'Clients',
	components: {
		Confirm,
		Model,
		Import,
		Buscador,
		ClientsNav,
		List,
	},
	computed: {
		model_name() {
			return 'client'
		},
		model_name_spanish() {
			return 'cliente'
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
	}
}
</script>