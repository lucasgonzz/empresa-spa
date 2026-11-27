<template>
	<!-- Aviso de error de un reporte: ocupa el lugar de los totales cuando el pedido falló, para que no
	queden a la vista los números del período anterior como si fueran los del nuevo (ticket 177). -->
	<div
	v-if="mensaje"
	class="aviso-error-reporte"
	role="alert"
	data-testid="aviso-error-reporte">
		<i class="bi bi-exclamation-circle aviso-error-reporte__icono" aria-hidden="true"></i>
		<span class="aviso-error-reporte__texto">{{ mensaje }}</span>
	</div>
</template>
<script>
/**
 * Props:
 * - mensaje {String}: texto en castellano para el usuario; vacío = no se muestra nada.
 */
export default {
	props: {
		mensaje: {
			type: String,
			default: '',
		},
	},
}
</script>
<style lang="sass">
/* Bloque discreto, de ancho completo, con tokens del tema (claro y oscuro) */
.aviso-error-reporte
	display: flex
	align-items: flex-start
	gap: 10px
	width: 100%
	margin-top: 20px
	padding: 14px 16px
	border: 1px solid var(--color-border, #E2E8F0)
	border-left: 4px solid #EF4444
	border-radius: 8px
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-primary, #1E293B)
	font-size: 0.9rem
	line-height: 1.4

	.aviso-error-reporte__icono
		color: #EF4444
		font-size: 1.1rem
		flex-shrink: 0

	.aviso-error-reporte__texto
		min-width: 0
		overflow-wrap: anywhere
</style>
