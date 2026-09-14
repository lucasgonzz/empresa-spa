<template>
	<div class="agenda">

		<div class="agenda__cabecera">
			<h4 class="agenda__titulo">Agenda</h4>

			<!--
				Segmented control, no pestañas: son tres formas de mirar las MISMAS tareas, no tres
				pantallas. La activa se despega con el fondo de tarjeta y una sombra corta, como el
				control de iOS.
			-->
			<div
			class="agenda__segmentos"
			role="tablist"
			aria-label="Vista de la agenda">
				<button
				v-for="opcion in vistas"
				:key="opcion.key"
				type="button"
				role="tab"
				class="agenda__segmento"
				:class="{ 'agenda__segmento--activo': vista == opcion.key }"
				:aria-selected="vista == opcion.key ? 'true' : 'false'"
				:data-testid="'agenda-vista-' + opcion.key"
				@click="cambiar_vista(opcion.key)">
					{{ opcion.texto }}
				</button>
			</div>

			<b-button
			class="btn-modulo agenda__nueva"
			variant="primary"
			data-testid="agenda-nueva-tarea"
			@click="abrir_nueva_tarea(fecha_para_nueva)">
				<i class="bi bi-plus-lg m-r-5"></i>
				Nueva tarea
			</b-button>
		</div>

		<lista v-if="vista == 'lista'"></lista>
		<calendario v-else-if="vista == 'calendario'"></calendario>
		<realizadas v-else></realizadas>

		<form-tarea></form-tarea>
		<modal-completar></modal-completar>
		<barra-deshacer></barra-deshacer>

	</div>
</template>
<script>
/*
	Contenedor del modulo de Agenda (Alertas -> Agenda), mision agenda-tareas-calendario.

	Reemplaza a components/pendings (tabla generica + pestañas "Por realizar" / "Realizados"), que
	queda en el repo sin montar hasta que Lucas pruebe esta. La vista (lista, calendario,
	realizadas) vive en el store `agenda` y se refleja en la URL (/agenda/calendario) para poder
	entrar derecho a una de las tres; el menu manda `view: 'por-realizar'`, que cae en la lista.
*/
import acciones_agenda from '@/components/agenda/acciones_agenda'

const VISTAS_VALIDAS = ['lista', 'calendario', 'realizadas']

