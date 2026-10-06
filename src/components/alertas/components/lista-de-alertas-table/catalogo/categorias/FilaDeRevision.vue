<template>
<li
class="cat-rev-fila"
:class="{ 'cat-rev-fila--seleccionada': seleccionado, 'cat-rev-fila--procesando': procesando }"
:data-testid="'categorias-item-' + item.id"
:data-estado="item.estado"
:data-confianza="item.confianza">

	<b-form-checkbox
	v-if="se_puede_resolver"
	class="cat-rev-fila__tilde"
	:data-testid="'categorias-tilde-' + item.id"
	:checked="seleccionado"
	:disabled="procesando"
	:aria-label="'Seleccionar ' + nombre"
	@change="$emit('seleccionar', $event)"></b-form-checkbox>

	<div class="cat-rev-fila__cuerpo">

		<span class="cat-rev-fila__nombre">{{ nombre }}</span>

		<div
		v-if="item.articulo.codigo_de_barras || item.articulo.codigo_de_proveedor"
		class="cat-rev-fila__meta">
			<span
			v-if="item.articulo.codigo_de_barras"
			class="cat-rev-fila__codigo"
			title="Código de barras"
			:data-testid="'categorias-codigo-barras-' + item.id">
				<span class="cat-rev-fila__rotulo">Cód. barras</span>
				{{ item.articulo.codigo_de_barras }}
			</span>
			<span
			v-if="item.articulo.codigo_de_proveedor"
			class="cat-rev-fila__codigo"
			title="Código de proveedor"
			:data-testid="'categorias-codigo-proveedor-' + item.id">
				<span class="cat-rev-fila__rotulo">Cód. proveedor</span>
				{{ item.articulo.codigo_de_proveedor }}
			</span>
		</div>

		<div class="cat-rev-fila__avisos">
			<span
			class="cat-etiqueta"
			:class="'cat-etiqueta--' + tono"
			:data-testid="'categorias-estado-' + item.id">
				{{ texto_del_estado }}
			</span>
			<!-- Qué tan segura estaba la IA, solo mientras el artículo espera que alguien decida. -->
			<span
			v-if="item.estado === 'a_revisar' && item.confianza === 'dudosa'"
			class="cat-etiqueta cat-etiqueta--aviso">
				La IA no está segura
			</span>
		</div>

		<!--
			La categoría: la que sugiere la IA (A revisar), la que sugirió y se rechazó (Sin categoría) o
			la que el artículo tiene ahora (Asignados, con los nombres reales que manda la API).
		-->
		<p
		v-if="categoria.categoria"
		class="cat-rev-fila__categoria"
		:data-testid="'categorias-categoria-' + item.id">
			<span class="cat-rev-fila__rotulo-categoria">{{ rotulo_de_la_categoria }}</span>
			<strong>{{ categoria.categoria }}</strong>
			<template v-if="categoria.subcategoria">
				<i
				class="bi bi-chevron-right cat-rev-fila__separador"
				aria-hidden="true"></i>
				{{ categoria.subcategoria }}
			</template>
		</p>

		<!--
			La categoria que el articulo tiene HOY, solo en "A revisar" y solo si ya tiene una (la API la
			manda en `actual` para esos items): "Aprobar" se la va a pisar con la sugerida, y sin esta linea
			no se veia que era lo que se reemplazaba (B-13). En "Sin categoria" `actual` viene vacio y no se
			dibuja nada.
		-->
		<p
		v-if="categoria_de_hoy"
		class="cat-rev-fila__categoria"
		:data-testid="'categorias-hoy-' + item.id">
			<span class="cat-rev-fila__rotulo-categoria">Hoy está en</span>
			<strong>{{ categoria_de_hoy.categoria }}</strong>
			<template v-if="categoria_de_hoy.subcategoria">
				<i
				class="bi bi-chevron-right cat-rev-fila__separador"
				aria-hidden="true"></i>
				{{ categoria_de_hoy.subcategoria }}
			</template>
		</p>

		<p
		v-if="item.motivo"
		class="cat-rev-fila__motivo"
		:data-testid="'categorias-motivo-' + item.id">
			{{ item.motivo }}
		</p>

	</div>

	<!--
		Rechazar a la izquierda y aprobar a la derecha, como en cualquier dialogo: la accion que avanza
		queda donde termina la lectura. Aprobar es la unica en color lleno. Solo en "A revisar" y solo
		quien puede gestionar.
	-->
	<div
	v-if="se_puede_resolver"
	class="cat-rev-fila__acciones">
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="outline-danger"
		:data-testid="'categorias-rechazar-' + item.id"
		:disabled="procesando"
		@click="$emit('rechazar')">
			Rechazar
		</b-button>
		<b-button
		class="btn-modulo btn-modulo--fila"
		variant="success"
		:data-testid="'categorias-aprobar-' + item.id"
		:disabled="procesando"
		@click="$emit('aprobar')">
			Aprobar
		</b-button>
	</div>

