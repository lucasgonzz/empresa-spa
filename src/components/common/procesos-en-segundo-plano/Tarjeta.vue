<template>
<transition name="procesos-tarjeta">
	<div
	v-if="visible"
	class="procesos-tarjeta"
	:class="clases"
	data-testid="procesos-tarjeta"
	:data-estado="estado"
	:data-cantidad="cantidad_activos"
	role="button"
	tabindex="0"
	:title="titulo"
	@click="abrir_modal"
	@keydown.enter.prevent="abrir_modal"
	@keydown.space.prevent="abrir_modal"
	@mouseenter="hover = true"
	@mouseleave="hover = false">

		<span
		class="procesos-tarjeta__texto"
		data-testid="procesos-tarjeta-texto">
			{{ texto }}
		</span>

		<!--
			Mientras hay activos, el anillo de download-resources (el molde que pidio Lucas) con el
			porcentaje global; con porcentaje null el anillo gira sin numero. Al terminar, el tilde
			del mismo anillo si salio bien, o el signo de error en el rojo del tema si fallo.
		-->
		<i
		v-if="estado === 'error'"
		class="bi bi-exclamation-circle-fill procesos-tarjeta__error"></i>
		<ring-progress
		v-else
		:porcentaje="porcentaje_global"
		:terminado="estado === 'terminado'"></ring-progress>

	</div>
</transition>
</template>
<script>
/** Milisegundos que la pildora se muestra expandida (con texto) antes de achicarse al anillo. */
const MS_HASTA_COMPACTAR = 6000

/** Milisegundos que se muestra "Proceso terminado" / "Proceso con error" antes de irse. */
const MS_MENSAJE_FINAL = 4000

/** Cada cuanto se pide el listado mientras hay activos y la conexion en tiempo real no esta sana. */
const MS_RESPALDO = 15000

/**
 * Pildora de arriba a la derecha con los procesos en segundo plano en curso (mision
 * procesos-en-segundo-plano, 18/9/2026). Misma familia visual que la tarjeta de descarga de
 * recursos del arranque (download-resources/Progress.vue): translucida, con el anillo de
 * progreso, se achica sola a los 6 s y se expande al pasar el mouse.
 *
 * Se monta en App.vue, gateada por `authenticated`. Es tambien quien pide el listado la primera
 * vez y quien mantiene el respaldo por polling cuando el broadcast no puede llegar.
 */
