<template>
	<div class="tarjeta-clip">

		<div
		v-if="clip.url"
		class="tarjeta-clip__marco"
		:class="{ 'tarjeta-clip__marco--grande': grande }">
			<video
			ref="video"
			class="tarjeta-clip__video"
			:src="clip.url"
			controls
			playsinline
			@loadstart="marcar_cargando"
			@waiting="marcar_cargando"
			@loadeddata="marcar_listo"
			@canplay="marcar_listo"
			@playing="marcar_listo"
			@error="marcar_fallo"
			@play="$emit('reproducir')"
			@pause="$emit('pausar')"
			@ended="al_terminar"></video>

			<!--
				Capa de carga sobre el marco. Sin esto el clip se abre como un rectangulo negro
				hasta que el navegador tiene datos, y el lead no sabe si esta esperando o si se
				rompio algo.
			-->
			<div
			v-if="cargando && !fallo"
			class="tarjeta-clip__capa"
			role="status">
				<span class="tarjeta-clip__anillo" aria-hidden="true"></span>
				<span class="tarjeta-clip__capa-texto">Cargando el video</span>
			</div>

			<!--
				Estado de error. La URL puede estar cargada y el archivo no responder: antes de
				esto el lead se quedaba mirando el rectangulo negro para siempre, sin ninguna
				forma de enterarse de que habia fallado.
			-->
			<div
			v-else-if="fallo"
			class="tarjeta-clip__capa tarjeta-clip__capa--fallo"
			role="status">
				<p class="tarjeta-clip__fallo-texto">No pudimos cargar este video</p>
				<button
				type="button"
				class="tarjeta-clip__reintentar"
				@click="reintentar">
					Reintentar
				</button>
			</div>
		</div>

		<!--
			Un clip sin video grabado se abre igual y "Probar" queda habilitado: si no, con los
			videos sin subir la demo queda intransitable.
		-->
		<p v-else class="tarjeta-clip__sin-video">Este video todavía no está disponible.</p>

		<button
		type="button"
		class="tarjeta-clip__probar"
		:disabled="!habilitar_probar"
		@click="$emit('probar')">
			Probar
		</button>
	</div>
</template>
<script>
/**
 * Tarjeta desplegable de un clip del panel de la demo: el video con sus estados y el boton
 * "Probar".
 *
 * Vive aparte porque el panel la dibuja en dos lugares —los clips de nucleo y los de
 * biblioteca— con exactamente el mismo comportamiento. Antes estaba duplicada en el template,
 * y cada estado nuevo del video habia que escribirlo dos veces.
 *
 * El estado del video (cargando / fallo) es local a proposito: muere con la tarjeta, que se
 * destruye al cerrar el clip, y no tiene por que sobrevivir al F5 como si tienen las notas o
 * los clips vistos.
 */
export default {
	props: {
		clip: {
			type: Object,
			required: true,
		},
		/** El video crece mientras reproduce. Lo decide el panel, que tambien dibuja el fondo. */
		grande: {
			type: Boolean,
			default: false,
		},
		/** Lo resuelve el panel: el video llego al final, o el clip no tiene video. */
		puede_probar: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			// Arranca en true: el marco se dibuja negro desde el primer cuadro, asi que el
			// indicador tiene que estar puesto antes del `loadstart` y no despues.
			cargando: true,
			fallo: false,
		}
	},
	computed: {
		/**
		 * 🔴 Un video roto tambien desbloquea "Probar".
		 *
		 * Es la misma razon por la que un clip SIN video lo deja habilitado: si la URL esta
		 * cargada pero el archivo no responde, el lead nunca puede llegar al final del video y
		 * queda encerrado en ese clip. El fallo lo sabe esta tarjeta y nadie mas, asi que el
		 * desbloqueo se resuelve aca y no en `puede_probar()` del panel, que sigue significando
		 * lo mismo de siempre.
		 *
		 * @returns {Boolean}
		 */
		habilitar_probar() {
			return this.puede_probar || this.fallo
		},
	},
	methods: {
		marcar_cargando() {
			this.cargando = true
		},
		marcar_listo() {
			this.cargando = false
			this.fallo = false
		},
		marcar_fallo() {
			this.cargando = false
			this.fallo = true
		},
		/**
		 * El video llego al final.
		 *
		 * 🔴 Apaga `cargando` ademas de avisarle al panel, y eso NO es redundante: varios
		 * navegadores emiten `waiting` justo antes de `ended` cuando el buffer se queda corto en
		 * el ultimo pedacito. Ese `waiting` prende el indicador y despues de `ended` ya no llega
		 * ningun `canplay` ni `playing` que lo apague, asi que el anillo girando y el texto
		 * "Cargando el video" quedaban pegados encima de un video terminado, sin nada que los
		 * sacara salvo cerrar y volver a abrir el clip.
		 *
		 * @returns {void}
		 */
		al_terminar() {
			this.cargando = false
			this.$emit('terminado')
		},
		/**
		 * Vuelve a pedir el video. Una URL firmada vencida o un corte de red se arreglan solos
		 * con esto, y le evitan al lead tener que cerrar y volver a abrir el clip.
		 *
		 * @returns {void}
		 */
		reintentar() {
			const video = this.$refs.video

			this.fallo = false
			this.cargando = true

			if (video && typeof video.load === 'function') {
				video.load()
			}
		},
		/**
		 * Pausa el video. La llama el panel desde afuera (por `ref`), que es quien maneja el
		 * fondo difuminado y el boton "Probar".
		 *
		 * @returns {void}
		 */
		pausar() {
			const video = this.$refs.video

			if (video && typeof video.pause === 'function') {
				video.pause()
			}
		},
	},
}
</script>
<style lang="sass">
// Paleta de marca de ComercioCity. Es la misma del logo y la de la pagina de experiencia.
$tarjeta-clip-celeste: #0B84F8
$tarjeta-clip-violeta: #3A31FC

