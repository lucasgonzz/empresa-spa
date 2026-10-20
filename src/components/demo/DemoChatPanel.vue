<template>
	<div class="demo-ai" :class="{ 'demo-ai--cerrado': colapsado }" :style="reserva_launcher">
		<button v-if="colapsado" class="demo-ai__launcher" type="button" aria-label="Abrir asistente de la demo" @click="$emit('alternar')">
			<span class="demo-ai__orb" aria-hidden="true">✦</span><span>Tu guía de demo <small>Seguí explorando</small></span><i class="bi bi-arrow-up-right"></i>
		</button>
		<aside v-show="!colapsado" class="demo-ai__panel" aria-label="Asistente de la demo">
			<header class="demo-ai__header">
				<span class="demo-ai__orb" aria-hidden="true">✦</span>
				<div><h2>Tu asistente de la demo</h2><p>Explorá, preguntá y probá</p><a v-if="tienda_url" class="demo-ai__tienda" :href="tienda_url" target="_blank" rel="noopener noreferrer" data-demo-tienda @click="pausar">Tu tienda <i class="bi bi-arrow-up-right" aria-hidden="true"></i></a></div>
				<button type="button" aria-label="Minimizar asistente" @click="minimizar"><i class="bi bi-dash-lg"></i></button>
			</header>
			<div ref="hilo" class="demo-ai__hilo" role="log" aria-live="polite" aria-label="Conversación de la demo">
				<div v-if="cargando && !mensajes.length" class="demo-ai__inicio"><span class="demo-ai__orb">✦</span><p>Preparando tu recorrido</p></div>
				<article v-for="mensaje in mensajes" :key="mensaje.id" class="demo-ai__mensaje" :class="{ 'demo-ai__mensaje--lead': mensaje.rol === 'lead' }">
					<small>{{ mensaje.rol === 'lead' ? 'Vos' : 'Asistente' }}</small>
					<p v-if="mensaje.contenido">{{ mensaje.contenido }}</p>
					<section v-for="video in mensaje.videos || []" :key="video.clave" class="demo-ai__video" :class="{ 'demo-ai__video--hecho': video.completado }">
						<div class="demo-ai__video-heading"><span>{{ video.origen === 'recurso' ? 'Centro de recursos' : 'Tu recorrido' }}</span><i v-if="video.completado" class="bi bi-check-circle-fill" aria-label="Video completado"></i></div>
						<h3>{{ video.titulo }}</h3>
						<button v-if="video_abierto !== mensaje.id + ':' + video.clave" class="demo-ai__ver" type="button" @click="abrir_video(mensaje, video)"><i class="bi bi-play-fill"></i>{{ video.completado ? 'Volver a ver' : 'Ver video' }}</button>
						<tarjeta-clip v-else ref="tarjeta_chat" :clip="clip_de(video)" :rastrear_segundos="true" :con_tour="tiene_tour(video)" :puede_probar="video.completado || !video.url" :probado="fue_probado(video)" @segundos="registrar_segundos(video, $event)" @probar="probar(video)" @terminado="refrescar"></tarjeta-clip>
						<div class="demo-ai__avance" role="progressbar" :aria-valuenow="video.porcentaje || 0" aria-valuemin="0" aria-valuemax="100" :aria-label="'Progreso de ' + video.titulo"><span :style="{ width: (video.porcentaje || 0) + '%' }"></span></div>
						<div class="demo-ai__video-pie"><span>{{ video.porcentaje || 0 }}% visto<span v-if="video.completado"> · Listo</span></span><button v-if="!video.completado && !video.omitido" type="button" @click="omitir(video)">Saltear</button><span v-else-if="video.omitido">Para después</span></div>
						<button v-if="ubicacion_video(video)" type="button" class="demo-ai__seccion" aria-haspopup="dialog" @click="abrir_selector(video)">{{ ubicacion_video(video) }} <i class="bi bi-chevron-down" aria-hidden="true"></i></button>
					</section>
				</article>
				<div v-if="pensando" class="demo-ai__pensando" role="status"><span class="demo-ai__constelacion" aria-hidden="true"><i></i><i></i><i></i></span><span>{{ estado === 'listo' ? 'Preparando tu respuesta' : 'Pensando' }}<small>{{ estado === 'esperando' ? 'Te leo. Podés seguir escribiendo.' : 'Buscando cómo ayudarte' }}</small></span></div>
			</div>
			<footer class="demo-ai__footer">
				<p v-if="error" class="demo-ai__error" role="alert">{{ error }} <button type="button" @click="reintentar">Reintentar</button></p>
				<p v-else-if="estado === 'error'" class="demo-ai__error" role="alert">No pude preparar la respuesta. Probá enviando tu consulta de nuevo.</p>
				<form class="demo-ai__composer" @submit.prevent="enviar">
					<textarea ref="entrada" v-model="texto" rows="2" maxlength="4000" placeholder="¿Qué querés probar?" aria-label="Preguntale al asistente de la demo" @keydown.enter.exact.prevent="enviar"></textarea>
					<button type="submit" :disabled="!texto.trim() || enviando" aria-label="Enviar mensaje"><i class="bi bi-arrow-up"></i></button>
				</form>
				<small class="demo-ai__ayuda">Preguntá lo que necesites. Vamos a tu ritmo.</small>
			</footer>
		</aside>
		<selector-videos-demo ref="selector" :catalogo="catalogo" :seleccionando="seleccionando" :error="error_seleccion" @seleccionar="seleccionar_video" @cerrado="error_seleccion = ''"></selector-videos-demo>
	</div>
