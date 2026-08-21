<template>
<div
v-if="from_credit_account"
class="saldo-y-limite">
	<span class="saldo-y-limite__item">
		Saldo actual: <b>{{ price(from_credit_account.saldo) }}</b>
	</span>

	<template v-if="tiene_limite">
		<span class="saldo-y-limite__item">
			Límite de crédito: <b>{{ price(from_credit_account.limite_credito) }}</b>
		</span>
		<span
		class="saldo-y-limite__item"
		:class="{ 'saldo-y-limite__item--rojo': disponible <= 0 }">
			Disponible: <b>{{ price(disponible) }}</b>
		</span>
	</template>
</div>
</template>
<script>
import current_acounts from '@/mixins/current_acounts'

export default {
	mixins: [current_acounts],
	computed: {
		tiene_limite() {
			return this.from_credit_account
				&& this.from_credit_account.limite_credito !== null
				&& typeof this.from_credit_account.limite_credito != 'undefined'
		},
		disponible() {
			return this.from_credit_account.limite_credito - this.from_credit_account.saldo
		},
	},
}
</script>
<style scoped lang="sass">
// Franja de una sola linea: este modal lo montan doce vistas (clientes, proveedores, ventas,
// presupuestos, alertas, rutas, listado, por-entregar, por-estado, vender...), asi que tiene que
// leerse como continuacion de la barra de arriba y no como un bloque nuevo. Tokens de color,
// nunca hexadecimales: el modal cuelga de body, fuera de #app, y un hex rompe modo oscuro.
.saldo-y-limite
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 16px
	padding: 10px 20px
	background: var(--bg-card)
	border-bottom: 1px solid var(--color-border)
	font-size: 0.875rem
	color: var(--color-text-primary)

	&__item
		color: var(--color-text-secondary)

		b
			color: var(--color-text-primary)

		&--rojo b
			color: var(--btn-peligro-texto)
</style>
