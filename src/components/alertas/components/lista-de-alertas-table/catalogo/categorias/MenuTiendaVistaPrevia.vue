<template>
<div
class="cat-menu"
:data-testid="'categorias-menu-' + clave">

	<p class="cat-menu__titulo">Categorías</p>

	<ul
	v-if="filas.length"
	class="cat-menu__lista">
		<li
		v-for="fila in filas"
		:key="fila.id"
		class="cat-menu__grupo"
		:class="{ 'cat-menu__grupo--abierto': esta_abierta(fila.id) }"
		:data-categoria="fila.id">

			<div class="cat-menu__fila">
				<!--
					Igual que en la tienda: el chevron solo aparece si la categoría tiene
					subcategorías; si no, un espaciador del mismo ancho mantiene alineados los
					nombres. Acá el nombre también despliega (en la tienda navega a la categoría):
					esto es una vista previa, no hay adónde ir.
				-->
				<button
				v-if="fila.subs.length"
				type="button"
				class="cat-menu__toggle"
				:aria-expanded="esta_abierta(fila.id) ? 'true' : 'false'"
				:aria-controls="id_de_las_subs(fila)"
				:aria-label="(esta_abierta(fila.id) ? 'Ocultar' : 'Ver') + ' las subcategorías de ' + fila.nombre"
				:data-testid="'categorias-menu-fila-toggle-' + clave + '-' + fila.id"
				@click="alternar(fila.id)">
					<i
					class="bi cat-menu__chevron"
					:class="esta_abierta(fila.id) ? 'bi-chevron-up' : 'bi-chevron-down'"
					aria-hidden="true"></i>
				</button>
				<span
				v-else
				class="cat-menu__espaciador"
				aria-hidden="true"></span>

				<button
				v-if="fila.subs.length"
				type="button"
				class="cat-menu__nombre cat-menu__nombre--boton"
				@click="alternar(fila.id)">
					{{ fila.nombre }}
				</button>
				<span
				v-else
				class="cat-menu__nombre">
					{{ fila.nombre }}
				</span>

				<!-- Con subcategorías, "N sub"; sin ellas, "N prod." (la misma regla que la tienda). -->
				<button
				v-if="fila.subs.length"
				type="button"
				class="cat-menu__pastilla cat-menu__pastilla--subs"
				:title="'Ver ' + fila.subs.length + (fila.subs.length === 1 ? ' subcategoría' : ' subcategorías')"
				@click="alternar(fila.id)">
					{{ fila.subs.length }}
					<span class="cat-menu__rotulo">sub</span>
				</button>
				<span
				v-else
				class="cat-menu__pastilla cat-menu__pastilla--productos"
				:title="entero(fila.productos) + (fila.productos === 1 ? ' artículo en esta categoría' : ' artículos en esta categoría')">
					{{ entero(fila.productos) }}
					<span class="cat-menu__rotulo">prod.</span>
				</span>
			</div>

			<ul
			v-if="fila.subs.length && esta_abierta(fila.id)"
			:id="id_de_las_subs(fila)"
			class="cat-menu__subs">
				<li
				v-for="sub in fila.subs"
				:key="sub.id"
				class="cat-menu__sub">
					<i
					class="bi bi-chevron-right cat-menu__icono-sub"
					aria-hidden="true"></i>
					<span class="cat-menu__nombre-sub">{{ sub.nombre }}</span>
					<span
					class="cat-menu__cuenta-sub"
					:title="entero(sub.productos) + (sub.productos === 1 ? ' artículo' : ' artículos')">
						{{ entero(sub.productos) }}
					</span>
				</li>
			</ul>

		</li>
	</ul>

	<p
	v-else
	class="cat-menu__vacio"
	:data-testid="'categorias-menu-vacio-' + clave">
		Con este sistema todavía no habría categorías para mostrar en la tienda.
	</p>

	<p class="cat-menu__nota">
		{{ nota }}
	</p>

