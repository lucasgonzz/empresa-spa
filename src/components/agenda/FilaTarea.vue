<template>
	<div
	class="fila-tarea"
	:class="{
		'fila-tarea--vencida': ocurrencia.vencida && !ocurrencia.completado,
		'fila-tarea--hecha': ocurrencia.completado,
	}"
	:data-testid="'agenda-fila-' + ocurrencia.key"
	@click="$emit('editar', ocurrencia)">

		<!--
			El circulo es un boton aparte de la fila: la fila abre el form, el circulo completa.
			Es la misma division que Recordatorios de Apple, y el .stop evita que un clic en el
			circulo abra ademas la edicion.
		-->
		<button
		type="button"
		class="fila-tarea__check"
		:data-testid="'agenda-completar-' + ocurrencia.key"
		:title="titulo_check"
		:aria-label="titulo_check"
		@click.stop="click_check">
			<i
			v-if="ocurrencia.completado"
			class="bi bi-check-lg"></i>
		</button>

		<div class="fila-tarea__cuerpo">
			<div class="fila-tarea__detalle">
				{{ ocurrencia.detalle }}
			</div>
			<div class="fila-tarea__secundaria">
				<span class="fila-tarea__fecha">
					{{ texto_fecha }}
				</span>
				<span
				v-if="ocurrencia.es_recurrente"
				class="fila-tarea__chip"
				title="Tarea recurrente">
					<i class="bi bi-arrow-repeat"></i>
					{{ texto_recurrencia }}
				</span>
				<span
				v-if="ocurrencia.expense_concept_id"
				class="fila-tarea__chip fila-tarea__chip--gasto"
				title="Gasto asociado">
					<i class="bi bi-cash-coin"></i>
					{{ nombre_concepto }}<template v-if="monto"> · {{ price(monto) }}</template>
				</span>
				<span
				v-if="ocurrencia.notas"
				class="fila-tarea__chip fila-tarea__chip--icono"
				:title="ocurrencia.notas">
					<i class="bi bi-sticky"></i>
				</span>
			</div>
		</div>

		<i class="bi bi-chevron-right fila-tarea__flecha"></i>
	</div>
</template>
<script>
/*
	Una ocurrencia de la agenda (forma "Ocurrencia" de la seccion 2 del plan). La monta la lista
	agrupada y el dia seleccionado del calendario; no decide nada: emite `completar`, `deshacer` y
	`editar`, y el padre (con el mixin acciones_agenda) hace el resto.
*/
import { fecha_corta, fecha_relativa, texto_recurrencia as texto_de_recurrencia } from '@/components/agenda/fechas_agenda'

