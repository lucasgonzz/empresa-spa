<template>
	<div class="panel-demo" :class="{ 'panel-demo--colapsado': colapsado }">

		<!--
			Tirador ("alita") a media altura sobre el borde del panel. Es la unica forma de que
			el lead llegue a la parte de la pantalla que el panel tapa, asi que vive afuera del
			panel y sigue visible cuando esta colapsado.
		-->
		<button
		type="button"
		class="panel-demo__tirador"
		:class="{ 'panel-demo__tirador--llamando': llamando_la_atencion }"
		:aria-label="colapsado ? 'Abrir los tutoriales' : 'Cerrar los tutoriales'"
		@click="alternar_colapso">
			<span class="panel-demo__tirador-icono">{{ colapsado ? '‹' : '›' }}</span>
		</button>

		<aside class="panel-demo__hoja">

			<header class="panel-demo__encabezado">
				<h2 class="panel-demo__titulo">Tu recorrido</h2>
				<p class="panel-demo__bajada">Mirá el video y probalo en el sistema.</p>
			</header>

			<div class="panel-demo__cuerpo">

				<div v-if="cargando" class="panel-demo__cargando">Cargando tu recorrido...</div>

				<section
				v-for="seccion in secciones"
				:key="seccion.id"
				class="panel-demo__seccion">

					<div class="panel-demo__seccion-encabezado">
						<h3 class="panel-demo__seccion-titulo">{{ seccion.titulo }}</h3>
						<!-- El denominador es lo que le toco a ESTE lead, nunca un total global. -->
						<span class="panel-demo__progreso">{{ vistos_de(seccion) }}/{{ nucleo_de(seccion).length }}</span>
					</div>

					<ul class="panel-demo__lista">
						<li
						v-for="clip in nucleo_de(seccion)"
						:key="clip.id"
						class="panel-demo__item">
							<button
							type="button"
							class="panel-demo__item-boton"
							:class="{ 'panel-demo__item-boton--hecho': fue_visto(clip) }"
							@click="alternar_clip(clip)">
								<span class="panel-demo__item-marca">{{ fue_visto(clip) ? '✓' : '' }}</span>
								<span class="panel-demo__item-titulo">{{ clip.titulo }}</span>
							</button>

							<div v-if="clip_abierto_id === clip.id" class="panel-demo__tarjeta">
								<video
								v-if="clip.url"
								ref="video"
								class="panel-demo__video"
								:class="{ 'panel-demo__video--grande': video_grande }"
								:src="clip.url"
								controls
								playsinline
								@play="al_reproducir"
								@pause="al_pausar"
								@ended="al_terminar(clip)"></video>

								<!--
									Un clip sin video grabado se abre igual y "Probar" queda
									habilitado: si no, con los videos sin subir la demo queda
									intransitable.
								-->
								<p v-else class="panel-demo__sin-video">Este video todavía no está disponible.</p>

								<button
								type="button"
								class="panel-demo__probar"
								:disabled="!puede_probar(clip)"
								@click="probar()">
									Probar
								</button>
							</div>
						</li>
					</ul>

					<!-- Los de biblioteca van abajo y NO suman al progreso. -->
					<div v-if="biblioteca_de(seccion).length > 0" class="panel-demo__biblioteca">
						<h4 class="panel-demo__biblioteca-titulo">Recursos adicionales</h4>
						<ul class="panel-demo__lista">
							<li
							v-for="clip in biblioteca_de(seccion)"
							:key="clip.id"
							class="panel-demo__item">
								<button
								type="button"
								class="panel-demo__item-boton panel-demo__item-boton--secundario"
								@click="alternar_clip(clip)">
									<span class="panel-demo__item-titulo">{{ clip.titulo }}</span>
								</button>

								<div v-if="clip_abierto_id === clip.id" class="panel-demo__tarjeta">
									<video
									v-if="clip.url"
									ref="video"
									class="panel-demo__video"
									:class="{ 'panel-demo__video--grande': video_grande }"
									:src="clip.url"
									controls
									playsinline
									@play="al_reproducir"
									@pause="al_pausar"
									@ended="al_terminar(clip)"></video>

									<p v-else class="panel-demo__sin-video">Este video todavía no está disponible.</p>

									<button
									type="button"
									class="panel-demo__probar"
									:disabled="!puede_probar(clip)"
									@click="probar()">
										Probar
									</button>
								</div>
							</li>
						</ul>
					</div>
				</section>
			</div>

			<!--
				Copiloto pasivo (§3.13): no es un chat y no responde nada. Solo guarda lo que el
				lead escribe para que el closer lo tenga antes de la llamada.
			-->
			<footer class="panel-demo__notas">
				<label class="panel-demo__notas-texto" for="panel-demo-notas">
					Anotá acá cualquier duda que te surja: las repasamos en la llamada
				</label>
				<textarea
				id="panel-demo-notas"
				v-model="notas"
				class="panel-demo__notas-campo"
				rows="3"
				@input="al_escribir_nota"></textarea>
			</footer>
		</aside>

		<!-- Fondo difuminado detrás del video agrandado. Solo aparece con el video reproduciendo. -->
		<div v-if="video_grande" class="panel-demo__fondo" @click="pausar_video"></div>
	</div>
