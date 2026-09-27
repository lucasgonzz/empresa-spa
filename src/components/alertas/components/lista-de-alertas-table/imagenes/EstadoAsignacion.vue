<template>
<div
class="img-asig-estado"
:class="{ 'img-asig-estado--compacto': compacto }">

	<div class="img-asig-estado__chips">
		<!--
			El motivo del estado (por ejemplo "Se agotaron las búsquedas del día") va en el title:
			en la tabla no hay lugar para una frase entera. En el detalle se muestra escrito.
		-->
		<span
		class="img-asig-chip"
		:class="'img-asig-chip--' + asignacion.status"
		:data-status="asignacion.status"
		:title="asignacion.motivo_estado || null">
			<span class="img-asig-chip__punto"></span>
			{{ texto_estado }}
		</span>

		<span
		v-if="asignacion.trabada"
		class="img-asig-chip img-asig-chip--trabada"
		data-testid="imagenes-chip-trabada"
		title="No avanza hace más de 15 minutos">
			<i class="bi bi-exclamation-triangle"></i>
			Parece trabada
		</span>
	</div>

	<template v-if="activa">
		<barra-progreso
		class="img-asig-estado__barra"
		:porcentaje="porcentaje"
		:status="asignacion.status"></barra-progreso>
		<span class="img-asig-estado__avance">
			{{ texto_avance }}
		</span>
	</template>

</div>
</template>
<script>
import { ESTADOS, texto_de, esta_activa, porcentaje_de, entero_es } from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'

/**
 * Estado de una asignación de imágenes: el chip ("Buscando", "Terminada", "Se cortó"...), el
 * aviso de "Parece trabada" y, mientras corre, la barra de avance con "1.250 de 5.000".
 *
 * Lo usan la tabla de la solapa (compacto) y el encabezado del detalle. La barra es la misma de
 * los procesos en segundo plano: un proceso de imágenes se ve igual en la píldora y acá.
 */
export default {
	components: {
		BarraProgreso: () => import('@/components/common/procesos-en-segundo-plano/BarraProgreso'),
	},
	props: {
		/** RunPayload (contrato §5.1). */
		asignacion: {
			type: Object,
			required: true,
		},
		/** true en la tabla: el texto de avance va sin la palabra "artículos". */
		compacto: {
			type: Boolean,
			default: false,
		},
	},
	computed: {
		texto_estado() {
			return texto_de(ESTADOS, this.asignacion.status)
		},
		activa() {
			return esta_activa(this.asignacion)
		},
		/**
		 * Porcentaje para la barra. Mientras espera turno en la cola (pendiente, cero
		 * procesados) va null: la barra se dibuja indeterminada, que es la forma calma de decir
		 * "arranca en un momento" sin mostrar un 0 % clavado.
		 *
		 * @returns {Number|null}
		 */
		porcentaje() {
			if (this.asignacion.status === 'pendiente' && !Number(this.asignacion.procesados)) {
				return null
			}
			return porcentaje_de(this.asignacion)
		},
		/**
		 * "1.250 de 5.000 artículos · 25 %" (en compacto, sin "artículos").
		 *
		 * @returns {String}
		 */
		texto_avance() {
			if (this.asignacion.status === 'pendiente' && !Number(this.asignacion.procesados)) {
				return 'Arranca en un momento'
			}
			let partes = [entero_es(this.asignacion.procesados) + ' de ' + entero_es(this.asignacion.total_articulos) + (this.compacto ? '' : ' artículos')]
			if (this.porcentaje !== null) {
				partes.push(this.porcentaje + ' %')
			}
			return partes.join(' · ')
		},
	},
}
</script>
<style lang="sass">
// Sin scope a proposito: el chip se usa adentro de celdas de b-table y de un b-modal, y los
// colores van todos por token con su contraparte oscura (los pares de _dark_theme.sass que ya usa
// el chip de estado de los procesos en segundo plano), asi que no hay nada que pelear.
.img-asig-estado
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 6px
	min-width: 0

.img-asig-estado__chips
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 6px

.img-asig-estado__barra
	width: 100%
	min-width: 120px

.img-asig-estado__avance
	font-size: 12px
	line-height: 1.3
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums
	white-space: nowrap

.img-asig-estado--compacto
	.img-asig-estado__barra
		max-width: 180px

.img-asig-chip
	display: inline-flex
	align-items: center
	gap: 6px
	padding: 3px 9px 3px 8px
	border-radius: 999px
	font-size: 11.5px
	font-weight: 600
	line-height: 1.3
	white-space: nowrap
	// Neutro por defecto (en espera, detenida): un escalon por debajo de la tarjeta.
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)

	i
		font-size: 11px

.img-asig-chip__punto
	width: 6px
	height: 6px
	border-radius: 50%
	background: currentColor
	opacity: .7

.img-asig-chip--en_proceso
	background: rgba(0, 123, 255, .1)
	color: var(--color-primary, #007bff)

	// El punto respira mientras busca: es el unico movimiento del chip.
	.img-asig-chip__punto
		animation: img-asig-chip-respirar 1.8s ease-in-out infinite

.img-asig-chip--terminada
	background: var(--caja-abierta-fondo, #f2f7f4)
	color: var(--caja-abierta-texto, #1e6047)

.img-asig-chip--fallida
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)

// Ambar de aviso: los dos tokens existen solo en html.dark-mode (barrido del 26/9/2026), asi que
// en claro manda el literal del fallback.
.img-asig-chip--trabada
	background: var(--bg-warning-soft, rgba(255, 193, 7, .16))
	color: var(--color-text-warning-strong, #856404)

@keyframes img-asig-chip-respirar
	0%, 100%
		opacity: .35
	50%
		opacity: 1

@media (prefers-reduced-motion: reduce)
	.img-asig-chip--en_proceso .img-asig-chip__punto
		animation: none

html.dark-mode
	.img-asig-chip--en_proceso
		background: rgba(77, 163, 255, .16)
</style>
