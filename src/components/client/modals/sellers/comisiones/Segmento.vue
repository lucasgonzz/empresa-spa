<template>
	<!--
		Botonera tipo segmento del modal de comisiones. La usan el selector Pesos/Dólares y el
		filtro Todos/Comisiones/Pagos de la tabla de liquidadas, así los dos se ven igual.
	-->
	<div
	class="comision-segmento"
	role="group">
		<button
		v-for="opcion in opciones"
		:key="'segmento-'+opcion.value"
		type="button"
		class="comision-segmento__btn"
		:class="{ 'comision-segmento__btn--activo': opcion.value == value }"
		:aria-pressed="opcion.value == value ? 'true' : 'false'"
		@click="elegir(opcion.value)">
			{{ opcion.label }}
		</button>
	</div>
</template>
<script>
export default {
	props: {
		// Lista de opciones: [{ value, label }].
		opciones: {
			type: Array,
			required: true,
		},
		// Valor elegido (se usa con v-model).
		value: {
			default: null,
		},
	},
	methods: {
		// Emite el valor nuevo solo si cambió, para no disparar un pedido de más.
		elegir(valor) {
			if (valor == this.value) {
				return
			}
			this.$emit('input', valor)
		},
	},
}
</script>
<style scoped lang="sass">
.comision-segmento
	display: inline-flex
	flex-wrap: wrap
	gap: 4px
	background: var(--bg-hover)
	padding: 4px
	border-radius: 10px
	max-width: 100%

	&__btn
		border: none
		background: none
		padding: 6px 14px
		border-radius: 8px
		font-size: 0.82rem
		font-weight: 600
		color: var(--color-text-secondary)
		cursor: pointer
		white-space: nowrap

		&--activo
			background: var(--bg-card)
			color: var(--color-text-primary)
			box-shadow: 0 1px 3px var(--shadow-color)
</style>
