<template>
<ul
class="cat-arbol"
:data-testid="'categorias-arbol-' + clave">

	<li
	v-for="categoria in categorias"
	:key="categoria.id"
	class="cat-arbol__item"
	:data-nodo="categoria.id">

		<div class="cat-arbol__fila">

			<!--
				Una categoría con subcategorías es un botón que las despliega (chevron + nombre,
				con aria-expanded); una sin hijos es solo texto, con un espaciador del ancho del
				chevron para que todos los nombres queden alineados. Es el molde accesible de
				asistente-ia/ConfiguracionAgente.vue (botón con aria-expanded y aria-controls).
			-->
			<button
			v-if="categoria.subcategorias.length"
			type="button"
			class="cat-arbol__titulo cat-arbol__titulo--boton"
			:aria-expanded="esta_abierta(categoria.id) ? 'true' : 'false'"
			:aria-controls="id_de_los_hijos(categoria)"
			:data-testid="'categorias-nodo-toggle-' + clave + '-' + categoria.id"
			@click="alternar(categoria.id)">
				<i
				class="bi cat-arbol__chevron"
				:class="esta_abierta(categoria.id) ? 'bi-chevron-down' : 'bi-chevron-right'"
				aria-hidden="true"></i>
				<span class="cat-arbol__nombre">{{ categoria.nombre }}</span>
				<span class="cat-arbol__subs">{{ categoria.subcategorias.length }} sub</span>
			</button>
			<span
			v-else
			class="cat-arbol__titulo">
				<span
				class="cat-arbol__espaciador"
				aria-hidden="true"></span>
				<span class="cat-arbol__nombre">{{ categoria.nombre }}</span>
			</span>

			<span class="cat-arbol__cuentas">
				<span
				class="cat-arbol__cuenta"
				:title="titulo_de_la_cuenta(categoria)">
					{{ entero(categoria.articulos) }}
				</span>
				<span
				v-if="categoria.dudosos > 0"
				class="cat-etiqueta cat-etiqueta--aviso">
					{{ cantidad_de_dudosos(categoria.dudosos) }}
				</span>
				<span
				v-if="se_suma(categoria)"
				class="cat-etiqueta cat-etiqueta--ok">
					+{{ entero(categoria.suman) }}
				</span>
			</span>

		</div>

		<ul
		v-if="categoria.subcategorias.length && esta_abierta(categoria.id)"
		:id="id_de_los_hijos(categoria)"
		class="cat-arbol__hijos">
			<li
			v-for="sub in hijas_de(categoria)"
			:key="sub.id"
			class="cat-arbol__item cat-arbol__item--hija"
			:data-nodo="sub.id">
				<div class="cat-arbol__fila">
					<span class="cat-arbol__titulo">
						<span class="cat-arbol__nombre">{{ sub.nombre }}</span>
					</span>
					<span class="cat-arbol__cuentas">
						<span
						class="cat-arbol__cuenta"
						:title="titulo_de_la_cuenta(sub)">
							{{ entero(sub.articulos) }}
						</span>
						<span
						v-if="sub.dudosos > 0"
						class="cat-etiqueta cat-etiqueta--aviso">
							{{ cantidad_de_dudosos(sub.dudosos) }}
						</span>
						<span
						v-if="se_suma(sub)"
						class="cat-etiqueta cat-etiqueta--ok">
							+{{ entero(sub.suman) }}
						</span>
					</span>
				</div>
			</li>
		</ul>

	</li>

</ul>
</template>
<script>
import { ordenar_por_nombre } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/menu_tienda'
import { entero_es } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'

/**
 * El árbol de categorías de una tarjeta: las categorías en una lista, cada una con su cantidad de
 * artículos, y las que tienen subcategorías se despliegan (UN solo nivel de hijos: en el sistema
 * solo existe categoría → subcategoría).
 *
 * Es solo para mirar: no tiene ninguna acción. Se ordena por nombre igual que el menú de la tienda
 * (ver menu_tienda.js).
 *
 * Qué dice el número de cada fila según el tipo de tarjeta:
 *  - Sistema nuevo: los artículos que la IA ubicó ahí. Si algunos son "dudosos" (la IA no tiene
 *    claro que sean de esa categoría) se avisa aparte: esos quedan sin categoría hasta que se
 *    revisen.
 *  - "Mantener las mías": los artículos que la categoría ya tiene hoy, y el `+N` verde son los que
 *    se le suman al elegir.
 *
 * Props: `arbol` (el `arbol` de la tarjeta, normalizado por el store), `tipo` (`nueva` | `mantener`)
 * y `clave` (la clave de la tarjeta, para que los testids y los ids de aria no se pisen entre
 * tarjetas).
 */
