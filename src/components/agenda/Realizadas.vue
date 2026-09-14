<template>
	<div class="agenda-realizadas">

		<div class="agenda-realizadas__filtros">
			<b-form-input
			type="date"
			v-model="desde"
			class="agenda-realizadas__fecha"
			data-testid="agenda-realizadas-desde"></b-form-input>
			<span class="agenda-realizadas__hasta">a</span>
			<b-form-input
			type="date"
			v-model="hasta"
			class="agenda-realizadas__fecha"
			data-testid="agenda-realizadas-hasta"></b-form-input>
			<b-button
			class="btn-modulo"
			variant="primary"
			:disabled="loading"
			data-testid="agenda-realizadas-buscar"
			@click="buscar">
				Buscar
			</b-button>
		</div>

		<div
		v-if="loading"
		class="agenda__cargando">
			<b-spinner small></b-spinner>
		</div>

		<div
		v-else-if="!realizadas.length"
		class="agenda__vacio"
		data-testid="agenda-realizadas-vacio">
			<i class="bi bi-journal-check"></i>
			<p>No hay tareas realizadas en ese período.</p>
		</div>

		<div
		v-else
		class="agenda-grupo__filas">
			<div
			v-for="realizada in realizadas"
			:key="realizada.id"
			class="fila-realizada"
			:data-testid="'agenda-realizada-' + realizada.id">
				<span class="fila-realizada__check">
					<i class="bi bi-check-lg"></i>
				</span>
				<div class="fila-realizada__cuerpo">
					<div class="fila-realizada__detalle">
						{{ realizada.detalle }}
					</div>
					<div class="fila-realizada__secundaria">
						<span>hecha el {{ fecha_hora(realizada.fecha_realizada) }}</span>
						<span>programada para {{ fecha_programada(realizada) }}</span>
						<span
						v-if="realizada.expense_id"
						class="fila-realizada__chip"
						title="Gasto registrado al marcarla">
							<i class="bi bi-cash-coin"></i>
							Gasto{{ realizada.expense && realizada.expense.num ? ' N° ' + realizada.expense.num : '' }}
							<template v-if="monto_gasto(realizada)"> · {{ price(monto_gasto(realizada)) }}</template>
						</span>
						<span
						v-if="realizada.notas"
						class="fila-realizada__chip fila-realizada__chip--icono"
						:title="realizada.notas">
							<i class="bi bi-sticky"></i>
						</span>
					</div>
				</div>
				<b-button
				class="btn-modulo btn-modulo--fila"
				variant="outline-secondary"
				:disabled="deshaciendo_id == realizada.id"
				:data-testid="'agenda-deshacer-' + realizada.id"
				@click="deshacer(realizada)">
					Deshacer
				</b-button>
			</div>
		</div>

	</div>
</template>
<script>
/*
	Vista "Realizadas": lo que se marco como hecho en un rango (ultimos 30 dias por defecto), con
	el gasto que se registro si lo hubo, y el boton para deshacer.

	Deshacer borra la marca (DELETE pending-completed/{id}) y la tarea vuelve a pendiente; el
	gasto NO se borra --la API lo deja y lo informa--, y el confirm lo dice antes, porque es lo
	unico de esta pantalla que puede sorprender.
*/
import moment from 'moment'
import { FORMATO, fecha_corta } from '@/components/agenda/fechas_agenda'

