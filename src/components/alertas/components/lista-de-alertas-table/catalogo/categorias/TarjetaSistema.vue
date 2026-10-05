<template>
<article
class="cat-tarjeta"
:class="{ 'cat-tarjeta--bloqueada': bloqueada }"
:data-testid="'categorias-tarjeta-' + propuesta.clave"
:data-propuesta="propuesta.id"
:data-tipo="propuesta.tipo">

	<header class="cat-tarjeta__cabecera">
		<span class="cat-etiqueta cat-etiqueta--neutro">{{ etiqueta }}</span>
	</header>

	<h3
	class="cat-tarjeta__nombre"
	:data-testid="'categorias-nombre-' + propuesta.clave">
		{{ propuesta.nombre }}
	</h3>
	<p
	v-if="propuesta.resumen"
	class="cat-tarjeta__resumen">
		{{ propuesta.resumen }}
	</p>

	<!--
		Los números de lo que pasaría al elegir este sistema. Siempre las mismas filas, en el mismo
		orden, para poder comparar las tarjetas de un vistazo.
	-->
	<dl
	class="cat-tarjeta__numeros"
	:data-testid="'categorias-numeros-' + propuesta.clave">
		<div
		v-for="dato in numeros"
		:key="dato.clave"
		class="cat-tarjeta__dato"
		:class="dato.tono ? 'cat-tarjeta__dato--' + dato.tono : null"
		:data-dato="dato.clave">
			<dt>{{ dato.rotulo }}</dt>
			<dd>{{ dato.valor }}</dd>
		</div>
	</dl>

	<!-- En qué se basó el sistema y para qué negocio sirve: lo escribe quien armó la tarjeta. -->
	<section
	v-if="propuesta.descripcion"
	class="cat-tarjeta__seccion">
		<button
		type="button"
		class="cat-tarjeta__toggle"
		:aria-expanded="ver_base ? 'true' : 'false'"
		:aria-controls="'categorias-base-' + propuesta.clave"
		:data-testid="'categorias-base-toggle-' + propuesta.clave"
		@click="ver_base = !ver_base">
			<span>En qué se basa</span>
			<i
			class="bi"
			:class="ver_base ? 'bi-chevron-up' : 'bi-chevron-down'"
			aria-hidden="true"></i>
		</button>
		<p
		v-if="ver_base"
		:id="'categorias-base-' + propuesta.clave"
		class="cat-tarjeta__base">
			{{ propuesta.descripcion }}
		</p>
	</section>

	<section class="cat-tarjeta__seccion">
		<button
		type="button"
		class="cat-tarjeta__toggle"
		:aria-expanded="ver_categorias ? 'true' : 'false'"
		:aria-controls="'categorias-arbol-contenedor-' + propuesta.clave"
		:data-testid="'categorias-arbol-toggle-' + propuesta.clave"
		@click="ver_categorias = !ver_categorias">
			<span>Ver las categorías</span>
			<i
			class="bi"
			:class="ver_categorias ? 'bi-chevron-up' : 'bi-chevron-down'"
			aria-hidden="true"></i>
		</button>
		<div
		v-if="ver_categorias"
		:id="'categorias-arbol-contenedor-' + propuesta.clave"
		class="cat-tarjeta__arbol">
			<p
			v-if="!propuesta.arbol.length"
			class="cat-tarjeta__vacio">
				Este sistema no tiene categorías cargadas.
			</p>
			<arbol-de-categorias
			v-else
			:arbol="propuesta.arbol"
			:tipo="propuesta.tipo"
			:clave="propuesta.clave"></arbol-de-categorias>
		</div>
	</section>

	<section class="cat-tarjeta__seccion">
		<button
		type="button"
		class="cat-tarjeta__toggle"
		:aria-expanded="ver_menu ? 'true' : 'false'"
		:aria-controls="'categorias-menu-contenedor-' + propuesta.clave"
		:data-testid="'categorias-menu-toggle-' + propuesta.clave"
		@click="ver_menu = !ver_menu">
			<span>Cómo se vería en tu tienda</span>
			<i
			class="bi"
			:class="ver_menu ? 'bi-chevron-up' : 'bi-chevron-down'"
			aria-hidden="true"></i>
		</button>
		<div
		v-if="ver_menu"
		:id="'categorias-menu-contenedor-' + propuesta.clave"
		class="cat-tarjeta__menu">
			<menu-tienda-vista-previa
			:arbol="propuesta.arbol"
			:tipo="propuesta.tipo"
			:clave="propuesta.clave"></menu-tienda-vista-previa>
		</div>
	</section>

	<footer class="cat-tarjeta__pie">

		<!--
			Un sistema nuevo bloqueado (márgenes o listas de precio por categoría, Tienda Nube): el botón
			queda apagado y se dice por qué. Quién está bloqueado y por qué lo calcula la API; acá solo
			se dibuja.
		-->
		<div
		v-if="bloqueada"
		class="cat-tarjeta__bloqueo"
		:data-testid="'categorias-bloqueo-' + propuesta.clave">
			<p class="cat-tarjeta__bloqueo-titulo">
				<i
				class="bi bi-slash-circle"
				aria-hidden="true"></i>
				No se puede elegir por ahora
			</p>
			<ul
			v-if="motivos_de_bloqueo.length"
			class="cat-tarjeta__bloqueo-lista">
				<li
				v-for="(motivo, indice) in motivos_de_bloqueo"
				:key="'motivo-' + indice">
					{{ motivo }}
				</li>
			</ul>
			<p
			v-if="nombre_de_mantener"
			class="cat-tarjeta__bloqueo-pista">
				Podés elegir «{{ nombre_de_mantener }}»: no cambia tus categorías y completa los artículos que no tienen ninguna.
			</p>
		</div>

		<p
		v-if="!puede_gestionar"
		class="cat-tarjeta__solo-dueno">
			{{ texto_solo_el_dueno }}
		</p>

		<b-button
		v-else
		class="btn-modulo cat-tarjeta__elegir"
		variant="primary"
		block
		:disabled="bloqueada || ocupado"
		:data-testid="'categorias-elegir-' + propuesta.clave"
		@click="$emit('elegir', propuesta)">
			Elegir este
		</b-button>

	</footer>

