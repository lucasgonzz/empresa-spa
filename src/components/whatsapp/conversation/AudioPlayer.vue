<template>
	<!-- Reproductor de audio estilo WhatsApp: mic + play + tiempo + waveform + velocidad -->
	<div
	class="wa-audio-player"
	:class="is_outgoing ? 'wa-audio-player--outgoing' : 'wa-audio-player--incoming'">

		<!-- Elemento <audio> real, oculto: se controla por código vía $refs.audio_el -->
		<audio
		ref="audio_el"
		:src="src"
		preload="metadata"
		class="wa-audio-native"></audio>

		<!-- Ícono de micrófono visible en reposo; se oculta al reproducir -->
		<span
		v-if="!is_playing"
		class="wa-audio-mic"
		aria-hidden="true">🎤</span>

		<!-- Botón circular play/pause -->
		<button
		type="button"
		class="wa-audio-play-btn"
		:title="is_playing ? 'Pausar' : 'Reproducir'"
		@click="toggle_play">
			<i
			class="bi"
			:class="is_playing ? 'bi-pause-fill' : 'bi-play-fill'"
			aria-hidden="true"></i>
		</button>

		<!-- Tiempo: duración en reposo, transcurrido mientras reproduce -->
		<span class="wa-audio-time">{{ time_label }}</span>

		<!-- Waveform pseudo-aleatorio: barras estáticas con progreso por color -->
		<div
		class="wa-audio-waveform"
		role="slider"
		:aria-valuenow="Math.round(current_time)"
		:aria-valuemax="has_valid_duration ? Math.round(duration) : 0"
		aria-label="Posición de reproducción"
		@click="on_waveform_click">
			<span
			v-for="(bar, bar_index) in waveform_bars"
			:key="bar_index"
			class="wa-audio-bar"
			:class="{ 'wa-audio-bar--played': is_bar_played(bar_index) }"
			:style="{ height: bar.height + 'px' }"></span>
		</div>

		<!-- Botón de velocidad: cicla 1x -> 1.5x -> 2x -->
		<button
		type="button"
		class="wa-audio-rate-btn"
		title="Velocidad de reproducción"
		@click="cycle_rate">
			{{ playback_rate }}x
		</button>

	</div>
</template>
<script>
/**
 * Reproductor de audio propio con estética WhatsApp para las burbujas con nota de voz.
 *
 * Reemplaza al control nativo `<audio controls>` controlando un elemento `<audio>` oculto
 * por código. Soporta play/pause, seek por waveform y cambio de velocidad.
 *
 * 🔴 **Es un port de `admin-spa/src/components/lead/conversation/AudioPlayer.vue`** (Vue 3).
 * Lo único que cambia en la lógica es `beforeUnmount` -> `beforeDestroy`, que es el nombre del
 * hook en Vue 2. No tiene ninguna dependencia: ni store, ni axios, ni el JS de Bootstrap, así
 * que no hubo nada que traducir de Bootstrap 5 a 4 — el molde no usa ni una clase utilitaria
 * ni una variable `--bs-*`, todos los colores salen de custom properties propias `--wa-audio-*`
 * declaradas más abajo.
 *
 * Los nombres de clase quedan con el prefijo `wa-audio-` del original (verificado: no chocan con
 * nada del repo) para que este archivo se pueda seguir diffeando contra el de `admin-spa` cuando
 * alguno de los dos se arregle.
 */
