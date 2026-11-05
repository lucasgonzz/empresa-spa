<template>
	<b-modal
		id="aviso-implementacion"
		ref="modal"
		centered
		hide-header
		hide-footer
		no-fade
		no-close-on-backdrop
		body-class="p-0 implementacion-modal-cuerpo"
		content-class="implementacion-modal-contenedor"
		aria-label="Avance de Implementación"
		@shown="al_mostrar"
		@hidden="al_cerrar"
	>
		<div v-if="apertura" ref="tarjeta" class="implementacion-modal-tarjeta"
			:class="{ 'desde-navegacion': animar_tarjeta, 'espera-animacion': espera_animacion }" :style="estilo"
			@animationend.self="animar_tarjeta = false">
			<header>
				<div class="implementacion-modal-etapa">
					<i :class="'bi bi-' + (hito.icono || 'list-check')" aria-hidden="true"></i>
					<span>Etapa {{ hito.etapa }}<small v-if="hito.implementacion === 'agente'">Agente de WhatsApp</small></span>
				</div>
				<button type="button" class="implementacion-modal-cerrar" aria-label="Cerrar el aviso" @click="cerrar">
					<i class="bi bi-x-lg" aria-hidden="true"></i>
				</button>
			</header>
			<div class="implementacion-modal-contenido">
				<p class="implementacion-modal-estado" :class="'estado-' + hito.estado">
					<i :class="hito.estado === 'completado' ? 'bi bi-check-circle-fill' : 'bi bi-info-circle-fill'" aria-hidden="true"></i>
					{{ rotulos[hito.estado] }}
				</p>
				<h2>{{ hito.titulo }}</h2>
				<p>{{ hito.detalle }}</p>
				<section v-if="hito.siguientes && hito.siguientes.length" ref="siguientes" class="implementacion-modal-siguientes">
					<h3>Próximos pasos</h3>
					<ul>
						<li v-for="paso in hito.siguientes" :key="paso">{{ paso }}</li>
					</ul>
				</section>
				<div class="implementacion-modal-acciones">
					<b-button v-if="accion" :to="accion.ruta" variant="primary" @click="cerrar">
						{{ accion.texto }}
					</b-button>
					<b-button v-else :to="{ name: 'implementacion' }" variant="outline-primary" @click="cerrar">
						Ver implementación
					</b-button>
					<b-button v-if="hito.aprobado === false" variant="outline-primary" :disabled="aprobando" @click="aprobar">
						Aprobar la preparación del agente
					</b-button>
					<b-button variant="link" @click="cerrar">Cerrar</b-button>
				</div>
				<p v-if="hito.aprobado === true" class="mt-2 mb-0" role="status">Preparación aprobada.</p>
				<p v-if="error_aprobacion" class="mt-2 mb-0" role="alert">No pudimos guardar la aprobación. Probá de nuevo.</p>
			</div>
			<div v-if="fase_robot" class="implementacion-modal-robot" :class="'fase-' + fase_robot">
				<robot :pose="fase_robot === 'senalando' ? 'senalar' : 'saludo'"></robot>
			</div>
		</div>
	</b-modal>
</template>

<script>
import Robot from './Robot'
import { destino_de_accion } from './accion'

