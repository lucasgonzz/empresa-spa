<template>
<transition name="recursos-tarjeta">
	<div
	v-if="visible"
	class="recursos-tarjeta"
	:class="{ 'recursos-tarjeta--compacta': compacta }"
	data-testid="recursos-tarjeta"
	:data-estado="estado"
	role="button"
	tabindex="0"
	title="Ver el detalle de los recursos"
	@click="$emit('abrir_panel')"
	@keydown.enter.prevent="$emit('abrir_panel')"
	@keydown.space.prevent="$emit('abrir_panel')">

		<span class="recursos-tarjeta__texto">
			{{ texto }}
		</span>

		<ring-progress
		:porcentaje="percentage"
		:terminado="terminado"></ring-progress>

	</div>
</transition>
</template>
<script>
export default {
	props: {
		models_to_download: Array,
	},
	components: {
		RingProgress: () => import('@/common-vue/components/download-resources/RingProgress'),
	},
	data() {
		return {
			// Controla si la tarjeta esta en pantalla (entra/sale con animacion).
			visible: false,
			// Controla el estado achicado (solo el anillo, sin texto).
			compacta: false,
			// Evita reiniciar la secuencia en cada disparo del watch de models_to_download,
			// que se dispara una vez por cada recurso que el padre agrega con push.
			secuencia_iniciada: false,
			// Timer que achica la tarjeta a los 5 segundos de arrancar.
			timer_compactar: null,
			// Timer que oculta la tarjeta a los 3 segundos de terminar.
			timer_ocultar: null,
		}
	},
	computed: {
		descargados() {
			// La lista ya viene filtrada desde setModels() (prompt 01 del grupo): no entran los
			// recursos que esta sesion no va a descargar, asi que alcanza con contar los terminados.
			return this.models_to_download.filter(model => model.downloaded).length
		},
		terminado() {
			// El chequeo de length evita que la tarjeta se considere terminada con la lista
			// todavia vacia (0 de 0), que era lo que la hacia aparecer y desaparecer al arrancar.
			return this.models_to_download.length > 0 && this.descargados == this.models_to_download.length
		},
		percentage() {
			if (!this.models_to_download.length) {
				return 0
			}
			return Math.round(this.descargados * 100 / this.models_to_download.length)
		},
		texto() {
			return this.terminado ? 'Recursos descargados' : 'Descargando recursos'
		},
		/**
		 * Estado de la descarga, publicado en el DOM de la tarjeta.
		 *
		 * Sirve para dos cosas: distinguir a simple vista la tarjeta que todavia esta trabajando
		 * de la que ya termino, y darle a un test end to end una condicion que mirar sin depender
		 * del texto visible. La condicion ESTABLE de "termino todo" no es esta --la tarjeta se
		 * esconde sola a los 3 segundos-- sino el data-estado del elemento raiz de
		 * download-resources/Index.vue, que no se va nunca.
		 *
		 * @returns {string} 'descargando' | 'listo'
		 */
		estado() {
			return this.terminado ? 'listo' : 'descargando'
		},
	},
	watch: {
		models_to_download() {
			if (!this.models_to_download.length) {
				// La lista se rearmo desde cero (boton de volver a descargar): se habilita una
				// secuencia nueva.
				this.secuencia_iniciada = false
				return
			}
			if (!this.terminado) {
				this.iniciar_secuencia()
			}
		},
		terminado(valor) {
			if (valor) {
				this.mostrar_final()
			}
		},
	},
	beforeDestroy() {
		this.limpiar_timers()
	},
	methods: {
		/**
		 * Muestra la tarjeta expandida y programa el achique a los 5 segundos.
		 * Es idempotente: el watch de models_to_download se dispara una vez por cada recurso
		 * que se agrega a la lista, y la secuencia tiene que arrancar una sola vez.
		 */
		iniciar_secuencia() {
			if (this.secuencia_iniciada) {
				return
			}
			this.secuencia_iniciada = true
			this.limpiar_timers()
			this.visible = true
			this.compacta = false

			// El texto se muestra los primeros 5 segundos. Despues la tarjeta se achica y queda
			// solo el anillo, para no ocupar pantalla durante toda la descarga. Si la descarga ya
			// termino antes de esos 5 segundos no se achica nunca: manda el estado final.
			this.timer_compactar = setTimeout(() => {
				if (!this.terminado) {
					this.compacta = true
				}
			}, 5000)
		},
		/**
		 * Vuelve a expandir la tarjeta con el mensaje final y la esconde sola.
		 */
		mostrar_final() {
			this.limpiar_timers()
			this.visible = true
			this.compacta = false
			this.timer_ocultar = setTimeout(() => {
				this.visible = false
			}, 3000)
		},
		/**
		 * Cancela los timers pendientes para que no se pisen entre secuencias ni queden vivos
		 * despues de destruir el componente.
		 */
		limpiar_timers() {
			clearTimeout(this.timer_compactar)
			clearTimeout(this.timer_ocultar)
			this.timer_compactar = null
			this.timer_ocultar = null
		},
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'

.recursos-tarjeta
	position: fixed
	top: 14px
	right: 20px
	// Un punto por encima del resto de las tarjetas fijas de la esquina (#offline-articles-progress
	// esta en 1000): esta es la unica de las dos que se clickea, asi que si alguna vez vuelven a
	// solaparse, la que gana tiene que ser la interactiva y no la informativa.
	z-index: 1001
	display: flex
	flex-direction: row
	align-items: center
	gap: 12px
	padding: 7px 8px 7px 18px
	border-radius: 999px
	background: rgba(255, 255, 255, .82)
	backdrop-filter: saturate(180%) blur(20px)
	-webkit-backdrop-filter: saturate(180%) blur(20px)
	border: 1px solid rgba(0, 0, 0, .06)
	box-shadow: 0 8px 30px rgba(0, 0, 0, .12)
	// La tarjeta es el acceso al panel lateral con el detalle de los recursos: se clickea.
	cursor: pointer
	user-select: none
	// El achique se anima por el ancho maximo del texto, no por el ancho de la tarjeta:
	// una pildora con ancho automatico no se puede animar de otra manera.
	transition: padding .42s cubic-bezier(.22, .61, .36, 1), gap .42s cubic-bezier(.22, .61, .36, 1), box-shadow .18s ease, transform .18s ease

	&:hover
		box-shadow: 0 10px 34px rgba(0, 0, 0, .18)
		transform: translateY(-1px)

	&:focus-visible
		outline: 2px solid $blue
		outline-offset: 2px

.recursos-tarjeta__texto
	font-size: 13px
	font-weight: 500
	color: #1d1d1f
	white-space: nowrap
	overflow: hidden
	max-width: 220px
	opacity: 1
	transition: max-width .42s cubic-bezier(.22, .61, .36, 1), opacity .18s ease

.recursos-tarjeta--compacta
	padding: 7px
	gap: 0

	.recursos-tarjeta__texto
		max-width: 0
		opacity: 0

// Entrada y salida de la tarjeta: entra deslizando desde el borde derecho y se va igual.
.recursos-tarjeta-enter, .recursos-tarjeta-leave-to
	opacity: 0
	transform: translateX(28px) scale(.96)

.recursos-tarjeta-enter-active, .recursos-tarjeta-leave-active
	transition: opacity .34s ease, transform .38s cubic-bezier(.22, .61, .36, 1)

@if ($theme == 'dark')
	.recursos-tarjeta
		background: rgba(38, 38, 40, .82)
		border-color: rgba(255, 255, 255, .1)
		box-shadow: 0 8px 30px rgba(0, 0, 0, .45)

	.recursos-tarjeta__texto
		color: rgba(255, 255, 255, .95)
</style>
