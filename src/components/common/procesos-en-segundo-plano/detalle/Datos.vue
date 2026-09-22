<template>
<dl
v-if="datos.length"
class="proceso-datos">
	<div
	v-for="dato in datos"
	:key="dato.clave"
	class="proceso-dato"
	data-testid="proceso-detalle-dato"
	:data-dato="dato.clave">
		<dt class="proceso-dato__etiqueta">
			{{ dato.etiqueta }}
		</dt>
		<dd class="proceso-dato__valor">
			<button
			v-if="dato.tipo === 'link'"
			type="button"
			class="proceso-dato__link"
			data-testid="proceso-detalle-descargar"
			@click="abrir(dato.valor)">
				<i class="bi bi-download"></i>
				{{ dato.texto || 'Descargar' }}
			</button>
			<template v-else>
				{{ dato.valor }}
			</template>
		</dd>
	</div>
</dl>
</template>
<script>
/**
 * Pares etiqueta / valor de un detalle (proveedor, archivo, origen, modelo...). Un dato de tipo
 * `link` se muestra como boton que abre la URL en otra pestaña (las exportaciones traen el link
 * del archivo generado).
 */
export default {
	props: {
		/** [{ clave, etiqueta, valor, tipo?: 'texto' | 'link', texto? }] */
		datos: {
			type: Array,
			default() {
				return []
			},
		},
	},
	methods: {
		/**
		 * @param {String} url
		 * @return {void}
		 */
		abrir(url) {
			if (!url) {
				return
			}
			window.open(url, '_blank')
		},
	},
}
</script>
<style lang="sass">
.proceso-datos
	margin: 16px 0 0
	border-top: 1px solid var(--color-border-secondary, #e9ecef)

.proceso-dato
	display: flex
	flex-direction: row
	align-items: baseline
	justify-content: space-between
	gap: 16px
	padding: 9px 0
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)
	font-size: 13px
	text-align: left

.proceso-dato__etiqueta
	margin: 0
	flex: 0 0 auto
	font-weight: 500
	color: var(--color-text-secondary, #6c757d)

.proceso-dato__valor
	margin: 0
	flex: 1 1 auto
	min-width: 0
	text-align: right
	font-weight: 500
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.proceso-dato__link
	display: inline-flex
	align-items: center
	gap: 6px
	border: 0
	padding: 0
	background: transparent
	font-size: 13px
	font-weight: 500
	color: var(--color-primary, #007bff)
	box-shadow: none
	transition: opacity .15s ease

	&:hover
		opacity: .7
</style>
