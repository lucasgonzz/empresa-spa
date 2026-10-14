<template>
<li
class="desc-rev-fila"
:class="clases"
:data-testid="'descripciones-item-' + item.article_id"
:data-solapa="solapa"
:data-editando="editando ? 'si' : 'no'">

	<!-- La tilde para aprobar o descartar de a muchas: solo en "A revisar". -->
	<b-form-checkbox
	v-if="es_a_revisar"
	class="desc-rev-fila__tilde"
	:data-testid="'descripciones-tilde-' + item.article_id"
	:checked="seleccionado"
	:disabled="procesando"
	:aria-label="'Seleccionar ' + nombre"
	@change="$emit('seleccionar', $event)"></b-form-checkbox>

	<div class="desc-rev-fila__cuerpo">

		<div class="desc-rev-fila__cabeza">
			<span class="desc-rev-fila__nombre">{{ nombre }}</span>
			<span
			v-if="es_a_revisar"
			class="desc-etiqueta desc-etiqueta--aviso"
			:data-testid="'descripciones-dudosa-' + item.article_id">
				{{ textos.etiqueta_dudosa }}
			</span>
		</div>

		<div
		v-if="item.articulo.codigo_de_barras || item.articulo.codigo_de_proveedor"
		class="desc-rev-fila__meta">
			<span
			v-if="item.articulo.codigo_de_barras"
			class="desc-rev-fila__codigo"
			title="Código de barras"
			:data-testid="'descripciones-codigo-barras-' + item.article_id">
				<span class="desc-rev-fila__rotulo">Cód. barras</span>
				{{ item.articulo.codigo_de_barras }}
			</span>
			<span
			v-if="item.articulo.codigo_de_proveedor"
			class="desc-rev-fila__codigo"
			title="Código de proveedor"
			:data-testid="'descripciones-codigo-proveedor-' + item.article_id">
				<span class="desc-rev-fila__rotulo">Cód. proveedor</span>
				{{ item.articulo.codigo_de_proveedor }}
			</span>
		</div>

		<!--
			Edicion en el lugar: titulo y texto de cada seccion. Lo escrito vive en `borrador` (una copia):
			Cancelar lo tira y la fila vuelve a mostrar lo de siempre. Si guardar falla, lo escrito queda.
		-->
		<div
		v-if="editando"
		class="desc-rev-fila__edicion"
		:data-testid="'descripciones-edicion-' + item.article_id">
			<div
			v-for="(seccion, indice) in borrador"
			:key="'borrador-' + indice"
			class="desc-rev-fila__edicion-seccion">
				<div>
					<label
					class="desc-rev-fila__edicion-rotulo"
					:for="id_del_campo('titulo', indice)">Título</label>
					<b-form-input
					:id="id_del_campo('titulo', indice)"
					v-model="seccion.title"
					maxlength="191"
					autocomplete="off"
					:ref="indice === 0 ? 'primer_titulo' : null"
					:state="seccion.title.trim() ? null : false"
					:disabled="procesando"
					:data-testid="'descripciones-titulo-' + item.article_id + '-' + indice"></b-form-input>
				</div>
				<div>
					<label
					class="desc-rev-fila__edicion-rotulo"
					:for="id_del_campo('texto', indice)">Texto</label>
					<b-form-textarea
					:id="id_del_campo('texto', indice)"
					v-model="seccion.content"
					rows="3"
					max-rows="12"
					:state="seccion.content.trim() ? null : false"
					:disabled="procesando"
					:data-testid="'descripciones-texto-' + item.article_id + '-' + indice"></b-form-textarea>
				</div>
			</div>

			<p
			v-if="!borrador_valido"
			class="desc-rev-fila__edicion-aviso"
			:data-testid="'descripciones-edicion-incompleta-' + item.article_id">
				Cada sección necesita un título y un texto.
			</p>

			<div class="desc-rev-fila__edicion-pie">
				<b-button
				class="btn-modulo btn-modulo--fila"
				variant="outline-secondary"
				:data-testid="'descripciones-cancelar-' + item.article_id"
				:disabled="procesando"
				@click="$emit('cancelar_edicion')">
					Cancelar
				</b-button>
				<b-button
				class="btn-modulo btn-modulo--fila"
				variant="success"
				:data-testid="'descripciones-guardar-' + item.article_id"
				:disabled="procesando || !borrador_valido"
				@click="guardar">
					{{ es_a_revisar ? 'Guardar y aprobar' : 'Guardar' }}
				</b-button>
			</div>
		</div>

		<!-- Lo que armo la IA, tal cual se va a ver (o se ve) en la tienda y en la ficha. -->
		<div
		v-else
		class="desc-rev-fila__secciones">
			<div
			v-for="(seccion, indice) in item.secciones"
			:key="'seccion-' + indice"
			class="desc-rev-fila__seccion"
			:data-testid="'descripciones-seccion-' + item.article_id + '-' + indice">
				<p class="desc-rev-fila__seccion-titulo">{{ seccion.title }}</p>
				<p class="desc-rev-fila__seccion-texto">{{ seccion.content }}</p>
			</div>
		</div>

		<!--
			De donde saco la informacion la IA: un link por fuente, con el sitio como texto. Solo llegan
			las que tienen una URL http(s) (el store descarta el resto: un `javascript:` en el href se
			ejecutaria al hacerle clic).
		-->
		<div
		v-if="item.fuentes.length"
		class="desc-rev-fila__fuentes"
		:data-testid="'descripciones-origen-' + item.article_id">
			<span>{{ textos.de_donde }}</span>
			<a
			v-for="(fuente, indice) in item.fuentes"
			:key="fuente.url"
			:href="fuente.url"
			target="_blank"
			rel="noopener noreferrer"
			:title="fuente.title || fuente.url"
			:data-testid="'descripciones-fuente-' + item.article_id + '-' + indice">
				{{ fuente.sitio }}
				<i
				class="bi bi-box-arrow-up-right"
				aria-hidden="true"></i>
			</a>
		</div>

	</div>

	<!--
		Lo que borra a la izquierda y lo que avanza a la derecha, como en la revision de categorias:
		Aprobar es la unica en color lleno. Mientras se edita, las acciones son las del pie de la edicion.
	-->
	<div
	v-if="!editando"
	class="desc-rev-fila__acciones">
		<template v-if="es_a_revisar">
			<b-button
			class="btn-modulo btn-modulo--fila"
			variant="outline-danger"
			:data-testid="'descripciones-descartar-' + item.article_id"
			:disabled="procesando"
			@click="$emit('descartar')">
				Descartar
			</b-button>
			<b-button
			class="btn-modulo btn-modulo--fila"
			variant="outline-secondary"
			:data-testid="'descripciones-editar-' + item.article_id"
			:disabled="procesando"
			@click="$emit('editar')">
				<i
				class="bi bi-pencil desc-rev-fila__icono-boton"
				aria-hidden="true"></i>
				<span>Editar</span>
			</b-button>
			<b-button
			class="btn-modulo btn-modulo--fila"
			variant="success"
			:data-testid="'descripciones-aprobar-' + item.article_id"
			:disabled="procesando"
			@click="$emit('aprobar')">
				Aprobar
			</b-button>
		</template>
		<template v-else>
			<b-button
			class="btn-modulo btn-modulo--fila"
			variant="outline-danger"
			:data-testid="'descripciones-quitar-' + item.article_id"
			:disabled="procesando"
			@click="$emit('quitar')">
				Quitar
			</b-button>
			<b-button
			class="btn-modulo btn-modulo--fila"
			variant="outline-secondary"
			:data-testid="'descripciones-editar-' + item.article_id"
			:disabled="procesando"
			@click="$emit('editar')">
				<i
				class="bi bi-pencil desc-rev-fila__icono-boton"
				aria-hidden="true"></i>
				<span>Editar</span>
			</b-button>
		</template>
	</div>

