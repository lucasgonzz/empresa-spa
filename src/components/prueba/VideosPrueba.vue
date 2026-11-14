<template>
	<div v-if="videos.length" class="prueba-videos">
		<button type="button" class="prueba-videos__abrir" aria-haspopup="dialog" @click="abrir()"><i class="bi bi-play-circle" aria-hidden="true"></i>Videos para tu prueba</button>
		<b-modal ref="modal" id="prueba-selector-videos" title="Videos para tu prueba" hide-footer size="lg" modal-class="prueba-videos-modal" @hide="pausar" @hidden="elegida = null">
			<p>Elegí qué querés conocer. Los videos no hacen cambios en tu negocio.</p>
			<section v-if="actual" class="prueba-videos__reproductor" :aria-label="actual.titulo">
				<h3>{{ actual.titulo }}</h3>
				<tarjeta-clip :key="actual.clave + ':' + actual.url" ref="tarjeta" :clip="actual" :rastrear_segundos="false" :con_tour="false"></tarjeta-clip>
			</section>
			<div class="prueba-videos__lista" aria-label="Videos disponibles">
				<button v-for="video in videos" :key="video.clave" type="button" :aria-pressed="!!actual && actual.clave === video.clave" @click="seleccionar(video)"><i class="bi bi-play-circle" aria-hidden="true"></i><span>{{ video.titulo }}</span></button>
			</div>
			<button type="button" class="prueba-videos__cerrar" @click="cerrar">Cerrar videos</button>
		</b-modal>
	</div>
</template>
<script>
import TarjetaClip from '@/components/demo/TarjetaClip'
import { catalogo_de_prueba } from '@/components/prueba/videos'

export default {
	components: { TarjetaClip },
	props: { catalogo: { type: Array, default: function () { return [] } } },
	data() { return { elegida: null } },
	computed: {
		videos() { return catalogo_de_prueba(this.catalogo) },
		actual() { return this.videos.find(video => video.clave === this.elegida) || null },
	},
	watch: {
		videos() {
			if (this.elegida && !this.actual) { this.pausar(); this.elegida = null }
			if (!this.videos.length) this.cerrar()
		},
	},
	beforeDestroy() { this.pausar() },
	methods: {
		abrir(video) {
			if (!this.videos.length) return
			this.pausar_otros_medios()
			if (video && !this.seleccionar(video)) return
			if (!video) this.elegida = null
			this.$refs.modal.show()
		},
		seleccionar(video) {
			let actual = this.videos.find(item => item.clave === (video && video.clave))
			if (!actual) return false
			this.pausar_otros_medios()
			this.pausar()
			this.elegida = actual.clave
			return true
		},
		pausar_otros_medios() {
			// Soporte conserva su hilo oculto: su multimedia no debe sonar junto al selector.
			if (typeof document === 'undefined') return
			Array.from(document.querySelectorAll('video, audio')).forEach(function (medio) { medio.pause() })
		},
		pausar() { if (this.$refs.tarjeta) this.$refs.tarjeta.pausar() },
		cerrar() { this.pausar(); this.elegida = null; if (this.$refs.modal) this.$refs.modal.hide() },
	},
}
</script>
<style lang="sass">
.prueba-videos__abrir
	display: inline-flex
	align-items: center
	gap: 7px
	max-width: 100%
	margin: 8px 0
	padding: 7px 10px
	border: 1px solid #8194ca
	border-radius: 8px
	background: #eef0fc
	color: #354a87
	font-size: 12px
	text-align: left
	overflow-wrap: anywhere

.prueba-videos-modal
	.modal-body
		max-height: 80vh
		overflow-y: auto
		> p
			color: #526176
			font-size: 14px
.prueba-videos__reproductor
	margin-bottom: 18px
	h3
		font-size: 18px
		overflow-wrap: anywhere
.prueba-videos__lista
	display: grid
	gap: 8px
	button
		display: flex
		align-items: center
		gap: 10px
		width: 100%
		padding: 12px
		border: 1px solid #dce3ee
		border-radius: 10px
		background: #f7f9fc
		color: #26324d
		text-align: left
		overflow-wrap: anywhere
		&[aria-pressed="true"]
			border-color: #6474c7
			background: #eef0fc
.prueba-videos__cerrar
	margin-top: 16px
	padding: 8px 16px
	border: 1px solid #6474c7
	border-radius: 8px
	background: #fff
	color: #43559e
</style>