</template>
<script>
import TarjetaClip from '@/components/demo/TarjetaClip'
import SelectorVideosDemo from '@/components/demo/SelectorVideosDemo'
import { tour_habilitado } from '@/tours/habilitados'

export default {
	components: { TarjetaClip, SelectorVideosDemo },
	props: { colapsado: { type: Boolean, default: false } },
	data() {
		return { mensajes: [], catalogo: [], conversacion: {}, texto: '', error: '', error_seleccion: '', seleccionando: '', seleccion_pendiente: null, cargando: true, enviando: false, esperando_local: false, video_abierto: null, temporizador: null, consultando: false, destruido: false, pendiente_envio: null, pendientes_video: {}, enviando_video: {}, revision: -1, reserva_compositor: 0 }
	},
	computed: {
		reserva_launcher() {
			// Comparte la reserva de Vender y deja lugar al asistente personal y al soporte.
			let vender = this.$store.state.vender
			let barra = Math.max(0, Number(vender && vender.actions_bar_height_px) || 0)
			let soporte = this.hasExtencion('support_chat') ? 76 : 0
			return { '--demo-launcher-base': Math.max(barra + soporte + 96, this.reserva_compositor) + 'px' }
		},
		estado_editores_whatsapp() {
			let chat = this.$store.state.whatsapp_chat || {}
			return [chat.sidebar_abierto, chat.selected_chat_id, chat.loading_messages, (chat.messages || []).length].join(':')
		},
		tienda_url() {
			let usuario = this.$store.state.auth.user
			let dueno = usuario && (usuario.owner || usuario)
			if (!dueno || typeof dueno.online !== 'string') return null
			try {
				let url = new URL(dueno.online.trim())
				return ['http:', 'https:'].indexOf(url.protocol) !== -1 && !url.username && !url.password ? url.href : null
			} catch (e) { return null }
		},
		estado() { return this.esperando_local ? 'esperando' : this.conversacion.estado },
		pensando() { return ['esperando', 'pensando', 'listo'].indexOf(this.estado) !== -1 },
	},
	watch: {
		colapsado() { this.actualizar_espacio(); this.programar_ubicacion_launcher() },
		estado_editores_whatsapp() { this.programar_ubicacion_launcher() },
		'$route.fullPath'() { this.programar_ubicacion_launcher() },
	},
	mounted() {
		this.actualizar_espacio()
		this.iniciar()
		this.observar_ubicacion_launcher()
		let self = this
		this.temporizador = setInterval(function () { self.refrescar() }, 3000)
	},
	beforeDestroy() {
		document.body.classList.remove('demo-chat-abierto')
		this.destruido = true
		clearInterval(this.temporizador)
		this.limpiar_ubicacion_launcher()
		this.pausar()
	},
	methods: {
		observar_ubicacion_launcher() {
			let self = this
			this._mover_launcher = function () { self.programar_ubicacion_launcher() }
			this._editores_launcher = []
			this._scroll_launcher = []
			if (window.ResizeObserver) this._resize_launcher = new ResizeObserver(this._mover_launcher)
			window.addEventListener('resize', this._mover_launcher)
			if (window.visualViewport) window.visualViewport.addEventListener('resize', this._mover_launcher)
			this.programar_ubicacion_launcher()
		},
		limpiar_ubicacion_launcher() {
			window.removeEventListener('resize', this._mover_launcher)
			if (window.visualViewport) window.visualViewport.removeEventListener('resize', this._mover_launcher)
			if (this._resize_launcher) this._resize_launcher.disconnect()
			;(this._scroll_launcher || []).forEach(e => e.removeEventListener('scroll', this._mover_launcher))
			cancelAnimationFrame(this._frame_launcher)
		},
		programar_ubicacion_launcher() {
			if (this.destruido || this._frame_launcher) return
			let self = this
			this.$nextTick(function () {
				if (self.destruido || self._frame_launcher) return
				self._frame_launcher = requestAnimationFrame(function () { self._frame_launcher = null; self.medir_compositores() })
			})
		},
		medir_compositores() {
			if (!this.colapsado) return
			// Reserva explícita del editor real y del editor de simulación; no busca controles globales.
			let editores = Array.from(document.querySelectorAll('.whatsapp-composer, .whatsapp-simulated-composer'))
			if (editores.length !== this._editores_launcher.length || editores.some((e, i) => e !== this._editores_launcher[i])) {
				if (this._resize_launcher) { this._resize_launcher.disconnect(); editores.forEach(e => this._resize_launcher.observe(e)) }
				this._editores_launcher = editores
				this._scroll_launcher.forEach(e => e.removeEventListener('scroll', this._mover_launcher))
				this._scroll_launcher = Array.from(document.querySelectorAll('.whatsapp-messages-container'))
				this._scroll_launcher.forEach(e => e.addEventListener('scroll', this._mover_launcher, { passive: true }))
			}
			let top = innerHeight
			editores.forEach(function (e) {
				let r = e.getBoundingClientRect()
				if (r.width && r.height && r.bottom > 0 && r.top < innerHeight && getComputedStyle(e).visibility !== 'hidden') top = Math.min(top, r.top)
			})
			this.reserva_compositor = Math.max(0, innerHeight - top + 12)
		},
		actualizar_espacio() { document.body.classList.toggle('demo-chat-abierto', !this.colapsado) },
		// El panel vive entre módulos: sus pedidos no pertenecen a la pantalla que se abandona.
		iniciar() {
			let self = this
			this.$axios.post('/api/demo/chat/iniciar', {}, { skip_navigation_cancel: true }).then(function (res) { self.aplicar(res.data); self.error = '' }).catch(function (e) { self.fallar(e) }).then(function () { self.cargando = false })
		},
		refrescar() {
			this.programar_ubicacion_launcher()
			if (this.consultando || this.destruido) return
			let self = this
			this.consultando = true
			this.$axios.get('/api/demo/chat', { skip_navigation_cancel: true }).then(function (res) {
				self.aplicar(res.data)
				if (!self.pendiente_envio) self.error = ''
				Object.keys(self.pendientes_video).forEach(function (clave) { self.enviar_progreso(clave) })
			}).catch(function (e) { self.fallar(e) }).then(function () { self.consultando = false })
		},
		aplicar(snapshot) {
			if (this.destruido) return
			if (!snapshot || snapshot.disponible === false) { this.$emit('no-disponible'); return }
			let revision = Number(snapshot.conversacion && snapshot.conversacion.revision) || 0
			if (revision < this.revision) return
			let nuevos = Array.isArray(snapshot.mensajes) ? snapshot.mensajes : []
			let anterior = this.mensajes.length ? this.mensajes[this.mensajes.length - 1].id : null
			this.revision = revision
			this.conversacion = snapshot.conversacion || {}
			// Una API anterior no anuncia el selector: el chat y su progreso siguen disponibles.
			this.catalogo = Array.isArray(snapshot.catalogo) ? snapshot.catalogo : []
			this.mensajes = nuevos
			let self = this
			nuevos.forEach(function (mensaje) { (mensaje.videos || []).forEach(function (video) {
				if (video.origen === 'demo' && video.completado && self.$store.state.demo.clips_vistos.indexOf(video.clip_id) === -1) self.$emit('terminado', self.clip_de(video))
			}) })
			if (nuevos.length && nuevos[nuevos.length - 1].id !== anterior) this.al_final()
		},
		enviar() {
			if (!this.texto.trim() || this.enviando) return
			let contenido = this.texto.trim()
			if (!this.pendiente_envio || this.pendiente_envio.contenido !== contenido) this.pendiente_envio = { contenido: contenido, cliente_uuid: this.uuid() }
			let self = this
			this.enviando = true
			this.esperando_local = true
			this.error = ''
			this.al_final()
			this.$axios.post('/api/demo/chat/mensajes', this.pendiente_envio, { skip_navigation_cancel: true }).then(function (res) {
				self.aplicar(res.data)
				if (self.texto.trim() === contenido) self.texto = ''
				self.pendiente_envio = null
			}).catch(function (e) { self.fallar(e) }).then(function () { self.enviando = false; self.esperando_local = false })
		},
		uuid() {
			return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { let r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16) })
		},
		fallar(error) {
			if (this.destruido) return
			if (error.response && [404, 405].indexOf(error.response.status) !== -1) { this.$emit('no-disponible'); return }
			this.error = 'Se cortó la conexión. Tu mensaje queda acá para reintentarlo.'
		},
		reintentar() { if (this.pendiente_envio) this.enviar(); else this.iniciar() },
		al_final() {
			let self = this
			this.$nextTick(function () { if (self.$refs.hilo) self.$refs.hilo.scrollTop = self.$refs.hilo.scrollHeight })
		},
		clip_de(video) {
			let encontrado = null
			this.$store.state.demo.secciones.forEach(function (seccion) { (seccion.clips || []).forEach(function (clip) { if (clip.id === video.clip_id) encontrado = clip }) })
			return Object.assign({}, encontrado || {}, { id: video.clip_id || video.codigo, titulo: video.titulo, url: video.url, practica: video.origen === 'demo' && (!encontrado || encontrado.practica !== false) })
		},
		tiene_tour(video) { return video.origen === 'demo' && tour_habilitado(this.clip_de(video)) },
		fue_probado(video) { return this.$store.state.demo.clips_probados.indexOf(video.clip_id) !== -1 },
		ubicacion_video(video) {
			let actual = this.catalogo.find(item => item.clave === video.clave)
			return actual && actual.seccion && actual.posicion > 0 && actual.cantidad > 0 ? actual.seccion + ' · ' + actual.posicion + ' de ' + actual.cantidad : ''
		},
		abrir_selector(video) {
			let actual = this.catalogo.find(item => item.clave === video.clave)
			if (!actual) return
			this.pausar()
			this.error_seleccion = ''
			this.$refs.selector.abrir(actual)
		},
		seleccionar_video(video) {
			if (this.seleccionando) return
			// El mismo intento conserva UUID ante una respuesta perdida; no duplica la tarjeta.
			if (!this.seleccion_pendiente || this.seleccion_pendiente.clave !== video.clave) this.seleccion_pendiente = { clave: video.clave, cliente_uuid: this.uuid() }
			let self = this
			this.seleccionando = video.clave
			this.error_seleccion = ''
			this.$axios.post('/api/demo/chat/videos/seleccionar', this.seleccion_pendiente, { skip_navigation_cancel: true }).then(function (res) {
				if (self.destruido) return
				self.aplicar(res.data)
				self.seleccion_pendiente = null
				self.$refs.selector.cerrar()
				self.al_final()
			}).catch(function (e) {
				if (self.destruido) return
				self.error_seleccion = e.response && e.response.status === 422 ? 'Este video ya no está disponible. Elegí otro.' : 'No pudimos enviar el video. Volvé a intentarlo.'
			}).then(function () { self.seleccionando = '' })
		},
		abrir_video(mensaje, video) {
			this.pausar()
			this.video_abierto = mensaje.id + ':' + video.clave
			if (video.origen === 'demo') this.$store.dispatch('demo/reportar', { nombre: 'clip.abierto', clip_id: video.clip_id })
		},
		pausar() { (this.$refs.tarjeta_chat || []).forEach(function (tarjeta) { tarjeta.pausar() }) },
		minimizar() { this.pausar(); this.$emit('alternar') },
		probar(video) { this.pausar(); this.$emit('probar', this.clip_de(video)) },
		registrar_segundos(video, datos) {
			let cola = this.pendientes_video[video.clave] || []
			let segundos = datos.segundos_vistos.slice()
			if (!segundos.length && datos.terminado !== true) return
			// Cada evento conserva su frontera: un ended previo no puede incorporar segundos
			// de una reproducción posterior mientras todavía hay un pedido en vuelo.
			for (let inicio = 0; inicio < segundos.length || inicio === 0; inicio += 600) {
				cola.push({ video: video, segundos: segundos.slice(inicio, inicio + 600), duracion: datos.duracion, terminado: datos.terminado === true && inicio + 600 >= segundos.length })
			}
			this.pendientes_video[video.clave] = cola
			this.enviar_progreso(video.clave)
		},
		enviar_progreso(clave) {
			if (this.enviando_video[clave]) return
			let cola = this.pendientes_video[clave]
			if (!cola || !cola.length) return
			let pendiente = cola[0]
			let self = this
			this.enviando_video[clave] = true
			this.$axios.post('/api/demo/chat/videos/progreso', { clave: clave, segundos_vistos: pendiente.segundos, duracion: pendiente.duracion, terminado: pendiente.terminado }, { skip_navigation_cancel: true }).then(function (res) {
				cola.shift()
				self.aplicar(res.data)
				if (pendiente.video.origen === 'demo') {
					let video = self.buscar_video(clave)
					if (video && !video.completado) self.$store.dispatch('demo/reportar', { nombre: 'clip.progreso', clip_id: video.clip_id, datos: { porcentaje: video.porcentaje || 0 } })
				}
				self.enviando_video[clave] = false
				self.enviar_progreso(clave)
			}).catch(function (e) { self.enviando_video[clave] = false; self.fallar(e) })
		},
		buscar_video(clave) {
			let encontrado = null
			this.mensajes.forEach(function (mensaje) { (mensaje.videos || []).forEach(function (video) { if (video.clave === clave) encontrado = video }) })
			return encontrado
		},
		omitir(video) {
			this.pausar()
			let self = this
			this.$axios.post('/api/demo/chat/videos/omitir', { clave: video.clave }, { skip_navigation_cancel: true }).then(function (res) { self.aplicar(res.data) }).catch(function (e) { self.fallar(e) })
		},
	},
}
</script>
<style lang="sass">
// El acceso al asistente del negocio vuelve al minimizar la guía de la demo.
body.demo-chat-abierto .asistente-ia-fab
	visibility: hidden
	pointer-events: none
