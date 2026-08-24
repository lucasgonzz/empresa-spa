<template>
	<!--
		Pildora de estado de una caja (grupo 371). Presentacional pura: no lee el store ni
		hace peticiones. La paleta sale de los tokens --caja-* de src/sass/_dark_theme.sass,
		definidos en modo claro y oscuro, asi que se usan sin fallback.
	-->
	<span
	class="estado-caja"
	:class="abierta ? 'estado-caja--abierta' : 'estado-caja--cerrada'">
		<span
		class="estado-caja__punto"
		aria-hidden="true"></span>
		{{ texto }}
	</span>
</template>
<script>
export default {
	props: {
		abierta: {
			type: Boolean,
			required: true,
		},
		texto_abierta: {
			type: String,
			default: 'Abierta',
		},
		texto_cerrada: {
			type: String,
			default: 'Cerrada',
		},
	},
	computed: {
		/**
		 * Texto de la pildora. Se recibe por prop porque el mismo componente rotula estados
		 * distintos segun el contexto: una CAJA esta "Abierta"/"Cerrada", y una APERTURA de caja
		 * esta "En curso"/"Cerrada" (ver el modal de aperturas del prompt 03).
		 *
		 * @returns {String}
		 */
		texto() {
			if (this.abierta) {
				return this.texto_abierta
			}
			return this.texto_cerrada
		},
	},
}
</script>
<style scoped lang="sass">
.estado-caja
	display: inline-flex
	align-items: center
	gap: 7px
	padding: 3px 10px
	border-radius: 999px
	font-size: 0.75rem
	font-weight: 600
	line-height: 1.5
	white-space: nowrap
	border: 1px solid transparent

	// El punto hereda el color del texto de la pildora: asi un modo nuevo (o un token
	// retocado) no obliga a tocar dos declaraciones.
	&__punto
		flex-shrink: 0
		width: 7px
		height: 7px
		border-radius: 50%
		background: currentColor

	&--abierta
		background: var(--caja-abierta-fondo)
		border-color: var(--caja-abierta-acento)
		color: var(--caja-abierta-texto)

	&--cerrada
		background: var(--caja-cerrada-fondo)
		border-color: var(--caja-cerrada-acento)
		color: var(--caja-cerrada-texto)
</style>
