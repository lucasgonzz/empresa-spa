<template>
	<div class="mostrador">

		<!--
			Gate visual, mismo criterio que tenía el módulo IA viejo: la ruta existe
			siempre (el router del proyecto no procesa extensiones ni dueño), así que si
			alguien tipea /ia sin la extensión o sin ser el dueño, acá se le explica en
			vez de mostrarle una pantalla rota. El gate real está en el backend (403 en
			mostrador/*) y en el menú (routes.js).
		-->
		<b-alert
		v-if="!mostrador_tiene_extension"
		show
		variant="warning"
		class="m-t-15">
			Este módulo requiere la extensión del asistente IA. Comunicate con
			ComercioCity si querés activarla.
		</b-alert>

		<b-alert
		v-else-if="!mostrador_es_el_dueno"
		show
		variant="warning"
		class="m-t-15">
			El mostrador es solo para el dueño del negocio.
		</b-alert>

		<template v-else>
			<header class="mostrador__cabecera">
				<div class="mostrador__cabecera-fila">
					<h1 class="mostrador__titulo">Tu mostrador</h1>
					<button
					type="button"
					class="mostrador__config"
					title="Configurar el asistente"
					@click="abrir_configuracion">
						<i class="bi bi-gear" aria-hidden="true"></i>
						<span>Configurar</span>
					</button>
				</div>
				<p class="mostrador__fecha">{{ fecha_de_hoy }}</p>
			</header>

			<escritorio
			@abrir="abrir"></escritorio>

			<!--
				Montado una vez, abre por estado (mostrador.reporte_abierto): así el
				overlay no se re-crea en cada apertura y el :id de la ruta puede abrir un
				informe sin pasar por una carpeta.
			-->
			<informe-abierto></informe-abierto>
		</template>

	</div>
</template>
<script>
import moment from 'moment'
import mostrador_acceso from '@/mixins/mostrador_acceso'

/**
 * Orquestador del mostrador: encabezado + escritorio de carpetas + el informe
 * abierto a pantalla completa. Los datos viven en store/mostrador.js; la
 * conversación de cada informe reusa el store ai_chat (ver SidebarConversacion).
 *
 * El gate (extensión asistente_ia + dueño o acceso maestro) viene del mixin
 * mostrador_acceso: es el MISMO que usan DepositButtons y las notificaciones de
 * sugerencias para decidir si mandan a alguien acá, así ningún punto de entrada
 * trae a una persona que este componente después rechaza.
 */
export default {
	mixins: [mostrador_acceso],
	components: {
		Escritorio: () => import('@/components/ia/Escritorio'),
		InformeAbierto: () => import('@/components/ia/InformeAbierto'),
	},
	data() {
		return {
			// Id de /ia/:id que todavía no se pudo abrir porque el gate no resolvió
			// (ver abrir_desde_la_ruta y el watch de puede_entrar_al_mostrador). null =
			// nada pendiente.
			apertura_pendiente: null,
		}
	},
	computed: {
		/**
		 * "lunes 14 de septiembre": moment ya está en 'es' (common-vue/mixins/dates.js).
		 */
		fecha_de_hoy() {
			return moment().format('dddd D [de] MMMM')
		},
	},
	mounted() {
		this.abrir_desde_la_ruta()
	},
	beforeDestroy() {
		// Salir del módulo con un informe abierto lo cierra: si no, el estado queda en el
		// store y al volver a /ia el overlay reaparece solo.
		this.$store.dispatch('mostrador/cerrarReporte')
	},
	watch: {
		// El puente "Ver el informe" del chat puede llegar estando ya en /ia.
		'$route.params.id'() {
			this.abrir_desde_la_ruta()
		},
		/**
		 * En una carga fría sobre /ia/:id (F5 o link directo) este componente se monta
		 * antes de que auth/me traiga al usuario y sus extensiones, así que el gate da
		 * false en mounted() y la apertura queda pendiente. Cuando el gate resuelve a
		 * true, se dispara UNA vez (abrir_pendiente limpia el id). Si resuelve a false
		 * (un empleado, o sin la extensión) se muestra el cartel y el id se descarta.
		 */
		puede_entrar_al_mostrador(puede) {
			if (puede && this.apertura_pendiente) {
				this.abrir_pendiente()
			}
		},
	},
	methods: {
		/**
		 * Abre el modal de configuración del agente (S3, acceso 2). El modal está montado en
		 * el botón flotante (que en /ia se muestra, mismo gate que el mostrador); acá solo se
		 * lo dispara por id.
		 */
		abrir_configuracion() {
			this.$bvModal.show('configuracion-agente')
		},
		/**
		 * Click en una carpeta del escritorio. El store rechaza si el GET falla (404:
		 * no es del dueño o no está listo); acá se avisa.
		 */
		abrir(reporte) {
			let self = this
			this.$store.dispatch('mostrador/abrirReporte', reporte)
				.catch(function () {
					self.$toast.error('No pudimos abrir el informe. Probá de nuevo en un momento.')
				})
		},
		/**
		 * /ia/:id abre ese informe de entrada. Si el gate todavía no resolvió (carga
		 * fría), el id queda pendiente y lo dispara el watch de puede_entrar_al_mostrador;
		 * hasta entonces la URL conserva el :id, para que un F5 en el medio no lo pierda.
		 */
		abrir_desde_la_ruta() {
			let id = this.$route.params.id
			if (!id) {
				return
			}
			this.apertura_pendiente = Number(id)
			if (!this.puede_entrar_al_mostrador) {
				return
			}
			this.abrir_pendiente()
		},
		/**
		 * Abre el informe pendiente y limpia el :id de la URL, para que un F5 posterior
		 * vuelva al escritorio y no reabra el informe. El id se limpia ANTES de abrir:
		 * el replace de la ruta vuelve a disparar abrir_desde_la_ruta (sin id, corta) y
		 * el watch del gate no tiene que encontrar nada que repetir.
		 */
		abrir_pendiente() {
			let id = this.apertura_pendiente
			this.apertura_pendiente = null
			if (!id) {
				return
			}
			this.abrir({ id: id })
			if (this.$route.params.id) {
				this.$router.replace({ name: 'ia' })
			}
		},
	},
}
</script>
<style lang="sass">
// Sobrio, tipografía del sistema, superficie gris cálida muy clara (en oscuro, los
// tokens del tema). #app centra todo el texto del ERP; acá se declara a la izquierda.
.mostrador
	text-align: left
	padding: 18px 0 40px 0

	&__cabecera
		margin-bottom: 22px

	// El título y el botón de configuración en una fila; la fecha queda debajo.
	&__cabecera-fila
		display: flex
		align-items: center
		justify-content: space-between
		gap: 12px

	// Acceso 2 a la configuración del agente (S3). Sobrio, sin sombra (el sistema se la pone
	// a todo <button>), del color secundario y con realce al pasar por encima.
	&__config
		flex-shrink: 0
		display: inline-flex
		align-items: center
		gap: 7px
		padding: 7px 14px
		border: 1px solid var(--color-border, #dee2e6)
		border-radius: 10px
		background: var(--bg-card, #fff)
		color: var(--color-text-secondary, #6c757d)
		box-shadow: none
		font-size: .88rem
		font-weight: 600
		transition: background .15s ease, color .15s ease, border-color .15s ease

		&:hover
			background: var(--bg-hover, #f1f3f5)
			color: var(--color-text-primary, #212529)
			border-color: var(--color-primary, #007bff)

	&__titulo
		font-size: 1.6rem
		font-weight: 700
		letter-spacing: -0.01em
		margin: 0
		color: var(--color-text-primary, #212529)

	&__fecha
		margin: 2px 0 0 0
		font-size: .95rem
		color: var(--color-text-secondary, #6c757d)
		// La fecha sale en minúscula de moment ("lunes 14 de septiembre"); se capitaliza
		// la primera letra sin tocar el resto.
		&::first-letter
			text-transform: uppercase
</style>