export default {
	components: {
		RingProgress: () => import('@/common-vue/components/download-resources/RingProgress'),
	},
	data() {
		return {
			/** Controla si la pildora esta en pantalla (entra/sale con animacion). */
			visible: false,
			/** Estado achicado (solo el anillo, sin texto). */
			compacta: false,
			/** true con el mouse encima: expande aunque este compacta. */
			hover: false,
			/** null mientras hay activos; 'terminado' | 'error' durante el mensaje final. */
			final: null,
			timer_compactar: null,
			timer_final: null,
			/** Intervalo del respaldo por polling (null cuando la conexion esta sana). */
			timer_respaldo: null,
		}
	},
	computed: {
		activos() {
			return this.$store.getters['background_processes/activos']
		},
		cantidad_activos() {
			return this.activos.length
		},
		porcentaje_global() {
			return this.$store.getters['background_processes/porcentaje_global']
		},
		conectado() {
			return this.$store.getters['background_processes/conectado']
		},
		/** true mientras la tarjeta de descarga de recursos del arranque esta en pantalla. */
		tarjeta_recursos_visible() {
			return !!this.$store.state.download_resources.tarjeta_visible
		},
		/**
		 * Mientras haya activos y los avisos en tiempo real no puedan llegar (socket caido, o el
		 * servidor sin broadcast), el listado se pide cada 15 s. Con la conexion sana, nunca.
		 */
		necesita_respaldo() {
			return this.cantidad_activos > 0 && !this.conectado
		},
		/**
		 * Estado publicado en el DOM: 'activo' | 'terminado' | 'error'.
		 *
		 * @returns {String}
		 */
		estado() {
			return this.final ? this.final : 'activo'
		},
		texto() {
			if (this.final === 'error') {
				return 'Proceso con error'
			}
			if (this.final === 'terminado') {
				return 'Proceso terminado'
			}
			if (this.cantidad_activos === 1) {
				return '1 proceso en segundo plano'
			}
			return this.cantidad_activos + ' procesos en segundo plano'
		},
		titulo() {
			return 'Ver los procesos en segundo plano'
		},
		clases() {
			return {
				'procesos-tarjeta--compacta': this.compacta && !this.hover && !this.final,
				'procesos-tarjeta--error': this.final === 'error',
				'procesos-tarjeta--terminado': this.final === 'terminado',
				'procesos-tarjeta--debajo-de-recursos': this.tarjeta_recursos_visible,
			}
		},
	},
	watch: {
		/**
		 * La lista de activos cambia con cada evento. Solo interesan dos transiciones: aparece
		 * trabajo (o se suma un proceso nuevo) y se termina el ultimo.
		 */
		activos(nuevos, viejos) {
			let cantidad_vieja = Array.isArray(viejos) ? viejos.length : 0

			if (nuevos.length > 0) {
				if (!this.visible || this.final || nuevos.length > cantidad_vieja) {
					this.mostrar_activa()
				}
				return
			}

			if (cantidad_vieja > 0) {
				this.mostrar_final(this.estado_final_de(viejos))
			}
		},
		necesita_respaldo: {
			immediate: true,
			handler(valor) {
				this.ajustar_respaldo(valor)
			},
		},
	},
	created() {
		this.cargar_inicial()
	},
	beforeDestroy() {
		this.limpiar_timers()
		this.ajustar_respaldo(false)
	},
	methods: {
		/**
		 * Primera carga del listado. Si hay un arranque de sesion en curso (App.vue encadena las
		 * ~15 llamadas del login una atras de otra para no rafaguear a la API), esta se encola
		 * detras; si no, sale ya. Mismo criterio que store/reportes/encolar_fetch_de_widget.
		 */
		cargar_inicial() {
			let arranque = this.$store.state.auth.arranque_en_curso

			if (arranque && typeof arranque.then === 'function') {
				arranque
				.catch(err => console.log(err))
				.then(() => this.$store.dispatch('background_processes/getModels'))
				.catch(err => console.log(err))
				return
			}

			this.$store.dispatch('background_processes/getModels')
		},
		/**
		 * Muestra la pildora expandida y programa el achique a los 6 s.
		 */
		mostrar_activa() {
			this.limpiar_timers()
			this.final = null
			this.visible = true
			this.compacta = false
			// Si la pildora se fue con el mouse encima, el mouseleave nunca llego: se resetea para
			// que la proxima si se achique a los 6 s.
			this.hover = false

			this.timer_compactar = setTimeout(() => {
				if (this.cantidad_activos > 0 && !this.final) {
					this.compacta = true
				}
			}, MS_HASTA_COMPACTAR)
		},
		/**
		 * Termino el ultimo activo: 4 s con el mensaje final y se va.
		 *
		 * @param {String} estado_final 'terminado' | 'error'
		 */
		mostrar_final(estado_final) {
			this.limpiar_timers()
			this.final = estado_final
			this.visible = true
			this.compacta = false

			this.timer_final = setTimeout(() => {
				this.visible = false
				this.final = null
			}, MS_MENSAJE_FINAL)
		},
		/**
		 * Con que termino el ultimo tramo de trabajo: si alguno de los que estaban activos aparece
		 * ahora como fallido, es error; si no, terminado. Los que ya no estan en la lista (se
		 * limpiaron entre medio) se dan por bien.
		 *
		 * @param {Array} activos_anteriores
		 * @returns {String} 'terminado' | 'error'
		 */
		estado_final_de(activos_anteriores) {
			let ids = (activos_anteriores || []).map(proceso => proceso.id)
			let modelos = this.$store.state.background_processes.models
			let hubo_error = modelos.some(proceso => ids.indexOf(proceso.id) !== -1 && proceso.status === 'fallo')
			return hubo_error ? 'error' : 'terminado'
		},
		/**
		 * Prende o apaga el respaldo por polling.
		 *
		 * @param {Boolean} prender
		 */
		ajustar_respaldo(prender) {
			if (prender && !this.timer_respaldo) {
				this.timer_respaldo = setInterval(() => {
					this.$store.dispatch('background_processes/getModels')
				}, MS_RESPALDO)
				return
			}
			if (!prender && this.timer_respaldo) {
				clearInterval(this.timer_respaldo)
				this.timer_respaldo = null
			}
		},
		abrir_modal() {
			this.$bvModal.show('procesos-en-segundo-plano')
		},
		limpiar_timers() {
			clearTimeout(this.timer_compactar)
			clearTimeout(this.timer_final)
			this.timer_compactar = null
			this.timer_final = null
		},
	},
}
</script>
<style lang="sass">
// Misma familia visual que .recursos-tarjeta (download-resources/Progress.vue): pildora
// translucida con backdrop-filter, sombra suave y borde tenue. Lo translucido no puede salir de
// un token de superficie (son colores planos), por eso lleva su contraparte html.dark-mode abajo.
.procesos-tarjeta
	position: fixed
	top: 14px
	right: 20px
	// Un punto por encima del resto de las tarjetas fijas de la esquina (#offline-articles-progress
	// esta en 1000) y a la par de .recursos-tarjeta, con la que nunca se solapa (ver --debajo-de-recursos).
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
	cursor: pointer
	user-select: none
	// El achique se anima por el ancho maximo del texto, no por el ancho de la pildora; el `top`
	// se anima para bajar suave cuando aparece la tarjeta de recursos.
	transition: padding .42s cubic-bezier(.22, .61, .36, 1), gap .42s cubic-bezier(.22, .61, .36, 1), top .36s cubic-bezier(.22, .61, .36, 1), box-shadow .18s ease, transform .18s ease

	&:hover
		box-shadow: 0 10px 34px rgba(0, 0, 0, .18)
		transform: translateY(-1px)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 2px

