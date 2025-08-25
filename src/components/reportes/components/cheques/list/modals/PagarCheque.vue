<template>
	<b-modal
	hide-footer
	title="Pagar cheque"
	id="pagar-cheque">

			<p>
				¿Seguro que quiere marcar este cheque como cobrado?
			</p>
		
			<b-form-group
			label="Indique la caja ORIGEN"
			v-if="cajas.length">
				<b-form-select
				v-model="caja_id"
				:options="get_cajas_abiertas_options()"></b-form-select> 
			</b-form-group>

			<b-button
			@click="pagar"
			block
			variant="primary">
				Pagar cheque
			</b-button>
	</b-modal>
</template>
<script>
export default {
	computed: {
		cheque() {
			return this.$store.state.cheque.model 
		},
		cajas() {
			return this.$store.state.caja.models 
		},
	},
	data() {
		return {
			caja_id: 0,
		}
	},
	methods: {
		pagar() {

			if (this.cajas.length && this.caja_id == 0) {
				this.$toast.error('Seleccione la caja de destino')
				return
			}

			this.$store.commit('auth/setMessage', 'Cobrando cheque')
			this.$store.commit('auth/setLoading', true)
			this.$api.put('cheque/pagar', {
				cheque_id: this.cheque.id,
				caja_id: this.caja_id
			})
			.then(res => {
				this.caja_id = 0
				this.$store.commit('auth/setLoading', false)
				this.$store.dispatch('cheque/getModels')
				// this.$store.commit('cheque/add', res.data.model)
				this.$toast.success('Cheque pagado')
				this.$bvModal.hide('pagar-cheque')
			})
			.catch(err => {
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al pagar cheque')
			})
		}
	}
}
</script>