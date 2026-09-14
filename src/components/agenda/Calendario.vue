<template>
	<div class="agenda-calendario">

		<div class="agenda-calendario__barra">
			<div class="agenda-calendario__nav">
				<button
				type="button"
				class="agenda-calendario__flecha"
				title="Mes anterior"
				aria-label="Mes anterior"
				data-testid="agenda-mes-anterior"
				@click="mover(-1)">
					<i class="bi bi-chevron-left"></i>
				</button>
				<h5
				class="agenda-calendario__mes"
				data-testid="agenda-mes-visible">
					{{ etiqueta }}
				</h5>
				<button
				type="button"
				class="agenda-calendario__flecha"
				title="Mes siguiente"
				aria-label="Mes siguiente"
				data-testid="agenda-mes-siguiente"
				@click="mover(1)">
					<i class="bi bi-chevron-right"></i>
				</button>
			</div>
			<b-button
			class="btn-modulo"
			variant="outline-secondary"
			data-testid="agenda-hoy"
			@click="mover(0)">
				Hoy
			</b-button>
		</div>

		<div
		class="agenda-calendario__grilla-wrapper"
		:class="{ 'agenda-calendario__grilla-wrapper--cargando': loading }">
			<div class="agenda-calendario__cabecera">
				<span
				v-for="nombre in cabecera"
				:key="nombre">
					{{ nombre }}
				</span>
			</div>
			<div
			class="agenda-calendario__grilla"
			data-testid="agenda-grilla">
				<dia-calendario
				v-for="dia in dias"
				:key="dia.fecha"
				:dia="dia"
				:seleccionado="dia.fecha == dia_seleccionado"
				:max_chips="max_chips"
				@seleccionar="seleccionar"
				@abrir="abrir_edicion"></dia-calendario>
			</div>
		</div>

		<!-- El dia elegido, con sus filas completas, para completar o editar desde aca. -->
		<section
		v-if="dia_seleccionado"
		class="agenda-calendario__dia"
		data-testid="agenda-dia-seleccionado">
			<header class="agenda-calendario__dia-cabecera">
				<h6 class="agenda-calendario__dia-titulo">
					{{ titulo_del_dia }}
				</h6>
				<button
				type="button"
				class="agenda-calendario__dia-nueva"
				data-testid="agenda-nueva-tarea-dia"
				@click="abrir_nueva_tarea(dia_seleccionado)">
					<i class="bi bi-plus-lg"></i>
					Nueva tarea este día
				</button>
			</header>
			<div
			v-if="ocurrencias_del_dia.length"
			class="agenda-grupo__filas">
				<fila-tarea
				v-for="ocurrencia in ocurrencias_del_dia"
				:key="ocurrencia.key"
				:ocurrencia="ocurrencia"
				@completar="marcar_hecha"
				@deshacer="deshacer_ocurrencia"
				@editar="abrir_edicion"></fila-tarea>
			</div>
			<p
			v-else
			class="agenda-calendario__dia-vacio">
				Nada agendado para este día.
			</p>
		</section>

	</div>
</template>
<script>
/*
	Vista "Calendario": grilla mensual lunes -> domingo con las ocurrencias de cada dia como chips
	(o puntos, en telefono), y abajo el dia seleccionado con sus filas completas.

	La grilla se dibuja con el rango que el store pidio a la API (rango_grilla_mes, la misma
	funcion en los dos lados), asi que cada celda tiene exactamente las ocurrencias que llegaron
	para esa fecha, incluidos los dias grises de los meses vecinos.
*/
import acciones_agenda from '@/components/agenda/acciones_agenda'
import { CABECERA_SEMANA, etiqueta_mes, fecha_larga, parsear, rango_grilla_mes } from '@/components/agenda/fechas_agenda'

