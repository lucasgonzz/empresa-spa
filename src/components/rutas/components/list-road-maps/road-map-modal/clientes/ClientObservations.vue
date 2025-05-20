<template>
	<div>
		<hr>
		<b-form-textarea
		v-model="text"
		placeholder="Ingrese una nueva observacion"></b-form-textarea>

		<b-button
		class="m-t-15"
		@click="save"
		variant="primary">
			Guardar observacion
		</b-button>

		<div
		v-if="_client.client_observations.length">
			<hr>
			<h5>
				Historial de observaciones
			</h5>
			<div 
			v-for="observation in _client.client_observations"
			class="observation custom-card m-t-15">
				<div class="header">
					El {{ date(observation.created_at) }} a las {{ hour(observation.created_at) }}
				</div>
				<div class="body">
					<p
					v-html="html_text(observation.text)"></p>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		_client: Object,
	},	
	data() {
		return {
			text: '',
		}
	},
	computed: {
		road_map() {
			return this.$store.state.road_map.model
		},
	},
	methods: {
		save() {
			this.$store.commit('auth/setMessage', 'Guardarndo')
			this.$store.commit('auth/setLoading', true)
			this.$api.post('road-map-client-observation', {
				text: this.text,
				client_id: this._client.client.id,
				road_map_id: this.road_map.id,
				text: this.text,
			})
			.then(res => {
				this.text = ''
				this.$store.commit('auth/setLoading', false)
				this.$bvModal.hide('road_map')
				this.$store.dispatch('road_map/getModels')
				this.$toast.success('Observacion guardada')
			})
			.catch(err => {
				console.log(err)
				this.$store.commit('auth/setLoading', false)
				this.$toast.error('Error al guardar observacion')
			})

		}
	}
}
</script>
<style lang="sass">
// .observation 

</style>