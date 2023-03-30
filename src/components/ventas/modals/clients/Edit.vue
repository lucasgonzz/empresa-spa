<template>
<b-modal id="edit-client" :title="title" hide-footer>
	<b-form-group
	label="Nombre del cliente">
		<b-form-input
		placeholder="Ingresar nombre"
		v-model="client.name"></b-form-input>
	</b-form-group>
	<b-form-group
	label="Apellido del cliente">
		<b-form-input
		placeholder="Ingresar apellido"
		v-model="client.surname"></b-form-input>
	</b-form-group>
	<b-form-group
	label="Direccion del cliente">
		<b-form-input
		placeholder="Ingresar direccion"
		v-model="client.address"></b-form-input>
	</b-form-group>
	<b-form-group
	label="CUIT del cliente">
		<b-form-input
		placeholder="Ingresar CUIT sin guiones"
		v-model="client.cuit"></b-form-input>
	</b-form-group>
	<b-form-group
	label="Razon social">
		<b-form-input
		placeholder="Ingresar la razon social"
		v-model="client.razon_social"></b-form-input>
	</b-form-group>
    <b-form-group
    label="Condicion frente al IVA">
        <b-form-select
        :options="iva_condition_options"
        v-model="client.iva_condition_id"></b-form-select>
    </b-form-group>
    <b-form-group
    label="Vendedor">
        <b-form-select
        :options="seller_options"
        v-model="client.seller_id"></b-form-select>
    </b-form-group>
    <b-form-group>
    	<b-button
    	block
    	variant="primary"
    	@click="updateClient">
    		<btn-loader
    		text="Actualizar"
    		:loader="updating"></btn-loader>
    	</b-button>
    </b-form-group>
</b-modal>
</template>
<script>
import clients from '@/mixins/clients'
import iva_conditions from '@/mixins/iva_conditions'
import BtnLoader from '@/components/common/BtnLoader'
export default {
	name: 'EditClient',
	components: {
		BtnLoader,
	},
	data() {
		return {
			updating: false,
		}
	},
	mixins: [clients, iva_conditions],
	computed: {
		title() {
			return 'Editar cliente '+this.client.name
		},
		client() {
			return this.$store.state.clients.to_edit
		}
	},
	methods: {
		updateClient() {
			this.updating = true
			this.$api.put('/clients', {
				client: this.client
			})
			.then(res => {
				this.updating = false
				this.$store.commit('client/add', res.data.model)
				this.$toast.success('Cliente actualizado')
				this.$bvModal.hide('edit-client')
			})
			.catch(err => {
				console.log(err)
				this.updating = false
			})
		}
	}
}
</script>