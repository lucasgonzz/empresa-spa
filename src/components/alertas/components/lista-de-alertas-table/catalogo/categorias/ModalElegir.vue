<template>
<b-modal
id="categorias-elegir"
size="md"
centered
scrollable
title="Elegir este sistema de categorías"
@show="al_abrir"
@hidden="al_cerrar">

	<div
	v-if="propuesta"
	class="cat-modal"
	data-testid="categorias-modal-elegir"
	:data-propuesta="propuesta.id">

		<p class="cat-modal__intro">
			Vas a organizar tu catálogo con «{{ propuesta.nombre }}».
		</p>

		<!-- Lo que más importa de un vistazo: cuántos artículos quedan en su categoría. -->
		<div class="cat-modal__principal">
			<span
			class="cat-modal__cifra"
			data-testid="categorias-modal-ubicados"
			:data-valor="totales.seguros">
				{{ entero(totales.seguros) }}
			</span>
			<span class="cat-modal__cifra-etiqueta">
				{{ etiqueta_de_la_cifra }}
			</span>
		</div>

		<ul class="cat-modal__lista">
			<li v-if="es_mantener">
				No se cambia ninguna de tus categorías: solo se completan los artículos que hoy no tienen ninguna.
			</li>
			<template v-else>
				<li>
					El sistema tiene <strong>{{ entero(totales.categorias) }}</strong> {{ totales.categorias === 1 ? 'categoría' : 'categorías' }}
					y <strong>{{ entero(totales.subcategorias) }}</strong> {{ totales.subcategorias === 1 ? 'subcategoría' : 'subcategorías' }}:
					se crean las que tienen artículos para ubicar.
				</li>
				<li>
					Si ya tenés una categoría con el mismo nombre, se usa esa en vez de crear otra.
				</li>
			</template>
			<li
			v-if="totales.dudosos > 0"
			data-testid="categorias-modal-dudosos">
				<strong>{{ entero(totales.dudosos) }}</strong> {{ totales.dudosos === 1 ? 'artículo queda' : 'artículos quedan' }} para que {{ totales.dudosos === 1 ? 'lo revises' : 'los revises' }}:
				hasta que {{ totales.dudosos === 1 ? 'lo apruebes' : 'los apruebes' }}, no {{ totales.dudosos === 1 ? 'tiene' : 'tienen' }} categoría.
			</li>
			<li
			v-if="totales.sin_asignar > 0"
			data-testid="categorias-modal-sin-asignar">
				<strong>{{ entero(totales.sin_asignar) }}</strong> {{ totales.sin_asignar === 1 ? 'artículo queda' : 'artículos quedan' }} sin categoría porque la IA no pudo ubicarlo{{ totales.sin_asignar === 1 ? '' : 's' }}.
			</li>
		</ul>

		<!-- Artículos que hoy tienen categoría y quedarían sin ella hasta revisarse: lo más delicado. -->
		<div
		v-if="totales.pierden_categoria > 0"
		class="cat-modal__aviso cat-modal__aviso--aviso"
		data-testid="categorias-modal-pierden">
			<template v-if="totales.pierden_categoria === 1">
				1 artículo que hoy tiene categoría va a quedar sin ella hasta que lo revises.
			</template>
			<template v-else>
				{{ entero(totales.pierden_categoria) }} artículos que hoy tienen categoría van a quedar sin ella hasta que los revises.
			</template>
		</div>

		<div
		v-for="aviso in avisos"
		:key="aviso.codigo"
		class="cat-modal__aviso cat-modal__aviso--info"
		:data-testid="'categorias-modal-aviso-' + aviso.codigo">
			{{ aviso.texto }}
		</div>

		<!--
			Solo con un sistema nuevo y si el negocio ya tenía categorías: las que queden sin un solo
			artículo se quitan, así el menú de la tienda no muestra categorías vacías. Tildado por
			defecto (decisión de la misión): lo habitual es querer el menú limpio.
		-->
		<div
		v-if="muestra_el_tilde"
		class="cat-modal__opcion">
			<b-form-checkbox
			v-model="eliminar_vacias"
			data-testid="categorias-modal-eliminar-vacias">
				Eliminar las categorías anteriores que queden vacías
			</b-form-checkbox>
			<p class="cat-modal__opcion-pista">
				Las categorías que ya tenías y se queden sin artículos se quitan del menú de tu tienda.
			</p>
		</div>

		<!--
			Elegir es UN pedido que reescribe la categoría de los artículos: tarda unos segundos, frena un
			poco las ventas y las cargas del negocio mientras dura, y lo que alguien edite en ese lapso
			puede pisarse (B-04 y B-05). No se puede evitar desde acá: se avisa para que el dueño elija el
			momento. El mismo texto lo usa la confirmación de "Cambiar de sistema".
		-->
		<div
		class="cat-modal__aviso cat-modal__aviso--info"
		data-testid="categorias-modal-demora">
			<strong>{{ aviso_de_demora.titulo }}</strong>
			{{ aviso_de_demora.texto }}
		</div>

		<p class="cat-modal__nota">
			Si cambiás de idea, mientras no hayas revisado ni cambiado nada a mano podés volver atrás desde esta misma pantalla.
		</p>

	</div>

	<template #modal-footer>
		<b-button
		class="btn-modulo"
		variant="outline-secondary"
		data-testid="categorias-modal-cancelar"
		@click="cancelar">
			Cancelar
		</b-button>
		<b-button
		class="btn-modulo"
		variant="primary"
		data-testid="categorias-modal-confirmar"
		:disabled="!propuesta || ocupado || enviado"
		@click="confirmar">
			<b-spinner
			v-if="ocupado || enviado"
			small
			class="m-r-5"></b-spinner>
			Elegir este sistema
		</b-button>
	</template>