export default {
	mixins: [acciones_agenda],
	components: {
		DiaCalendario: () => import('@/components/agenda/DiaCalendario'),
		FilaTarea: () => import('@/components/agenda/FilaTarea'),
	},
	data() {
		return {
			cabecera: CABECERA_SEMANA,
			/*
			 * Cuantos chips entran en una celda antes del "+N más". Depende del ancho real de la
			 * ventana y se mide en vivo (resize), para que el "+N" diga la verdad tambien en tablet,
			 * donde las celdas son mas angostas. En telefono los chips se cambian por puntos (CSS).
			 */
			max_chips: 3,
		}
	},
	computed: {
		loading() {
			return this.$store.state.agenda.loading
		},
		hoy() {
			return this.$store.state.agenda.hoy
		},
		mes_visible() {
			return this.$store.state.agenda.mes_visible
		},
		dia_seleccionado() {
			return this.$store.state.agenda.dia_seleccionado
		},
		etiqueta() {
			return etiqueta_mes(this.mes_visible)
		},
		/**
		 * Ocurrencias del rango indexadas por fecha. Vencidas no se suman: las de este mes ya
		 * vienen dentro de `ocurrencias` (con `vencida: true`), y las de meses anteriores se ven
		 * navegando a ese mes.
		 *
		 * @returns {Object} { 'YYYY-MM-DD': [ocurrencia, ...] }
		 */
		por_fecha() {
			let mapa = {}
			this.$store.state.agenda.ocurrencias.forEach(o => {
				if (!mapa[o.fecha]) {
					mapa[o.fecha] = []
				}
				mapa[o.fecha].push(o)
			})
			return mapa
		},
		/**
		 * Las celdas de la grilla (35 o 42), del lunes de la primera semana al domingo de la
		 * ultima.
		 *
		 * @returns {Array}
		 */
		dias() {
			let rango = rango_grilla_mes(this.mes_visible)
			let cursor = parsear(rango.desde)
			let fin = parsear(rango.hasta)
			let dias = []
			while (!cursor.isAfter(fin)) {
				let fecha = cursor.format('YYYY-MM-DD')
				dias.push({
					fecha: fecha,
					numero: cursor.date(),
					es_hoy: fecha == this.hoy,
					es_otro_mes: cursor.format('YYYY-MM') != this.mes_visible,
					ocurrencias: this.por_fecha[fecha] ? this.por_fecha[fecha] : [],
				})
				cursor.add(1, 'days')
			}
			return dias
		},
		ocurrencias_del_dia() {
			if (!this.dia_seleccionado) {
				return []
			}
			return this.por_fecha[this.dia_seleccionado] ? this.por_fecha[this.dia_seleccionado] : []
		},
		titulo_del_dia() {
			let texto = fecha_larga(this.dia_seleccionado)
			if (this.dia_seleccionado == this.hoy) {
				texto = 'Hoy, ' + texto
			}
			return texto
		},
	},
	created() {
		// Al entrar, el dia de hoy ya esta elegido: la lista de abajo arranca con algo que leer.
		if (!this.dia_seleccionado) {
			this.$store.commit('agenda/setDiaSeleccionado', this.hoy)
		}
	},
	mounted() {
		this.medir_chips()
		window.addEventListener('resize', this.medir_chips)
	},
	beforeDestroy() {
		window.removeEventListener('resize', this.medir_chips)
	},
	methods: {
		/**
		 * Tres chips por celda en escritorio, dos en tablet (celdas de ~100px, donde el tercero ya
		 * no se lee). En telefono el numero no importa: CSS esconde los chips y muestra puntos.
		 */
		medir_chips() {
			this.max_chips = window.innerWidth <= 1024 ? 2 : 3
		},
		/**
		 * @param {Number} delta -1 anterior, 1 siguiente, 0 volver a hoy
		 */
		mover(delta) {
			this.$store.dispatch('agenda/mover_mes', delta)
		},
		/**
		 * Clic en una celda. Un dia gris de otro mes tambien se puede elegir: sus ocurrencias ya
		 * estan cargadas porque el rango pedido cubre la grilla entera.
		 *
		 * @param {String} fecha YYYY-MM-DD
		 */
		seleccionar(fecha) {
			this.$store.commit('agenda/setDiaSeleccionado', fecha)
		},
	},
}
</script>
<style lang="sass">
.agenda-calendario
	&__barra
		display: flex
		align-items: center
		justify-content: space-between
		gap: 12px
		margin-bottom: 12px

	&__nav
		display: flex
		align-items: center
		gap: 4px

	&__mes
		margin: 0
		min-width: 190px
		text-align: center
		font-weight: 600
		letter-spacing: -0.01em
		color: var(--color-text-primary)

	&__flecha
		width: 34px
		height: 34px
		border-radius: 50%
		border: 0
		background: transparent
		color: var(--color-text-secondary)
		display: inline-flex
		align-items: center
		justify-content: center
		cursor: pointer
		transition: background 0.15s ease, color 0.15s ease
		&:hover
			background: var(--bg-hover)
			color: var(--color-text-primary)
		&:focus
			outline: none
		&:focus-visible
			box-shadow: 0 0 0 2px var(--color-primary)

	&__grilla-wrapper
		background: var(--bg-card)
		border: 1px solid var(--color-border)
		border-radius: 12px
		overflow: hidden
		box-shadow: 0 2px 8px var(--shadow-color)
		transition: opacity 0.15s ease
		&--cargando
			opacity: 0.6

	// 🔴 minmax(0, 1fr) y no 1fr a secas: con 1fr una celda con un chip largo se ensancha y la
	// grilla se pasa del ancho del contenedor (scroll horizontal). Con el minimo en 0 las siete
	// columnas reparten el ancho que hay y el texto se trunca adentro de la celda.
	&__cabecera, &__grilla
		display: grid
		grid-template-columns: repeat(7, minmax(0, 1fr))

	&__cabecera
		background: var(--bg-section)
		border-bottom: 1px solid var(--color-border-secondary)
		span
			padding: 8px 0
			text-align: center
			font-size: 0.75rem
			font-weight: 600
			text-transform: uppercase
			letter-spacing: 0.05em
			color: var(--color-text-secondary)

	&__dia
		margin-top: 24px

	&__dia-cabecera
		display: flex
		align-items: center
		justify-content: space-between
		gap: 8px
		flex-wrap: wrap
		margin: 0 4px 8px

	&__dia-titulo
		margin: 0
		font-size: 0.95rem
		font-weight: 600
		color: var(--color-text-primary)
		&::first-letter
			text-transform: uppercase

	&__dia-nueva
		border: 0
		background: transparent
		color: var(--color-primary)
		font-size: 0.85rem
		font-weight: 500
		padding: 4px 8px
		border-radius: 8px
		cursor: pointer
		&:hover
			background: var(--bg-hover)

	&__dia-vacio
		margin: 0 4px
		font-size: 0.9rem
		color: var(--color-text-secondary)

@media (max-width: 575px)
	.agenda-calendario
		&__mes
			min-width: 0
			font-size: 1.05rem
</style>