</li>
</template>
<script>
import { TEXTOS } from '@/components/alertas/components/lista-de-alertas-table/catalogo/descripciones/textos'

/**
 * Un artículo de la revisión de descripciones: su nombre y códigos, las secciones (título y texto)
 * que armó la IA y de dónde sacó la información.
 *
 *  - En "A revisar" lleva la tilde, la etiqueta "La IA no está segura" y Descartar · Editar · Aprobar.
 *    Mientras no se apruebe, la descripción NO se ve en la tienda ni en la ficha (decisión D1).
 *  - En "Publicadas" lleva Quitar · Editar: son descripciones de IA que ya se ven.
 *
 * Editar abre en el lugar el título y el texto de cada sección sobre una COPIA (`borrador`): el
 * botón es "Guardar y aprobar" en A revisar y "Guardar" en Publicadas. Si quien mira cancela, la copia
 * se tira; si guardar falla, lo escrito queda para corregirlo y volver a intentar. Que esté abierta o
 * no lo decide la sección (`editando`), así una lista que se vuelve a pedir no la cierra sola.
 *
 * La acción en sí la hace la sección. Eventos: `seleccionar(bool)`, `aprobar`, `descartar`, `editar`,
 * `cancelar_edicion`, `guardar(secciones)` y `quitar`.
 */