</b-modal>
</template>
<script>
import { AVISO_DE_DEMORA, advertencias_de_la_propuesta, entero_es } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'

/**
 * Confirmación de "Elegir este": muestra los números de lo que va a pasar antes de tocar el catálogo
 * (cuántos artículos quedan en su categoría, cuántos se revisan, cuántos quedan sin categoría y, lo
 * más delicado, cuántos pierden la categoría que hoy tienen), las advertencias que mande la API y, si
 * el negocio ya tenía categorías y el sistema es nuevo, la casilla para eliminar las anteriores que
 * queden vacías.
 *
 * Es un `b-modal` propio y no `$bvModal.msgBoxConfirm` (como las otras confirmaciones de Alertas)
 * porque tiene un control con estado adentro, la casilla, que una caja de mensaje armada con VNodes
 * no puede mantener. Conserva lo importante de `confirmar()` de la revisión: el botón se apaga apenas
 * se confirma, así que un doble clic no manda dos veces la elección.
 *
 * No habla con la API: avisa con `confirmar({propuesta_id, eliminar_categorias_vacias})` y quien la
 * orquesta (Index.vue) hace el pedido, con el cargando global. Las advertencias y el hecho de que el
 * negocio ya tuviera categorías los decide la API; acá solo se dibujan.
 *
 * Antes del botón también avisa que aplicar un sistema tarda unos segundos, que mientras tanto el sistema
 * puede ir más lento para vender o cargar y que nadie tiene que editar artículos hasta que termine
 * (B-04 y B-05): es un solo pedido que reescribe la categoría de los artículos, y el dueño es quien elige
 * el momento. El texto vive en textos.js (`AVISO_DE_DEMORA`) porque la confirmación de "Cambiar de
 * sistema" dice lo mismo.
 *
 * Props: `propuesta` (el sistema que se va a elegir, o null), `advertencias` (las de la corrida),
 * `tiene_categorias_previas` y `ocupado` (la elección ya viaja).
 */
