<template>
	<!--
		Botón de acción para abrir el modal de movimientos entre cajas.
		Estilo chip alineado con los totales de la barra horizontal.
	-->
	<button
	type="button"
	class="caja-movimiento-btn"
	@click="show">
		<div class="caja-movimiento-btn__icon-wrap">
			<i
			class="bi bi-arrow-left-right"
			aria-hidden="true"></i>
		</div>
		<div class="caja-movimiento-btn__body">
			<span class="caja-movimiento-btn__label">Transferencia</span>
			<span class="caja-movimiento-btn__value">Entre cajas</span>
		</div>
	</button>
</template>
<script>
export default {
	methods: {
		/**
		 * Abre el modal de movimientos entre cajas.
		 *
		 * @returns {void}
		 */
		show() {
			this.$bvModal.show('movimientos-entre-cajas')
		},
	},
}
</script>
<style scoped lang="sass">
@import '@/sass/_custom.scss'

// Acento de acción (distinto a los chips de totales por moneda)
$accent-action: #6366f1

.caja-movimiento-btn
	display: flex
	align-items: center
	gap: 10px
	padding: 8px 12px
	border-radius: 10px
	border: 1px solid #e2e8f0
	background: #fff
	box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06)
	transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background-color 0.2s ease
	min-width: 0
	cursor: pointer
	text-align: left

	&:hover
		transform: translateY(-1px)
		box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08)
		border-color: rgba($accent-action, 0.35)
		background: rgba($accent-action, 0.03)

	&:focus
		outline: none
		box-shadow: 0 0 0 3px rgba($accent-action, 0.2), 0 1px 3px rgba(15, 23, 42, 0.06)

	&:active
		transform: translateY(0)
		box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08)

	&__icon-wrap
		flex-shrink: 0
		width: 34px
		height: 34px
		border-radius: 8px
		display: flex
		align-items: center
		justify-content: center
		background: rgba($accent-action, 0.12)
		color: $accent-action

		i
			font-size: 1rem
			line-height: 1

	&__body
		display: flex
		flex-direction: column
		min-width: 0
		gap: 1px

	&__label
		font-size: 0.68rem
		font-weight: 600
		color: #64748b
		text-transform: uppercase
		letter-spacing: 0.04em
		line-height: 1.2
		white-space: nowrap

	&__value
		font-size: 0.92rem
		font-weight: 700
		line-height: 1.2
		color: darken($accent-action, 8%)
		white-space: nowrap

	@media screen and (max-width: 576px)
		margin-left: 0
		width: 100%

		&__value
			font-size: 0.88rem
</style>