// El sangrado horizontal es el mismo que el del boton del item, para que el marco del video
// quede alineado con el titulo del clip y no colgado del borde de la tarjeta.
.tarjeta-clip
	// Declarado y no heredado. Hasta el 17/8/2026 el centrado del boton "Probar" y del aviso
	// de video faltante venia del `text-align: center` que `#app` le pone a todo el ERP: la
	// tarjeta se veia bien de casualidad. Ahora que la hoja del panel declara `left` para que
	// los titulos largos no salgan centrados, lo que acá SI se busca centrado se dice acá.
	text-align: center
	padding: 0.25rem 0.75rem 0.875rem

.tarjeta-clip__marco
	position: relative
	border-radius: 12px
	overflow: hidden
	background: #000000
	line-height: 0

.tarjeta-clip__video
	width: 100%
	display: block
	background: #000000

// El marco entero pasa a primer plano, y no solo el video, para que la capa de carga y la
// de error viajen con el.
.tarjeta-clip__marco--grande
	position: fixed
	top: 50%
	left: 50%
	transform: translate(-50%, -50%)
	// Sin min(): SASS lo toma como su propia funcion y con vw y px juntos tira
	// "Incompatible units". El par width/max-width da lo mismo y no depende de eso.
	width: 80vw
	max-width: 960px
	z-index: 1060

.tarjeta-clip__marco--grande .tarjeta-clip__video
	max-height: 80vh

.tarjeta-clip__capa
	position: absolute
	top: 0
	left: 0
	width: 100%
	height: 100%
	display: flex
	flex-direction: column
	align-items: center
	justify-content: center
	gap: 0.75rem
	// Los controles nativos del video quedan abajo: la capa no tiene que comerse el click.
	pointer-events: none
	background: rgba(0, 0, 0, 0.55)
	line-height: 1.4

.tarjeta-clip__capa--fallo
	// El unico caso donde la capa SI recibe clicks, por el boton de reintentar.
	pointer-events: auto
	background: rgba(17, 24, 39, 0.88)

.tarjeta-clip__anillo
	width: 34px
	height: 34px
	border-radius: 50%
	border: 2px solid rgba(255, 255, 255, 0.22)
	border-top-color: $tarjeta-clip-celeste
	animation: tarjeta-clip-girar 0.9s linear infinite

.tarjeta-clip__capa-texto
	font-size: 0.8125rem
	color: rgba(255, 255, 255, 0.82)
	letter-spacing: 0.01em

.tarjeta-clip__fallo-texto
	margin: 0
	font-size: 0.875rem
	font-weight: 500
	color: #ffffff

.tarjeta-clip__reintentar
	padding: 0.375rem 0.875rem
	border-radius: 999px
	border: 1px solid rgba(255, 255, 255, 0.28)
	background: transparent
	color: #ffffff
	font-size: 0.8125rem
	cursor: pointer
	transition: background 0.15s ease

.tarjeta-clip__reintentar:hover
	background: rgba(255, 255, 255, 0.12)

.tarjeta-clip__reintentar:active
	transform: scale(0.97)

.tarjeta-clip__sin-video
	font-size: 0.875rem
	color: #6b7280
	margin: 0
	padding: 0.75rem 0.875rem
	border-radius: 12px
	background: #f4f4f6

.tarjeta-clip__probar
	margin-top: 0.75rem
	padding: 0.5rem 1.25rem
	border-radius: 10px
	border: none
	background: $tarjeta-clip-celeste
	color: #ffffff
	font-size: 0.875rem
	font-weight: 500
	letter-spacing: 0.01em
	cursor: pointer
	// La respuesta va en el apretado, no en el soltado: es lo unico que hace que un boton
	// se sienta vivo.
	transition: background 0.15s ease, transform 0.1s ease

.tarjeta-clip__probar:hover:not(:disabled)
	background: darken($tarjeta-clip-celeste, 6%)

.tarjeta-clip__probar:active:not(:disabled)
	transform: scale(0.97)

.tarjeta-clip__probar:focus-visible
	outline: 2px solid $tarjeta-clip-violeta
	outline-offset: 2px

.tarjeta-clip__probar:disabled
	background: #ececed
	color: #a1a1aa
	cursor: not-allowed

@keyframes tarjeta-clip-girar
	to
		transform: rotate(360deg)

// 🔴 Estado estatico, no una version suave del mismo movimiento: el anillo deja de girar y
// queda como un aro completo. El texto "Cargando el video" es el que sigue comunicando.
@media (prefers-reduced-motion: reduce)
	.tarjeta-clip__anillo
		animation: none
		border-color: rgba(255, 255, 255, 0.35)
		border-top-color: $tarjeta-clip-celeste

	.tarjeta-clip__probar,
	.tarjeta-clip__reintentar
		transition: none

	.tarjeta-clip__probar:active:not(:disabled),
	.tarjeta-clip__reintentar:active
		transform: none

// Telefono: el video agrandado usa casi todo el ancho, igual que antes del refactor.
@media (max-width: 767px)
	.tarjeta-clip__marco--grande
		width: 94vw
</style>
