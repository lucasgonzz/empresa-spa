<template>
	<b-modal ref="modal" id="demo-selector-videos" hide-header hide-footer size="xl" content-class="demo-videos-shell" aria-label="Elegí un video" @hidden="$emit('cerrado')">
		<div class="demo-videos">
			<nav class="demo-videos__nav" aria-label="Secciones de videos">
				<div class="demo-videos__brand"><span aria-hidden="true">✦</span><div>Explorá la demo<small>Videos a tu ritmo</small></div></div>
				<button v-for="seccion in secciones" :key="seccion.id" type="button" :class="{ 'is-active': actual && actual.id === seccion.id }" :aria-current="actual && actual.id === seccion.id ? 'page' : null" @click="elegida = seccion.id"><span>{{ seccion.nombre }}<small class="demo-videos__origen">{{ seccion.origen === 'recurso' ? 'Centro de recursos' : 'Demo' }}</small></span><small>{{ seccion.cantidad }}</small></button>
			</nav>
			<main class="demo-videos__contenido">
				<header class="demo-videos__header"><div><small>VIDEOS DE LA DEMO</small><h2>{{ actual ? actual.nombre : 'Elegí un video' }}</h2><p>El asistente te lo envía al chat para que lo mires cuando quieras.</p></div><button type="button" aria-label="Cerrar selector de videos" @click="cerrar"><i class="bi bi-x-lg" aria-hidden="true"></i></button></header>
				<p v-if="error" class="demo-videos__error" role="alert">{{ error }}</p>
				<p v-if="!videos.length" class="demo-videos__vacio">Todavía no hay videos disponibles en esta sección.</p>
				<div class="demo-videos__lista">
					<button v-for="video in videos" :key="video.clave" type="button" class="demo-videos__video" :disabled="!!seleccionando" @click="$emit('seleccionar', video)">
						<span class="demo-videos__numero">{{ video.posicion }}</span><span class="demo-videos__detalle"><strong>{{ video.titulo }}</strong><small>{{ video.posicion }} de {{ video.cantidad }}<span v-if="video.porcentaje"> · {{ video.porcentaje }}% visto</span></small></span><span class="demo-videos__enviar">{{ seleccionando === video.clave ? 'Enviando…' : 'Ver en el chat' }} <i class="bi bi-arrow-up-right" aria-hidden="true"></i></span>
					</button>
				</div>
			</main>
		</div>
	</b-modal>
</template>
<script>
export default {
	props: {
		catalogo: { type: Array, default: function () { return [] } },
		seleccionando: { type: String, default: '' },
		error: { type: String, default: '' },
	},
	data() { return { elegida: null } },
	computed: {
		secciones() {
			let secciones = []
			this.catalogo.forEach(function (video) {
				if (!video.seccion_id || secciones.some(item => item.id === video.seccion_id)) return
				secciones.push({ id: video.seccion_id, nombre: video.seccion, cantidad: video.cantidad, origen: video.origen })
			})
			return secciones
		},
		actual() { return this.secciones.find(item => item.id === this.elegida) || this.secciones[0] },
		videos() { let id = this.actual && this.actual.id; return this.catalogo.filter(video => video.seccion_id === id) },
	},
	methods: {
		abrir(video) { this.elegida = video.seccion_id; this.$refs.modal.show() },
		cerrar() { this.$refs.modal.hide() },
	},
}
</script>
<style lang="sass">
.demo-videos-shell
	border: 0 !important
	border-radius: 22px !important
	overflow: hidden
	.modal-body
		padding: 0
.demo-videos
	display: flex
	height: min(680px, 82vh)
	background: #fff
	color: #26324d
	button
		font: inherit
		cursor: pointer
	button:focus-visible
		outline: 2px solid #7384d8
		outline-offset: -2px
.demo-videos__nav
	flex: 0 0 220px
	width: 220px
	min-width: 0
	padding: 26px 14px
	background: #f4f6fb
	border-right: 1px solid #e9ecf4
	overflow-y: auto
	> button
		display: flex
		align-items: center
		justify-content: space-between
		gap: 8px
		width: 100%
		border: 0
		border-radius: 10px
		background: transparent
		color: #667086
		padding: 12px 14px
		text-align: left
		font-size: 13px
		margin-bottom: 5px
		overflow-wrap: anywhere
		&.is-active
			background: #e4e8fd
			color: #4d5dbb
			font-weight: 700
		&:hover
			background: #e9edf7
.demo-videos__brand
	display: flex
	align-items: center
	gap: 12px
	margin: 0 10px 30px
	font-size: 15px
	font-weight: 700
	color: #25304e
	> span
		font-size: 32px
		color: #7384d8
	small
		display: block
		font-size: 11px
		font-weight: 400
		color: #8893aa
.demo-videos__origen
	display: block
	margin-top: 3px
	font-size: 9px
	font-weight: 400
	opacity: .8
.demo-videos__contenido
	flex: 1
	min-width: 0
	padding: 32px
	overflow-y: auto
.demo-videos__header
	display: flex
	justify-content: space-between
	align-items: flex-start
	gap: 12px
	margin-bottom: 24px
	small
		font-size: 9px
		letter-spacing: .12em
		color: #8993aa
		font-weight: 700
	h2
		font-size: 24px
		font-weight: 700
		color: #26324d
		margin: 8px 0
	p
		color: #79839a
		font-size: 13px
		margin: 0
	button
		background: #f2f4f8
		border: 0
		border-radius: 9px
		width: 32px
		height: 32px
		color: #6c7891
		flex-shrink: 0
.demo-videos__lista
	display: grid
	gap: 10px
.demo-videos__video
	display: flex
	align-items: center
	gap: 14px
	width: 100%
	padding: 17px
	border: 1px solid #e9ecf4
	border-radius: 14px
	background: #fff
	color: #26324d
	text-align: left
	&:hover
		background: #f8f9fd
		border-color: #b9c2ed
	&:disabled
		opacity: .6
		cursor: wait
.demo-videos__numero
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 34px
	height: 34px
	background: #eef0fc
	color: #6474c7
	border-radius: 10px
	font-size: 13px
.demo-videos__detalle
	flex: 1
	min-width: 0
	overflow-wrap: anywhere
	strong
		display: block
		font-size: 14px
		font-weight: 600
	small
		display: block
		margin-top: 6px
		font-size: 11px
		color: #79839a
.demo-videos__enviar
	color: #6474c7
	font-size: 11px
	flex-shrink: 0
.demo-videos__error
	color: #a73443
	font-size: 13px
.demo-videos__vacio
	color: #79839a
	font-size: 13px
@media (max-width: 767px)
	.demo-videos
		height: 86vh
	.demo-videos__nav
		flex-basis: 118px
		width: 118px
		padding: 18px 7px
		> button
			padding: 11px 8px
			font-size: 11px
			gap: 5px
	.demo-videos__brand
		margin: 0 5px 20px
		font-size: 11px
		> span
			display: none
		small
			font-size: 9px
	.demo-videos__contenido
		padding: 20px 12px
	.demo-videos__header
		gap: 5px
		h2
			font-size: 19px
		p
			font-size: 11px
	.demo-videos__video
		flex-wrap: wrap
		gap: 9px
		padding: 12px
	.demo-videos__numero
		flex-basis: 26px
		height: 26px
	.demo-videos__detalle strong
		font-size: 12px
	.demo-videos__enviar
		width: 100%
</style>