export default {
	mixins: [acciones_agenda],
	components: {
		Lista: () => import('@/components/agenda/Lista'),
		Calendario: () => import('@/components/agenda/Calendario'),
		Realizadas: () => import('@/components/agenda/Realizadas'),
		FormTarea: () => import('@/components/agenda/FormTarea'),
		ModalCompletar: () => import('@/components/agenda/ModalCompletar'),
		BarraDeshacer: () => import('@/components/agenda/BarraDeshacer'),
	},
	data() {
		return {
			vistas: [
				{ key: 'lista', texto: 'Lista' },
				{ key: 'calendario', texto: 'Calendario' },
				{ key: 'realizadas', texto: 'Realizadas' },
			],
		}
	},
	computed: {
		vista() {
			return this.$store.state.agenda.vista
		},
		/**
		 * "Nueva tarea" desde el calendario con un dia elegido arranca en ese dia; en las otras
		 * vistas, en hoy.
		 *
		 * @returns {String|null}
		 */
		fecha_para_nueva() {
			if (this.vista == 'calendario') {
				return this.$store.state.agenda.dia_seleccionado
			}
			return null
		},
	},
	watch: {
		/*
		 * La URL manda: un clic en "Agenda" del menu estando en Calendario navega a
		 * /agenda/por-realizar y tiene que volver a la lista, y un enlace directo a
		 * /agenda/realizadas tiene que abrir Realizadas aunque el componente ya este montado.
		 */
		'$route.params.view'(view) {
			this.aplicar_vista_de_la_url(view)
		},
	},
	created() {
		this.aplicar_vista_de_la_url(this.$route.params.view)
	},
	methods: {
		/**
		 * @param {String|undefined} view Segmento de la URL; lo que no sea una vista valida
		 *                                (`por-realizar` del menu, vacio) cae en la lista.
		 */
		aplicar_vista_de_la_url(view) {
			let vista = VISTAS_VALIDAS.indexOf(view) != -1 ? view : 'lista'
			if (vista == this.vista && this.$store.state.agenda.desde) {
				return
			}
			this.$store.dispatch('agenda/set_vista', vista)
		},

		/**
		 * Cambia la vista en el store (que recarga si hace falta) y la refleja en la URL sin
		 * agregar historial. El catch vacio es por el NavigationDuplicated de vue-router 3 cuando
		 * la URL ya es esa: no es un error para el usuario.
		 *
		 * @param {String} vista
		 */
		cambiar_vista(vista) {
			if (vista == this.vista) {
				return
			}
			this.$store.dispatch('agenda/set_vista', vista)
			let navegacion = this.$router.replace({ name: 'pending', params: { view: vista } })
			if (navegacion && typeof navegacion.catch == 'function') {
				navegacion.catch(() => {})
			}
		},
	},
}
</script>
<style lang="sass">
// Vocabulario visual de la agenda. Todo por tokens de _dark_theme.sass: los modales de bootstrap-vue
// cuelgan de <body> y un hex aca queda blanco en modo oscuro.
.agenda
	max-width: 1100px
	margin: 0 auto
	padding: 15px 15px 90px

	&__cabecera
		display: flex
		align-items: center
		gap: 16px
		flex-wrap: wrap
		margin-bottom: 20px

	&__titulo
		margin: 0
		font-weight: 600
		letter-spacing: -0.01em
		color: var(--color-text-primary)

	&__segmentos
		display: inline-flex
		padding: 3px
		border-radius: 10px
		background: var(--bg-section)
		border: 1px solid var(--color-border-secondary)
		margin-left: auto

	&__segmento
		border: 0
		background: transparent
		color: var(--color-text-secondary)
		font-size: 0.875rem
		font-weight: 500
		padding: 6px 14px
		border-radius: 8px
		cursor: pointer
		transition: background 0.15s ease, color 0.15s ease
		&:focus
			outline: none
		&:focus-visible
			box-shadow: 0 0 0 2px var(--color-primary)
		&--activo
			background: var(--bg-card)
			color: var(--color-text-primary)
			box-shadow: 0 1px 3px var(--shadow-color)

	// Estados compartidos por las tres vistas
	&__cargando
		display: flex
		justify-content: center
		padding: 40px 0
		color: var(--color-text-secondary)

	&__vacio
		text-align: center
		padding: 56px 16px
		color: var(--color-text-secondary)
		i
			font-size: 2.4rem
			display: block
			margin-bottom: 10px
			opacity: 0.6
		p
			margin-bottom: 16px

// Un grupo de filas: titulo chico arriba y una tarjeta con las filas separadas por hairlines.
.agenda-grupo
	margin-bottom: 24px

	&__cabecera
		display: flex
		align-items: center
		gap: 8px
		margin: 0 4px 8px

	&__titulo
		margin: 0
		font-size: 0.8rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: 0.06em
		color: var(--color-text-secondary)

	&__contador
		font-size: 0.75rem
		font-weight: 600
		min-width: 22px
		height: 22px
		padding: 0 7px
		border-radius: 11px
		display: inline-flex
		align-items: center
		justify-content: center
		background: var(--bg-hover)
		color: var(--color-text-secondary)

	&__filas
		background: var(--bg-card)
		border: 1px solid var(--color-border)
		border-radius: 12px
		overflow: hidden
		box-shadow: 0 2px 8px var(--shadow-color)

	&__nota
		margin: 8px 4px 0
		font-size: 0.8rem
		color: var(--color-text-secondary)

	// Vencidas: el rojo suave del sistema (--btn-peligro-*), solo en el titulo y el contador.
	&--vencidas
		.agenda-grupo__titulo
			color: var(--btn-peligro-texto)
		.agenda-grupo__contador
			background: var(--btn-peligro-fondo)
			color: var(--btn-peligro-texto)

// Telefono: el titulo y el boton en una fila, el segmented control abajo a todo el ancho.
@media (max-width: 575px)
	.agenda
		padding: 10px 10px 90px
		&__cabecera
			gap: 10px
		&__segmentos
			order: 3
			width: 100%
			margin-left: 0
		&__segmento
			flex: 1
			text-align: center
		&__nueva
			margin-left: auto
</style>