export default {
	components: { Robot },
	data() {
		return {
			canal: null,
			intervalo: null,
			temporizadores: [],
			animar_tarjeta: false,
			espera_animacion: false,
			fase_robot: null,
			estilo: {},
			ruta_al_abrir: null,
			aprobando: false,
			error_aprobacion: false,
			rotulos: { completado: 'Completada', parcial: 'Avance parcial', error: 'Hay un problema' },
		}
	},
	computed: {
		apertura() {
			return this.$store.state.implementacion.apertura
		},
		migracion_terminada() {
			return this.$store.state.implementacion.hitos.some(hito => hito.etapa === 4
				&& ['completado', 'parcial'].includes(hito.estado))
		},
		hito() {
			return this.apertura.hito
		},
		accion() {
			return destino_de_accion(this.hito.accion)
		},
	},
	watch: {
		apertura(actual) {
			if (actual) {
				this.ruta_al_abrir = this.$route.fullPath
				this.error_aprobacion = false
				this.espera_animacion = !!actual.origen && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
				this.$refs.modal.show()
			}
		},
		migracion_terminada(terminada) {
			if (terminada) {
				this.$store.dispatch('prueba/refrescar')
			}
		},
	},
	mounted() {
		if (this.Echo) {
			this.canal = 'implementacion.user.' + this.$store.state.auth.user.id
			this.Echo.private(this.canal)
				.listen('.ImplementacionActualizada', this.refrescar_en_vivo)
				.subscribed(this.refrescar_en_vivo)
		}
		this.refrescar()
		this.intervalo = window.setInterval(this.refrescar, 15000)
		document.addEventListener('visibilitychange', this.refrescar)
	},
	beforeDestroy() {
		if (this.canal) {
			this.Echo.leave(this.canal)
		}
		window.clearInterval(this.intervalo)
		document.removeEventListener('visibilitychange', this.refrescar)
		this.limpiar_animacion()
		this.$store.commit('implementacion/limpiar')
	},
	methods: {
		refrescar_en_vivo() {
			this.$store.dispatch('implementacion/refrescar', { en_vivo: true })
		},
		refrescar() {
			if (!document.hidden) {
				this.$store.dispatch('implementacion/refrescar')
			}
		},
		al_mostrar() {
			const apertura = this.apertura
			if (!apertura) {
				return
			}
			if (apertura.hito.avisar !== false && !apertura.hito.visto) {
				this.$store.dispatch('implementacion/marcar_visto', apertura.hito.id).catch(() => {})
			}
			if (!this.espera_animacion) {
				return
			}
			const rect = this.$refs.tarjeta.getBoundingClientRect()
			const siguientes = this.$refs.siguientes
			this.estilo = {
				'--origen-x': (apertura.origen.x - rect.left - rect.width / 2) + 'px',
				'--origen-y': (apertura.origen.y - rect.top - rect.height / 2) + 'px',
				'--salto-robot': (siguientes ? siguientes.offsetTop - 22 : 0) + 'px',
			}
			this.animar_tarjeta = true
			this.espera_animacion = false
			this.fase_robot = 'saludando'
			const fin_saludo = 660 + 3000
			const salida = siguientes ? fin_saludo + 650 + 3000 : fin_saludo
			if (siguientes) {
				this.temporizadores.push(window.setTimeout(() => { this.fase_robot = 'senalando' }, fin_saludo))
			}
			this.temporizadores.push(window.setTimeout(() => { this.fase_robot = 'saliendo' }, salida))
			this.temporizadores.push(window.setTimeout(() => { this.fase_robot = null }, salida + 650))
		},
		cerrar() {
			this.$refs.modal.hide()
		},
		aprobar() {
			this.aprobando = true
			this.error_aprobacion = false
			this.$store.dispatch('implementacion/aprobar', this.hito.id)
			.catch(() => { this.error_aprobacion = true })
			.finally(() => { this.aprobando = false })
		},
		al_cerrar() {
			const foco = this.apertura && this.apertura.foco
			const sigue_en_la_misma_ruta = this.ruta_al_abrir === this.$route.fullPath
			this.limpiar_animacion()
			this.$store.commit('implementacion/abrir', null)
			this.$nextTick(() => {
				const destino = foco && foco.isConnected ? foco
					: document.querySelector(window.innerWidth < 768 ? '[data-menu-implementacion-movil]' : '[data-nav-implementacion]')
				if (destino && sigue_en_la_misma_ruta) {
					destino.focus()
				}
			})
		},
		limpiar_animacion() {
			this.temporizadores.forEach(temporizador => window.clearTimeout(temporizador))
			this.temporizadores = []
			this.animar_tarjeta = false
			this.espera_animacion = false
			this.fase_robot = null
			this.estilo = {}
		},
	},
}
</script>