export default {
	data() {
		let hoy = this.$store.state.agenda.hoy
		return {
			desde: moment(hoy, FORMATO).subtract(30, 'days').format(FORMATO),
			hasta: hoy,
			deshaciendo_id: null,
		}
	},
	computed: {
		loading() {
			return this.$store.state.agenda.loading_realizadas
		},
		/**
		 * Las mas recientes arriba. Se ordena aca y no se confia en el orden de la ruta, que es
		 * la vieja `from-date` (ordenaba por created_at).
		 *
		 * @returns {Array}
		 */
		realizadas() {
			return this.$store.state.agenda.realizadas.slice().sort((a, b) => {
				return String(b.fecha_realizada || '').localeCompare(String(a.fecha_realizada || ''))
			})
		},
	},
	created() {
		this.buscar()
	},
	methods: {
		buscar() {
			if (!this.desde || !this.hasta) {
				this.$toast.error('Elegí las dos fechas.')
				return
			}
			if (this.hasta < this.desde) {
				this.$toast.error('La fecha "hasta" no puede ser anterior a la "desde".')
				return
			}
			this.$store.dispatch('agenda/cargar_realizadas', { desde: this.desde, hasta: this.hasta })
		},
		/**
		 * "14/09/2026 15:32". `fecha_realizada` llega como 'YYYY-MM-DD HH:mm:ss' (timestamp de
		 * MySQL sin cast); se acepta tambien ISO por si el modelo lo castea en el futuro.
		 *
		 * @param {String} valor
		 * @returns {String}
		 */
		fecha_hora(valor) {
			if (!valor) {
				return '-'
			}
			let f = moment(valor, ['YYYY-MM-DD HH:mm:ss', moment.ISO_8601])
			return f.isValid() ? f.format('DD/MM/YYYY HH:mm') : '-'
		},
		/**
		 * @param {Object} realizada
		 * @returns {String} "lun 21 sep"
		 */
		fecha_programada(realizada) {
			let fecha = String(realizada.fecha_realizacion || '').substr(0, 10)
			if (!fecha) {
				return '-'
			}
			return fecha_corta(fecha, this.$store.state.agenda.hoy)
		},
		/**
		 * El monto del gasto: el del Expense cargado, o el que quedo guardado en el
		 * PendingCompleted (expense_amount) si el gasto no vino.
		 *
		 * @param {Object} realizada
		 * @returns {Number}
		 */
		monto_gasto(realizada) {
			if (realizada.expense && realizada.expense.amount) {
				return Number(realizada.expense.amount) || 0
			}
			return Number(realizada.expense_amount) || 0
		},
		deshacer(realizada) {
			let self = this
			let pregunta = realizada.expense_id
				? '¿Deshacer "' + realizada.detalle + '"? Vuelve a pendiente. El gasto que se registró queda cargado; si hace falta, se borra desde Gastos.'
				: '¿Deshacer "' + realizada.detalle + '"? Vuelve a pendiente.'

			this.$bvModal.msgBoxConfirm(pregunta, {
				title: 'Volver a pendiente',
				okTitle: 'Deshacer',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				if (!confirmado) {
					return
				}
				self.deshaciendo_id = realizada.id
				return self.$store.dispatch('agenda/deshacer', realizada.id)
				.then(res => {
					self.deshaciendo_id = null
					if (res && res.expense_id) {
						self.$toast.success('Volvió a pendiente. El gasto queda cargado en Gastos.')
					} else {
						self.$toast.success('Volvió a pendiente')
					}
					self.buscar()
				})
				.catch(mensaje => {
					self.deshaciendo_id = null
					self.$toast.error(mensaje)
				})
			})
		},
	},
}
</script>
<style lang="sass">
.agenda-realizadas
	&__filtros
		display: flex
		align-items: center
		gap: 10px
		flex-wrap: wrap
		margin-bottom: 16px

	&__fecha
		width: 170px
		flex: none

	&__hasta
		color: var(--color-text-secondary)

.fila-realizada
	display: flex
	align-items: center
	gap: 12px
	padding: 12px 14px
	border-bottom: 1px solid var(--color-border-secondary)
	&:last-child
		border-bottom: 0

	&__check
		flex: none
		width: 22px
		height: 22px
		border-radius: 50%
		background: var(--color-primary)
		// Glifo sobre el color de accion, no texto sobre superficie: blanco en los dos modos.
		color: #fff
		display: inline-flex
		align-items: center
		justify-content: center
		font-size: 0.9rem

	&__cuerpo
		flex: 1
		min-width: 0

	&__detalle
		color: var(--color-text-primary)
		font-size: 1rem
		overflow-wrap: anywhere

	&__secundaria
		display: flex
		flex-wrap: wrap
		align-items: center
		gap: 4px 10px
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
		&--icono
			padding: 1px 6px

@media (max-width: 575px)
	.agenda-realizadas
		&__fecha
			width: auto
			min-width: 0
			flex: 1
		.btn
			width: 100%
	.fila-realizada
		flex-wrap: wrap
		&__cuerpo
			flex: 1 1 calc(100% - 34px)
		.btn
			margin-left: 34px
</style>
