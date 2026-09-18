<template>
<b-modal
id="procesos-en-segundo-plano"
size="lg"
centered
hide-footer
hide-header
modal-class="procesos-modal"
body-class="procesos-modal__body"
@show="al_abrir"
@hidden="al_cerrar">

	<!--
		Hero propio en lugar del header de bootstrap: el titulo, el subtitulo con los conteos y el
		punto de conexion a la derecha. En la vista de detalle el titulo pasa a ser el del proceso
		y aparece el "Volver".
	-->
	<div
	class="procesos-modal__hero"
	data-testid="procesos-hero">

		<button
		v-if="vista === 'detalle'"
		type="button"
		class="procesos-modal__volver"
		data-testid="procesos-volver"
		title="Volver a la lista"
		@click="volver">
			<i class="bi bi-arrow-left"></i>
			<span class="procesos-modal__volver-texto">Volver</span>
		</button>

		<div class="procesos-modal__hero-texto">
			<h4
			class="procesos-modal__titulo"
			data-testid="procesos-titulo">
				{{ titulo_hero }}
			</h4>
			<p
			class="procesos-modal__subtitulo"
			data-testid="procesos-subtitulo">
				{{ subtitulo_hero }}
			</p>
		</div>

		<div
		class="procesos-modal__conexion"
		:class="'procesos-modal__conexion--' + estado_visual_conexion"
		:title="titulo_conexion"
		data-testid="procesos-conexion"
		:data-estado="estado_visual_conexion">
			<span class="procesos-modal__conexion-punto"></span>
			<span class="procesos-modal__conexion-texto">
				{{ texto_conexion }}
			</span>
		</div>

		<button
		type="button"
		class="procesos-modal__cerrar"
		data-testid="procesos-cerrar"
		title="Cerrar"
		@click="cerrar">
			<i class="bi bi-x-lg"></i>
		</button>

	</div>

	<transition
	name="procesos-vista"
	mode="out-in">

		<!-- ── Lista ─────────────────────────────────────────────────────────────────── -->
		<div
		v-if="vista === 'lista'"
		key="lista"
		class="procesos-modal__lista"
		data-testid="procesos-lista">

			<section
			v-if="activos.length"
			class="procesos-modal__seccion"
			data-testid="procesos-activos">
				<h6 class="procesos-modal__seccion-titulo">
					En curso
				</h6>
				<proceso-fila
				v-for="proceso in activos"
				:key="proceso.id"
				:proceso="proceso"
				:lanzado_por="nombre_de_quien_lanzo(proceso)"
				:ahora="ahora"
				@abrir="abrir_detalle"></proceso-fila>
			</section>

			<div
			v-if="!activos.length && !recientes.length"
			class="procesos-modal__vacio"
			data-testid="procesos-vacio">
				<i class="bi bi-check2-circle procesos-modal__vacio-icono"></i>
				<p class="procesos-modal__vacio-texto">
					No hay procesos en segundo plano
				</p>
				<p class="procesos-modal__vacio-ayuda">
					Cuando lances una importación, un recálculo de precios o una actualización masiva, acá vas a ver cómo avanza.
				</p>
			</div>

			<section
			v-if="recientes.length"
			class="procesos-modal__seccion procesos-modal__seccion--recientes"
			data-testid="procesos-recientes">
				<div class="procesos-modal__seccion-linea">
					<h6 class="procesos-modal__seccion-titulo">
						Terminados recientemente
					</h6>
					<button
					type="button"
					class="procesos-modal__limpiar"
					data-testid="procesos-limpiar"
					title="Quitar de la lista todos los terminados"
					@click="limpiar">
						Limpiar
					</button>
				</div>
				<proceso-fila
				v-for="proceso in recientes"
				:key="proceso.id"
				:proceso="proceso"
				:lanzado_por="nombre_de_quien_lanzo(proceso)"
				:ahora="ahora"
				apagada
				con_cerrar
				@abrir="abrir_detalle"
				@cerrar="marcar_visto"
				@ver_historial="ver_historial"></proceso-fila>
			</section>

		</div>

		<!-- ── Detalle ───────────────────────────────────────────────────────────────── -->
		<div
		v-else
		key="detalle"
		class="procesos-modal__detalle"
		data-testid="procesos-detalle"
		:data-id="detalle_id">

			<!-- Sin proceso y sin carga en vuelo: se limpio de la lista y el GET no lo trajo. -->
			<p
			v-if="!detalle_loading && !proceso_detalle"
			class="procesos-modal__aviso"
			data-testid="procesos-detalle-ausente">
				Este proceso ya no está en la lista.
			</p>

			<div
			v-else-if="detalle_loading"
			class="procesos-modal__skeleton"
			aria-busy="true">
				<div class="procesos-modal__skeleton-fila">
					<span class="procesos-modal__skeleton-anillo"></span>
					<div class="procesos-modal__skeleton-lineas">
						<span class="procesos-modal__skeleton-linea procesos-modal__skeleton-linea--ancha"></span>
						<span class="procesos-modal__skeleton-linea"></span>
					</div>
				</div>
				<div class="procesos-modal__skeleton-tarjetas">
					<span class="procesos-modal__skeleton-tarjeta"></span>
					<span class="procesos-modal__skeleton-tarjeta"></span>
					<span class="procesos-modal__skeleton-tarjeta"></span>
					<span class="procesos-modal__skeleton-tarjeta"></span>
				</div>
			</div>

			<template v-else>
				<component
				:is="componente_detalle"
				:proceso="proceso_detalle"
				:referencia="referencia_detalle"
				@ver_historial="ver_historial"></component>

				<p
				v-if="detalle_con_error"
				class="procesos-modal__aviso">
					No se pudo traer el detalle completo; esto es lo que llegó por el aviso en tiempo real.
				</p>
			</template>

		</div>

	</transition>

