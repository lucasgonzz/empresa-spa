<template>
<span
class="proceso-chip"
:class="'proceso-chip--' + status"
:data-status="status">
	<span class="proceso-chip__punto"></span>
	{{ texto }}
</span>
</template>
<script>
import { texto_de_estado } from '@/components/common/procesos-en-segundo-plano/tipos'

/**
 * Chip de estado de un proceso ("En espera" / "En proceso" / "Terminado" / "Falló").
 * Los colores salen de los pares de tokens que ya tienen contraparte oscura en _dark_theme.sass.
 */
export default {
	props: {
		/** pendiente | en_proceso | completado | fallo */
		status: {
			type: String,
			required: true,
		},
	},
	computed: {
		texto() {
			return texto_de_estado(this.status)
		},
	},
}
</script>
<style lang="sass">
.proceso-chip
	display: inline-flex
	align-items: center
	gap: 6px
	flex: 0 0 auto
	padding: 3px 9px 3px 8px
	border-radius: 999px
	font-size: 11px
	font-weight: 600
	letter-spacing: .01em
	line-height: 1.3
	white-space: nowrap
	// Neutro por defecto (en espera): un escalon por debajo de la tarjeta.
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)

.proceso-chip__punto
	width: 6px
	height: 6px
	border-radius: 50%
	background: currentColor
	opacity: .7

.proceso-chip--en_proceso
	// Primario en baja opacidad: en claro es un celeste, en oscuro un azul apagado.
	background: rgba(0, 123, 255, .1)
	color: var(--color-primary, #007bff)

	// El punto respira suave mientras el proceso corre: unico movimiento del chip.
	.proceso-chip__punto
		animation: proceso-chip-respirar 1.8s ease-in-out infinite

.proceso-chip--completado
	// Verde del sistema: el par --caja-abierta-* ya trae su contraparte oscura.
	background: var(--caja-abierta-fondo, #f2f7f4)
	color: var(--caja-abierta-texto, #1e6047)

.proceso-chip--fallo
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)

@keyframes proceso-chip-respirar
	0%, 100%
		opacity: .35
	50%
		opacity: 1

@media (prefers-reduced-motion: reduce)
	.proceso-chip--en_proceso .proceso-chip__punto
		animation: none

html.dark-mode
	.proceso-chip--en_proceso
		background: rgba(77, 163, 255, .16)
</style>