</li>
</template>
<script>
import { ESTADOS_DE_ITEM, TONOS_DE_ITEM, texto_de } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'

/**
 * Un artículo de la revisión de categorías: su nombre y códigos, en qué estado está, la categoría
 * (la que sugiere la IA, la que sugirió y se rechazó, o la que tiene ahora) y por qué la IA no
 * estaba segura. En "A revisar" lleva Aprobar y Rechazar y la casilla para hacerlo de a muchos.
 *
 * Mientras no se apruebe, el artículo NO tiene la categoría que sugiere la IA (decisión de la
 * misión): aprobar se la asigna (y crea la categoría si todavía no existía) y REEMPLAZA la que tenga
 * hoy, por eso la fila la muestra ("Hoy está en"); rechazar descarta la sugerencia y no toca al
 * artículo.
 *
 * Eventos: `seleccionar(bool)`, `aprobar` y `rechazar`. La acción en sí la hace la revisión.
 */
export default {
	props: {
		/** Una fila de la revisión (normalizada por el store). */
		item: {
			type: Object,
			required: true,
		},
		/** true si está tildado para aprobar o rechazar en lote. */
		seleccionado: {
			type: Boolean,
			default: false,
		},
		/** true mientras viaja una acción sobre este artículo. */
		procesando: {
			type: Boolean,
			default: false,
		},
		/** false si quien mira no puede aprobar ni rechazar. */
		puede_gestionar: {
			type: Boolean,
			default: true,
		},
	},
	computed: {
		nombre() {
			return this.item.articulo.nombre || ('Artículo N° ' + this.item.articulo.id)
		},
		/**
		 * Solo un artículo que espera revisión se puede aprobar o rechazar (la API contesta 409 con
		 * cualquier otro estado).
		 *
		 * @returns {Boolean}
		 */
		se_puede_resolver() {
			return this.puede_gestionar && this.item.estado === 'a_revisar'
		},
		texto_del_estado() {
			return texto_de(ESTADOS_DE_ITEM, this.item.estado)
		},
		/** Color de la etiqueta del estado (`cat-etiqueta--*`). */
		tono() {
			return Object.prototype.hasOwnProperty.call(TONOS_DE_ITEM, this.item.estado) ? TONOS_DE_ITEM[this.item.estado] : 'neutro'
		},
		/**
		 * Qué categoría mostrar: con el artículo ya asignado o aprobado, la que tiene de verdad
		 * (`actual`, con los nombres reales); en cualquier otro caso, la sugerencia.
		 *
		 * @returns {{categoria: String|null, subcategoria: String|null}}
		 */
		categoria() {
			let esta_asignado = this.item.estado === 'aplicada' || this.item.estado === 'aprobada'
			if (esta_asignado && this.item.actual.categoria) {
				return this.item.actual
			}
			return this.item.sugerencia
		},
		/**
		 * La categoría (y subcategoría) que el artículo tiene HOY, para mostrar junto a la sugerencia de
		 * un artículo "a revisar", o null si no corresponde mostrar nada (B-13).
		 *
		 * "Aprobar" le va a PISAR la categoría con la sugerida, así que la fila tiene que mostrar qué se
		 * reemplaza: pasa en "Mantener las mías" (un artículo que ya tenía categoría y la conserva hasta
		 * que lo aprueben) y cuando alguien le puso una a mano después de elegir. Solo en "A revisar":
		 * en "Sin categoría" la API manda `actual` vacío y en Asignados/Aprobado esa categoría ya es la
		 * que muestra `categoria`. Sin categoría hoy (o con la suya borrada) la API manda null y no se
		 * dibuja nada, igual que con una API que todavía no manda `actual` en estos artículos.
		 *
		 * @returns {{categoria: String, subcategoria: String|null}|null}
		 */
		categoria_de_hoy() {
			if (this.item.estado !== 'a_revisar' || !this.item.actual.categoria) {
				return null
			}
			return this.item.actual
		},
		/**
		 * El rótulo que acompaña a la categoría.
		 *
		 * @returns {String}
		 */
		rotulo_de_la_categoria() {
			if (this.item.estado === 'aplicada' || this.item.estado === 'aprobada') {
				return 'Categoría'
			}
			if (this.item.estado === 'rechazada') {
				return 'Sugerencia rechazada'
			}
			return 'Sugerencia de la IA'
		},
	},
}
</script>
<style lang="sass">
// Sin scope: prefijo cat-rev-fila, colores por token con el literal de :root como respaldo. Las
// etiquetas (.cat-etiqueta) las define categorias/Index.vue. Lista con separadores finos, sin
// tarjetas: la jerarquia la dan la tipografia y el aire (igual que las filas del detalle de imagenes).
.cat-rev-fila
	display: flex
	flex-direction: row
	align-items: flex-start
	gap: 14px
	padding: 14px 6px
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)
	text-align: left
	transition: background 0.15s ease, opacity 0.15s ease

