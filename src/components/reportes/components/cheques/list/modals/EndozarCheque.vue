<template>
	<b-modal
	hide-footer
	title="Endosar cheque"
	id="endosar-cheque">

			<p>
				¿Seguro que quiere endosar este cheque como cobrado?
			</p>
		
			<b-form-group
			label="Indique el proveedor">
				<b-form-select
				v-model="provider_id"
				:options="getOptions({key: 'provider_id', text: 'Seleccione proveedor'})"></b-form-select> 
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
		endosar() {

			if (this.provider_id == 0) {
				this.$toast.error('Seleccione el proveedor')
				return
			}

			this.$store.commit('auth/setMessage', 'Endozando cheque')
			this.$store.commit('auth/setLoading', true)
			this.$api.put('cheque/endosar', {
				cheque_id: this.cheque.id,
				provider_id: this.provider_id
			})
			.then(res => {
				this.provider_id = 0
				this.$store.commit('auth/setLoading', false)
				this.$store.dispatch('cheque/getModels')
				this.$toast.success('Cheque endozado')
				this.$bvModal.hide('endosar-cheque')
			})
			.catch(err => {
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al endosar cheque')
			})
		}
	}
}
</script>