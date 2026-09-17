<template>
	<div class="agenda">

		<h4 class="agenda__titulo">Agenda</h4>

		<!--
			horizontal-nav compartido (common-vue), el mismo control que usa el resto del sistema
			para alternar vistas de un modulo: son tres formas de mirar las MISMAS tareas, no tres
			pantallas. "Nueva tarea" va en su slot #btn_create -no como hermano suelto- porque la
			raiz del componente (.cont-navs) es `width: 100%`: afuera de ese slot, competir con ella
			en un flex propio la manda a su propia fila y bloquea todo lo que venga despues.
		-->
		<horizontal-nav
		class="agenda__nav"
		:items="nav_items"
		:selected_item_value="vista"
		:show_display="false"
		emitir_setSelected_al_inicio
		@setSelected="al_elegir_vista">
			<template #btn_create>
				<b-button
				class="btn-modulo agenda__nueva"
				variant="primary"
				data-testid="agenda-nueva-tarea"
				@click="abrir_nueva_tarea(fecha_para_nueva)">
					<i class="bi bi-plus-lg m-r-5"></i>
					Nueva tarea
				</b-button>
			</template>
		</horizontal-nav>

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
		HorizontalNav: () => import('@/common-vue/components/horizontal-nav/Index'),
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
		/**
		 * Items del horizontal-nav compartido. `route_value` coincide con las claves de
		 * VISTAS_VALIDAS para que el estado activo quede sincronizado con la `vista` del store sin
		 * traducir nombres, y `testid` preserva los `data-testid` `agenda-vista-*` que ya leen las
		 * descripciones de agenda.js (sin esto, HorizontalNav los arma desde el nombre visible y
		 * cambia la convencion).
		 *
		 * @returns {Array}
		 */
		nav_items() {
			return this.vistas.map(opcion => {
				return {
					name: opcion.texto,
					route_value: opcion.key,
					testid: 'agenda-vista-' + opcion.key,
				}
			})
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

		/**
		 * @param {Object} item Item de nav_items que se acaba de elegir.
		 */
		al_elegir_vista(item) {
			this.cambiar_vista(item.route_value)
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

	&__titulo
		margin: 0 0 14px
		// #app centra todo el texto (ver el hallazgo del informe de la mision original); sin esto
		// el titulo queda centrado apenas deja de vivir adentro de un flex, como paso al mover
		// "Nueva tarea" al slot del horizontal-nav.
		text-align: left
		font-weight: 600
		letter-spacing: -0.01em
		color: var(--color-text-primary)

	// El horizontal-nav compartido ya trae su propio pill y su propio "Nueva tarea" via el slot
	// #btn_create (common-vue/sass/_horizontal_nav.sass); acá solo se le da aire debajo, antes de
	// la lista/calendario/realizadas.
	&__nav
		margin-bottom: 20px

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

@media (max-width: 575px)
	.agenda
		padding: 10px 10px 90px
</style>
