<template>
	<!--
		Pastilla fija del pedido de OK de actualización (misión aviso-actualizacion-sistema, 25/11/2026):
		esta computadora ya aceptó y sigue trabajando mientras las demás confirman. No tapa nada que se
		pueda tocar: es chica, abajo a la izquierda (encima del aviso de "Sin conexión") y deja pasar los
		clics (pointer-events: none), así no cubre botones como el de cobrar de Vender.
	-->
	<div
		v-if="visible"
		class="actualizacion-faltan"
		role="status"
		aria-live="polite"
		data-testid="actualizacion-faltan"
	>
		<span class="actualizacion-faltan__punto" aria-hidden="true"></span>
		<span class="actualizacion-faltan__texto">
			<strong>Aceptaste.</strong>
			<span data-testid="actualizacion-faltan-texto">{{ texto }}</span>
		</span>
	</div>
</template>
<script>
export default {
	name: 'ActualizacionFaltanAviso',
	computed: {
		/**
		 * ¿Hay pedido abierto y esta computadora ya aceptó?
		 *
		 * @returns {Boolean}
		 */
		visible() {
			return this.$store.getters['actualizacion_del_sistema/mostrar_faltan']
		},
		/**
		 * "Faltan N computadoras por confirmar" (en vivo: el store se actualiza por canal y por polling).
		 *
		 * @returns {String}
		 */
		texto() {
			return this.$store.getters['actualizacion_del_sistema/texto_faltan']
		},
	},
}
</script>
<style scoped lang="sass">
// Debajo de los modales de bootstrap (1040/1050) y del overlay de carga: es un aviso, no un bloqueo.
$actualizacion_faltan_z: 1030

.actualizacion-faltan
	position: fixed
	left: 12px
	bottom: 52px
	z-index: $actualizacion_faltan_z
	display: flex
	align-items: center
	gap: 8px
	max-width: calc(100vw - 24px)
	padding: 7px 14px
	border-radius: 999px
	font-size: 13px
	line-height: 1.25
	color: var(--color-text-primary, #1d1d1f)
	background: var(--bg-card, rgba(255, 255, 255, 0.92))
	border: 1px solid var(--color-border, rgba(0, 0, 0, 0.1))
	box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1)
	-webkit-backdrop-filter: saturate(180%) blur(12px)
	backdrop-filter: saturate(180%) blur(12px)
	pointer-events: none
	box-sizing: border-box

// Punto azul que respira despacio: indica "esperando", sin alarma.
.actualizacion-faltan__punto
	flex: 0 0 auto
	width: 8px
	height: 8px
	border-radius: 50%
	background: var(--color-primary, #007aff)
	animation: actualizacion-faltan-respirar 2.4s ease-in-out infinite

.actualizacion-faltan__texto
	display: flex
	flex-wrap: wrap
	column-gap: 6px
	min-width: 0
	span
		color: var(--color-text-secondary, #6e6e73)

@keyframes actualizacion-faltan-respirar
	0%, 100%
		opacity: 1
	50%
		opacity: 0.35

@media (prefers-reduced-motion: reduce)
	.actualizacion-faltan__punto
		animation: none
</style>