export default {
	props: {
		/** Un artículo de la revisión (normalizado por el store). */
		item: {
			type: Object,
			required: true,
		},
		/** a_revisar | publicadas */
		solapa: {
			type: String,
			required: true,
		},
		/** true si está tildado para aprobar o descartar en lote. */
		seleccionado: {
			type: Boolean,
			default: false,
		},
		/** true mientras viaja una acción sobre este artículo. */
		procesando: {
			type: Boolean,
			default: false,
		},
		/** true mientras se edita en el lugar. */
		editando: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			textos: TEXTOS,
			/** Copia editable de las secciones, mientras `editando`. */
			borrador: [],
		}
	},
	computed: {
		es_a_revisar() {
			return this.solapa === 'a_revisar'
		},
		nombre() {
			return this.item.articulo.nombre || ('Artículo N° ' + this.item.article_id)
		},
		clases() {
			return {
				'desc-rev-fila--seleccionada': this.seleccionado,
				'desc-rev-fila--procesando': this.procesando,
				'desc-rev-fila--editando': this.editando,
			}
		},
		/**
		 * Lo que la API le pide a cada sección: título y texto, los dos sin vaciar. Con alguno vacío no se
		 * deja guardar, así que un 422 por eso no llega nunca. El otro límite del título (191 caracteres)
		 * lo pone el `maxlength` del campo, no esta cuenta. La cantidad de secciones no se mira acá: se
		 * editan las que vinieron, ni se agregan ni se sacan.
		 *
		 * @returns {Boolean}
		 */
		borrador_valido() {
			if (!this.borrador.length) {
				return false
			}
			return this.borrador.every(function (seccion) {
				return !!String(seccion.title || '').trim() && !!String(seccion.content || '').trim()
			})
		},
	},
	watch: {
		/**
		 * Al abrir la edición se copian las secciones de ese momento y el foco va al primer título; al
		 * cerrarla, la copia se tira.
		 */
		editando: {
			immediate: true,
			handler(valor) {
				if (!valor) {
					this.borrador = []
					return
				}
				let copia = []
				this.item.secciones.forEach(function (seccion) {
					copia.push({ id: seccion.id, title: seccion.title, content: seccion.content })
				})
				this.borrador = copia
				this.$nextTick(() => {
					let campo = this.$refs.primer_titulo
					let elemento = Array.isArray(campo) ? campo[0] : campo
					if (elemento && typeof elemento.focus === 'function') {
						elemento.focus()
					}
				})
			},
		},
	},
	methods: {
		/**
		 * Id único de un campo de la edición, para atar su `<label>`.
		 *
		 * @param {String} campo titulo | texto
		 * @param {Number} indice
		 * @returns {String}
		 */
		id_del_campo(campo, indice) {
			return 'desc-rev-' + campo + '-' + this.item.article_id + '-' + indice
		},
		/** Manda lo escrito, sin los espacios de las puntas. */
		guardar() {
			if (!this.borrador_valido || this.procesando) {
				return
			}
			let secciones = []
			this.borrador.forEach(function (seccion) {
				secciones.push({
					id: seccion.id,
					title: String(seccion.title || '').trim(),
					content: String(seccion.content || '').trim(),
				})
			})
			this.$emit('guardar', secciones)
		},
	},
}
</script>
<style lang="sass">
// Sin scope: prefijo desc-rev-fila, colores por token con el literal de :root como respaldo (asi el
// modo oscuro los cambia solos). Lista con separadores finos, sin tarjetas, igual que la revision de
// categorias.
.desc-rev-fila
	display: flex
	flex-direction: row
	align-items: flex-start
	gap: 14px
	padding: 16px 6px
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)
	text-align: left
	transition: background 0.15s ease, opacity 0.15s ease

.desc-rev-fila__tilde
	flex: 0 0 auto
	padding-top: 2px
	margin-right: -8px

.desc-rev-fila__cuerpo
	display: flex
	flex-direction: column
	gap: 6px
	flex: 1 1 0
	min-width: 0

.desc-rev-fila__cabeza
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 6px 10px

