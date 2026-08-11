<template>
<div
class="control-fecha">

	<modal-from-dates
	:model_name="model_name"></modal-from-dates>

	<div class="control-fecha__pastilla">

		<!-- Fila 1 en telefono; en desktop es parte de la unica fila. Lleva el segmento de modo y
		     el boton de calendario, que son los dos controles que siempre estan. -->
		<div class="control-fecha__fila-principal">

			<!-- MODO: solo cuando el modulo lo pide (Compras si, Ventas no). La logica de
			     setFromDates es la misma de DisplayNav.vue, movida tal cual: incluye la limpieza
			     del estado de paginado antes de volver a "Por fecha". -->
			<div
			v-if="change_from_dates_option"
			class="control-fecha__modo">
				<div
				class="control-fecha__modo-item apretable"
				:class="es_modo(true) ? 'active' : ''"
				@click="setFromDates(true)">
					Por fecha
				</div>
				<div
				class="control-fecha__modo-item apretable"
				:class="es_modo(false) ? 'active' : ''"
				@click="setFromDates(false)">
					Historico
				</div>
			</div>

			<span
			v-if="change_from_dates_option && muestra_dias"
			class="control-fecha__separador control-fecha__separador--desktop"></span>

			<!-- El calendario se muestra SIEMPRE, incluso en Historico y con una busqueda activa:
			     es la salida para volver a una fecha sin tener que deshacer nada antes. -->
			<button
			type="button"
			class="control-fecha__calendario"
			title="Elegir fecha o rango"
			aria-label="Elegir fecha o rango"
			v-b-modal="'from-date'">
				<i class="bi bi-calendar3"></i>
			</button>
		</div>

		<span
		v-if="muestra_dias"
		class="control-fecha__separador control-fecha__separador--desktop"></span>

		<!-- Fila 2 en telefono: los dias. Las flechas quedan FUERA del area que scrollea, fijas a
		     los extremos, y el scroll ocurre solo en el carril del medio. -->
		<div
		v-if="muestra_dias"
		class="control-fecha__dias">

			<!-- Rango activo: el chip reemplaza a las celdas. Es la unica informacion que el nav no
			     puede mostrar por si solo, sobre todo si el rango es mas largo que la semana. -->
			<div
			v-if="hay_rango"
			class="control-fecha__rango">
				<span>{{ texto_rango }}</span>
				<button
				type="button"
				class="control-fecha__rango-quitar"
				title="Quitar el rango"
				aria-label="Quitar el rango"
				@click="quitarRango">
					<i class="bi bi-x-lg"></i>
				</button>
			</div>

			<template v-else>
				<button
				type="button"
				class="control-fecha__flecha"
				title="Semana anterior"
				aria-label="Semana anterior"
				v-show="days.length == 7"
				@click="getDaysBefore">
					<i class="bi bi-chevron-left"></i>
				</button>

				<div
				ref="carril"
				class="control-fecha__carril">
					<b-skeleton
					v-if="loading"
					type="input"
					width="220px"></b-skeleton>

					<button
					v-else
					v-for="(day, i) in days"
					:key="i"
					type="button"
					:ref="isActive(day) ? 'dia_activo' : null"
					class="control-fecha__dia"
					:class="clase_dia(day)"
					@click.right="setLimitDate(day.date)"
					@click.prevent="clickDia(day)">
						<!-- El mes solo cuando cambia respecto de la celda anterior: repetirlo siete
						     veces seguidas, como hacia el chip verde, no informa nada. -->
						<span
						v-if="muestra_mes(i)"
						class="control-fecha__mes">
							{{ getMonth(day.date) }}
						</span>
						<span class="control-fecha__dia-nombre">
							{{ nombre_dia(day.date) }}
						</span>
						<span class="control-fecha__dia-numero">
							{{ numero_dia(day.date) }}
						</span>
					</button>
				</div>

				<button
				type="button"
				class="control-fecha__flecha"
				title="Semana siguiente"
				aria-label="Semana siguiente"
				v-show="index >= 1"
				@click="getDaysNext">
					<i class="bi bi-chevron-right"></i>
				</button>
			</template>
		</div>
	</div>