export default {
	props: {
		ocurrencia: {
			type: Object,
			required: true,
		},
	},
	computed: {
		hoy() {
			return this.$store.state.agenda.hoy
		},
		/**
		 * "hoy", "mañana", "vence hace 3 días", "lun 21 sep". Vencida/hoy se deciden con el `hoy`
		 * de la API, no con el reloj del navegador. Una fila ya hecha no "vence": muestra la fecha
		 * a secas.
		 *
		 * @returns {String}
		 */
		texto_fecha() {
			if (this.ocurrencia.completado) {
				return 'hecha · ' + fecha_corta(this.ocurrencia.fecha, this.hoy)
			}
			return fecha_relativa(this.ocurrencia.fecha, this.hoy)
		},
		/**
		 * "cada mes" / "cada 2 semanas". El slug viene con la ocurrencia; si no, se busca en el
		 * catalogo de unidades del store por id.
		 *
		 * @returns {String}
		 */
		texto_recurrencia() {
			let slug = this.ocurrencia.unidad_frecuencia ? this.ocurrencia.unidad_frecuencia.slug : null
			if (!slug && this.ocurrencia.unidad_frecuencia_id) {
				let unidad = this.$store.state.unidad_frecuencia.models.find(u => {
					return Number(u.id) === Number(this.ocurrencia.unidad_frecuencia_id)
				})
				if (unidad) {
					slug = unidad.slug
				}
			}
			return texto_de_recurrencia(slug, this.ocurrencia.cantidad_frecuencia)
		},
		nombre_concepto() {
			if (this.ocurrencia.expense_concept && this.ocurrencia.expense_concept.name) {
				return this.ocurrencia.expense_concept.name
			}
			let concepto = this.$store.state.expense_concept.models.find(c => {
				return Number(c.id) === Number(this.ocurrencia.expense_concept_id)
			})
			return concepto ? concepto.name : 'Gasto'
		},
		monto() {
			return Number(this.ocurrencia.expense_amount) || 0
		},
		titulo_check() {
			if (this.ocurrencia.completado) {
				return 'Hecha. Clic para volver a pendiente'
			}
			if (this.ocurrencia.expense_concept_id) {
				return 'Marcar como hecha y registrar el gasto'
			}
			return 'Marcar como hecha'
		},
	},
	methods: {
		/**
		 * Una fila ya hecha vuelve a pendiente con el mismo circulo (pasa en el dia del
		 * calendario, que muestra las hechas). Una pendiente se completa.
		 */
		click_check() {
			if (this.ocurrencia.completado) {
				this.$emit('deshacer', this.ocurrencia)
				return
			}
			this.$emit('completar', this.ocurrencia)
		},
	},
}
</script>
<style lang="sass">
.fila-tarea
	display: flex
	align-items: flex-start
	gap: 12px
	padding: 12px 14px
	cursor: pointer
	border-bottom: 1px solid var(--color-border-secondary)
	transition: background 0.12s ease
	&:last-child
		border-bottom: 0
	&:hover
		background: var(--bg-hover)
		.fila-tarea__check
			border-color: var(--color-primary)
		.fila-tarea__flecha
			opacity: 1

	&__check
		flex: none
		width: 22px
		height: 22px
		margin-top: 2px
		border-radius: 50%
		border: 2px solid var(--color-border)
		background: transparent
		color: transparent
		padding: 0
		display: inline-flex
		align-items: center
		justify-content: center
		font-size: 0.9rem
		line-height: 1
		cursor: pointer
		transition: background 0.15s ease, border-color 0.15s ease
		&:focus
			outline: none
		&:focus-visible
			box-shadow: 0 0 0 3px var(--bg-nav-hover)

	&__cuerpo
		flex: 1
		min-width: 0

	&__detalle
		color: var(--color-text-primary)
		font-size: 1rem
		line-height: 1.35
		overflow-wrap: anywhere

	&__secundaria
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 6px 10px
		margin-top: 3px
		font-size: 0.8rem
		color: var(--color-text-secondary)

	&__chip
		display: inline-flex
		align-items: center
		gap: 4px
		padding: 1px 8px
		border-radius: 999px
		background: var(--bg-section)
		border: 1px solid var(--color-border-secondary)
		white-space: nowrap
		max-width: 100%
		overflow: hidden
		text-overflow: ellipsis
		&--icono
			padding: 1px 6px
		i
			font-size: 0.8rem

	&__flecha
		flex: none
		align-self: center
		color: var(--color-text-secondary)
		opacity: 0.35
		font-size: 0.85rem

	// Vencida: solo la fecha se pone en rojo suave. Pintar la fila entera gritaria de mas.
	&--vencida
		.fila-tarea__fecha
			color: var(--btn-peligro-texto)
			font-weight: 600

	// Hecha: circulo lleno con el acento y detalle tachado.
	&--hecha
		.fila-tarea__check
			background: var(--color-primary)
			border-color: var(--color-primary)
			// El tilde va blanco sobre el acento en los dos modos: es un glifo sobre color, no texto sobre superficie.
			color: #fff
		.fila-tarea__detalle
			text-decoration: line-through
			color: var(--color-text-secondary)

@media (max-width: 575px)
	.fila-tarea
		padding: 11px 12px
		&__flecha
			display: none
</style>