</template>
<script>
/**
 * Panel lateral de tutoriales de la demo (misión 51).
 *
 * Este componente solo se monta dentro de una sesión de demo: `App.vue` lo condiciona a
 * `demo/es_demo`, que únicamente prende `DemoIngreso.vue`. Un cliente real nunca lo crea ni
 * descarga su chunk.
 *
 * 🔴 El panel NO marca nada como `completo`. `clip.terminado` lleva el hito del roadmap a
 * `parcial` del lado del admin; a `completo` lo lleva el evento de negocio que dispara el lead
 * haciendo la acción de verdad en el sistema. Eso no es un defecto y no hay que "arreglarlo".
 */
export default {
	data() {
		return {
			// El panel arranca abierto: es lo primero que el lead tiene que ver al entrar.
			colapsado: false,
			// El tirador late para invitar a volver, después de que "Probar" colapsó el panel.
			llamando_la_atencion: false,
			// Id del clip cuya tarjeta está desplegada. Uno solo a la vez.
			clip_abierto_id: null,
			// El video crece mientras reproduce y vuelve al pausar. No es fullscreen del navegador.
			video_grande: false,
			notas: '',
			// Handle del debounce de las notas. 3 segundos, por la pieza 3.
			temporizador_nota: null,
			// Secciones que ya reportaron `seccion.completada`, para no repetirlo.
			secciones_reportadas: [],
		}
	},
	computed: {
		secciones() {
			return this.$store.state.demo.secciones
		},
		cargando() {
			return this.$store.state.demo.cargando
		},
		clips_vistos() {
			return this.$store.state.demo.clips_vistos
		},
	},
	mounted() {
		// Única llamada del panel, y solo ocurre dentro de una demo.
		this.$store.dispatch('demo/cargar_plan')
	},
	beforeDestroy() {
		// Sin esto, un debounce en vuelo dispara sobre un componente que ya no existe.
		if (this.temporizador_nota) {
			clearTimeout(this.temporizador_nota)
		}
	},
	methods: {
		/**
		 * @param {Object} seccion
		 * @returns {Array} Clips de núcleo, que son los que cuentan para el progreso.
		 */
		nucleo_de(seccion) {
			return (seccion.clips || []).filter(function (clip) {
				return clip.tipo !== 'biblioteca'
			})
		},
		/**
		 * @param {Object} seccion
		 * @returns {Array} Clips de biblioteca, que van abajo y no suman al progreso.
		 */
		biblioteca_de(seccion) {
			return (seccion.clips || []).filter(function (clip) {
				return clip.tipo === 'biblioteca'
			})
		},
		/**
		 * @param {Object} clip
		 * @returns {Boolean}
		 */
		fue_visto(clip) {
			return this.clips_vistos.indexOf(clip.id) !== -1
		},
		/**
		 * @param {Object} seccion
		 * @returns {Number} Clips de núcleo de esta sección que el lead ya terminó.
		 */
		vistos_de(seccion) {
			let self = this
			return this.nucleo_de(seccion).filter(function (clip) {
				return self.fue_visto(clip)
			}).length
		},
		/**
		 * "Probar" se desbloquea cuando el video llegó al final —adelantar vale— o cuando el
		 * clip no tiene video cargado.
		 *
		 * @param {Object} clip
		 * @returns {Boolean}
		 */
		puede_probar(clip) {
			return !clip.url || this.fue_visto(clip)
		},
		/**
		 * Abre o cierra la tarjeta de un clip. Solo el que se abre reporta `clip.abierto`.
		 *
		 * @param {Object} clip
		 * @returns {void}
		 */
		alternar_clip(clip) {
			if (this.clip_abierto_id === clip.id) {
				this.clip_abierto_id = null
				this.video_grande = false
				return
			}

			this.clip_abierto_id = clip.id
			this.video_grande = false

			this.$store.dispatch('demo/reportar', { nombre: 'clip.abierto', clip_id: clip.id })
		},
		al_reproducir() {
			this.video_grande = true
		},
		al_pausar() {
			this.video_grande = false
		},
		/**
		 * Pausa el video desde el fondo difuminado, que es la forma natural de "salir".
		 *
		 * @returns {void}
		 */
		pausar_video() {
			const videos = this.$refs.video

			if (!videos) {
				return
			}

			const video = Array.isArray(videos) ? videos[0] : videos

			if (video && typeof video.pause === 'function') {
				video.pause()
			}
		},
		/**
		 * El video llegó al final: se marca el clip y se desbloquea "Probar".
		 *
		 * @param {Object} clip
		 * @returns {void}
		 */
		al_terminar(clip) {
			this.video_grande = false

			// Se marca ANTES de reportar: el botón se desbloquea aunque el reporte falle.
			this.$store.commit('demo/agregarClipVisto', clip.id)

			this.$store.dispatch('demo/reportar', { nombre: 'clip.terminado', clip_id: clip.id })

			this.revisar_seccion_completada(clip)
		},
		/**
		 * Reporta `seccion.completada` la primera vez que todos los clips de núcleo de la
		 * sección quedaron vistos.
		 *
		 * @param {Object} clip Clip que se acaba de terminar, para ubicar su sección.
		 * @returns {void}
		 */
		revisar_seccion_completada(clip) {
			let self = this

			const seccion = this.secciones.find(function (una_seccion) {
				return (una_seccion.clips || []).some(function (un_clip) {
					return un_clip.id === clip.id
				})
			})

			if (!seccion || this.secciones_reportadas.indexOf(seccion.id) !== -1) {
				return
			}

			const nucleo = this.nucleo_de(seccion)

			if (nucleo.length === 0) {
				return
			}

			const todos_vistos = nucleo.every(function (un_clip) {
				return self.fue_visto(un_clip)
			})

			if (!todos_vistos) {
				return
			}

			this.secciones_reportadas.push(seccion.id)

			this.$store.dispatch('demo/reportar', {
				nombre: 'seccion.completada',
				datos: { seccion_id: seccion.id },
			})
		},
		/**
		 * "Probar": colapsa el panel y le deja el sistema libre al lead. No arranca ningún
		 * recorrido guiado — el motor de tour es otra misión.
		 *
		 * @returns {void}
		 */
		probar() {
			this.pausar_video()
			this.colapsado = true
			this.llamando_la_atencion = true
		},
		alternar_colapso() {
			this.colapsado = !this.colapsado

			if (!this.colapsado) {
				this.llamando_la_atencion = false
				return
			}

			this.pausar_video()
		},
		/**
		 * Debounce de 3 segundos sobre las notas: dos teclas seguidas son un solo evento.
		 *
		 * @returns {void}
		 */
		al_escribir_nota() {
			let self = this

			if (this.temporizador_nota) {
				clearTimeout(this.temporizador_nota)
			}

			this.temporizador_nota = setTimeout(function () {
				self.temporizador_nota = null
				self.$store.dispatch('demo/reportar', {
					nombre: 'nota.escrita',
					datos: { texto: self.notas },
				})
			}, 3000)
		},
	},
}
</script>
<style lang="sass">
$panel-demo-ancho: 500px

