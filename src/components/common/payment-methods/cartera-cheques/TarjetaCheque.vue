<template>
	<div
	class="tarjeta-cheque"
	role="button"
	tabindex="0"
	:data-testid="'tarjeta-cheque-'+cheque.id"
	@click="$emit('elegir')"
	@keydown.enter.prevent="$emit('elegir')"
	@keydown.space.prevent="$emit('elegir')">

		<div class="tarjeta-cheque__fila-superior">
			<span class="tarjeta-cheque__banco">{{ banco_texto }}</span>

			<span class="tarjeta-cheque__fila-superior-derecha">
				<span
				v-if="cheque.es_echeq"
				class="tarjeta-cheque__echeq">
					e-cheque
				</span>
				<span class="tarjeta-cheque__numero">N° {{ cheque.numero || 's/n' }}</span>
			</span>
		</div>

		<div class="tarjeta-cheque__monto">{{ price(cheque.amount) }}</div>

		<div class="tarjeta-cheque__linea"></div>

		<div class="tarjeta-cheque__fila-inferior">
			<span class="tarjeta-cheque__cliente">{{ cliente_texto }}</span>
			<span
			v-if="cheque.fecha_pago"
			class="tarjeta-cheque__fecha">
				Cobra el {{ fecha_pago_texto }}
			</span>
		</div>
	</div>
</template>
<script>
import moment from 'moment'

/**
 * Una tarjeta de solo lectura con el diseño visual de un cheque físico (misión
 * cartera-cheques-modal, 22/9/2026): banco y número arriba, el monto destacado en el medio, y
 * cliente + fecha de pago abajo, separados por una línea que evoca la firma del cheque real sin
 * caer en skeuomorfismo (referencia Apple del contexto master: pocos elementos, bien resueltos).
 *
 * Presentacional puro: no pide nada a la API ni escribe en ningún store. `cheque_banco_texto` y
 * `price` son mixins globales (Vue.mixin en main.js), ya usados con el mismo criterio en
 * CheckInfo.vue.
 */
export default {
	props: {
		cheque: {
			type: Object,
			required: true,
		},
	},
	computed: {
		banco_texto() {
			return this.cheque_banco_texto(this.cheque) || 'Sin banco'
		},
		cliente_texto() {
			return (this.cheque.client && this.cheque.client.name) || 'Sin cliente'
		},
		fecha_pago_texto() {
			let m = moment(this.cheque.fecha_pago)
			return m.isValid() ? m.format('DD/MM/YYYY') : ''
		},
	},
}
</script>
<style lang="sass" scoped>
.tarjeta-cheque
	display: flex
	flex-direction: column
	gap: 10px
	padding: 16px
	// Proporción apaisada, como un cheque real, sin forzar una altura fija: el contenido manda.
	min-height: 120px
	background: var(--bg-card)
	border: 1px solid var(--color-border)
	border-radius: 12px
	cursor: pointer
	transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease

	&:hover,
	&:focus
		border-color: var(--color-primary)
		box-shadow: 0 4px 16px var(--shadow-color)
		outline: none
		transform: translateY(-1px)

	&__fila-superior
		display: flex
		align-items: baseline
		justify-content: space-between
		gap: 10px

	&__banco
		font-weight: 600
		color: var(--color-text-primary)
		font-size: .95rem
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap
		min-width: 0

	&__fila-superior-derecha
		flex-shrink: 0
		display: flex
		align-items: center
		gap: 8px

	&__numero
		color: var(--color-text-secondary)
		font-size: .8rem

	&__monto
		font-size: 1.5rem
		font-weight: 700
		color: var(--color-text-primary)

	// La "línea de firma": evoca un cheque real sin dibujar uno.
	&__linea
		border-top: 1px dashed var(--color-border)

	&__fila-inferior
		display: flex
		align-items: baseline
		justify-content: space-between
		gap: 10px
		font-size: .8rem
		color: var(--color-text-secondary)

	&__cliente
		overflow: hidden
		text-overflow: ellipsis
		white-space: nowrap

	&__fecha
		flex-shrink: 0

	&__echeq
		padding: 2px 8px
		border-radius: 999px
		background: var(--bg-section)
		color: var(--color-text-secondary)
		font-size: .7rem
		font-weight: 600
		text-transform: uppercase
		letter-spacing: .03em
		white-space: nowrap

</style>