</article>
</template>
<script>
import ArbolDeCategorias from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/ArbolDeCategorias'
import MenuTiendaVistaPrevia from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/MenuTiendaVistaPrevia'
import { TEXTOS, entero_es, etiqueta_de_la_propuesta } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'

/**
 * Una tarjeta de Alertas → Catálogo → Categorías: un sistema de categorías para el catálogo del
 * negocio (o "Mantener las mías", que deja las que ya tenía y completa los artículos sin
 * categoría).
 *
 * Muestra el nombre, la línea que lo resume, los números de lo que pasaría al elegirlo (categorías,
 * subcategorías, artículos que quedan ubicados, los que la IA no tiene claros y los que no pudo
 * ubicar), en qué se basa, el árbol de categorías (abierto por defecto, para poder comparar un
 * sistema con otro) y cómo se vería el menú de la tienda (cerrado por defecto). Abajo, "Elegir este".
 *
 * No elige nada por su cuenta: avisa con `elegir(propuesta)` y quien la orquesta (Index.vue) abre
 * la confirmación. Tampoco decide si está bloqueada ni qué advertencias hay: lo recibe por props.
 *
 * Props: `propuesta` (la tarjeta normalizada por el store), `bloqueada` y `motivos_de_bloqueo` (ya
 * traducidos a texto), `nombre_de_mantener` (el de la tarjeta que mantiene las categorías, para
 * sugerirla cuando esta está bloqueada), `puede_gestionar` y `ocupado` (hay una elección en curso).
 */