</div>
</template>
<script>
import { armar_menu } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/menu_tienda'
import { entero_es } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'

/**
 * Vista previa del menú de categorías de la tienda online con lo que existiría después de elegir un
 * sistema: la misma anatomía que el menú real (tienda-spa, `nav/categories`) para que el dueño vea
 * cómo le quedaría la tienda antes de decidir.
 *
 * Cada fila lleva el chevron (solo si tiene subcategorías), el nombre y una píldora a la derecha:
 * `N sub` si tiene subcategorías o `N prod.` si no las tiene. Se ordena por nombre, sin distinguir
 * mayúsculas ni acentos, y se despliega una categoría a la vez, como en la tienda.
 *
 * Qué muestra y por qué (la regla vive en menu_tienda.js): en un sistema nuevo solo lo que existiría,
 * o sea las categorías con al menos un artículo seguro, y "N prod." cuenta los seguros. Los
 * artículos dudosos no se cuentan: quedan sin categoría hasta que se aprueben.
 *
 * Los colores salen de tokens (nada de los grises y negros fijos de la tienda), así que sirve igual
 * en modo claro y oscuro. Props: `arbol`, `tipo` (`nueva` | `mantener`) y `clave` (de la tarjeta,
 * para los testids y los ids de aria).
 */
export default {
	props: {
		/** `arbol` de una tarjeta: `[{id, nombre, articulos, dudosos, suman, subcategorias}]`. */
		arbol: {
			type: Array,
			default: () => [],
		},
		/** `nueva` | `mantener`. */
		tipo: {
			type: String,
			default: 'nueva',
		},
		/** Clave de la tarjeta (`A`, `B`, `C`, `mantener`). */
		clave: {
			type: String,
			default: '',
		},
	},
	data() {
		return {
			/** Id de la categoría desplegada (una a la vez, como en la tienda); null = ninguna. */
			abierta_id: null,
		}
	},
	computed: {
		/**
		 * Las filas del menú tal como quedarían (ver armar_menu).
		 *
		 * @returns {Array}
		 */
		filas() {
			return armar_menu(this.arbol, this.tipo)
		},
		/**
		 * La aclaración de abajo: de dónde salen los números de las píldoras.
		 *
		 * @returns {String}
		 */
		nota() {
			if (this.tipo === 'mantener') {
				return 'Así se vería el menú de tu tienda online. Cada número incluye lo que la categoría ya tiene más los artículos que se le suman.'
			}
			return 'Así se vería el menú de tu tienda online. Los números cuentan los artículos que quedan ubicados al elegir este sistema; los dudosos se suman cuando los aprobás.'
		},
	},
	methods: {
		esta_abierta(id) {
			return this.abierta_id === id
		},
		/**
		 * Despliega una categoría (y pliega la que estaba abierta); volver a tocarla la pliega.
		 *
		 * @param {Number} id
		 */
		alternar(id) {
			this.abierta_id = this.abierta_id === id ? null : id
		},
		/**
		 * Id del `ul` de subcategorías de una fila, que referencia `aria-controls` del botón.
		 *
		 * @param {Object} fila
		 * @returns {String}
		 */
		id_de_las_subs(fila) {
			return 'categorias-menu-subs-' + this.clave + '-' + fila.id
		},
		entero(valor) {
			return entero_es(valor)
		},
	},
}
</script>
<style lang="sass">
// Sin scope a proposito (las reglas van prefijadas con cat-menu). Imita el menu de la tienda
// (tienda-spa, nav/categories) pero con los TOKENS de la empresa: nunca los rgba(0,0,0,..) ni los
// #222 / #444 de la tienda, que en modo oscuro quedarian negros sobre oscuro. Cada token lleva su
// literal de :root como respaldo.
.cat-menu
	box-sizing: border-box
	width: 100%
	max-width: 340px
	padding: 6px 8px 10px
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 12px
	background: var(--bg-card, #fff)
	text-align: left

// El titulo del panel de la tienda ("Categorias").
.cat-menu__titulo
	margin: 0 0 4px
	padding: 6px 4px 8px
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)
	font-size: 0.9375rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.cat-menu__lista
	list-style: none
	margin: 0
	padding: 0