export default {
	props: {
		/** `arbol` de una tarjeta: `[{id, nombre, articulos, dudosos, suman, subcategorias}]`. */
		arbol: {
			type: Array,
			default: () => [],
		},
		/** `nueva` | `mantener`: cambia lo que dice el número de cada fila. */
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
			/** Ids de las categorías desplegadas. Varias a la vez: sirve para comparar. */
			abiertas: [],
		}
	},
	computed: {
		/**
		 * Las categorías ordenadas por nombre.
		 *
		 * @returns {Array}
		 */
		categorias() {
			return ordenar_por_nombre(this.arbol)
		},
	},
	methods: {
		/**
		 * Las subcategorías de una categoría, ordenadas por nombre.
		 *
		 * @param {Object} categoria
		 * @returns {Array}
		 */
		hijas_de(categoria) {
			return ordenar_por_nombre(categoria.subcategorias)
		},
		esta_abierta(id) {
			return this.abiertas.indexOf(id) !== -1
		},
		/**
		 * Despliega o pliega una categoría.
		 *
		 * @param {Number} id
		 */
		alternar(id) {
			if (this.esta_abierta(id)) {
				this.abiertas = this.abiertas.filter(abierta => abierta !== id)
				return
			}
			this.abiertas = this.abiertas.concat([id])
		},
		/**
		 * Id del `ul` de hijos de una categoría, que referencia `aria-controls` del botón.
		 *
		 * @param {Object} categoria
		 * @returns {String}
		 */
		id_de_los_hijos(categoria) {
			return 'categorias-arbol-hijos-' + this.clave + '-' + categoria.id
		},
		/**
		 * True si hay que mostrar el `+N` verde: solo en "Mantener las mías", y solo si se le suma algo.
		 *
		 * @param {Object} nodo
		 * @returns {Boolean}
		 */
		se_suma(nodo) {
			return this.tipo === 'mantener' && nodo.suman > 0
		},
		/**
		 * El tooltip del número de una fila: qué cuenta según el tipo de tarjeta.
		 *
		 * @param {Object} nodo
		 * @returns {String}
		 */
		titulo_de_la_cuenta(nodo) {
			if (this.tipo === 'mantener') {
				return entero_es(nodo.articulos) + (nodo.articulos === 1 ? ' artículo ya está' : ' artículos ya están') + ' en esta categoría'
			}
			return entero_es(nodo.articulos) + (nodo.articulos === 1 ? ' artículo' : ' artículos')
		},
		cantidad_de_dudosos(cantidad) {
			return entero_es(cantidad) + (cantidad === 1 ? ' dudoso' : ' dudosos')
		},
		entero(valor) {
			return entero_es(valor)
		},
	},
}
</script>
<style lang="sass">
// Sin scope a proposito: las reglas van prefijadas con cat-arbol y los colores por token con el
// literal de :root como respaldo (modo oscuro: ver _dark_theme.sass). Las etiquetas (.cat-etiqueta)
// las define categorias/Index.vue, que siempre es el padre de este componente.
.cat-arbol
	list-style: none
	margin: 0
	padding: 0
	font-size: 0.875rem
	text-align: left

.cat-arbol__item
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)

	&:last-child
		border-bottom: none

.cat-arbol__fila
	display: flex
	align-items: center
	justify-content: space-between
	gap: 8px
	min-height: 36px
	padding: 4px 2px

.cat-arbol__titulo
	display: flex
	align-items: center
	gap: 6px
	flex: 1 1 auto
	min-width: 0
	margin: 0
	padding: 0
	border: 0
	background: transparent
	box-shadow: none
	text-align: left
	font: inherit
	color: var(--color-text-primary, #212529)

// El botón que despliega: el mismo texto, con el cursor y el foco de un control.
.cat-arbol__titulo--boton
	cursor: pointer
	border-radius: 6px

	&:hover
		color: var(--color-primary, #007bff)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 2px

.cat-arbol__chevron
	flex: 0 0 16px
	width: 16px
	font-size: 0.75rem
	text-align: center
	color: var(--color-text-secondary, #6c757d)

// Del ancho del chevron: las categorías sin hijos quedan alineadas con las que sí tienen.
.cat-arbol__espaciador
	flex: 0 0 16px
	width: 16px

.cat-arbol__nombre
	min-width: 0
	font-weight: 500
	line-height: 1.3
	overflow-wrap: anywhere

.cat-arbol__subs
	flex: 0 0 auto
	font-size: 0.72rem
	color: var(--color-text-secondary, #6c757d)
	white-space: nowrap

.cat-arbol__cuentas
	display: flex
	align-items: center
	justify-content: flex-end
	flex-wrap: wrap
	flex: 0 0 auto
	gap: 4px 6px

.cat-arbol__cuenta
	font-size: 0.8125rem
	font-variant-numeric: tabular-nums
	color: var(--color-text-secondary, #6c757d)

// Las subcategorías: una línea a la izquierda marca que cuelgan de la categoría.
.cat-arbol__hijos
	list-style: none
	margin: 0 0 6px 8px
	padding: 0 0 0 10px
	border-left: 2px solid var(--color-border, #dee2e6)

.cat-arbol__item--hija
	.cat-arbol__nombre
		font-weight: 400
</style>
