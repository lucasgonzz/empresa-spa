<template>
	<b-modal
	hide-footer
	title="Rechazar cheque"
	id="rechazar-cheque">

			<p>
				¿Seguro que quiere marcar este cheque como rechazado?
			</p>	

			<b-form-group
			label="Indique el motivo del rechazo">
				
				<b-form-textarea
				placeholder="Indique el motivo del rechazo"
				v-model="notas"></b-form-textarea>
			</b-form-group>
		
			<b-button
			@click="rechazar"
			block
			variant="primary">
				Rechazar cheque
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
			notas: '',
		}
	},
	methods: {
		rechazar() {


			this.$store.commit('auth/setMessage', 'Rechazando cheque')
			this.$store.commit('auth/setLoading', true)
			this.$api.put('cheque/rechazar', {
				cheque_id: this.cheque.id,
				notas: this.notas
			})
			.then(res => {
				this.notas = 0
				this.$store.commit('auth/setLoading', false)
				this.$store.dispatch('cheque/getModels')
				this.$toast.success('Cheque rechazado')
				this.$bvModal.hide('rechazar-cheque')
			})
			.catch(err => {
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al rechazar cheque')
			})
		}
	}
}
</script>