</b-modal>
</template>
<script>
import { componente_de_detalle } from '@/components/common/procesos-en-segundo-plano/tipos'

/**
 * Modal con todos los procesos en segundo plano del comercio (mision procesos-en-segundo-plano,
 * 18/9/2026). Lo abre la pildora de arriba a la derecha (Tarjeta.vue).
 *
 * Dos vistas en el mismo modal: la lista (activos arriba, terminados recientes abajo) y el
 * detalle de un proceso, elegido por `tipo` con <component :is>. Los datos salen del store
 * background_processes; este componente no pide nada por su cuenta salvo el detalle al abrirlo
 * y un refresco del listado cada vez que se abre el modal.
 */
export default {
	components: {
		ProcesoFila: () => import('@/components/common/procesos-en-segundo-plano/Fila'),
		DetalleImportacion: () => import('@/components/common/procesos-en-segundo-plano/detalle/Importacion'),
		DetalleRecalculoPrecios: () => import('@/components/common/procesos-en-segundo-plano/detalle/RecalculoPrecios'),
		DetalleActualizacionMasiva: () => import('@/components/common/procesos-en-segundo-plano/detalle/ActualizacionMasiva'),
		DetalleGenerico: () => import('@/components/common/procesos-en-segundo-plano/detalle/Generico'),
	},
	data() {
		return {
			/** 'lista' | 'detalle' */
			vista: 'lista',
			/** Id del proceso abierto en el detalle (null en la lista). */
			detalle_id: null,
			/**
			 * Marca de tiempo que se renueva cada 30 s mientras el modal esta abierto, para que
			 * los "hace 4 minutos" de las filas se vuelvan a calcular.
			 */
			ahora: Date.now(),
			timer_ahora: null,
			/** Ultimo refresco silencioso del detalle (ms) y su timer, para no pedirlo mas de una vez cada 4 s. */
			ultimo_refresco_detalle: 0,
			timer_refresco_detalle: null,
		}
	},
	computed: {
		activos() {
			return this.$store.getters['background_processes/activos']
		},
		recientes() {
			return this.$store.getters['background_processes/recientes']
		},
		estado_visual_conexion() {
			return this.$store.getters['background_processes/estado_visual_conexion']
		},
		titulo_conexion() {
			return this.$store.getters['background_processes/titulo_conexion']
		},
		texto_conexion() {
			return this.estado_visual_conexion === 'conectado' ? 'En tiempo real' : 'Sin conexión en tiempo real'
		},
		detalle() {
			return this.$store.state.background_processes.detalle
		},
		detalle_loading() {
			return this.$store.state.background_processes.detalle_loading
		},
		detalle_con_error() {
			return !!(this.detalle && this.detalle.error)
		},
		/**
		 * El proceso del detalle: la version que esta en la lista, que es la que los eventos van
		 * actualizando mientras el detalle esta abierto; si ya no esta en la lista (se limpio), la
		 * que trajo el GET del detalle.
		 */
		proceso_detalle() {
			if (this.detalle_id === null) {
				return null
			}
			let en_lista = this.$store.state.background_processes.models.find(proceso => proceso.id === this.detalle_id)
			if (en_lista) {
				return en_lista
			}
			return this.detalle && this.detalle.proceso ? this.detalle.proceso : null
		},
		referencia_detalle() {
			if (!this.detalle || !this.detalle.proceso || this.detalle.proceso.id !== this.detalle_id) {
				return null
			}
			return this.detalle.referencia || null
		},
		componente_detalle() {
			return 'Detalle' + componente_de_detalle(this.proceso_detalle ? this.proceso_detalle.tipo : null)
		},
		titulo_hero() {
			if (this.vista === 'detalle' && this.proceso_detalle) {
				return this.proceso_detalle.titulo || 'Detalle del proceso'
			}
			return 'Procesos en segundo plano'
		},
		/** "2 en curso · 3 terminados recientemente", o el detalle del proceso abierto. */
		subtitulo_hero() {
			if (this.vista === 'detalle') {
				return this.proceso_detalle && this.proceso_detalle.detalle ? this.proceso_detalle.detalle : ''
			}
			let partes = []
			partes.push(this.activos.length + ' en curso')
			partes.push(this.recientes.length + (this.recientes.length === 1 ? ' terminado recientemente' : ' terminados recientemente'))
			return partes.join(' · ')
		},
		/** Se observa para refrescar el detalle cuando llega un evento del proceso abierto. */
		updated_at_del_detalle() {
			return this.proceso_detalle ? this.proceso_detalle.updated_at : null
		},
	},
	watch: {
		/**
		 * Llego un evento del proceso que esta abierto en el detalle: se vuelve a pedir el detalle
		 * (con la referencia fresca) sin skeleton, a lo sumo una vez cada 4 s. Un cierre (paso a
		 * terminado) se pide siempre: son los numeros finales.
		 */
		updated_at_del_detalle(nuevo, viejo) {
			// Sin `viejo` es la apertura del detalle (de null al primer valor), no un evento: el
			// GET inicial ya esta en vuelo y no hay nada que refrescar.
			if (this.vista !== 'detalle' || !nuevo || !viejo || nuevo === viejo || !this.proceso_detalle) {
				return
			}
			this.programar_refresco_del_detalle()
		},
	},
	beforeDestroy() {
		this.detener_reloj()
		clearTimeout(this.timer_refresco_detalle)
	},
	methods: {
		/**
		 * Al abrir: vista de lista, reloj de "hace N minutos" andando, y un refresco del listado
		 * para que lo que se ve sea lo ultimo (el broadcast pudo haberse perdido algo).
		 */
		al_abrir() {
			this.vista = 'lista'
			this.detalle_id = null
			this.ahora = Date.now()
			this.detener_reloj()
			this.timer_ahora = setInterval(() => {
				this.ahora = Date.now()
			}, 30000)
			this.$store.dispatch('background_processes/getModels')
		},
		al_cerrar() {
			this.detener_reloj()
			clearTimeout(this.timer_refresco_detalle)
			this.timer_refresco_detalle = null
			this.vista = 'lista'
			this.detalle_id = null
			this.$store.commit('background_processes/setDetalle', null)
		},
		detener_reloj() {
			clearInterval(this.timer_ahora)
			this.timer_ahora = null
		},
		cerrar() {
			this.$bvModal.hide('procesos-en-segundo-plano')
		},
		/**
		 * Abre la vista de detalle de un proceso y pide su registro propio.
		 *
		 * @param {Object} proceso
		 */
		abrir_detalle(proceso) {
			if (!proceso) {
				return
			}
			this.detalle_id = proceso.id
			this.vista = 'detalle'
			this.ultimo_refresco_detalle = Date.now()
			this.$store.commit('background_processes/setDetalle', null)
			this.$store.dispatch('background_processes/getDetalle', proceso.id)
		},
		volver() {
			clearTimeout(this.timer_refresco_detalle)
			this.timer_refresco_detalle = null
			this.vista = 'lista'
			this.detalle_id = null
			this.$store.commit('background_processes/setDetalle', null)
		},
		/**
		 * Refresco silencioso del detalle abierto, con un techo de uno cada 4 s: los eventos
		 * llegan como mucho cada 2 s por proceso, y no hace falta pegarle a la API por cada uno.
		 */
		programar_refresco_del_detalle() {
			let id = this.detalle_id
			let espera = 4000 - (Date.now() - this.ultimo_refresco_detalle)

			clearTimeout(this.timer_refresco_detalle)

			this.timer_refresco_detalle = setTimeout(() => {
				if (this.vista !== 'detalle' || this.detalle_id !== id) {
					return
				}
				this.ultimo_refresco_detalle = Date.now()
				this.$store.dispatch('background_processes/getDetalle', { id: id, silencioso: true })
			}, Math.max(0, espera))
		},
		limpiar() {
			this.$store.dispatch('background_processes/marcar_vistos')
		},
		/**
		 * @param {Object} proceso
		 */
		marcar_visto(proceso) {
			this.$store.dispatch('background_processes/marcar_visto', proceso.id)
		},
		/**
		 * Abre el historial de importaciones (modal `import-history`), que esta montado en las
		 * pantallas de articulos y de compras. Se abre ENCIMA de este modal, sin cerrarlo: si en
		 * esta pantalla no esta montado, $bvModal.show no hace nada y el usuario sigue viendo el
		 * detalle, en vez de quedarse mirando la pantalla vacia.
		 */
		ver_historial() {
			this.$bvModal.show('import-history')
		},
		/**
		 * Nombre de quien lanzo el proceso: se resuelve contra los empleados del store y contra el
		 * dueño. Si no se resuelve, null y la fila no muestra nada.
		 *
		 * @param {Object} proceso
		 * @returns {String|null}
		 */
		nombre_de_quien_lanzo(proceso) {
			let id = proceso ? proceso.auth_user_id : null
			if (!id) {
				return null
			}
			let empleados = this.$store.state.employee && Array.isArray(this.$store.state.employee.models)
				? this.$store.state.employee.models
				: []
			let empleado = empleados.find(modelo => Number(modelo.id) === Number(id))
			if (empleado && empleado.name) {
				return empleado.name
			}
			if (this.owner && Number(this.owner.id) === Number(id) && this.owner.name) {
				return this.owner.name
			}
			return null
		},
	},
}
</script>
<style lang="sass">
// Los modales de bootstrap-vue cuelgan de <body>, fuera de #app: todo color va por token de
// _dark_theme.sass (declarados en :root) y nunca por hex, si no el modal queda claro en oscuro.
.procesos-modal
	// Verde de "conectado": el iOS system green, que es la referencia estetica del proyecto.
	// No hay token de exito en _dark_theme.sass; se declara aca con su contraparte oscura abajo.
	--procesos-verde: #34c759
	--procesos-rojo: var(--btn-peligro-borde, #b4443f)

	.modal-content
		border: 0
		box-shadow: 0 24px 60px rgba(0, 0, 0, .22)

.procesos-modal__body
	padding: 0 24px 24px

.procesos-modal__hero
	display: flex
	flex-direction: row
	align-items: center
	gap: 14px
	padding: 22px 0 16px
	text-align: left

.procesos-modal__volver
	flex: 0 0 auto
	height: 34px
	border: 0
	border-radius: 999px
	padding: 0 14px 0 10px
	display: inline-flex
	align-items: center
	gap: 6px
	font-size: 13px
	font-weight: 500
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-primary, #212529)
	box-shadow: none
	transition: background .15s ease

	i
		font-size: 15px

	&:hover
		background: var(--bg-hover, #f1f3f5)

.procesos-modal__hero-texto
	flex: 1 1 auto
	min-width: 0

.procesos-modal__titulo
	margin: 0
	font-size: 20px
	font-weight: 600
	letter-spacing: -0.02em
	line-height: 1.25
	color: var(--color-text-primary, #212529)
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap

.procesos-modal__subtitulo
	margin: 3px 0 0
	font-size: 13px
	color: var(--color-text-secondary, #6c757d)
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap

.procesos-modal__conexion
	flex: 0 0 auto
	display: inline-flex
	align-items: center
	gap: 7px
	padding: 5px 10px
	border-radius: 999px
	font-size: 12px
	font-weight: 500
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)
	cursor: default

.procesos-modal__conexion-punto
	width: 8px
	height: 8px
	border-radius: 50%
	background: var(--procesos-rojo)
	flex: 0 0 8px

.procesos-modal__conexion--conectado
	.procesos-modal__conexion-punto
		background: var(--procesos-verde)

.procesos-modal__cerrar
	flex: 0 0 30px
	width: 30px
	height: 30px
	border: 0
	border-radius: 50%
	padding: 0
	display: flex
	align-items: center
	justify-content: center
	font-size: 13px
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)
	box-shadow: none
	transition: background .15s ease, color .15s ease

	&:hover
		background: var(--bg-hover, #f1f3f5)
		color: var(--color-text-primary, #212529)

.procesos-modal__lista
	// La lista puede ser larga: scrollea adentro del modal, con el hero fijo arriba.
	max-height: min(68vh, 640px)
	overflow-y: auto
	overscroll-behavior: contain
	margin: 0 -8px
	padding: 2px 8px 4px

.procesos-modal__seccion + .procesos-modal__seccion
	margin-top: 22px

.procesos-modal__seccion-linea
	display: flex
	flex-direction: row
	align-items: center
	justify-content: space-between
	gap: 12px

.procesos-modal__seccion-titulo
	margin: 0 0 10px
	font-size: 11px
	font-weight: 600
	letter-spacing: .06em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)
	text-align: left

.procesos-modal__limpiar
	margin: 0 0 10px
	border: 0
	padding: 0
	background: transparent
	font-size: 13px
	font-weight: 500
	color: var(--color-primary, #007bff)
	box-shadow: none
	transition: opacity .15s ease

	&:hover
		opacity: .7

.procesos-modal__vacio
	padding: 36px 16px
	text-align: center

.procesos-modal__vacio-icono
	font-size: 34px
	color: var(--color-text-secondary, #6c757d)
	opacity: .6

.procesos-modal__vacio-texto
	margin: 10px 0 0
	font-size: 15px
	font-weight: 600
	color: var(--color-text-primary, #212529)

.procesos-modal__vacio-ayuda
	margin: 4px auto 0
	max-width: 380px
	font-size: 13px
	color: var(--color-text-secondary, #6c757d)

.procesos-modal__detalle
	max-height: min(68vh, 640px)
	overflow-y: auto
	overscroll-behavior: contain
	margin: 0 -8px
	padding: 2px 8px 4px

.procesos-modal__aviso
	margin: 14px 0 0
	font-size: 12.5px
	color: var(--color-text-secondary, #6c757d)
	text-align: left

// ── Skeleton del detalle: formas grises que respiran, sin spinner ──────────────────────────────
.procesos-modal__skeleton-fila
	display: flex
	flex-direction: row
	align-items: center
	gap: 20px
	padding: 4px 0 18px

.procesos-modal__skeleton-anillo
	flex: 0 0 88px
	width: 88px
	height: 88px
	border-radius: 50%
	// Un aro (no un disco) para que se parezca a lo que va a aparecer.
	border: 6px solid var(--bg-section, #f8f9fa)

.procesos-modal__skeleton-lineas
	flex: 1 1 auto
	display: flex
	flex-direction: column
	gap: 10px

.procesos-modal__skeleton-linea
	display: block
	height: 14px
	width: 40%
	border-radius: 7px
	background: var(--bg-section, #f8f9fa)

	&--ancha
		height: 22px
		width: 55%
		border-radius: 11px

.procesos-modal__skeleton-tarjetas
	display: grid
	grid-template-columns: repeat(auto-fit, minmax(130px, 1fr))
	gap: 10px

.procesos-modal__skeleton-tarjeta
	display: block
	height: 64px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)

.procesos-modal__skeleton-anillo, .procesos-modal__skeleton-linea, .procesos-modal__skeleton-tarjeta
	animation: procesos-skeleton-respirar 1.4s ease-in-out infinite

// Cambio de vista lista <-> detalle: un fundido corto con un desplazamiento minimo.
.procesos-vista-enter, .procesos-vista-leave-to
	opacity: 0
	transform: translateY(6px)

.procesos-vista-enter-active, .procesos-vista-leave-active
	transition: opacity .16s ease, transform .16s ease

@keyframes procesos-skeleton-respirar
	0%, 100%
		opacity: 1
	50%
		opacity: .5

@media (prefers-reduced-motion: reduce)
	.procesos-modal__skeleton-anillo, .procesos-modal__skeleton-linea, .procesos-modal__skeleton-tarjeta
		animation: none

@media (max-width: 575px)
	.procesos-modal__body
		padding: 0 14px 16px

	.procesos-modal__hero
		flex-wrap: wrap
		gap: 10px
		padding: 16px 0 12px

	.procesos-modal__hero-texto
		// El titulo y el subtitulo ocupan la primera linea completa menos el volver y el cerrar;
		// el chip de conexion baja a una segunda linea.
		flex-basis: 0

	.procesos-modal__conexion
		order: 4
		flex-basis: 100%
		justify-content: center

	.procesos-modal__titulo
		font-size: 18px
		white-space: normal

	.procesos-modal__volver
		padding: 0
		width: 34px
		justify-content: center

	.procesos-modal__volver-texto
		display: none

	.procesos-modal__lista, .procesos-modal__detalle
		max-height: 70vh

html.dark-mode
	.procesos-modal
		--procesos-verde: #30d158

		.modal-content
			box-shadow: 0 24px 60px rgba(0, 0, 0, .55)
</style>