export default {
	name: 'WhatsappAudioPlayer',
	props: {
		/** URL del archivo de audio (viene servida en `message.media_src`). */
		src: { type: String, required: true },
		/** true en mensajes salientes: adapta colores del botón y del waveform. */
		is_outgoing: { type: Boolean, default: false },
	},
	data() {
		return {
			/** true mientras el audio se está reproduciendo. */
			is_playing: false,
			/** Segundo actual de reproducción. */
			current_time: 0,
			/** Duración total del audio en segundos (0 o Infinity si aún no se conoce). */
			duration: 0,
			/** Velocidad de reproducción actual (cicla entre los valores de rate_steps). */
			playback_rate: 1,
			/** Pasos de velocidad disponibles, en orden de ciclado. */
			rate_steps: [1, 1.5, 2],
			/** Cantidad fija de barras del waveform (estilo WhatsApp). */
			waveform_bar_count: 30,
		}
	},
	computed: {
		/**
		 * true si la duración reportada por el navegador es un número finito y positivo.
		 * Algunos audios webm/ogg de WhatsApp reportan Infinity hasta hacer seek.
		 *
		 * @returns {boolean}
		 */
		has_valid_duration() {
			return typeof this.duration === 'number' && isFinite(this.duration) && this.duration > 0
		},
		/**
		 * Semilla numérica derivada del src para generar barras pseudo-aleatorias estables.
		 *
		 * @returns {number}
		 */
		waveform_seed() {
			var hash = 0
			var str = (this.src || '') + ''
			var i = 0
			for (i = 0; i < str.length; i = i + 1) {
				hash = ((hash << 5) - hash) + str.charCodeAt(i)
				hash = hash & hash
			}
			return Math.abs(hash)
		},
		/**
		 * Barras del waveform con alturas entre 4px y 18px según semilla + índice.
		 *
		 * @returns {Array<{height: number}>}
		 */
		waveform_bars() {
			var bars = []
			var seed = this.waveform_seed
			var i = 0
			for (i = 0; i < this.waveform_bar_count; i = i + 1) {
				var pseudo = this.pseudo_random(seed, i)
				bars.push({
					height: 4 + Math.floor(pseudo * 14),
				})
			}
			return bars
		},
		/**
		 * Etiqueta de tiempo: transcurrido mientras reproduce, duración total en reposo.
		 *
		 * @returns {string}
		 */
		time_label() {
			if (this.is_playing || this.current_time > 0) {
				return this.format_time(this.current_time)
			}
			if (this.has_valid_duration) {
				return this.format_time(this.duration)
			}
			return '--:--'
		},
	},
	mounted() {
		/* Registrar listeners del elemento audio al montar el componente. */
		const el = this.$refs.audio_el
		if (!el) {
			return
		}
		el.addEventListener('loadedmetadata', this.on_loaded_metadata)
		el.addEventListener('timeupdate', this.on_time_update)
		el.addEventListener('play', this.on_play)
		el.addEventListener('pause', this.on_pause)
		el.addEventListener('ended', this.on_ended)
	},
	beforeDestroy() {
		/* Quitar listeners y frenar la reproducción para evitar fugas de memoria. */
		const el = this.$refs.audio_el
		if (!el) {
			return
		}
		el.removeEventListener('loadedmetadata', this.on_loaded_metadata)
		el.removeEventListener('timeupdate', this.on_time_update)
		el.removeEventListener('play', this.on_play)
		el.removeEventListener('pause', this.on_pause)
		el.removeEventListener('ended', this.on_ended)
		el.pause()
	},
	methods: {
		/**
		 * Genera un valor pseudo-aleatorio entre 0 y 1 a partir de semilla e índice.
		 *
		 * @param {number} seed Semilla base (derivada del src).
		 * @param {number} index Índice de la barra del waveform.
		 * @returns {number}
		 */
		pseudo_random(seed, index) {
			var x = Math.sin((seed + 1) * (index + 1) * 12.9898) * 43758.5453
			return x - Math.floor(x)
		},
		/**
		 * true si la barra ya fue "reproducida" según el progreso actual.
		 *
		 * @param {number} bar_index Índice de la barra (0-based).
		 * @returns {boolean}
		 */
		is_bar_played(bar_index) {
			if (!this.has_valid_duration) {
				return false
			}
			var progress = this.current_time / this.duration
			var bar_progress = (bar_index + 1) / this.waveform_bar_count
			return bar_progress <= progress
		},
		/**
		 * Alterna entre reproducir y pausar el audio.
		 *
		 * @returns {void}
		 */
		toggle_play() {
			const el = this.$refs.audio_el
			if (!el) {
				return
			}
			if (el.paused) {
				/* play() devuelve promesa: usar .catch para no romper si el navegador la rechaza. */
				const result = el.play()
				if (result && typeof result.catch === 'function') {
					result.catch(function () {
						/* Reproducción bloqueada (autoplay policy u otra causa): se ignora silenciosamente. */
					})
				}
			} else {
				el.pause()
			}
		},
		/**
		 * Cicla la velocidad de reproducción entre los pasos configurados (1x -> 1.5x -> 2x).
		 *
		 * @returns {void}
		 */
		cycle_rate() {
			const current_index = this.rate_steps.indexOf(this.playback_rate)
			const next_index = (current_index + 1) % this.rate_steps.length
			this.playback_rate = this.rate_steps[next_index]
			const el = this.$refs.audio_el
			if (el) {
				el.playbackRate = this.playback_rate
			}
		},
		/**
		 * Seek al hacer clic en el waveform según posición horizontal del clic.
		 *
		 * @param {MouseEvent} event Clic sobre el contenedor de barras.
		 * @returns {void}
		 */
		on_waveform_click(event) {
			const el = this.$refs.audio_el
			if (!el || !this.has_valid_duration) {
				return
			}
			const rect = event.currentTarget.getBoundingClientRect()
			if (!rect.width) {
				return
			}
			const ratio = (event.clientX - rect.left) / rect.width
			const clamped_ratio = Math.max(0, Math.min(1, ratio))
			const new_time = clamped_ratio * this.duration
			el.currentTime = new_time
			this.current_time = new_time
		},
		/**
		 * Al conocerse la metadata, guardar la duración del audio.
		 *
		 * @returns {void}
		 */
		on_loaded_metadata() {
			const el = this.$refs.audio_el
			if (el) {
				this.duration = el.duration
			}
		},
		/**
		 * Actualiza el segundo actual mientras avanza la reproducción.
		 *
		 * @returns {void}
		 */
		on_time_update() {
			const el = this.$refs.audio_el
			if (el) {
				this.current_time = el.currentTime
				/* Si la duración recién ahora se vuelve finita (caso webm/ogg), tomarla. */
				if (!this.has_valid_duration && isFinite(el.duration) && el.duration > 0) {
					this.duration = el.duration
				}
			}
		},
		/**
		 * Marca el estado como reproduciendo.
		 *
		 * @returns {void}
		 */
		on_play() {
			this.is_playing = true
		},
		/**
		 * Marca el estado como pausado.
		 *
		 * @returns {void}
		 */
		on_pause() {
			this.is_playing = false
		},
		/**
		 * Al terminar el audio: vuelve al inicio y marca pausado.
		 *
		 * @returns {void}
		 */
		on_ended() {
			this.is_playing = false
			this.current_time = 0
		},
		/**
		 * Formatea segundos a mm:ss.
		 *
		 * @param {number} seconds Segundos a formatear.
		 * @returns {string}
		 */
		format_time(seconds) {
			const total = Math.max(0, Math.floor(seconds || 0))
			const minutes = Math.floor(total / 60)
			const remaining = total % 60
			const padded = remaining < 10 ? '0' + remaining : '' + remaining
			return minutes + ':' + padded
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`, como el resto del módulo de WhatsApp: el aislamiento es por prefijo de clase.
// El original de `admin-spa` sí lo usa, pero acá la convención es BEM global.

// Contenedor pill tipo WhatsApp: mic + play + tiempo + waveform + velocidad.
.wa-audio-player
	display: flex
	align-items: center
	gap: .35rem
	min-width: 200px
	max-width: 320px
	margin-bottom: .25rem
	padding: .35rem .5rem
	border-radius: 22px
	background: var(--wa-audio-pill-bg, rgba(0, 0, 0, .06))

// Saliente (burbuja verde): botón verde oscuro y barras más contrastadas.
.wa-audio-player--outgoing
	--wa-audio-pill-bg: rgba(0, 0, 0, .05)
	--wa-audio-btn-bg: #1b8755
	--wa-audio-btn-color: #ffffff
	--wa-audio-bar-color: rgba(17, 27, 33, .28)
	--wa-audio-bar-played: rgba(17, 27, 33, .62)
	--wa-audio-time-color: rgba(17, 27, 33, .55)
	--wa-audio-rate-bg: rgba(255, 255, 255, .65)
	--wa-audio-rate-color: rgba(17, 27, 33, .65)

// Entrante (burbuja blanca): botón blanco con acento verde.
.wa-audio-player--incoming
	--wa-audio-pill-bg: rgba(0, 0, 0, .04)
	--wa-audio-btn-bg: #ffffff
	--wa-audio-btn-color: #1b8755
	--wa-audio-bar-color: rgba(17, 27, 33, .22)
	--wa-audio-bar-played: #1b8755
	--wa-audio-time-color: rgba(17, 27, 33, .5)
	--wa-audio-rate-bg: rgba(255, 255, 255, .85)
	--wa-audio-rate-color: rgba(17, 27, 33, .6)

// El <audio> real queda fuera de pantalla; se controla solo por código.
.wa-audio-native
	display: none

// Ícono de micrófono al inicio (solo en reposo).
.wa-audio-mic
	flex-shrink: 0
	font-size: .95rem
	line-height: 1
	opacity: .85
	user-select: none

// Botón circular play/pause.
.wa-audio-play-btn
	flex-shrink: 0
	width: 2rem
	height: 2rem
	border-radius: 50%
	border: none
	background: var(--wa-audio-btn-bg, #1b8755)
	color: var(--wa-audio-btn-color, #ffffff)
	display: inline-flex
	align-items: center
	justify-content: center
	font-size: 1.05rem
	cursor: pointer
	padding: 0
	padding-left: .05rem
	transition: filter .15s
	box-shadow: 0 1px 2px rgba(11, 20, 26, .12)
	&:hover
		filter: brightness(1.06)

// Tiempo a la izquierda del waveform.
.wa-audio-time
	flex-shrink: 0
	font-size: .68rem
	line-height: 1
	color: var(--wa-audio-time-color, rgba(17, 27, 33, .5))
	font-variant-numeric: tabular-nums
	min-width: 1.85rem
	text-align: center
	user-select: none

// Contenedor del waveform: barras inline de 2px con gap mínimo.
.wa-audio-waveform
	flex: 1
	display: flex
	align-items: center
	justify-content: space-between
	gap: 1px
	min-width: 0
	height: 18px
	cursor: pointer
	user-select: none

// Barra individual del waveform.
.wa-audio-bar
	display: inline-block
	width: 2px
	min-height: 4px
	border-radius: 1px
	background: var(--wa-audio-bar-color, rgba(17, 27, 33, .25))
	transition: background-color .08s linear
	&--played
		background: var(--wa-audio-bar-played, rgba(17, 27, 33, .55))

// Botón de velocidad de reproducción.
.wa-audio-rate-btn
	flex-shrink: 0
	border: none
	background: var(--wa-audio-rate-bg, rgba(255, 255, 255, .7))
	color: var(--wa-audio-rate-color, rgba(17, 27, 33, .65))
	border-radius: .75rem
	font-size: .68rem
	font-weight: 600
	line-height: 1
	padding: .22rem .38rem
	cursor: pointer
	min-width: 2rem
	text-align: center
	&:hover
		filter: brightness(1.04)
</style>
