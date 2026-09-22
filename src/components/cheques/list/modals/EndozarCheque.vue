<template>
	<b-modal
	hide-footer
	title="Endosar cheque"
	id="endosar-cheque"
	@shown="onShown">

			<p>
				¿Seguro que quiere endosar este cheque como cobrado?
			</p>
		
			<b-form-group
			label="Indique el proveedor">
				<b-form-select
				v-model="provider_id"
				:options="getOptionsFromCatalog({key: 'provider_id', text: 'Seleccione proveedor'})"></b-form-select>
			</b-form-group>

			<b-button
			@click="endosar"
			block
			variant="primary">
				Endosar cheque
			</b-button>
	</b-modal>
</template>
<script>
export default {
	computed: {
		cheque() {
			return this.$store.state.cheque.model 
		},
	},
	data() {
		return {
			provider_id: 0,
		}
	},
	methods: {
		onShown() {
			this.$store.dispatch('provider/getOptions')
		},
		endosar() {

			if (this.provider_id == 0) {
				this.$toast.error('Seleccione el proveedor')
				return
			}

			this.$store.commit('auth/setMessage', 'Endosando cheque')
			this.$store.commit('auth/setLoading', true)
			/*
				Desde la misión cheques-endoso-y-bancos (21/9/2026) la API responde 422 con un
				mensaje en lenguaje de comerciante cuando el endoso no puede hacerse (el cheque ya
				se endosó, se cobró o venció; el proveedor no tiene cuenta en esa moneda). Ese
				texto es lo que hay que mostrar, y una sola vez: sin `skip_global_error_event` el
				interceptor de main.js lo sacaba como warning y acá encima salía un genérico.
			*/
			this.$api.put('cheque/endosar', {
				cheque_id: this.cheque.id,
				provider_id: this.provider_id
			}, {
				skip_global_error_event: true,
			})
			.then(res => {
				this.provider_id = 0
				this.$store.commit('auth/setLoading', false)
				this.$store.dispatch('cheque/getModels')
				this.$toast.success('Cheque endosado')
				this.$bvModal.hide('endosar-cheque')
			})
			.catch(err => {
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$store.commit('auth/setMessage', '')

				let mensaje = 'Error al endosar cheque'
				if (err && err.response && err.response.data && err.response.data.message) {
					mensaje = err.response.data.message
				}
				this.$toast.error(mensaje, {
					duration: 10000,
				})
			})
		}
	}
}
</script>