.cat-menu__grupo
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)

	&:last-child
		border-bottom: none

.cat-menu__fila
	display: flex
	flex-direction: row
	align-items: center
	gap: 6px
	min-height: 44px
	padding: 4px 2px
	border-radius: 10px
	transition: background 0.15s ease

	&:hover
		background: var(--bg-hover, #f1f3f5)

// La categoria desplegada se marca con el celeste del sistema.
.cat-menu__grupo--abierto .cat-menu__fila
	background: var(--bg-nav-hover, #e7f1ff)

.cat-menu__toggle,
.cat-menu__espaciador
	flex: 0 0 32px
	width: 32px
	height: 32px
	display: inline-flex
	align-items: center
	justify-content: center

.cat-menu__toggle
	margin: 0
	padding: 0
	border: none
	border-radius: 8px
	background: transparent
	box-shadow: none
	color: var(--color-primary, #007bff)
	cursor: pointer

	&:hover
		background: var(--bg-nav-hover, #e7f1ff)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 1px

.cat-menu__chevron
	font-size: 1rem

.cat-menu__nombre
	flex: 1 1 auto
	min-width: 0
	margin: 0
	padding: 6px 4px
	border: none
	background: transparent
	box-shadow: none
	text-align: left
	font-size: 0.95rem
	font-weight: 600
	line-height: 1.3
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.cat-menu__nombre--boton
	cursor: pointer

	&:hover
		color: var(--color-primary, #007bff)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 1px

// "N sub" y "N prod.": el numero grande y el rotulo en mayusculas chico, como en la tienda.
.cat-menu__pastilla
	flex: 0 0 auto
	display: inline-flex
	align-items: baseline
	gap: 4px
	margin: 0
	padding: 3px 9px
	border: none
	border-radius: 999px
	box-shadow: none
	font-size: 0.8rem
	font-weight: 700
	line-height: 1.2
	white-space: nowrap
	font-variant-numeric: tabular-nums

.cat-menu__pastilla--subs
	background: var(--bg-nav-hover, #e7f1ff)
	color: var(--color-primary, #007bff)
	cursor: pointer

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 1px

.cat-menu__pastilla--productos
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)
	box-shadow: inset 0 0 0 1px var(--color-border-secondary, #e9ecef)
	cursor: default

.cat-menu__rotulo
	font-size: 0.65rem
	font-weight: 600
	text-transform: uppercase
	letter-spacing: 0.04em

// Las subcategorias: una linea de 3px del color primario a la izquierda, como en la tienda.
.cat-menu__subs
	list-style: none
	margin: 0 4px 10px 6px
	padding: 0 0 0 8px
	border-left: 3px solid var(--color-primary, #007bff)

.cat-menu__sub
	display: flex
	align-items: center
	gap: 6px
	margin-bottom: 4px
	padding: 8px 10px 8px 8px
	border-radius: 8px
	background: var(--bg-section, #f8f9fa)
	font-size: 0.88rem
	font-weight: 500
	color: var(--color-text-primary, #212529)

.cat-menu__icono-sub
	flex: 0 0 auto
	font-size: 0.75rem
	opacity: 0.75

.cat-menu__nombre-sub
	flex: 1 1 auto
	min-width: 0
	line-height: 1.3
	overflow-wrap: anywhere

.cat-menu__cuenta-sub
	flex: 0 0 auto
	padding: 2px 7px
	border-radius: 999px
	background: var(--bg-hover, #f1f3f5)
	font-size: 0.72rem
	font-weight: 700
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums

.cat-menu__vacio
	margin: 10px 4px
	font-size: 0.85rem
	line-height: 1.45
	color: var(--color-text-secondary, #6c757d)

.cat-menu__nota
	margin: 8px 4px 0
	font-size: 0.75rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)
</style>