export default {
	components: {
		ArbolDeCategorias,
		MenuTiendaVistaPrevia,
	},
	props: {
		/** La tarjeta: `{id, clave, tipo, nombre, resumen, descripcion, totales, arbol}`. */
		propuesta: {
			type: Object,
			required: true,
		},
		/** true si este sistema no se puede elegir (la API lo dice con `bloqueo`). */
		bloqueada: {
			type: Boolean,
			default: false,
		},
		/** Los motivos del bloqueo, ya traducidos a frases. */
		motivos_de_bloqueo: {
			type: Array,
			default: () => [],
		},
		/** Nombre de la tarjeta "Mantener las mías" si existe (para sugerirla), o null. */
		nombre_de_mantener: {
			type: String,
			default: null,
		},
		/** false si quien mira no es el dueño ni el acceso maestro: no se ofrece elegir. */
		puede_gestionar: {
			type: Boolean,
			default: true,
		},
		/** true mientras hay una elección en curso: los botones se apagan. */
		ocupado: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/** "En qué se basa" desplegado. */
			ver_base: false,
			/** El árbol de categorías desplegado: abierto, para comparar de un vistazo. */
			ver_categorias: true,
			/** La vista previa del menú de la tienda desplegada. */
			ver_menu: false,
		}
	},
	computed: {
		/** "Sistema A" / "Tus categorías". */
		etiqueta() {
			return etiqueta_de_la_propuesta(this.propuesta)
		},
		texto_solo_el_dueno() {
			return TEXTOS.solo_el_dueno
		},
		/**
		 * Las filas de números de la tarjeta. Las de "Mantener las mías" dicen lo mismo con otras
		 * palabras (no se crea nada: se completan artículos). "Se pierde la categoría" solo aparece
		 * si hay artículos que hoy tienen categoría y la dejarían de tener hasta que se revisen.
		 *
		 * @returns {Array<{clave: String, rotulo: String, valor: String, tono: String|null}>}
		 */
		numeros() {
			let totales = this.propuesta.totales
			let es_mantener = this.propuesta.tipo === 'mantener'
			let filas = [
				{ clave: 'categorias', rotulo: es_mantener ? 'Categorías que quedan' : 'Categorías', valor: entero_es(totales.categorias), tono: null },
				{ clave: 'subcategorias', rotulo: es_mantener ? 'Subcategorías que quedan' : 'Subcategorías', valor: entero_es(totales.subcategorias), tono: null },
				{ clave: 'seguros', rotulo: es_mantener ? 'Artículos que se completan' : 'Artículos que se ubican', valor: entero_es(totales.seguros), tono: null },
				{ clave: 'dudosos', rotulo: 'Para revisar', valor: entero_es(totales.dudosos), tono: totales.dudosos > 0 ? 'aviso' : null },
				{ clave: 'sin_asignar', rotulo: 'Sin categoría', valor: entero_es(totales.sin_asignar), tono: null },
			]
			if (totales.pierden_categoria > 0) {
				filas.push({ clave: 'pierden_categoria', rotulo: 'Pierden su categoría actual', valor: entero_es(totales.pierden_categoria), tono: 'aviso' })
			}
			return filas
		},
	},
}
</script>
<style lang="sass">
// Sin scope a proposito (reglas prefijadas con cat-tarjeta). Mismo lenguaje visual que las tarjetas
// de integraciones (radio 14, borde y sombra por token) pero con clases propias: .integration-card
// vive en el <style> de TiendaOnline.vue y solo existe mientras ese componente esta cargado, asi que
// no se puede dar por sentado en Alertas. Todo color va por token con el literal de :root de respaldo.
.cat-tarjeta
	box-sizing: border-box
	display: flex
	flex-direction: column
	height: 100%
	min-width: 0
	padding: 18px
	background: var(--bg-card, #fff)
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 14px
	box-shadow: 0 1px 2px var(--shadow-color, rgba(99, 99, 99, 0.2))
	text-align: left
	transition: box-shadow 0.2s ease, border-color 0.2s ease

	&:hover
		box-shadow: 0 4px 14px var(--shadow-color, rgba(99, 99, 99, 0.2))
		border-color: var(--color-border-tertiary, #dee2e6)

.cat-tarjeta__cabecera
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 6px
	margin-bottom: 8px

.cat-tarjeta__nombre
	margin: 0
	font-size: 1.0625rem
	font-weight: 600
	line-height: 1.3
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.cat-tarjeta__resumen
	margin: 4px 0 0
	font-size: 0.875rem
	line-height: 1.45
	color: var(--color-text-secondary, #6c757d)

// Las filas de numeros: rotulo a la izquierda, cifra a la derecha, con una linea punteada fina.
.cat-tarjeta__numeros
	display: flex
	flex-direction: column
	margin: 14px 0 6px
	padding: 0

.cat-tarjeta__dato
	display: flex
	align-items: baseline
	justify-content: space-between
	gap: 12px
	padding: 5px 0
	border-bottom: 1px dashed var(--color-border-secondary, #e9ecef)
	font-size: 0.875rem

	&:last-child
		border-bottom: none

	dt
		margin: 0
		font-weight: 400
		color: var(--color-text-secondary, #6c757d)

	dd
		margin: 0
		font-weight: 600
		font-variant-numeric: tabular-nums
		color: var(--color-text-primary, #212529)

// Ambar: el token existe solo en html.dark-mode; en claro manda el literal del fallback.
.cat-tarjeta__dato--aviso dd
	color: var(--color-text-warning-strong, #856404)

.cat-tarjeta__seccion
	margin-top: 8px
	padding-top: 6px
	border-top: 1px solid var(--color-border-secondary, #e9ecef)

// El boton que despliega cada seccion: el rotulo a la izquierda y el chevron a la derecha.
.cat-tarjeta__toggle
	display: flex
	align-items: center
	justify-content: space-between
	gap: 8px
	width: 100%
	margin: 0
	padding: 6px 0
	border: 0
	background: transparent
	box-shadow: none
	text-align: left
	font-size: 0.875rem
	font-weight: 600
	color: var(--color-text-primary, #212529)
	cursor: pointer

	i
		flex: 0 0 auto
		font-size: 0.75rem
		color: var(--color-text-secondary, #6c757d)

	&:hover
		color: var(--color-primary, #007bff)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 2px
		border-radius: 6px

.cat-tarjeta__base
	margin: 4px 0 6px
	font-size: 0.8125rem
	line-height: 1.5
	color: var(--color-text-secondary, #6c757d)
	overflow-wrap: anywhere

// El arbol acotado a un alto fijo: con decenas de categorias la tarjeta no puede crecer sin limite y
// desparejar la fila de tarjetas. Scroll prolijo del sistema (pista transparente, pildora gris).
.cat-tarjeta__arbol
	max-height: 300px
	margin-top: 2px
	padding-right: 4px
	overflow-y: auto

	&::-webkit-scrollbar
		width: 8px

	&::-webkit-scrollbar-track
		background: transparent

	&::-webkit-scrollbar-thumb
		background-color: var(--color-border, rgba(0, 0, 0, 0.2))
		border-radius: 8px

.cat-tarjeta__menu
	margin-top: 4px

.cat-tarjeta__vacio
	margin: 6px 0
	font-size: 0.8125rem
	color: var(--color-text-secondary, #6c757d)

// El pie queda siempre al fondo de la tarjeta: con la fila de tarjetas a la misma altura, los
// botones "Elegir este" quedan alineados aunque una tarjeta tenga menos arriba.
.cat-tarjeta__pie
	margin-top: auto
	padding-top: 16px

.cat-tarjeta__bloqueo
	margin-bottom: 12px
	padding: 12px 14px
	border-radius: 12px
	background: var(--bg-warning-soft, rgba(255, 193, 7, 0.16))
	color: var(--color-text-warning-strong, #856404)
	font-size: 0.8125rem
	line-height: 1.45

.cat-tarjeta__bloqueo-titulo
	margin: 0 0 6px
	font-weight: 600

	i
		margin-right: 4px

.cat-tarjeta__bloqueo-lista
	margin: 0 0 6px
	padding-left: 18px

.cat-tarjeta__bloqueo-pista
	margin: 0
	font-weight: 500

.cat-tarjeta__solo-dueno
	margin: 0
	font-size: 0.8125rem
	color: var(--color-text-secondary, #6c757d)

// Telefono: el boton de elegir a lo ancho y con tamano de dedo (ya es `block`).
@media (max-width: 575px)
	.cat-tarjeta
		padding: 14px

	.cat-tarjeta__arbol
		max-height: 260px

	.cat-tarjeta__elegir.btn
		height: 40px
</style>
