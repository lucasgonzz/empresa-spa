<template>
	<!--
		Miniatura de un Diseño de Vender para su tarjeta en la solapa: las tres etapas como bandas, con
		un bloque por campo del ancho de sus columnas (N/12) y el separador como una linea. Dibuja lo
		mismo que Vender va a mostrar en ESTE negocio: resolver_diseno + elementos_visibles, las mismas
		dos funciones que usa Vender. La etapa 2 lleva debajo la tabla de articulos, que es fija.

		Es decorativa (aria-hidden): el nombre y el detalle de la tarjeta dicen lo mismo en texto.
	-->
	<div
	class="miniatura-de-diseno"
	aria-hidden="true">
		<div
		v-for="banda in bandas"
		:key="banda.etapa"
		class="miniatura-de-diseno__banda"
		:class="'acento-etapa-' + banda.numero">
			<span class="miniatura-de-diseno__numero">{{ banda.numero }}</span>
			<div class="miniatura-de-diseno__contenido">
				<div class="miniatura-de-diseno__grilla">
					<span
					v-for="item in banda.items"
					:key="identidad(item)"
					class="miniatura-de-diseno__celda"
					:class="{ 'miniatura-de-diseno__celda--separador': item.key === KEY_SEPARADOR }"
					:data-cols="item.cols">
						<span class="miniatura-de-diseno__bloque"></span>
					</span>
					<span
					v-if="!banda.items.length"
					class="miniatura-de-diseno__vacia"></span>
				</div>
				<span
				v-if="banda.etapa === 'etapa_2'"
				class="miniatura-de-diseno__tabla"></span>
			</div>
		</div>
	</div>
</template>
<script>
import { ETAPAS, KEY_SEPARADOR } from '@/components/vender/layout/elementos'
import { resolver_diseno, elementos_visibles } from '@/components/vender/layout/resolver_diseno'
import { identidad } from './editor/estado_del_editor'

/**
 * Miniatura de un diseño (mision diseno-vender-configurable, 28/9/2026). El `vm` que piden las
 * funciones del contrato es este mismo componente (los mixins globales estan en todos).
 */
export default {
	name: 'MiniaturaDeDiseno',
	props: {
		/* El vender_layout: se usa su `layout` (objeto, o null = predeterminado del sistema) */
		modelo: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			KEY_SEPARADOR: KEY_SEPARADOR,
		}
	},
	computed: {
		/**
		 * Una banda por etapa con los items que Vender dibuja (disponibles, separadores limpios).
		 *
		 * @returns {Array}
		 */
		bandas() {
			let self = this
			let resuelto = resolver_diseno(this.modelo.layout, this)
			let bandas = []

			ETAPAS.forEach(function (etapa, indice) {
				bandas.push({
					etapa: etapa,
					numero: indice + 1,
					items: elementos_visibles(resuelto, etapa, self),
				})
			})

			return bandas
		},
	},
	methods: {
		/**
		 * Identidad de un item (key del v-for).
		 *
		 * @param {Object} item
		 * @returns {string}
		 */
		identidad(item) {
			return identidad(item)
		},
	},
}
</script>
<style lang="sass">
@import '@/components/abm/disenos-de-vender/_acentos_de_etapas'

// Colores solo por token: cada bloque es el acento de su etapa con opacidad (asi no hace falta un
// token "claro" aparte para cada color, y funciona igual en modo oscuro).
.miniatura-de-diseno
	display: flex
	flex-direction: column
	gap: 8px

.miniatura-de-diseno__banda
	display: flex
	align-items: flex-start
	gap: 8px

.miniatura-de-diseno__numero
	display: inline-flex
	align-items: center
	justify-content: center
	flex: 0 0 16px
	width: 16px
	height: 16px
	border-radius: 50%
	background: var(--acento-etapa)
	color: var(--bg-card)
	font-size: 0.6rem
	font-weight: 700
	line-height: 1

.miniatura-de-diseno__contenido
	flex: 1 1 auto
	min-width: 0
	padding-top: 2px

// La misma grilla de 12 columnas que Vender, en chico: gutter de 3px y cada celda N/12
.miniatura-de-diseno__grilla
	display: flex
	flex-wrap: wrap
	margin: 0 -1.5px

	> .miniatura-de-diseno__celda
		flex: 0 0 100%
		max-width: 100%
		padding: 0 1.5px
		margin-bottom: 3px

		@for $columnas from 1 through 12
			&[data-cols="#{$columnas}"]
				flex-basis: calc(100% * #{$columnas} / 12)
				max-width: calc(100% * #{$columnas} / 12)

.miniatura-de-diseno__bloque
	display: block
	height: 8px
	border-radius: 3px
	background: var(--acento-etapa)
	opacity: .38

// El separador: una linea finita, no un bloque
.miniatura-de-diseno__celda--separador
	.miniatura-de-diseno__bloque
		height: 1px
		margin: 3px 0
		border-radius: 0
		background: var(--color-border)
		opacity: 1

// Etapa sin campos: una linea punteada donde irian
.miniatura-de-diseno__vacia
	display: block
	width: 100%
	height: 8px
	margin: 0 1.5px 3px
	border: 1px dashed var(--color-border)
	border-radius: 3px

// La tabla de articulos de la etapa 2 (fija): renglones grises
.miniatura-de-diseno__tabla
	display: block
	height: 22px
	margin-top: 1px
	border: 1px solid var(--color-border-secondary)
	border-radius: 3px
	background: repeating-linear-gradient(to bottom, var(--bg-card) 0, var(--bg-card) 6px, var(--color-border-secondary) 6px, var(--color-border-secondary) 7px)
</style>
