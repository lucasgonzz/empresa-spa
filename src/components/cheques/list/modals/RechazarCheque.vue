<template>
	<b-modal
	hide-footer
	title="Rechazar cheque"
	id="rechazar-cheque"
	@show="al_abrir">

			<p>
				¿Seguro que quiere marcar este cheque como rechazado?
			</p>	

			<b-form-group
			label="Indique el motivo del rechazo">
				
				<!--
					maxlength: el mismo tope que la API (ChequeHelper::MOTIVO_DE_RECHAZO_MAX). Si se
					pasara, la API contesta 422 y el cheque no se rechaza.
				-->
				<b-form-textarea
				placeholder="Indique el motivo del rechazo"
				maxlength="1000"
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
		/**
		 * Al abrir el modal el motivo arranca vacío: un motivo escrito y cancelado no tiene que
		 * aparecer al rechazar OTRO cheque.
		 */
		al_abrir() {
			this.notas = ''
		},
		/**
		 * Rechaza el cheque con su motivo (misión cheque-motivo-rechazo, 9/10/2026).
		 *
		 * 🔴 El motivo viaja como `notas` y NO como `rechazado_observaciones`, a propósito. En un
		 * deploy el SPA se sube ANTES que la API y que la migración que pasa la columna a texto: la
		 * API vieja ignora `notas` sin romper (el cheque se rechaza, sin motivo, como siempre), pero
		 * un `rechazado_observaciones` con texto lo escribiría en la columna INT y el rechazo entero
		 * sería un 500. La API nueva lee las dos claves.
		 */
		rechazar() {
			this.$store.commit('auth/setMessage', 'Rechazando cheque')
			this.$store.commit('auth/setLoading', true)
			this.$api.put('cheque/rechazar', {
				cheque_id: this.cheque.id,
				notas: this.notas
			})
			.then(res => {
				// Vacío y no 0: con 0 el textarea mostraba "0" la próxima vez que se abría.
				this.notas = ''
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