export default {
	props: {
		/** El sistema que se va a elegir (la tarjeta normalizada), o null con el modal cerrado. */
		propuesta: {
			type: Object,
			default: null,
		},
		/** `advertencias` de la corrida (códigos): se muestran las que valen para este sistema. */
		advertencias: {
			type: Array,
			default: () => [],
		},
		/** `tiene_categorias_previas` de la corrida: el negocio ya tenía categorías. */
		tiene_categorias_previas: {
			type: Boolean,
			default: false,
		},
		/** true mientras la elección viaja a la API: el botón de confirmar queda apagado. */
		ocupado: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/** La casilla "Eliminar las categorías anteriores que queden vacías" (tildada por defecto). */
			eliminar_vacias: true,
			/** true desde que se confirmó hasta que el modal se vuelve a abrir: evita el doble clic. */
			enviado: false,
			/** Lo que hay que saber antes de aplicar (tarda, frena las ventas, que nadie edite): textos.js. */
			aviso_de_demora: AVISO_DE_DEMORA,
		}
	},
	computed: {
		es_mantener() {
			return !!this.propuesta && this.propuesta.tipo === 'mantener'
		},
		/** Los totales de la tarjeta (con ceros si todavía no hay una). */
		totales() {
			if (!this.propuesta) {
				return { categorias: 0, subcategorias: 0, articulos: 0, seguros: 0, dudosos: 0, sin_asignar: 0, pierden_categoria: 0 }
			}
			return this.propuesta.totales
		},
		/**
		 * Lo que dice la cifra grande.
		 *
		 * @returns {String}
		 */
		etiqueta_de_la_cifra() {
			let cantidad = this.totales.seguros
			if (this.es_mantener) {
				return cantidad === 1 ? 'artículo sin categoría se completa' : 'artículos sin categoría se completan'
			}
			return cantidad === 1 ? 'artículo queda en su categoría' : 'artículos quedan en su categoría'
		},
		/**
		 * Las advertencias que valen para este sistema, ya traducidas.
		 *
		 * @returns {Array<{codigo: String, texto: String}>}
		 */
		avisos() {
			return advertencias_de_la_propuesta(this.propuesta, this.advertencias)
		},
		/**
		 * La casilla de eliminar vacías solo tiene sentido con un sistema nuevo (en "Mantener las mías"
		 * no se toca ninguna categoría) y si el negocio ya tenía categorías.
		 *
		 * @returns {Boolean}
		 */
		muestra_el_tilde() {
			return !!this.propuesta && !this.es_mantener && this.tiene_categorias_previas
		},
	},
	methods: {
		/** Al abrir, todo como la primera vez: casilla tildada y botón disponible. */
		al_abrir() {
			this.eliminar_vacias = true
			this.enviado = false
		},
		al_cerrar() {
			this.enviado = false
		},
		cancelar() {
			this.$bvModal.hide('categorias-elegir')
		},
		/**
		 * Confirma. Se apaga el botón y se avisa una sola vez; el modal se cierra y el cargando global
		 * (que prende Index.vue) tapa la pantalla mientras la API aplica el sistema.
		 */
		confirmar() {
			if (!this.propuesta || this.ocupado || this.enviado) {
				return
			}
			this.enviado = true
			this.$emit('confirmar', {
				propuesta_id: this.propuesta.id,
				eliminar_categorias_vacias: this.muestra_el_tilde ? this.eliminar_vacias : false,
			})
			this.$bvModal.hide('categorias-elegir')
		},
		entero(valor) {
			return entero_es(valor)
		},
	},
}
</script>
<style lang="sass">
// Sin scope: el cuerpo de un b-modal cuelga de <body> (fuera de #app) y las reglas van todas
// prefijadas con cat-modal. Colores por token, con el literal de :root como respaldo.
.cat-modal
	display: flex
	flex-direction: column
	gap: 14px
	text-align: left

.cat-modal__intro
	margin: 0
	font-size: 0.9375rem
	line-height: 1.45
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.cat-modal__principal
	display: flex
	flex-direction: column
	align-items: center
	gap: 2px
	padding: 4px 0
	text-align: center

.cat-modal__cifra
	font-size: 2.4rem
	font-weight: 700
	line-height: 1.05
	letter-spacing: -0.02em
	color: var(--color-text-primary, #212529)
	font-variant-numeric: tabular-nums

.cat-modal__cifra-etiqueta
	font-size: 0.95rem
	font-weight: 600
	color: var(--color-text-primary, #212529)

.cat-modal__lista
	margin: 0
	padding: 0
	list-style: none
	display: flex
	flex-direction: column
	gap: 8px
	font-size: 0.875rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

	li
		position: relative
		padding-left: 14px

		// Un punto chico en vez de la vineta del navegador: mas liviano.
		&::before
			content: ''
			position: absolute
			left: 0
			top: 0.55em
			width: 5px
			height: 5px
			border-radius: 50%
			background: var(--color-border, #dee2e6)

	strong
		color: var(--color-text-primary, #212529)
		font-variant-numeric: tabular-nums

.cat-modal__aviso
	padding: 12px 14px
	border-radius: 12px
	font-size: 0.875rem
	line-height: 1.4

// Ambar: los dos tokens existen solo en html.dark-mode; en claro manda el literal del fallback.
.cat-modal__aviso--aviso
	background: var(--bg-warning-soft, rgba(255, 193, 7, 0.16))
	color: var(--color-text-warning-strong, #856404)

.cat-modal__aviso--info
	background: var(--bg-info-soft, rgba(23, 162, 184, 0.1))
	color: var(--color-text-info-strong, #0c5460)

.cat-modal__opcion
	padding: 12px 14px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)

.cat-modal__opcion-pista
	margin: 6px 0 0 24px
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

.cat-modal__nota
	margin: 0
	font-size: 0.8rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)
</style>