.procesos-tarjeta__texto
	font-size: 13px
	font-weight: 500
	color: var(--color-text-primary, #1d1d1f)
	white-space: nowrap
	overflow: hidden
	max-width: 220px
	opacity: 1
	transition: max-width .42s cubic-bezier(.22, .61, .36, 1), opacity .18s ease

.procesos-tarjeta__error
	flex: 0 0 34px
	width: 34px
	font-size: 22px
	line-height: 34px
	text-align: center
	color: var(--btn-peligro-borde, #b4443f)
	animation: procesos-tarjeta-aparecer .3s cubic-bezier(.22, .61, .36, 1)

.procesos-tarjeta--error
	.procesos-tarjeta__texto
		color: var(--btn-peligro-texto, #9c3a36)

.procesos-tarjeta--compacta
	padding: 7px
	gap: 0

	.procesos-tarjeta__texto
		max-width: 0
		opacity: 0

// Mientras la tarjeta de descarga de recursos del arranque (50 px de alto, en top: 14px) esta en
// pantalla, esta baja para no pisarla.
.procesos-tarjeta--debajo-de-recursos
	top: 72px

// Entrada y salida: entra deslizando desde el borde derecho y se va igual (misma curva que
// .recursos-tarjeta).
.procesos-tarjeta-enter, .procesos-tarjeta-leave-to
	opacity: 0
	transform: translateX(28px) scale(.96)

.procesos-tarjeta-enter-active, .procesos-tarjeta-leave-active
	transition: opacity .34s ease, transform .38s cubic-bezier(.22, .61, .36, 1)

@keyframes procesos-tarjeta-aparecer
	from
		opacity: 0
		transform: scale(.5)
	to
		opacity: 1
		transform: scale(1)

// Telefono: el menu es un encabezado fijo arriba (.mobile-nav-header, ~52 px de alto con su
// borde) con el boton de hamburguesa a la derecha; la pildora va debajo, para no taparlo.
@media (max-width: 767px)
	.procesos-tarjeta
		top: 60px
		right: 12px

	.procesos-tarjeta--debajo-de-recursos
		top: 74px

html.dark-mode
	.procesos-tarjeta
		// El --bg-card del tema (#2e333a) al mismo 82 %: no se puede escribir rgba(var(--bg-card), .82)
		// porque el token guarda un color entero, no sus tres componentes.
		background: rgba(46, 51, 58, .82)
		border-color: rgba(255, 255, 255, .1)
		box-shadow: 0 8px 30px rgba(0, 0, 0, .45)

		&:hover
			box-shadow: 0 10px 34px rgba(0, 0, 0, .6)
</style>