.panel-demo
	position: fixed
	top: 0
	right: 0
	height: 100vh
	width: $panel-demo-ancho
	max-width: 100%
	z-index: 1040
	display: flex
	transition: transform 0.35s ease

.panel-demo--colapsado
	transform: translateX(100%)

.panel-demo__hoja
	display: flex
	flex-direction: column
	width: 100%
	height: 100%
	background: #ffffff
	border-left: 1px solid #e5e7eb
	box-shadow: -8px 0 24px rgba(17, 24, 39, 0.06)

.panel-demo__tirador
	position: absolute
	top: 50%
	left: -36px
	transform: translateY(-50%)
	width: 36px
	height: 72px
	border: 1px solid #e5e7eb
	border-right: none
	border-radius: 8px 0 0 8px
	background: #ffffff
	color: #111827
	cursor: pointer
	display: flex
	align-items: center
	justify-content: center
	box-shadow: -4px 0 12px rgba(17, 24, 39, 0.08)

.panel-demo__tirador--llamando
	animation: panel-demo-latido 1.6s ease-in-out infinite

.panel-demo__tirador-icono
	font-size: 1.5rem
	line-height: 1

.panel-demo__encabezado
	padding: 1.5rem 1.5rem 1rem
	border-bottom: 1px solid #f3f4f6