<style lang="sass">
.implementacion-modal-contenedor.modal-content
	background: transparent
	border: 0
	box-shadow: none
	> .implementacion-modal-cuerpo.modal-body:first-child:last-child
		overflow: visible

.implementacion-modal-tarjeta
	position: relative
	isolation: isolate
	border-radius: 1.4rem
	background: #f9fbff
	color: #18274a
	box-shadow: 0 22px 64px #0a173450
	&.espera-animacion
		opacity: 0
	&.desde-navegacion
		animation: desplegar-implementacion .68s cubic-bezier(.18,.75,.26,1) both
	header
		display: flex
		align-items: flex-start
		justify-content: space-between
		border-radius: 1.4rem 1.4rem 0 0
		background: linear-gradient(120deg, #182a5b, #344fc1)
		padding: 1.2rem 1.35rem
		color: white
	h2
		font-size: 1.6rem
		font-weight: 700
		line-height: 1.18

.implementacion-modal-etapa
	display: flex
	align-items: center
	gap: .7rem
	font-size: 1.4rem
	font-weight: 700
	small
		display: block
		color: #d8e4ff
		font-size: .8rem
	i
		display: grid
		place-items: center
		width: 2.7rem
		height: 2.7rem
		border-radius: .8rem
		background: #ffffff26

.implementacion-modal-cerrar
	z-index: 2
	padding: .4rem
	border: 0
	border-radius: .4rem
	background: transparent
	color: white
	&:hover, &:focus-visible
		background: #ffffff2b

.implementacion-modal-contenido
	padding: 1.25rem 1.35rem

.implementacion-modal-estado
	display: flex
	gap: .45rem
	align-items: center
	margin-bottom: .45rem
	color: #825300
	font-weight: 700
	&.estado-completado
		color: #176b4a

.implementacion-modal-siguientes
	margin: 1rem 0
	padding: .85rem 1rem
	border: 1px solid #d3ddfa
	border-radius: .8rem
	background: #edf3ff
	h3
		font-size: 1rem
		font-weight: 700
	ul
		margin: 0
		padding-left: 1.1rem
	li + li
		margin-top: .25rem

.implementacion-modal-acciones
	display: flex
	flex-wrap: wrap
	gap: .4rem .6rem

.implementacion-modal-robot
	position: absolute
	z-index: 1
	top: .3rem
	left: -5.4rem
	width: 6.5rem
	pointer-events: none
	filter: drop-shadow(0 8px 7px #17285045)
	transition: transform .65s ease, opacity .65s ease
	&.fase-saludando
		animation: llegar-robot .66s cubic-bezier(.19,.86,.35,1.1) both
	&.fase-senalando
		transform: translate(12%, var(--salto-robot))
	&.fase-saliendo
		transform: translate(-46%, -4.5rem) scale(.35)
		opacity: 0

@keyframes desplegar-implementacion
	0%
		opacity: .15
		transform: translate(var(--origen-x), var(--origen-y)) scale(.055,.095)
		clip-path: polygon(25% 20%, 75% 0, 100% 90%, 0 100%)
	62%
		opacity: 1
		transform: translate(calc(var(--origen-x) * .09), calc(var(--origen-y) * .09)) scale(.94,1.02)
		clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%)
	100%
		transform: translate(0,0) scale(1)

@keyframes llegar-robot
	from
		transform: translate(-24%, 24%) scale(.28)
		opacity: 0
	to
		transform: translate(0,0) scale(1)
		opacity: 1

@media (max-width: 767px)
	.implementacion-modal-robot
		left: auto
		right: 3.5rem
		top: -.95rem
		width: 4.2rem
		&.fase-senalando
			transform: translate(2.5rem, var(--salto-robot)) scale(.65)
	.implementacion-modal-tarjeta h2
		font-size: 1.35rem
	.implementacion-modal-siguientes
		padding-right: 2.35rem

@media (prefers-reduced-motion: reduce)
	.implementacion-modal-tarjeta.desde-navegacion
		animation: none
	.implementacion-modal-robot
		display: none
</style>