.cat-rev-fila__tilde
	flex: 0 0 auto
	align-self: center
	margin-right: -8px

.cat-rev-fila__cuerpo
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 4px
	flex: 1 1 0
	min-width: 0

.cat-rev-fila__nombre
	font-size: 0.9375rem
	font-weight: 600
	line-height: 1.3
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.cat-rev-fila__meta
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 4px 12px
	font-size: 0.8rem
	color: var(--color-text-secondary, #6c757d)

.cat-rev-fila__codigo
	font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace
	font-size: 0.78rem
	font-variant-numeric: tabular-nums
	overflow-wrap: anywhere

// "Cod. barras" / "Cod. proveedor": el rotulo va en la tipografia comun, apagado, para que el numero se lea primero.
.cat-rev-fila__rotulo
	font-family: inherit
	font-size: 0.72rem
	margin-right: 4px
	color: var(--color-text-secondary, #6c757d)
	opacity: 0.85

.cat-rev-fila__avisos
	display: flex
	flex-wrap: wrap
	gap: 6px
	margin-top: 2px

.cat-rev-fila__categoria
	margin: 2px 0 0
	font-size: 0.82rem
	line-height: 1.4
	color: var(--color-text-primary, #212529)

	strong
		font-weight: 600

.cat-rev-fila__rotulo-categoria
	margin-right: 6px
	font-size: 0.75rem
	color: var(--color-text-secondary, #6c757d)

.cat-rev-fila__separador
	margin: 0 2px
	font-size: 0.65rem
	color: var(--color-text-secondary, #6c757d)

.cat-rev-fila__motivo
	margin: 0
	font-size: 0.8rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

.cat-rev-fila__acciones
	display: flex
	flex: 0 0 auto
	align-self: center
	gap: 8px

// Fila tildada: el celeste de siempre (--bg-nav-hover, con su variante oscura en el token).
.cat-rev-fila--seleccionada
	background: var(--bg-nav-hover, #e7f1ff)

.cat-rev-fila--procesando
	opacity: 0.55

// Telefono: las acciones bajan debajo de la fila, a lo ancho y con tamano de dedo.
@media (max-width: 575px)
	.cat-rev-fila
		flex-wrap: wrap
		gap: 10px 12px
		padding: 12px 2px

	// Al lado de la casilla, pero con un piso: si no entra, baja entero.
	.cat-rev-fila__cuerpo
		flex-basis: 160px

	.cat-rev-fila__acciones
		width: 100%

		// Tres clases: .btn-modulo--fila.btn (0,2,0) vive en una hoja global y fija 28px.
		.btn.btn-modulo
			flex: 1 1 0
			height: 36px
</style>