.panel-demo__titulo
	font-size: 1.125rem
	font-weight: 600
	color: #111827
	margin: 0

.panel-demo__bajada
	font-size: 0.875rem
	color: #6b7280
	margin: 0.25rem 0 0

.panel-demo__cuerpo
	flex: 1 1 auto
	overflow-y: auto
	padding: 1rem 1.5rem

.panel-demo__cargando
	font-size: 0.875rem
	color: #6b7280

.panel-demo__seccion
	margin-bottom: 1.75rem

.panel-demo__seccion-encabezado
	display: flex
	align-items: baseline
	justify-content: space-between
	margin-bottom: 0.5rem

.panel-demo__seccion-titulo
	font-size: 0.9375rem
	font-weight: 600
	color: #111827
	margin: 0

.panel-demo__progreso
	font-size: 0.8125rem
	color: #6b7280
	font-variant-numeric: tabular-nums

.panel-demo__lista
	list-style: none
	margin: 0
	padding: 0

.panel-demo__item
	margin-bottom: 0.25rem

.panel-demo__item-boton
	display: flex
	align-items: center
	gap: 0.5rem
	width: 100%
	text-align: left
	background: transparent
	border: none
	padding: 0.5rem 0
	font-size: 0.9375rem
	color: #111827
	cursor: pointer

.panel-demo__item-boton--secundario
	color: #6b7280

.panel-demo__item-boton--hecho .panel-demo__item-titulo
	color: #6b7280

.panel-demo__item-marca
	width: 1rem
	color: #16a34a

.panel-demo__tarjeta
	padding: 0.5rem 0 1rem

.panel-demo__video
	width: 100%
	border-radius: 8px
	background: #000000
	display: block
	transition: all 0.3s ease

.panel-demo__video--grande
	position: fixed
	top: 50%
	left: 50%
	transform: translate(-50%, -50%)
	width: min(80vw, 960px)
	max-height: 80vh
	z-index: 1060

.panel-demo__sin-video
	font-size: 0.875rem
	color: #6b7280
	margin: 0 0 0.75rem

.panel-demo__probar
	margin-top: 0.75rem
	padding: 0.5rem 1.25rem
	border-radius: 8px
	border: none
	background: #111827
	color: #ffffff
	font-size: 0.875rem
	cursor: pointer

.panel-demo__probar:disabled
	background: #e5e7eb
	color: #9ca3af
	cursor: not-allowed

.panel-demo__biblioteca
	margin-top: 1rem
	padding-top: 0.75rem
	border-top: 1px solid #f3f4f6

.panel-demo__biblioteca-titulo
	font-size: 0.8125rem
	font-weight: 600
	color: #6b7280
	margin: 0 0 0.25rem

.panel-demo__notas
	padding: 1rem 1.5rem
	border-top: 1px solid #f3f4f6

.panel-demo__notas-texto
	display: block
	font-size: 0.8125rem
	color: #6b7280
	margin-bottom: 0.375rem

.panel-demo__notas-campo
	width: 100%
	border: 1px solid #e5e7eb
	border-radius: 8px
	padding: 0.5rem
	font-size: 0.875rem
	resize: vertical

.panel-demo__fondo
	position: fixed
	top: 0
	left: 0
	width: 100vw
	height: 100vh
	background: rgba(17, 24, 39, 0.45)
	backdrop-filter: blur(6px)
	z-index: 1050

/*
	Los tres anchos de la regla dura.

	Tablet (768-1024): el panel de 500px fijos se come mas de la mitad de la pantalla, asi que
	pasa a 55% con tope de 500px. El sistema de atras sigue usable.
*/
@media (max-width: 1024px)
	.panel-demo
		width: 55%
		min-width: 380px

/*
	Telefono (< 768): 500px sobre 360px no es un panel, es una pared. Pasa a hoja completa
	sobre el sistema, y el tirador se mete adentro del borde para no quedar fuera de pantalla.
*/
@media (max-width: 767px)
	.panel-demo
		width: 100%
		min-width: 0

	.panel-demo__tirador
		left: auto
		right: 100%
		margin-right: -1px

	.panel-demo--colapsado .panel-demo__tirador
		right: 100%

	.panel-demo__video--grande
		width: 94vw

@keyframes panel-demo-latido
	0%, 100%
		transform: translateY(-50%) scale(1)
	50%
		transform: translateY(-50%) scale(1.12)
</style>
