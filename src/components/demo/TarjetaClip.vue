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
			@play="al_reproducir"
			@pause="al_pausar"
			@timeupdate="al_avanzar_video"
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

		<!--
			Un clip sin práctica (`practica: false`) es solo para mirar: no hay nada que ir a
			hacer al sistema, así que "Probar" no se dibuja. El clip se completa igual, con el
			video llegando al final.

			`con_tour` es el segundo gate y es del 1/9/2026: el corte de release de los tours
			(`tours/habilitados.js`). Va OCULTO y no deshabilitado por pedido explícito de Lucas
			—"el botón de probar no debe estar visible"—, y además es lo correcto: un botón
			apagado promete algo que no va a poder hacer nunca, y el lead lo va a apretar igual.
		-->
		<button
		v-if="con_practica && con_tour"
		type="button"
		class="tarjeta-clip__probar"
		:class="{ 'tarjeta-clip__probar--probado': probado }"
		:disabled="!habilitar_probar"
		@click="$emit('probar', clip)">
			Probar
			<!--
				El check aparece recién con el tour completado. Es `v-if` y no una clase que lo
				esconda: la animación de entrada tiene que correr cuando el lead está mirando el
				botón (ver `tarjeta-clip-aparecer-check`), y un elemento que ya estaba en el DOM
				con opacidad 0 no vuelve a animarla.
			-->
			<i
			v-if="probado"
			class="bi bi-check-lg tarjeta-clip__check"
			aria-hidden="true"></i>
			<!--
				El check es puramente visual (`aria-hidden`), así que el estado se dice aparte:
				sin esto, para un lector de pantalla el botón verde y el celeste se llaman igual.
			-->
			<span v-if="probado" class="sr-only">(ya probado)</span>
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
		/**
		 * El tour de este clip esta habilitado para salir (`tours/habilitados.js`).
		 *
		 * 🔴 Default `false`, al reves que `practica`, y la asimetria es a proposito. `practica`
		 * defaultea a true porque protege a los planes ya congelados, que pueden no traer el
		 * campo: ahi el default seguro es "el boton sigue como estaba". Esta prop protege otra
		 * cosa --que no salga a produccion un tour que nadie recorrio--, y ahi el default seguro
		 * es el contrario: si el panel se olvida de pasarla, el boton no se dibuja.
		 */
		con_tour: {
			type: Boolean,
			default: false,
		},
		/**
		 * El lead ya completo el tour de este clip. Lo resuelve el panel contra el store, que lo
		 * siembra del plan: por eso sobrevive al F5.
		 */
		probado: {
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
			// El lead apreto play mientras el video todavia cargaba. Se le avisa al panel recien
			// cuando hay datos (ver `marcar_listo`), para que el marco se agrande una sola vez y
			// ya reproduciendo, en vez de agrandarse en el medio del buffering.
			quiere_reproducir: false,
			// Ultimo decimo del video que ya se reporto (0 = 0-9%, 1 = 10-19%...). Arranca en -1
			// para que el primer cruce sea siempre uno nuevo.
			ultimo_decimo: -1,
			// Porcentaje mas alto ya reportado. Ver `reportar_progreso`.
			maximo_reportado: 0,
		}
	},
	computed: {
		/**
		 * El clip tiene una práctica para hacer en el sistema, así que "Probar" se dibuja.
		 *
		 * 🔴 SOLO `practica: false` explícito oculta el botón. Ausente / undefined / true lo
		 * dejan como estuvo siempre: los planes congelados antes de que el catálogo trajera el
		 * campo pueden no traerlo, y un default estricto les sacaría "Probar" a todos los clips
		 * de esos leads. Compatible hacia atrás a propósito, no por prolijidad.
		 *
		 * @returns {Boolean}
		 */
		con_practica() {
			return this.clip.practica !== false
		},
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
		/**
		 * Hay datos: se apaga el indicador y, si el lead habia apretado play mientras cargaba,
		 * ese es el momento de avisarle al panel. Recien aca el marco se agranda, con el video ya
		 * en condiciones de reproducir de verdad.
		 *
		 * @returns {void}
		 */
		marcar_listo() {
			this.cargando = false
			this.fallo = false

			if (this.quiere_reproducir) {
				this.quiere_reproducir = false
				this.$emit('reproducir')
			}
		},
		marcar_fallo() {
			this.cargando = false
			// Si el video fallo no tiene ningun sentido seguir esperando para agrandarlo.
			this.quiere_reproducir = false
			this.fallo = true
		},
		/**
		 * El navegador emite `play` apenas INTENTA arrancar, sin datos suficientes todavia. Si le
		 * avisamos al panel en ese momento, el marco se agranda en el medio del buffering: el
		 * video cambia de tamano mientras todavia no se reproduce nada (pedido de Lucas del
		 * 31/8/2026).
		 *
		 * Mientras `cargando` este puesto, la intencion se guarda y no se emite nada: la tarjeta
		 * queda chica con la capa de "Cargando el video" arriba, que es lo que ya existe para eso.
		 *
		 * @returns {void}
		 */
		al_reproducir() {
			if (this.cargando) {
				this.quiere_reproducir = true
				return
			}

			this.$emit('reproducir')
		},
		/**
		 * 🔴 Cancela la intencion guardada ademas de avisarle al panel. Sin esto, un lead que
		 * aprieta play y se arrepiente antes de que termine de cargar veia el video arrancar
		 * solo -y agrandarse- cuando los datos llegaban, aunque ya no lo quisiera.
		 *
		 * @returns {void}
		 */
		al_pausar() {
			this.quiere_reproducir = false

			/**
			 * Pausar es el otro momento en que el porcentaje importa, además de los décimos: el
			 * lead que abandona un video lo abandona pausándolo, y ahí el dato es exacto en vez
			 * de redondeado al décimo de más abajo.
			 */
			this.reportar_progreso(this.porcentaje_actual())

			this.$emit('pausar')
		},
		/**
		 * `timeupdate` lo dispara el navegador ~4 veces por segundo. Acá NO se reporta cada vez:
		 * solo cuando el video cruza un décimo nuevo, o sea ~10 eventos por video mirado entero
		 * (granularidad que pidió Lucas el 1/9/2026).
		 *
		 * Se reporta el borde del décimo (10, 20, 30...) y no el porcentaje exacto del momento:
		 * son eventos distintos diciendo la misma cosa, y un número redondo es más fácil de leer
		 * en el feed del admin que un 43 que salió de dónde cayó el `timeupdate`.
		 *
		 * @returns {void}
		 */
		al_avanzar_video() {
			const porcentaje = this.porcentaje_actual()
			const decimo = Math.floor(porcentaje / 10)

			if (decimo === this.ultimo_decimo) {
				return
			}

			this.ultimo_decimo = decimo

			this.reportar_progreso(decimo * 10)
		},
		/**
		 * Porcentaje del video ya reproducido, entero de 0 a 100.
		 *
		 * 🔴 Sin `duration` finita devuelve 0 y no se reporta nada. Mientras el navegador no
		 * cargó los metadatos, `duration` es `NaN`, y con un stream sin fin puede ser `Infinity`:
		 * en los dos casos la cuenta da `NaN`, que `JSON.stringify` serializa como `null`. O sea
		 * que el admin recibiría `{"porcentaje": null}` y el dato quedaría sucio para siempre,
		 * sin que nadie vea un error en ningún lado.
		 *
		 * @returns {Number}
		 */
		porcentaje_actual() {
			const video = this.$refs.video

			if (!video || !isFinite(video.duration) || video.duration <= 0) {
				return 0
			}

			const porcentaje = Math.round((video.currentTime / video.duration) * 100)

			if (porcentaje < 0) {
				return 0
			}

			return porcentaje > 100 ? 100 : porcentaje
		},
		/**
		 * Le avisa al panel cuánto del video vio el lead.
		 *
		 * Dos reglas, y las dos son sobre el dato que ve el admin, no sobre el rendimiento:
		 *
		 * 🔴 **Solo hacia arriba.** Si el lead retrocede el video no se reporta nada hasta superar
		 * el máximo que ya se había reportado. Sin esto, alguien que mira el 80% y vuelve atrás
		 * para repasar el minuto 2 le manda al admin un 20% que se lee como "vio menos de lo que
		 * vio" — y el admin se queda con el último, no con el mejor.
		 *
		 * 🔴 **El 100% no se emite nunca.** Eso ya lo dice `clip.terminado`, que además es el que
		 * mueve el hito del roadmap. Emitir los dos duplica la fila sin agregar información.
		 *
		 * El 0 tampoco: es el estado por default del lado del admin, así que reportarlo sería una
		 * fila por cada video abierto para no decir nada.
		 *
		 * @param {Number} porcentaje
		 * @returns {void}
		 */
		reportar_progreso(porcentaje) {
			if (porcentaje <= 0 || porcentaje >= 100) {
				return
			}

			if (porcentaje <= this.maximo_reportado) {
				return
			}

			this.maximo_reportado = porcentaje

			this.$emit('progreso', porcentaje)
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
// Verde de "esto ya lo hiciste", del 1/9/2026. NO es el verde de Bootstrap (#28a745): con el
// texto blanco de 0.875rem de este boton ese verde da 3.1:1 de contraste y no llega a AA. Este
// da 5.0:1 (calculado sobre blanco puro), que si.
$tarjeta-clip-verde: #15803D

// El sangrado horizontal es el mismo que el del boton del item, para que el marco del video
// quede alineado con el titulo del clip y no colgado del borde de la tarjeta.
.tarjeta-clip
	// Declarado y no heredado. Hasta el 17/8/2026 el centrado del boton "Probar" y del aviso
	// de video faltante venia del `text-align: center` que `#app` le pone a todo el ERP: la
	// tarjeta se veia bien de casualidad. Ahora que la hoja del panel declara `left` para que
	// los titulos largos no salgan centrados, lo que acá SI se busca centrado se dice acá.
	text-align: center
	// El padding de arriba es el unico aire entre el titulo del clip (que vive en el boton del
	// item, arriba de este componente) y el borde negro del marco del video. Con 0.25rem el
	// titulo quedaba pegado al video (pedido de Lucas, 31/8/2026).
	padding: 0.625rem 0.75rem 0.875rem

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
	//
	// 90% de la pantalla (pedido de Lucas, 31/8/2026: era 80vw con tope de 960px, y en un
	// monitor de 1920px el tope mandaba y el video quedaba a la mitad de la pantalla, no al
	// 80%). El tope nuevo son 1728px = 90% de 1920, pantalla de referencia: de ahi para arriba
	// el video deja de crecer para que en un monitor ultrapanoramico la barra de controles
	// nativa no se estire miles de pixeles.
	width: 90vw
	max-width: 1728px
	z-index: 1060

.tarjeta-clip__marco--grande .tarjeta-clip__video
	max-height: 90vh

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

// ---------------------------------------------------------------------------------------
// "Ya lo probaste": el boton pasa a verde y le aparece el check (pedido de Lucas, 1/9/2026).
//
// 🔴 Los tiempos de acá son la mitad visible de una secuencia que arma `PanelDemo.vue`
// (`celebrar_tour`): el panel se abre, ~450 ms despues se pinta esto, y ~900 ms despues se abre
// el clip que sigue. Si estos valores cambian, mirar tambien esa secuencia: el punto del pedido
// es que el lead VEA cada paso, y para eso cada animacion tiene que terminar antes de que
// arranque la siguiente.
//
// La transicion del fondo es mas larga que la de los otros estados del boton (0.35s contra
// 0.15s) justo por eso: el cambio de color es el mensaje, no un efecto de hover.
// ---------------------------------------------------------------------------------------
.tarjeta-clip__probar--probado
	background: $tarjeta-clip-verde
	transition: background 0.35s ease, transform 0.1s ease
	animation: tarjeta-clip-marcar 0.45s cubic-bezier(0.32, 0.72, 0, 1)

// Va aparte y con esta especificidad porque `.tarjeta-clip__probar:hover:not(:disabled)` pesa
// mas que una clase sola: sin esto, pasar el mouse por encima devolvia el boton al celeste.
.tarjeta-clip__probar--probado:hover:not(:disabled)
	background: darken($tarjeta-clip-verde, 6%)

.tarjeta-clip__check
	// Sin esto el `transform` de la animacion no se aplica: el <i> es inline y los elementos
	// inline no se transforman.
	display: inline-block
	margin-left: 0.375rem
	// El glifo de Bootstrap Icons trae su propio interlineado y queda un pelo bajo respecto de
	// la palabra "Probar".
	vertical-align: -0.06em
	// Entra despues de que el fondo ya empezo a ponerse verde (0.15s de demora), no junto: son
	// dos cosas que decir y encimadas se leen como una sola. `backwards` mantiene el estado
	// inicial durante esa demora, si no el check parpadea entero antes de achicarse.
	animation: tarjeta-clip-aparecer-check 0.3s 0.15s backwards cubic-bezier(0.32, 0.72, 0, 1)

@keyframes tarjeta-clip-marcar
	0%
		transform: scale(1)
	45%
		transform: scale(1.06)
	100%
		transform: scale(1)

@keyframes tarjeta-clip-aparecer-check
	from
		opacity: 0
		transform: scale(0.4)
	to
		opacity: 1
		transform: scale(1)

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
	.tarjeta-clip__probar--probado,
	.tarjeta-clip__reintentar
		transition: none

	.tarjeta-clip__probar:active:not(:disabled),
	.tarjeta-clip__reintentar:active
		transform: none

	// 🔴 El estado final se aplica IGUAL: el boton queda verde y el check queda puesto. Lo que
	// se saca es el movimiento (el pulso y la entrada del check), no la informacion. Mismo
	// criterio que el anillo de carga de mas arriba.
	.tarjeta-clip__probar--probado,
	.tarjeta-clip__check
		animation: none

// Telefono: el video agrandado usa casi todo el ancho, igual que antes del refactor.
@media (max-width: 767px)
	.tarjeta-clip__marco--grande
		width: 94vw
</style>
