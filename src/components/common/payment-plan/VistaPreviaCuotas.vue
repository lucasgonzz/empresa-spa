<template>
	<!--
		Vista previa de las cuotas del plan: número, vencimiento, importe y una nota por cuota.
		Las notas se editan acá y suben al modal con el evento `nota`; importes y fechas son de solo
		lectura (los recalcula el back al guardar con el mismo algoritmo, ver cuotas_del_plan.js).

		Es una grilla CSS y no una <table>: en teléfono cada cuota pasa a dos renglones (los datos
		arriba, la nota abajo a lo ancho) sin scroll horizontal.
	-->
	<div class="plan-vista-previa">

		<div
		v-if="!cuotas.length"
		class="plan-vista-previa__vacia"
		data-testid="plan-vista-previa-vacia">
			<i class="bi bi-calendar3"></i>
			<span>{{ problema || 'Completá los datos del plan para ver las cuotas.' }}</span>
		</div>

		<template v-else>
			<div class="plan-vista-previa__fila plan-vista-previa__fila--cabecera">
				<span>N°</span>
				<span>Vencimiento</span>
				<span class="plan-vista-previa__importe">Importe</span>
				<span class="plan-vista-previa__nota">Nota</span>
			</div>

			<div
			class="plan-vista-previa__cuerpo"
			data-testid="plan-vista-previa">
				<div
				v-for="cuota in cuotas"
				:key="cuota.numero_cuota"
				class="plan-vista-previa__fila"
				data-testid="plan-cuota">
					<span class="plan-vista-previa__numero">{{ cuota.numero_cuota }}</span>
					<span class="plan-vista-previa__fecha">{{ fecha_legible(cuota.fecha_vencimiento) }}</span>
					<span class="plan-vista-previa__importe">{{ formatear(cuota.amount) }}</span>
					<b-form-input
					class="plan-vista-previa__nota"
					size="sm"
					:value="cuota.notes"
					placeholder="Nota (opcional)"
					:data-testid="'plan-nota-cuota-' + cuota.numero_cuota"
					@input="cambiar_nota(cuota.numero_cuota, $event)"></b-form-input>
				</div>
			</div>

			<div
			class="plan-vista-previa__fila plan-vista-previa__fila--total"
			data-testid="plan-total-cuotas">
				<span></span>
				<span>Total</span>
				<span class="plan-vista-previa__importe">{{ formatear(total) }}</span>
				<span class="plan-vista-previa__nota"></span>
			</div>
		</template>
	</div>
</template>
<script>
import moment from 'moment'
import { FORMATO, con_moneda } from '@/components/common/payment-plan/cuotas_del_plan'

/* Días de la semana en castellano: la app no registra el locale 'es' de moment. */
const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export default {
	props: {
		/* [{numero_cuota, fecha_vencimiento, amount, notes}] */
		cuotas: Array,
		/* 1 pesos, 2 dólares. */
		moneda_id: Number,
		/* Por qué no hay cuotas para mostrar, o null. */
		problema: String,
	},
	computed: {
		/* Suma de las cuotas: tiene que dar exacto el importe a financiar. */
		total() {
			let centavos = 0
			this.cuotas.forEach(cuota => {
				centavos += Math.round(cuota.amount * 100)
			})
			return centavos / 100
		},
	},
	methods: {
		/**
		 * "lun 10/11/2026": con el día de la semana se ve de un vistazo si una cuota cae en domingo.
		 *
		 * @param {String} fecha YYYY-MM-DD
		 * @returns {String}
		 */
		fecha_legible(fecha) {
			let m = moment(fecha, FORMATO)
			return DIAS[m.day()] + ' ' + m.format('DD/MM/YYYY')
		},
		formatear(importe) {
			return con_moneda(this.price(Number(importe)), this.moneda_id)
		},
		cambiar_nota(numero_cuota, texto) {
			this.$emit('nota', { numero_cuota: numero_cuota, notes: texto })
		},
	},
}
</script>
<style lang="sass">
.plan-vista-previa
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 10px
	overflow: hidden
	background: var(--bg-card, #fff)

	&__vacia
		display: flex
		align-items: center
		justify-content: center
		gap: 8px
		padding: 24px 16px
		font-size: 0.88rem
		color: var(--color-text-secondary, #6c757d)
		text-align: center

	// Con muchas cuotas la lista scrollea sola y la cabecera y el total quedan a la vista.
	&__cuerpo
		max-height: 320px
		overflow-y: auto

	&__fila
		display: grid
		grid-template-columns: 44px 150px 150px minmax(0, 1fr)
		align-items: center
		column-gap: 12px
		padding: 8px 14px
		border-top: 1px solid var(--color-border-secondary, #e9ecef)
		font-size: 0.88rem
		color: var(--color-text-primary, #212529)

		&:first-child
			border-top: 0

		&--cabecera
			border-top: 0
			background: var(--bg-section, #f8f9fa)
			font-size: 0.75rem
			font-weight: 600
			letter-spacing: 0.03em
			text-transform: uppercase
			color: var(--color-text-secondary, #6c757d)

		&--total
			background: var(--bg-section, #f8f9fa)
			font-weight: 600

	&__numero
		display: inline-flex
		align-items: center
		justify-content: center
		width: 28px
		height: 28px
		border-radius: 50%
		background: var(--bg-section, #f1f3f5)
		font-weight: 600
		font-size: 0.8rem

	&__fecha
		white-space: nowrap

	// _inputs.sass pone todos los input.form-control en 1.4rem: en una lista de 12 cuotas eso es
	// una pared de cajas. La nota de cada cuota va compacta, del tamaño del texto de la fila.
	input.form-control.plan-vista-previa__nota
		font-size: 0.88rem
		height: 32px
		padding: 4px 10px

	&__importe
		text-align: right
		font-variant-numeric: tabular-nums
		white-space: nowrap

	// Tablet: la columna de fecha y la de importe se achican.
	@media screen and (max-width: 768px)
		&__fila
			grid-template-columns: 36px 130px 120px minmax(0, 1fr)
			column-gap: 8px
			padding: 8px 10px

	// Teléfono: número, fecha e importe en un renglón y la nota abajo a lo ancho.
	@media screen and (max-width: 576px)
		&__fila
			grid-template-columns: 32px minmax(0, 1fr) auto
			row-gap: 6px

			.plan-vista-previa__nota
				grid-column: 1 / -1

			&--cabecera,
			&--total
				.plan-vista-previa__nota
					display: none
</style>
