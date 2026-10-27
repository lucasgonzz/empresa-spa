<template>
<div
class="med-estado"
:class="{ 'med-estado--compacto': compacto }">

	<div class="med-estado__chips">
		<!--
			El motivo del estado (por ejemplo "Se agotaron las búsquedas del día") va en el title: en la
			tabla no hay lugar para una frase entera. En el detalle se muestra escrito.
		-->
		<span
		class="med-chip-estado"
		:class="'med-chip-estado--' + corrida.status"
		:data-status="corrida.status"
		:title="corrida.motivo_estado || null">
			<span class="med-chip-estado__punto"></span>
			{{ texto_estado }}
		</span>

		<span
		v-if="corrida.esta_trabada"
		class="med-chip-estado med-chip-estado--trabada"
		data-testid="medidas-chip-trabada"
		title="No avanza hace más de 15 minutos">
			<i class="bi bi-exclamation-triangle"></i>
			Parece trabada
		</span>
	</div>

	<template v-if="activa">
		<barra-progreso
		class="med-estado__barra"
		:porcentaje="porcentaje"
		:status="corrida.status"></barra-progreso>
		<span class="med-estado__avance">
			{{ texto_avance }}
		</span>
	</template>

</div>
</template>
<script>
import { ESTADOS, texto_de, esta_activa, porcentaje_de, entero_es } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * Estado de una corrida de medidas: el chip ("En curso", "Terminada", "Se cortó"...), el aviso de
 * "Parece trabada" y, mientras corre, la barra de avance con "1.250 de 5.000".
 *
 * Lo usan la tabla de la sub-solapa (compacto) y el encabezado del detalle. La barra es la misma de
 * los procesos en segundo plano.
 */
export default {
	components: {
		BarraProgreso: () => import('@/components/common/procesos-en-segundo-plano/BarraProgreso'),
	},
	props: {
		/** RunPayload normalizado (contrato §2.6). */
		corrida: {
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
			return texto_de(ESTADOS, this.corrida.status)
		},
		activa() {
			return esta_activa(this.corrida)
		},
		/**
		 * Porcentaje para la barra. Mientras espera turno en la cola (pendiente, cero procesados) va
		 * null: la barra se dibuja indeterminada, que es la forma calma de decir "arranca en un
		 * momento" sin mostrar un 0 % clavado.
		 *
		 * @returns {Number|null}
		 */
		porcentaje() {
			if (this.corrida.status === 'pendiente' && !this.corrida.procesados) {
				return null
			}
			return porcentaje_de(this.corrida)
		},
		/**
		 * "1.250 de 5.000 artículos · 25 %" (en compacto, sin "artículos").
		 *
		 * @returns {String}
		 */
		texto_avance() {
			if (this.corrida.status === 'pendiente' && !this.corrida.procesados) {
				return 'Arranca en un momento'
			}
			let partes = [entero_es(this.corrida.procesados) + ' de ' + entero_es(this.corrida.total) + (this.compacto ? '' : ' artículos')]
			if (this.porcentaje !== null) {
				partes.push(this.porcentaje + ' %')
			}
			return partes.join(' · ')
		},
	},
}
</script>
<style lang="sass">
// Sin scope a propósito: el chip se usa adentro de la lista de corridas y de un b-modal, y los
// colores van todos por token con su contraparte oscura (los mismos pares de _dark_theme.sass que
// usa el chip de Imágenes).
.med-estado
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 6px
	min-width: 0

.med-estado__chips
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 6px

.med-estado__barra
	width: 100%
	min-width: 120px

.med-estado__avance
	font-size: 12px
	line-height: 1.3
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.med-estado--compacto
	.med-estado__barra
		max-width: 180px

.med-chip-estado
	display: inline-flex
	align-items: center
	gap: 6px
	padding: 3px 9px 3px 8px
	border-radius: 999px
	font-size: 11.5px
	font-weight: 600
	line-height: 1.3
	white-space: nowrap
	// Neutro por defecto (en espera, detenida): un escalón por debajo de la tarjeta.
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)

	i
		font-size: 11px

.med-chip-estado__punto
	width: 6px
	height: 6px
	border-radius: 50%
	background: currentColor
	opacity: .7

// Celeste de "en curso": el token del hover de las pestañas ya es este mismo par.
.med-chip-estado--en_proceso
	background: var(--bg-nav-hover, #e7f1ff)
	color: var(--color-primary, #007bff)

	// El punto respira mientras busca: es el único movimiento del chip.
	.med-chip-estado__punto
		animation: med-chip-estado-respirar 1.8s ease-in-out infinite

.med-chip-estado--terminada
	background: var(--caja-abierta-fondo, #f2f7f4)
	color: var(--caja-abierta-texto, #1e6047)

.med-chip-estado--fallida
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)

// Ámbar de aviso: los dos tokens existen solo en html.dark-mode, así que en claro manda el literal.
.med-chip-estado--trabada
	background: var(--bg-warning-soft, rgba(255, 193, 7, .16))
	color: var(--color-text-warning-strong, #856404)

@keyframes med-chip-estado-respirar
	0%, 100%
		opacity: .35
	50%
		opacity: 1

@media (prefers-reduced-motion: reduce)
	.med-chip-estado--en_proceso .med-chip-estado__punto
		animation: none
</style>
