<template>
<b-modal 
id="client" 
:title="title" 
hide-footer>
	<b-form-group
	v-for="prop in props"
	:label="prop.text">
		<b-form-input
		v-if="prop.type == 'text' || prop.type == 'number'"
		:placeholder="'Ingresar '+prop.text"
		:type="prop.type"
		v-model="model[prop.key]"></b-form-input>
		<b-form-select
		v-else-if="prop.type == 'select'"
		v-model="model[prop.key]"
		:options="getOptions(prop.key, prop.text)"></b-form-select>
	</b-form-group>
    <b-form-group>
    	<b-button
    	block
    	variant="primary"
    	@click="save">
    		<btn-loader
    		text="Guardar"
    		:loader="loading"></btn-loader>
    	</b-button>
    </b-form-group>
</b-modal>
</template>
<script>
import BtnLoader from '@/components/common/BtnLoader'

import iva_conditions from '@/mixins/iva_conditions'
import locations from '@/mixins/locations'
import sellers from '@/mixins/sellers'

import client_model from '@/models/client'
export default {
	name: 'ClientModel',
	mixins: [sellers, iva_conditions, locations],
	components: {
		BtnLoader,
	},
	data() {
		return {
			loading: false,
		}
	},
	computed: {
		props() {
			return client_model.props
		},
		title() {
			if (this.model.id) {
				return 'Editar cliente '+this.model.name
			}
			return 'Nuevo cliente'
		},
		model() {
			return this.$store.state.clients.model
		}
	},
	methods: {
		// options(prop) {
		// 	let name = prop.key+'_options'
		// 	return this[name]
		// },
		save() {
			if (this.check() && !this.loading) {
				this.loading = true
				if (this.model.id) {
					this.$api.put('/clients/'+this.model.id, this.model)
					.then(res => {
						this.loading = false
						this.$store.commit('clients/update', res.data.client)
						this.$toast.success('Cliente actualizado')
						this.$bvModal.hide('client')
					})
					.catch(err => {
						console.log(err)
						this.loading = false
						this.$toast.error('Error al actualizar cliente')
					})
				} else {
					this.$api.post('/clients', this.model)
					.then(res => {
						this.loading = false
						this.$store.commit('clients/add', res.data.client)
						this.$toast.success('Cliente guardado')
						this.$bvModal.hide('client')
					})
					.catch(err => {
						console.log(err)
						this.loading = false
						this.$toast.error('Error al guardar cliente')
					})
				}
			}
		},
		check() {
			if (this.model.name == '') {
				this.$toast.error('Ingrese un nombre para el cliente')
				return false 
			}
			return true 
		}
	}
}
</script>