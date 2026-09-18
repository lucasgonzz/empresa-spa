<template>
<div
v-if="metricas.length"
class="proceso-metricas"
:class="{ 'proceso-metricas--compactas': compacto }">
	<div
	v-for="metrica in metricas"
	:key="metrica.clave"
	class="proceso-metrica"
	data-testid="proceso-detalle-metrica"
	:data-metrica="metrica.clave"
	:data-valor="metrica.valor">
		<span class="proceso-metrica__valor">
			{{ formatear(metrica.valor) }}
		</span>
		<span class="proceso-metrica__etiqueta">
			{{ metrica.etiqueta }}
		</span>
	</div>
</div>
</template>
<script>
/**
 * Metricas numericas de un proceso: tarjetas en el detalle del modal (molde de
 * ArticleImportResultModal, sin el borde de color) o chips en una linea en la version compacta
 * de la tarjeta flotante.
 */
export default {
	props: {
		/** [{ clave, etiqueta, valor }]. Un valor null se muestra como "–". */
		metricas: {
			type: Array,
			default() {
				return []
			},
		},
		compacto: {
			type: Boolean,
			default: false,
		},
	},
	methods: {
		/**
		 * Numero con separador de miles, o "–" si todavia no hay dato.
		 *
		 * @param {*} valor
		 * @returns {String}
		 */
		formatear(valor) {
			if (valor === null || typeof valor === 'undefined' || valor === '') {
				return '–'
			}
			if (typeof valor === 'number') {
				return this.numero_es(valor)
			}
			return String(valor)
		},
	},
}
</script>
<style lang="sass">
.proceso-metricas
	display: grid
	grid-template-columns: repeat(auto-fit, minmax(130px, 1fr))
	gap: 10px

.proceso-metrica
	display: flex
	flex-direction: column
	gap: 2px
	padding: 12px 14px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)
	text-align: left

.proceso-metrica__valor
	font-size: 24px
	font-weight: 700
	line-height: 1.1
	letter-spacing: -0.02em
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums

.proceso-metrica__etiqueta
	font-size: 12px
	color: var(--color-text-secondary, #6c757d)

// Version compacta: chips en fila, valor y etiqueta en la misma linea.
.proceso-metricas--compactas
	display: flex
	flex-direction: row
	flex-wrap: wrap
	gap: 6px

	.proceso-metrica
		flex-direction: row
		align-items: baseline
		gap: 5px
		padding: 4px 10px
		border-radius: 999px

	.proceso-metrica__valor
		font-size: 13px
		font-weight: 600

	.proceso-metrica__etiqueta
		font-size: 11.5px
</style>