.demo-ai
	--demo-ink: #e8edf8
	--demo-muted: #a3aec6
	position: fixed
	z-index: 1040
	right: 18px
	top: 76px
	bottom: 18px
	width: 420px
	max-width: calc(100vw - 24px)
	color: var(--demo-ink)
	font-family: inherit
	text-align: left
	&--cerrado
		top: auto
		bottom: min(var(--demo-launcher-base), calc(100vh - 144px))
		width: auto
	button, textarea
		font: inherit
	button
		cursor: pointer
	button:focus-visible, textarea:focus-visible
		outline: 2px solid #8fc7ff
		outline-offset: 3px
.demo-ai__panel
	position: relative
	display: flex
	flex-direction: column
	height: 100%
	padding: 1px
	border-radius: 24px
	background: linear-gradient(135deg, #76d8ff, #7969ec, #ed8bc5, #76d8ff)
	background-size: 300% 300%
	animation: demo-ai-onda 9s ease infinite
	box-shadow: 0 24px 70px #090d2852, 0 0 26px #7969ec20
	overflow: hidden
.demo-ai__header
	display: flex
	align-items: center
	gap: 12px
	padding: 20px 18px 17px
	background: #151b2e
	border-radius: 23px 23px 0 0
	h2
		font-size: 16px
		font-weight: 700
		margin: 0 0 4px
		color: #fff
	p
		margin: 0
		font-size: 12px
		color: var(--demo-muted)
	button
		margin-left: auto
		border: 0
		background: #ffffff0d
		color: #dae4ff
		border-radius: 10px
		width: 34px
		height: 34px
.demo-ai__tienda
	display: inline-flex
	align-items: center
	gap: 4px
	margin-top: 5px
	font-size: 12px
	color: #b7c9ff
	&:hover, &:focus
		color: #fff
.demo-ai__orb
	display: inline-flex
	align-items: center
	justify-content: center
	flex-shrink: 0
	width: 40px
	height: 40px
	border-radius: 14px
	color: white
	font-size: 26px
	background: linear-gradient(140deg, #69c8ee, #8377e9 55%, #e59abf)
	box-shadow: 0 0 24px #9793ff35
.demo-ai__hilo
	flex: 1
	min-height: 0
	padding: 20px 16px
	background: #111729
	overflow-y: auto
	overscroll-behavior: contain
	scrollbar-width: thin
	scrollbar-color: #3b4664 transparent
.demo-ai__inicio
	text-align: center
	padding: 40px 0
	p
		margin-top: 18px
		color: var(--demo-muted)
.demo-ai__mensaje
	margin-bottom: 22px
	font-size: 14px
	line-height: 1.6
	> small
		display: block
		color: #929eb8
		font-size: 10px
		font-weight: 700
		letter-spacing: .08em
		text-transform: uppercase
		margin-bottom: 7px
	> p
		margin: 0
		white-space: pre-wrap
		overflow-wrap: anywhere
	&--lead
		margin-left: 34px
		padding: 11px 15px
		border-radius: 17px 17px 3px 17px
		background: #2a3351
.demo-ai__video
	margin-top: 12px
	padding: 14px
	border: 1px solid #3a435e
	border-radius: 17px
	background: linear-gradient(150deg, #232b44, #192136)
	h3
		font-size: 15px
		line-height: 1.4
		font-weight: 600
		color: #f3f5ff
		margin: 8px 0 12px
	.tarjeta-clip__video
		max-height: 310px
	&--hecho
		border-color: #74d7b478
		.demo-ai__video-heading i
			color: #90e9c4
			animation: demo-ai-hecho .5s ease both
.demo-ai__video-heading, .demo-ai__video-pie
	display: flex
	justify-content: space-between
	align-items: center
	font-size: 11px
	color: #b9c5dc
.demo-ai__video-heading
	text-transform: uppercase
	letter-spacing: .06em
.demo-ai__ver
	border: 1px solid #8299da55
	width: 100%
	padding: 10px
	border-radius: 10px
	color: #f5f6ff
	background: #49598955
	i
		margin-right: 6px
.demo-ai__avance
	height: 3px
	background: #ffffff15
	border-radius: 9px
	margin: 14px 0 7px
	overflow: hidden
	span
		display: block
		height: 100%
		background: linear-gradient(90deg, #98a1ff, #75e6d0)
		transition: width .4s
.demo-ai__video-pie button
	border: 0
	background: transparent
	color: #c3c9f7
	padding: 3px
	text-decoration: underline
.demo-ai__seccion
	display: inline-flex
	align-items: center
	gap: 7px
	max-width: 100%
	margin-top: 9px
	padding: 6px 8px
	border: 1px solid #8299da55
	border-radius: 8px
	background: #ffffff08
	color: #cbd4f5
	font-size: 11px !important
	text-align: left
	overflow-wrap: anywhere
	&:hover
		background: #ffffff12
.demo-ai__footer
	background: #151b2e
	padding: 14px
	border-radius: 0 0 23px 23px
.demo-ai__composer
	position: relative
	display: flex
	gap: 8px
	align-items: flex-end
	padding: 10px
	border-radius: 16px
	border: 1px solid transparent
	background: linear-gradient(#202941, #202941) padding-box, linear-gradient(120deg, #76d8ff, #a49dff, #ed8bc5, #76d8ff) border-box
	background-size: 100% 100%, 300% 300%
	animation: demo-ai-onda 7s ease infinite
	box-shadow: inset 0 0 14px #a49dff09, 0 0 16px #83bdff0e
	textarea
		width: 100%
		resize: none
		border: 0
		outline: 0
		background: transparent
		color: #f4f5ff
		font-size: 14px
		line-height: 1.5
		min-height: 43px
		&::placeholder
			color: #a6b2ca
	button
		flex-shrink: 0
		width: 34px
		height: 34px
		border: 0
		border-radius: 11px
		color: #151b2e
		background: #c2c4ff
		&:disabled
			opacity: .35
.demo-ai__ayuda
	display: block
	text-align: center
	font-size: 10px
	color: #a6b2ca
	margin-top: 10px
.demo-ai__error
	font-size: 12px
	color: #ffcccb
	button
		border: 0
		background: transparent
		color: #ddd9ff
		text-decoration: underline
.demo-ai__pensando
	display: flex
	align-items: center
	gap: 12px
	font-size: 12px
	color: #d7ddfa
	padding: 8px 0 16px
	small
		display: block
		font-size: 10px
		color: #a5b0cb
.demo-ai__constelacion
	position: relative
	width: 32px
	height: 32px
	flex-shrink: 0
	animation: demo-ai-orbita 5s linear infinite
	i
		position: absolute
		width: 8px
		height: 8px
		border-radius: 50%
		background: #adc4ff
		box-shadow: 0 0 10px #adc4ff
		&:nth-child(1)
			left: 12px
			top: 1px
		&:nth-child(2)
			left: 1px
			top: 21px
			background: #b39bff
		&:nth-child(3)
			right: 1px
			top: 21px
			background: #93e0db
.demo-ai__launcher
	display: flex
	max-width: 100%
	align-items: center
	gap: 12px
	border: 1px solid #a8b1ff
	border-radius: 19px
	padding: 11px 16px 11px 11px
	background: #151b2e
	color: #f5f7ff
	box-shadow: 0 9px 30px #171d384d, 0 0 24px #9a8ce52e
	text-align: left
	font-size: 14px
	small
		display: block
		color: #bac6df
		font-size: 10px
@keyframes demo-ai-onda
	0%, 100%
		background-position: 0% 50%
	50%
		background-position: 100% 50%
@keyframes demo-ai-orbita
	to
		transform: rotate(360deg)
@keyframes demo-ai-hecho
	0%
		transform: scale(.45)
	60%
		transform: scale(1.25)
	100%
		transform: scale(1)
@media (max-width: 600px)
	.demo-ai
		right: 8px
		top: 64px
		bottom: 8px
		width: calc(100vw - 16px)
		max-width: none
		&--cerrado
			top: auto
			bottom: min(var(--demo-launcher-base), calc(100vh - 144px))
			width: auto
	.demo-ai__header
		padding: 15px 12px
	.demo-ai__hilo
		padding: 16px 12px
@media (max-height: 420px)
	.demo-ai__launcher
		width: 48px
		height: 48px
		padding: 8px
		justify-content: center
		> span:not(.demo-ai__orb), > i
			display: none
		.demo-ai__orb
			width: 32px
			height: 32px
	.demo-ai.demo-ai--cerrado
		// En horizontal la pila puede no entrar: deja libre la columna de los FAB.
		right: 96px
		max-width: calc(100vw - 112px)
@media (prefers-reduced-motion: reduce)
	.demo-ai__panel, .demo-ai__composer, .demo-ai__constelacion, .demo-ai__video-heading i
		animation: none !important
	.demo-ai__avance span
		transition: none
</style>
