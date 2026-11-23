<template>
<div
class="version-historial"
data-testid="version-historial">

	<h6 class="version-historial__titulo">
		Historial de actualizaciones
	</h6>

	<p
	v-if="history.length === 0"
	class="version-historial__vacio">
		Todavía no hay actualizaciones registradas
	</p>

	<!-- Lista apilada (sin tabla) para que entre en 360 px sin scroll horizontal. -->
	<ul
	v-else
	class="version-historial__lista">
		<li
		v-for="fila in filas"
		:key="fila.id || fila.version"
		class="version-historial__fila"
		:class="{'version-historial__fila--actual': fila.es_actual}">
			<div class="version-historial__cabecera">
				<span class="version-historial__version">
					{{ fila.version }}
				</span>
				<span
				v-if="fila.es_actual"
				class="version-historial__actual">
					Actual
				</span>
			</div>
			<div
			v-if="fila.title"
			class="version-historial__detalle">
				{{ fila.title }}
			</div>
			<div class="version-historial__detalle">
				<template v-if="fila.installed_at">
					{{ fila.etiqueta }}: {{ fila.fecha }} · {{ fila.hace }}
				</template>
				<template v-else>
					Sin fecha registrada
				</template>
			</div>
		</li>
	</ul>
</div>
</template>
<script>
import { dias_desde_instalacion, texto_hace, formatear_fecha, etiqueta_de_fuente } from '@/utils/version_instalada'

/**
 * Lista del historial de versiones instaladas del comercio.
 */
export default {
	props: {
		// Filas del historial, la más reciente primero.
		history: {
			type: Array,
			default: () => [],
		},
		// Versión actual (para marcarla en la lista).
		current: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Filas listas para mostrar, con fecha, antigüedad y marca de "Actual".
		 *
		 * @returns {Array}
		 */
		filas() {
			// Filas armadas para la vista.
			const resultado = []
			this.history.forEach(fila => {
				resultado.push(Object.assign({}, fila, {
					es_actual: Boolean(this.current && this.current.version === fila.version),
					fecha: fila.installed_at ? formatear_fecha(fila.installed_at) : '',
					hace: fila.installed_at ? texto_hace(dias_desde_instalacion(fila.installed_at)) : '',
					etiqueta: etiqueta_de_fuente(fila.source),
				}))
			})
			return resultado
		},
	},
}
</script>
<style lang="sass">
// Tokens de _dark_theme.sass (el modal cuelga de <body>, fuera de #app).
.version-historial
	.version-historial__titulo
		margin: 0 0 8px
		font-size: 0.75rem
		font-weight: 600
		letter-spacing: 0.06em
		text-transform: uppercase
		color: var(--color-text-secondary)
	.version-historial__vacio
		margin: 0
		font-size: 0.875rem
		color: var(--color-text-secondary)
	.version-historial__lista
		list-style: none
		margin: 0
		padding: 0
		max-height: 45vh
		overflow-y: auto
	.version-historial__fila
		padding: 10px 12px
		margin-bottom: 6px
		border: 1px solid var(--color-border)
		border-radius: 8px
		background: var(--bg-section)
		overflow-wrap: anywhere
	.version-historial__fila--actual
		border-color: var(--color-primary)
	.version-historial__cabecera
		display: flex
		align-items: center
		justify-content: space-between
	.version-historial__version
		font-weight: 600
		color: var(--color-text-primary)
	.version-historial__actual
		font-size: 0.6875rem
		font-weight: 600
		color: var(--color-primary)
	.version-historial__detalle
		font-size: 0.8125rem
		color: var(--color-text-secondary)
</style>