</div>
</template>
<script>
import ModalFromDates from '@/common-vue/components/previus-days/ModalFromDates'
import moment from 'moment'

/**
 * ControlFecha — el control unico de fecha de los modulos que se ven por dia.
 *
 * Funde en una sola pastilla las cuatro piezas que antes se repartian una fila entera arriba de la
 * tabla mas un control suelto en el encabezado: el titulo de la fecha, el nav de dias, el boton
 * "Por fecha" y el selector de modo "Por fecha / Historico".
 *
 * El titulo no sobrevivio y no es un olvido: de sus cuatro ramas, la de "con filtro" era
 * inalcanzable (List.vue cortaba antes) y las de "de hoy" / "del DD/MM" ya las dice el dia pintado
 * de azul en el nav. La unica que aportaba algo era el rango, y para eso esta el chip.
 *
 * La logica de dias es la de WeekDaysNav.vue y la de modo es la de DisplayNav.vue, movidas tal
 * cual: mismos commit y mismos dispatch, para que el store no note la diferencia.
 */
export default {
	name: 'ControlFecha',
	components: {
		ModalFromDates,
	},
	props: {
		model_name: String,
		model_name_for_get_models: {
			type: String,
			default: null,
		},
		/** Muestra el segmento "Por fecha / Historico". Lo decide el modulo, no este componente. */
		change_from_dates_option: {
			type: Boolean,
			default: false,
		},
		/**
		 * Si se muestran las celdas de dia. La condicion la calcula quien monta el control, porque
		 * depende de reglas de la vista (ver views/Ventas.vue y la extension sales.hide): si este
		 * componente la recalculara por su cuenta, esa extension se rompe en silencio.
		 */
		mostrar_dias: {
			type: Boolean,
			default: true,
		},
		check_permissions: {
			type: Boolean,
			default: true,
		},
		clear_selected: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			days: [],
			index: 0,
			loading: false,
		}
	},
	computed: {
		from_date() {
			return this.$store.state[this.model_name].from_date
		},
		until_date() {
			return this.$store.state[this.model_name].until_date
		},
		/**
		 * Los stores de report y chart (Caja vieja) no declaran until_date. La guarda venia de
		 * WeekDaysNav.vue y se mantiene: sin ella esos dos modulos revientan en runtime, y no se
		 * nota desde Ventas ni desde Compras.
		 */
		has_until() {
			return typeof this.until_date != 'undefined'
		},
		hay_rango() {
			return this.has_until && this.until_date != ''
		},
		texto_rango() {
			return moment(this.from_date).format('D') + ' – ' + moment(this.until_date).format('D MMM')
		},
		has_permission() {
			if (this.check_permissions) {
				return this.can(this.model_name+'.index.previus_days')
			}
			return true
		},
		/**
		 * Las celdas de dia se muestran si el modulo lo pide Y el usuario tiene el permiso. El modo
		 * y el calendario no dependen del permiso: dependen del modulo.
		 */
		muestra_dias() {
			return this.mostrar_dias && this.has_permission
		},
	},
	watch: {
		/** Al volver a mostrarse los dias (por ejemplo, saliendo de Historico) se recentra el activo. */
		muestra_dias(value) {
			if (value) {
				this.centrar_dia_activo()
			}
		},
	},
	created() {
		this.getDays()
	},
	methods: {
		es_modo(value) {
			return this.$store.state[this.model_name].from_dates == value
		},
		/**
		 * Cambia entre "Por fecha" e "Historico". Copiado de DisplayNav.vue sin tocar nada:
		 * en Historico dispara el listado por defecto paginado, y al volver a "Por fecha" limpia
		 * todo el estado que dejo ese paginado antes de pedir los modelos del dia.
		 *
		 * @param {Boolean} value true = "Por fecha", false = "Historico"
		 */
		setFromDates(value) {
			this.$store.commit(this.model_name+'/setFromDates', value)
			if (!value) {
				this.$store.dispatch(this.model_name+'/runListadoPorDefecto')
				return
			}
			this.$store.commit(this.model_name+'/setFiltered', [])
			this.$store.commit(this.model_name+'/setIsFiltered', false)
			this.$store.commit(this.model_name+'/setFilterPage', 1)
			this.$store.commit(this.model_name+'/setTotalFilterPages', null)
			this.$store.commit(this.model_name+'/setTotalFilterResults', 0)
			this.$store.commit(this.model_name+'/set_listado_por_defecto', false)
			this.$store.commit(this.model_name+'/setGlobalSearchPayload', null)
			this.$store.dispatch(this.model_name+'/getModels')
		},
		isActive(day) {
			if (!this.has_until || this.until_date == '') {
				return this.date(this.from_date) == this.date(day.date)
			} else if (this.has_until && this.until_date != '') {
				return moment(day.date).isBetween(moment(this.from_date).subtract(1, 'days'), moment(this.until_date).add(1, 'days'))
			}
		},
		clase_dia(day) {
			let clases = []
			if (this.isActive(day)) {
				clases.push('active')
			}
			if (!day.models.length && this.date(day.date) != this.date(this.today)) {
				clases.push('control-fecha__dia--sin-movimientos')
			}
			return clases
		},
		/** El mes se escribe en la primera celda de la semana y cada vez que cambia. */
		muestra_mes(i) {
			if (i === 0) {
				return true
			}
			return this.getMonth(this.days[i].date) != this.getMonth(this.days[i - 1].date)
		},
		nombre_dia(d) {
			if (this.date(d) == this.date(this.today)) {
				return 'Hoy'
			}
			return moment(d).format('ddd')
		},
		numero_dia(d) {
			return moment(d).format('DD')
		},
		clickDia(day) {
			if (!day.models.length && this.date(day.date) != this.date(this.today)) {
				this.showNotModels()
				return
			}
			this.changeFromDate(day.date)
		},
		getDays() {
			this.loading = true
			let model_name = this.model_name
			if (this.model_name_for_get_models) {
				model_name = this.model_name_for_get_models
			}
			let route = `previus-day/${this.routeString(model_name)}/${this.index}`

			let date_param = 'created_at'
			if (this.$store.state[this.model_name].date_param) {
				date_param = this.$store.state[this.model_name].date_param
			}
			route += '/'+date_param

			this.$api.get(route)
			.then(res => {
				this.loading = false
				let days = res.data.days
				if (days.length > 0) {
					this.days = days
				}
				this.centrar_dia_activo()
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		},
		showNotModels() {
			this.$toast.error('No se hicieron '+this.singular(this.model_name)+' en este dia')
		},
		getDaysBefore() {
			this.index++
			this.getDays()
		},
		getDaysNext() {
			this.index--
			this.getDays()
		},
		changeFromDate(date) {
			if (this.clear_selected) {
				this.$store.commit(this.model_name+'/setSelected', [])
			}
			if (typeof this.$store.state[this.model_name].filtered != 'undefined') {
				this.$store.commit(this.model_name+'/setFiltered', [])
				this.$store.commit(this.model_name+'/setIsFiltered', false)
			}
			this.$store.commit(this.model_name+'/setFromDate', date)
			if (this.has_until) {
				this.$store.commit(this.model_name+'/setUntilDate', '')
			}
			this.$store.dispatch(this.model_name+'/getModels')
		},
		/** Rango por click derecho. Sigue siendo de escritorio: en telefono el camino es el modal. */
		setLimitDate(date) {
			if (moment(date).isBefore(this.from_date)) {
				this.$store.commit(this.model_name+'/setUntilDate', this.from_date)
				this.$store.commit(this.model_name+'/setFromDate', date)
			} else {
				this.$store.commit(this.model_name+'/setUntilDate', date)
			}
			this.$store.dispatch(this.model_name+'/getModels')
		},
		quitarRango() {
			this.$store.commit(this.model_name+'/setUntilDate', '')
			this.$store.dispatch(this.model_name+'/getModels')
		},
		/**
		 * En telefono el carril de dias scrollea, asi que el dia activo puede quedar fuera de
		 * pantalla. Se lo centra al montar y cada vez que cambia la semana. El primer render va sin
		 * animacion, y despues se respeta prefers-reduced-motion.
		 */
		centrar_dia_activo() {
			this.$nextTick(() => {
				let activo = this.$refs.dia_activo
				if (!activo) {
					return
				}
				if (Array.isArray(activo)) {
					activo = activo[0]
				}
				if (!activo || typeof activo.scrollIntoView != 'function') {
					return
				}
				activo.scrollIntoView({ inline: 'center', block: 'nearest' })
			})
		},
	},
}
</script>
<style lang="sass">
// La pastilla usa los mismos valores que .display-nav en DisplayNav.vue: es el mismo objeto visual
// del sistema, no uno nuevo. El modo y el dia seleccionado van los dos en azul (decision de Lucas
// del 10/8/2026, se evaluo diferenciarlos y se eligio un solo color), asi que la jerarquia entre
// los dos la da el TAMAÑO: el item de modo respira 8px 12px y la celda de dia 3px 6px. No es
// cosmetico: es lo unico que evita que se lean como el mismo control.
.control-fecha
	display: inline-flex
	max-width: 100%
	min-width: 0

	.control-fecha__pastilla
		display: inline-flex
		align-items: center
		width: fit-content
		max-width: 100%
		min-width: 0
		gap: 0
		padding: 4px
		background-color: #E3E3E3
		border-radius: 8px

	.control-fecha__fila-principal
		display: inline-flex
		align-items: center
		min-width: 0

	// Separador de 1px: es lo que sostiene la lectura de "tres zonas, un objeto".
	.control-fecha__separador
		display: inline-block
		flex: 0 0 auto
		width: 1px
		height: 20px
		margin: 0 6px
		background-color: #C7C7C7

	.control-fecha__modo
		display: inline-flex
		gap: 6px
		min-width: 0

	.control-fecha__modo-item
		border: none
		border-radius: 6px
		padding: 8px 12px
		cursor: pointer
		font-size: 0.875rem
		font-weight: 500
		line-height: 1.25
		color: #6c757d
		background-color: transparent
		white-space: nowrap
		transition: color 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease

		&:hover:not(.active)
			color: #0d6efd
			background-color: #e7f1ff

		&.active
			color: #fff
			background-color: #0d6efd
			font-weight: 600
			box-shadow: 0 1px 2px rgba(13, 110, 253, 0.28)

	.control-fecha__dias
		display: inline-flex
		align-items: center
		min-width: 0
		gap: 2px

	.control-fecha__carril
		display: flex
		align-items: center
		gap: 2px
		min-width: 0
		overflow-x: auto
		// La barra de scroll se oculta: el carril se descubre arrastrando, y una barra gris debajo
		// de las celdas ensucia una pastilla de 40px de alto.
		scrollbar-width: none
		-webkit-overflow-scrolling: touch

		&::-webkit-scrollbar
			display: none

	// El nombre del dia y el mes van ADENTRO de la celda. Los chips absolutos que usaba
	// WeekDaysNav (position: absolute con bottom: 100% y top: 100%) obligaban a reservar ~20px
	// arriba y ~20px abajo, y eran la razon real del alto de la fila que esta mision elimina.
	.control-fecha__dia
		position: relative
		display: inline-flex
		flex-direction: column
		align-items: center
		justify-content: center
		flex: 0 0 auto
		border: none
		background: transparent
		border-radius: 6px
		padding: 3px 6px
		cursor: pointer
		color: #6c757d
		line-height: 1.1
		scroll-snap-align: center
		transition: color 0.12s ease, background-color 0.12s ease, box-shadow 0.12s ease

		&:hover:not(.active)
			color: #0d6efd
			background-color: #e7f1ff

		&.active
			color: #fff
			background-color: #0d6efd
			box-shadow: 0 1px 2px rgba(13, 110, 253, 0.28)

			.control-fecha__dia-numero
				color: #fff

	.control-fecha__dia--sin-movimientos
		opacity: .45
		text-decoration: line-through
		cursor: not-allowed

	.control-fecha__dia-nombre
		font-size: 9px
		text-transform: uppercase
		letter-spacing: 0.04em

	.control-fecha__dia-numero
		font-size: 0.8125rem
		font-weight: 600

	// El verde del mes se conserva del chip viejo, pero ahora aparece solo cuando el mes cambia.
	.control-fecha__mes
		position: absolute
		top: -2px
		right: -2px
		background: #38c172
		color: #fff
		font-size: 8px
		line-height: 1
		padding: 1px 3px
		border-radius: 3px

	.control-fecha__flecha,
	.control-fecha__calendario
		display: inline-flex
		align-items: center
		justify-content: center
		flex: 0 0 auto
		border: none
		background: transparent
		color: #6c757d
		cursor: pointer
		border-radius: 6px
		width: 28px
		height: 28px
		transition: color 0.12s ease, background-color 0.12s ease

		&:hover
			color: #0d6efd
			background-color: #e7f1ff

	.control-fecha__calendario
		background: #fff
		box-shadow: 0 1px 2px rgba(0, 0, 0, .10)

	.control-fecha__rango
		display: inline-flex
		align-items: center
		gap: 6px
		padding: 4px 8px
		border-radius: 6px
		background-color: #0d6efd
		color: #fff
		font-size: 0.8125rem
		font-weight: 600
		white-space: nowrap

	.control-fecha__rango-quitar
		display: inline-flex
		align-items: center
		justify-content: center
		border: none
		background: transparent
		color: #fff
		cursor: pointer
		padding: 0
		font-size: 0.7rem

// Telefono: la pastilla ocupa el ancho y se parte en dos filas ADENTRO del mismo contenedor gris
// (una sola pastilla, no dos). Nunca se oculta: el comentario del template de view/header/Index.vue
// es explicito con que la zona derecha se ve en todos los tamaños. Si no entra, se reacomoda.
@media screen and (max-width: 767px)
	.control-fecha
		width: 100%

		.control-fecha__pastilla
			width: 100%
			flex-direction: column
			align-items: stretch
			gap: 6px

		.control-fecha__fila-principal
			display: flex
			align-items: center
			gap: 6px

		.control-fecha__modo
			flex: 1 1 auto
			display: flex

		.control-fecha__modo-item
			flex: 1 1 50%
			text-align: center

		// El calendario queda pegado a la derecha de la primera fila; cuando el modulo no tiene
		// modo (Ventas), esa fila queda solo con el calendario, igual alineado a la derecha.
		.control-fecha__calendario
			margin-left: auto

		// Los separadores verticales no tienen sentido con las zonas apiladas.
		.control-fecha__separador--desktop
			display: none

		.control-fecha__dias
			display: flex
			width: 100%

		.control-fecha__carril
			flex: 1 1 auto
			scroll-snap-type: x proximity

		// Objetivos tactiles: los 34px de escritorio no se tocan con el pulgar.
		.control-fecha__dia
			min-width: 44px
			min-height: 40px

		.control-fecha__rango
			flex: 1 1 auto
			justify-content: center
</style>
