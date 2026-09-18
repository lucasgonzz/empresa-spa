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
	:style="estilo_posicion"
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

		<!--
			Compacta, la pildora es solo el anillo con el porcentaje: lo que Lucas pidio que
			informe es CUANTOS hay, asi que la cantidad queda a la vista en un globito, como el
			badge de alertas del menu. Con el texto visible sobra.
		-->
		<span
		v-if="mostrar_contador"
		class="procesos-tarjeta__contador"
		data-testid="procesos-tarjeta-contador">
			{{ cantidad_activos }}
		</span>

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
 * Cada cuanto se pide el listado mientras hay activos CON la conexion sana. Es la red para el
 * unico aviso que no tiene siguiente: el del cierre. Si el POST del servidor a Pusher falla
 * justo en completar() (el servidor lo atrapa a proposito y sigue), el socket del navegador
 * esta perfecto y no llega nada: sin esto la pildora quedaba clavada en el ultimo porcentaje
 * hasta un F5. Un avance perdido lo tapa el siguiente; el cierre, no.
 */
const MS_RESPALDO_CONECTADO = 60000

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
			/**
			 * Pixeles desde arriba cuando el cartel de sincronizacion de articulos offline
			 * (#offline-articles-progress, misma esquina) esta en pantalla: la pildora baja
			 * hasta debajo de el. 0 = el cartel no esta, mandan las clases de CSS.
			 */
			offset_offline: 0,
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
		 * true mientras el cartel "Actualizando articulos offline" esta en pantalla. Vive en el
		 * data() del mixin offline de App.vue, que es $root: no pasa por el store.
		 */
		tarjeta_offline_visible() {
			let progreso = this.$root && this.$root.offline_articles_sync_progress
			return !!(progreso && progreso.visible)
		},
		/** Terminados con error que el usuario todavia no cerro. */
		fallos_recientes() {
			return this.$store.getters['background_processes/recientes'].filter(proceso => proceso.status === 'fallo').length
		},
		/** El globito con la cantidad: solo compacta (sin texto) y con algo que contar. */
		mostrar_contador() {
			return this.compacta && !this.hover && !this.final && this.cantidad_activos > 0
		},
		/** Inline solo cuando hay que esquivar el cartel offline; si no, mandan las clases. */
		estilo_posicion() {
			if (!this.tarjeta_offline_visible || !this.offset_offline) {
				return null
			}
			return { top: this.offset_offline + 'px' }
		},
		/**
		 * Mientras haya activos, el listado se vuelve a pedir cada tanto: cada 15 s si los avisos
		 * en tiempo real no pueden llegar (socket caido, o el servidor sin broadcast), cada 60 s
		 * con la conexion sana (ver MS_RESPALDO_CONECTADO). Sin activos, nunca.
		 *
		 * @returns {Number} milisegundos entre pedidos, 0 = sin respaldo.
		 */
		periodo_de_respaldo() {
			if (this.cantidad_activos === 0) {
				return 0
			}
			return this.conectado ? MS_RESPALDO_CONECTADO : MS_RESPALDO
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
				if (this.fallos_recientes > 1) {
					return this.fallos_recientes + ' procesos con error'
				}
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
		periodo_de_respaldo: {
			immediate: true,
			handler(periodo) {
				this.ajustar_respaldo(periodo)
			},
		},
		/**
		 * Un fallo que nadie vio no se va solo: mientras haya terminados con error sin cerrar
		 * y nada corriendo, la pildora se queda en rojo. Es la unica puerta al modal, y un
		 * "Proceso con error" que dura 4 segundos mientras el usuario mira otra pantalla es un
		 * error que nunca se entero. Se va cuando los cierra (la x de la fila o "Limpiar").
		 */
		fallos_recientes: {
			immediate: true,
			handler(cantidad) {
				if (this.cantidad_activos > 0) {
					return
				}
				if (cantidad > 0) {
					this.mostrar_final('error')
					return
				}
				if (this.final === 'error') {
					this.limpiar_timers()
					this.visible = false
					this.final = null
				}
			},
		},
		tarjeta_offline_visible: {
			immediate: true,
			handler() {
				this.medir_cartel_offline()
			},
		},
	},
	created() {
		this.cargar_inicial()
	},
	beforeDestroy() {
		this.limpiar_timers()
		this.ajustar_respaldo(0)
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

			// El error se queda hasta que el usuario lo cierre (ver el watch de fallos_recientes).
			if (estado_final === 'error' && this.fallos_recientes > 0) {
				return
			}

			this.timer_final = setTimeout(() => {
				this.visible = false
				this.final = null
			}, MS_MENSAJE_FINAL)
		},
		/**
		 * Mide donde termina el cartel de articulos offline para ponerse debajo. Se mide y no
		 * se hardcodea: el cartel tiene cuatro renglones y su alto depende de la fuente.
		 */
		medir_cartel_offline() {
			if (!this.tarjeta_offline_visible) {
				this.offset_offline = 0
				return
			}
			this.$nextTick(() => {
				let cartel = document.getElementById('offline-articles-progress')
				this.offset_offline = cartel ? Math.ceil(cartel.getBoundingClientRect().bottom) + 10 : 0
			})
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
		 * Prende, apaga o cambia de ritmo el respaldo por polling. Se reinicia entero cuando
		 * cambia el periodo (la conexion se cayo o volvio): un setInterval no se re-tempera.
		 *
		 * @param {Number} periodo  milisegundos, 0 = apagar.
		 */
		ajustar_respaldo(periodo) {
			if (this.timer_respaldo) {
				clearInterval(this.timer_respaldo)
				this.timer_respaldo = null
			}
			if (!periodo) {
				return
			}
			this.timer_respaldo = setInterval(() => {
				this.$store.dispatch('background_processes/getModels')
			}, periodo)
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

// Globito con la cantidad de procesos, pegado al anillo cuando la pildora esta compacta.
// Mismo lenguaje que .route-alert-badge del menu (redondo, chico, con un aro del color del fondo).
.procesos-tarjeta__contador
	position: absolute
	top: -4px
	left: -4px
	min-width: 18px
	height: 18px
	padding: 0 5px
	display: inline-flex
	align-items: center
	justify-content: center
	font-size: 11px
	font-weight: 700
	line-height: 1
	border-radius: 999px
	color: #fff
	background: var(--color-primary, #007bff)
	box-shadow: 0 0 0 2px var(--bg-card, #fff)
	animation: procesos-tarjeta-aparecer .25s cubic-bezier(.22, .61, .36, 1)

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
