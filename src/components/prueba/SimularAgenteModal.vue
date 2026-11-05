<template>
	<b-modal
	id="prueba-simular-agente"
	title="Probá tu agente de WhatsApp"
	cancel-title="Cerrar"
	:ok-title="cargando ? 'Consultando...' : 'Ver respuesta'"
	:ok-disabled="cargando || !pregunta.trim()"
	centered
	scrollable
	@ok="simular"
	@hidden="limpiar">
		<p class="text-muted">
			Hacé una pregunta como si fueras un cliente. El agente va a usar tu catálogo y vas a ver la respuesta acá.
			Es una simulación. No se guarda la conversación ni se manda ningún mensaje.
		</p>
		<b-form-group label="Pregunta" label-for="prueba-pregunta-agente">
			<b-form-textarea
			id="prueba-pregunta-agente"
			v-model="pregunta"
			rows="3"
			maxlength="500"
			:disabled="cargando"
			placeholder="Por ejemplo, ¿tenés tornillos de 3 pulgadas?"></b-form-textarea>
		</b-form-group>

		<b-alert v-if="error" show variant="warning" role="alert" class="mb-0">
			{{ error }}
		</b-alert>
		<div aria-live="polite">
			<div v-if="respuesta" class="border rounded p-3">
				<h3 class="h6">Respuesta del agente</h3>
				<p class="prueba-respuesta-agente mb-0">{{ respuesta }}</p>
			</div>
		</div>
	</b-modal>
</template>

<script>
export default {
	data() {
		return {
			pregunta: '',
			respuesta: '',
			error: '',
			cargando: false,
			consulta: 0,
		}
	},
	methods: {
		simular(evento) {
			evento.preventDefault()
			if (this.cargando || !this.pregunta.trim()) {
				return
			}

			let self = this
			const consulta = ++this.consulta
			this.cargando = true
			this.error = ''
			this.respuesta = ''
			this.$api.post('prueba/simular-agente', { pregunta: this.pregunta.trim() }, { skip_global_error_event: true })
			.then(function(res) {
				if (consulta === self.consulta) {
					self.respuesta = res.data.respuesta
					self.cargando = false
				}
			})
			.catch(function(error) {
				if (consulta === self.consulta) {
					const respuesta = error.response && error.response.data
					self.error = respuesta && respuesta.message ? respuesta.message : 'No pudimos consultar al agente. Volvé a intentar.'
					self.cargando = false
				}
			})
		},
		limpiar() {
			this.consulta++
			this.cargando = false
			this.pregunta = ''
			this.respuesta = ''
			this.error = ''
		},
	},
}
</script>

<style lang="sass" scoped>
.prueba-respuesta-agente
	white-space: pre-wrap
	overflow-wrap: anywhere
</style>
