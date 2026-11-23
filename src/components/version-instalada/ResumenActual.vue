<template>
<div
class="version-resumen"
data-testid="version-resumen">

	<template v-if="current && current.version">
		<p class="version-resumen__numero">
			{{ current.version }}
		</p>

		<template v-if="current.installed_at">
			<p class="version-resumen__fecha">
				{{ etiqueta }} el {{ fecha }}
			</p>
			<p class="version-resumen__hace">
				{{ hace }}
				<span v-if="dias !== null">({{ dias }} {{ dias === 1 ? 'día' : 'días' }})</span>
			</p>
		</template>
		<p
		v-else
		class="version-resumen__fecha">
			Todavía no tenemos la fecha de instalación de esta versión
		</p>
	</template>

	<p
	v-else
	class="version-resumen__fecha">
		Todavía no tenemos registrada la versión de tu sistema
	</p>
</div>
</template>
<script>
import { dias_desde_instalacion, texto_hace, formatear_fecha, etiqueta_de_fuente } from '@/utils/version_instalada'

/**
 * Bloque superior del modal: versión actual, fecha de instalación y antigüedad.
 */
export default {
	props: {
		// Versión actual: {version, installed_at, source, title} o null.
		current: {
			type: Object,
			default: null,
		},
	},
	computed: {
		/**
		 * Días calendario (hora argentina) desde la instalación.
		 *
		 * @returns {number|null}
		 */
		dias() {
			return this.current && this.current.installed_at ? dias_desde_instalacion(this.current.installed_at) : null
		},
		/**
		 * "Hoy", "Ayer" o "Hace N días".
		 *
		 * @returns {string}
		 */
		hace() {
			return texto_hace(this.dias)
		},
		/**
		 * Fecha de instalación formateada en hora argentina.
		 *
		 * @returns {string}
		 */
		fecha() {
			return this.current ? formatear_fecha(this.current.installed_at) : ''
		},
		/**
		 * "Instalada" o "Fecha de publicación (aproximada)" según el origen del dato.
		 *
		 * @returns {string}
		 */
		etiqueta() {
			return this.current ? etiqueta_de_fuente(this.current.source) : ''
		},
	},
}
</script>
<style lang="sass">
// Tokens de _dark_theme.sass (el modal cuelga de <body>, fuera de #app).
.version-resumen
	text-align: center
	padding: 8px 0 20px
	.version-resumen__numero
		margin: 0
		font-size: 2.25rem
		font-weight: 700
		line-height: 1.1
		color: var(--color-text-primary)
	.version-resumen__fecha
		margin: 8px 0 0
		font-size: 0.875rem
		color: var(--color-text-secondary)
	.version-resumen__hace
		margin: 4px 0 0
		font-size: 1rem
		font-weight: 600
		color: var(--color-text-primary)
</style>
