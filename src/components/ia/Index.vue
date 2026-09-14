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
				<h1 class="mostrador__titulo">Tu mostrador</h1>
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
	},
	methods: {
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
		 * /ia/:id abre ese informe de entrada y limpia el :id de la URL, para que un
		 * F5 posterior vuelva al escritorio y no reabra el informe.
		 */
		abrir_desde_la_ruta() {
			let id = this.$route.params.id
			if (!id || !this.puede_entrar_al_mostrador) {
				return
			}
			this.abrir({ id: Number(id) })
			this.$router.replace({ name: 'ia' })
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
