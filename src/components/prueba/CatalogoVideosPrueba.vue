<template>
	<div v-if="identidad" class="prueba-catalogo">
		<small v-if="cargando" role="status">Cargando videos de la prueba…</small>
		<p v-else-if="error" role="status">No pudimos cargar los videos. <button type="button" @click="cargar">Reintentar</button></p>
		<videos-prueba ref="videos" :catalogo="catalogo"></videos-prueba>
	</div>
</template>
<script>
import VideosPrueba from '@/components/prueba/VideosPrueba'
import { catalogo_de_prueba } from '@/components/prueba/videos'

export default {
	components: { VideosPrueba },
	data() { return { catalogo: [], cargando: false, error: false, revision: 0, destruido: false } },
	computed: {
		identidad() {
			const auth = this.$store.state.auth
			const usuario = auth.user
			// Soporte también ofrece el catálogo: la capacidad de chat personal no gobierna esta lectura.
			return auth.authenticated && !auth.version_bloqueada && !this.$store.state.prueba.vencida
				&& usuario && usuario.puede_usar_chat_prueba === true
				&& usuario.prueba && usuario.prueba.activa === true ? usuario.id : null
		},
	},
	watch: {
		identidad: { immediate: true, handler() { this.cargar() } },
		'$route.fullPath'() { this.cerrar() },
		'$store.state.ai_chat.selected_conversation_id'() { this.cerrar() },
	},
	beforeDestroy() { this.destruido = true; this.revision++; this.cerrar() },
	methods: {
		cerrar() { if (this.$refs.videos) this.$refs.videos.cerrar() },
		cargar() {
			const identidad = this.identidad
			const revision = ++this.revision
			this.cerrar()
			this.catalogo = []
			this.error = false
			this.cargando = !!identidad
			if (!identidad) return Promise.resolve()
			let self = this
			const vigente = () => !self.destruido && self.identidad === identidad && self.revision === revision
			// Sólo lectura: no inicia ni traslada conversaciones, y no modifica hitos.
			return this.$axios.get('/api/prueba/chat', { skip_global_error_event: true, timeout: 8000 }).then(function (res) {
				if (!vigente()) return
				self.catalogo = res.status !== 204 && res.data && res.data.disponible === true ? catalogo_de_prueba(res.data.catalogo) : []
			}).catch(function (e) {
				if (!vigente()) return
				self.error = !(e.response && [401, 403, 404, 405].indexOf(e.response.status) !== -1)
			}).then(function () { if (vigente()) self.cargando = false })
		},
	},
}
</script>
<style lang="sass">
.prueba-catalogo
	flex-shrink: 0
	padding: 0 16px
	color: #66748c
	> small, > p
		display: block
		font-size: 12px
		margin: 8px 0
	> p button
		border: 0
		background: transparent
		color: inherit
		text-decoration: underline
</style>