.desc-rev-fila__nombre
	font-size: 0.9375rem
	font-weight: 600
	line-height: 1.3
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.desc-rev-fila__meta
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 4px 12px
	font-size: 0.8rem
	color: var(--color-text-secondary, #6c757d)

.desc-rev-fila__codigo
	font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace
	font-size: 0.78rem
	font-variant-numeric: tabular-nums
	overflow-wrap: anywhere

// "Cod. barras" / "Cod. proveedor": el rotulo en la tipografia comun, apagado, para que el numero se lea primero.
.desc-rev-fila__rotulo
	font-family: inherit
	font-size: 0.72rem
	margin-right: 4px
	color: var(--color-text-secondary, #6c757d)
	opacity: 0.85

// Etiqueta ambar "La IA no esta segura": los dos tokens existen solo en html.dark-mode; en claro manda
// el literal del respaldo (los mismos de .cat-etiqueta--aviso de categorias).
.desc-etiqueta
	display: inline-flex
	align-items: center
	max-width: 100%
	padding: 2px 8px
	border-radius: 999px
	font-size: 0.72rem
	font-weight: 600
	line-height: 1.35
	white-space: normal

.desc-etiqueta--aviso
	background: var(--bg-warning-soft, rgba(255, 193, 7, 0.16))
	color: var(--color-text-warning-strong, #856404)

// Las secciones: un bloque apenas sombreado con un filete a la izquierda, para que se lea como "lo que
// va a decir la descripcion" y no como datos de la fila.
.desc-rev-fila__secciones
	display: flex
	flex-direction: column
	gap: 8px
	margin-top: 2px
	padding: 10px 12px
	border-left: 3px solid var(--color-border, #dee2e6)
	border-radius: 0 6px 6px 0
	background: var(--bg-section, #f8f9fa)

.desc-rev-fila__seccion-titulo
	margin: 0 0 2px
	font-size: 0.8rem
	font-weight: 700
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

// pre-line: los renglones que escribio la IA (o la persona al editar) se respetan.
.desc-rev-fila__seccion-texto
	margin: 0
	font-size: 0.86rem
	line-height: 1.5
	color: var(--color-text-primary, #212529)
	white-space: pre-line
	overflow-wrap: anywhere

.desc-rev-fila__fuentes
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 4px 10px
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)

	a
		color: var(--color-primary, #007bff)
		text-decoration: none
		overflow-wrap: anywhere

		&:hover
			text-decoration: underline

		i
			font-size: 0.7rem

.desc-rev-fila__acciones
	display: flex
	flex: 0 0 auto
	align-self: center
	gap: 8px

.desc-rev-fila__icono-boton
	margin-right: 6px

// Edicion en el lugar: un recuadro con el borde del sistema, los campos a lo ancho y el pie a la derecha.
.desc-rev-fila__edicion
	display: flex
	flex-direction: column
	gap: 12px
	padding: 10px 12px
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 8px
	background: var(--bg-card, #fff)

.desc-rev-fila__edicion-seccion
	display: flex
	flex-direction: column
	gap: 6px

	& + &
		padding-top: 12px
		border-top: 1px solid var(--color-border-secondary, #e9ecef)

	textarea
		line-height: 1.45
		resize: vertical

.desc-rev-fila__edicion-rotulo
	display: block
	margin-bottom: 3px
	font-size: 0.74rem
	font-weight: 600
	color: var(--color-text-secondary, #6c757d)

.desc-rev-fila__edicion-aviso
	margin: 0
	font-size: 0.8rem
	color: var(--btn-peligro-texto, #9c3a36)

.desc-rev-fila__edicion-pie
	display: flex
	flex-wrap: wrap
	justify-content: flex-end
	gap: 8px

// Fila tildada: el celeste de siempre (--bg-nav-hover, con su variante oscura en el token).
.desc-rev-fila--seleccionada
	background: var(--bg-nav-hover, #e7f1ff)

.desc-rev-fila--procesando
	opacity: 0.55

// Telefono: las acciones bajan debajo de la fila, a lo ancho y con tamano de dedo (36 px, como en
// categorias); el pie de la edicion, igual.
@media (max-width: 575px)
	.desc-rev-fila
		flex-wrap: wrap
		gap: 10px 12px
		padding: 14px 2px

	// Al lado de la casilla, pero con un piso: si no entra, baja entero.
	.desc-rev-fila__cuerpo
		flex-basis: 200px

	.desc-rev-fila__acciones
		width: 100%

	// Tres clases: .btn-modulo--fila.btn (0,2,0) vive en una hoja global y fija 28px.
	.desc-rev-fila__acciones .btn.btn-modulo,
	.desc-rev-fila__edicion-pie .btn.btn-modulo
		flex: 1 1 0
		height: 36px
</style>
