<template>
	<!--
		Bandeja de "Campos sacados" del editor: a la derecha del lienzo en escritorio, debajo en
		tablet y telefono (lo decide Index.vue).

		Arriba, la fuente del Separador: se arrastra a una etapa y se CLONA (pull: 'clone'), asi se
		pueden poner todos los que se quiera. Debajo, los campos sacados que este negocio puede usar:
		se arrastran de vuelta a cualquier etapa, o se tocan con "Agregar" y vuelven a su etapa de
		siempre. Y se puede soltar aca cualquier campo que no sea obligatorio para sacarlo.
	-->
	<aside
	class="editor-bandeja"
	:class="clases"
	aria-label="Campos sacados">

		<div class="editor-bandeja__cabecera">
			<span class="editor-bandeja__titulo">
				<i class="bi bi-inbox"></i>
				Campos sacados
			</span>
			<span
			v-if="sacados.length"
			class="editor-bandeja__contador"
			:aria-label="sacados.length + (sacados.length === 1 ? ' campo sacado' : ' campos sacados')">{{ sacados.length }}</span>
		</div>

		<p class="editor-bandeja__ayuda">
			No se ven en Vender. Para volver a usar uno, arrastralo a una etapa o tocá <strong>Agregar</strong>.
		</p>

		<!-- Fuente del separador: se clona, nunca se vacia ni recibe nada -->
		<draggable
		class="editor-bandeja__fuente"
		:list="fuente_de_separadores"
		:group="grupo_de_la_fuente"
		:clone="clonar_separador"
		:sort="false"
		:move="move"
		draggable=".editor-diseno-arrastrable"
		filter=".editor-diseno-no-arrastra"
		:prevent-on-filter="false"
		ghost-class="editor-diseno-hueco"
		drag-class="editor-diseno-levantado"
		:force-fallback="true"
		:fallback-on-body="true"
		:fallback-tolerance="4"
		:delay="150"
		:delay-on-touch-only="true"
		:scroll-sensitivity="80"
		:scroll-speed="14"
		data-zona="fuente"
		@start="$emit('inicio-arrastre', $event)"
		@end="$emit('fin-arrastre', $event)">
			<div
			v-for="item in fuente_de_separadores"
			:key="item.id"
			class="editor-bandeja__item editor-diseno-arrastrable"
			data-cols="12"
			data-key="separador"
			data-obligatorio="no"
			title="Arrastralo a una etapa para dividirla con una línea">
				<div class="editor-bandeja__tarjeta editor-bandeja__tarjeta--separador editor-diseno-caja">
					<i class="bi bi-grip-vertical editor-bandeja__agarre"></i>
					<span class="editor-bandeja__nombre">Separador</span>
					<span class="editor-bandeja__linea"></span>
					<span class="editor-bandeja__pista">Arrastralo a una etapa</span>
				</div>
			</div>
		</draggable>

		<!-- Los campos sacados -->
		<div class="editor-bandeja__zona">
			<draggable
			class="editor-bandeja__lista"
			:list="sacados"
			:group="grupo"
			:move="move"
			:animation="150"
			draggable=".editor-diseno-arrastrable"
			filter=".editor-diseno-no-arrastra"
			:prevent-on-filter="false"
			ghost-class="editor-diseno-hueco"
			drag-class="editor-diseno-levantado"
			:force-fallback="true"
			:fallback-on-body="true"
			:fallback-tolerance="4"
			:delay="150"
			:delay-on-touch-only="true"
			:scroll-sensitivity="80"
			:scroll-speed="14"
			data-zona="bandeja"
			@start="$emit('inicio-arrastre', $event)"
			@end="$emit('fin-arrastre', $event)"
			@change="al_cambiar">
				<div
				v-for="item in sacados"
				:key="item.key"
				class="editor-bandeja__item editor-diseno-arrastrable"
				:class="{ 'editor-bandeja__item--destacado': destacado === item.key }"
				:data-cols="item.cols"
				:data-key="item.key"
				data-obligatorio="no">
					<div class="editor-bandeja__tarjeta editor-diseno-caja">
						<i class="bi bi-grip-vertical editor-bandeja__agarre"></i>
						<span
						class="editor-bandeja__nombre"
						:title="nombre(item.key)">{{ nombre(item.key) }}</span>
						<button
						type="button"
						class="editor-bandeja__agregar editor-diseno-no-arrastra"
						:title="'Volver a ponerlo en «' + etapa_por_defecto(item.key) + '»'"
						:aria-label="'Agregar ' + nombre(item.key) + ' a ' + etapa_por_defecto(item.key)"
						@click="$emit('agregar', item)">
							<i class="bi bi-plus-lg"></i>
							Agregar
						</button>
					</div>
				</div>
			</draggable>

			<!-- Bandeja vacia: el texto queda encima de la zona de soltar sin tapar el arrastre -->
			<div
			v-if="!sacados.length && !rechaza"
			class="editor-bandeja__vacia">
				<i class="bi bi-box-arrow-in-down"></i>
				<span>{{ recibe ? 'Soltalo acá para sacarlo de Vender' : 'Arrastrá acá un campo para sacarlo de Vender' }}</span>
			</div>

			<!-- Se esta arrastrando un obligatorio: la bandeja lo dice antes de que lo suelten -->
			<div
			v-if="rechaza"
			class="editor-bandeja__rechazo"
			role="status">
				<i class="bi bi-lock-fill"></i>
				<span>{{ motivo_del_rechazo }}</span>
			</div>
		</div>
	</aside>
</template>
<script>
import draggable from 'vuedraggable'
import { KEY_SEPARADOR, TITULOS_DE_ETAPAS, elemento } from '@/components/vender/layout/elementos'
import { nuevo_id_de_separador } from '@/components/vender/layout/resolver_diseno'

/* Mismo grupo que las etapas (EtapaDelEditor.vue): los campos van y vienen entre todos */
const GRUPO = {
	name: 'diseno-de-vender',
	pull: true,
	put: true,
}

/* La fuente del separador: se CLONA al arrastrarla y no recibe nada */
const GRUPO_DE_LA_FUENTE = {
	name: 'diseno-de-vender',
	pull: 'clone',
	put: false,
}

/**
 * Bandeja de campos sacados del editor de diseños (mision diseno-vender-configurable, 28/9/2026).
 *
 * Igual que las etapas, recibe su lista de trabajo (`sacados`) y la deja mutar a vuedraggable por
 * referencia. Dos reglas viven aca:
 * - Un separador que se suelta en la bandeja se descarta (al_cambiar): los separadores no se
 *   "sacan", se quitan.
 * - Un obligatorio no se puede soltar aca: lo rechaza el `move` del editor, y mientras se arrastra
 *   uno la bandeja muestra el candado con el motivo (`arrastrando`).
 */
export default {
	name: 'BandejaDeSacados',
	components: {
		draggable,
	},
	props: {
		/* Campos sacados disponibles, {key, cols} (los muta vuedraggable) */
		sacados: {
			type: Array,
			required: true,
		},
		/* Funcion `move` de vuedraggable (la del editor) */
		move: {
			type: Function,
			default: null,
		},
		/* Lo que se esta arrastrando ahora, {key, obligatorio, desde}, o null */
		arrastrando: {
			type: Object,
			default: null,
		},
		/* Key del sacado que hay que resaltar un momento (recien sacado con la ✕), o null */
		destacado: {
			type: String,
			default: null,
		},
	},
	data() {
		return {
			grupo: GRUPO,
			grupo_de_la_fuente: GRUPO_DE_LA_FUENTE,
			/* Un solo item: el que se ve. Cada arrastre inserta un clon con id propio (clonar_separador) */
			fuente_de_separadores: [
				{
					key: KEY_SEPARADOR,
					id: 'fuente',
					cols: 12,
				},
			],
		}
	},
	computed: {
		/**
		 * Si se esta arrastrando un obligatorio desde una etapa: la bandeja no lo va a aceptar.
		 *
		 * @returns {boolean}
		 */
		rechaza() {
			return !!(this.arrastrando && this.arrastrando.obligatorio)
		},
		/**
		 * Si se esta arrastrando un campo de una etapa que SI se puede sacar: la bandeja se ofrece.
		 *
		 * @returns {boolean}
		 */
		recibe() {
			return !!(this.arrastrando && !this.arrastrando.obligatorio && this.arrastrando.desde === 'etapa')
		},
		/**
		 * Motivo del candado del obligatorio que se esta arrastrando.
		 *
		 * @returns {string}
		 */
		motivo_del_rechazo() {
			let el = this.arrastrando ? elemento(this.arrastrando.key) : null
			return (el && el.motivo_obligatorio) || 'Este campo no se puede sacar.'
		},
		/**
		 * Clases de estado de la bandeja.
		 *
		 * @returns {Object}
		 */
		clases() {
			return {
				'editor-bandeja--rechaza': this.rechaza,
				'editor-bandeja--recibe': this.recibe,
			}
		},
	},
	methods: {
		/**
		 * Nombre de un campo del catalogo.
		 *
		 * @param {string} key
		 * @returns {string}
		 */
		nombre(key) {
			let el = elemento(key)
			return el ? el.nombre : key
		},
		/**
		 * Titulo de la etapa a la que vuelve un campo con "Agregar".
		 *
		 * @param {string} key
		 * @returns {string}
		 */
		etapa_por_defecto(key) {
			let el = elemento(key)
			return el ? TITULOS_DE_ETAPAS[el.etapa] : ''
		},
		/**
		 * Lo que vuedraggable inserta en la etapa al soltar el separador de la fuente: uno nuevo, con
		 * un id propio que cumple el patron que valida el backend.
		 *
		 * @returns {Object}
		 */
		clonar_separador() {
			return {
				key: KEY_SEPARADOR,
				id: nuevo_id_de_separador(),
				cols: 12,
			}
		},
		/**
		 * Cambio en la lista de la bandeja. Si lo que llego es un separador, se descarta: la bandeja
		 * guarda campos para volver a usar, y un separador se vuelve a sacar de la fuente.
		 *
		 * @param {Object} evento {added: {element, newIndex}} | {removed} | {moved}
		 * @returns {void}
		 */
		al_cambiar(evento) {
			if (!evento || !evento.added || !evento.added.element) {
				return
			}
			if (evento.added.element.key !== KEY_SEPARADOR) {
				return
			}
			let indice = this.sacados.indexOf(evento.added.element)
			if (indice !== -1) {
				this.sacados.splice(indice, 1)
			}
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: el clon de Sortable que sigue al puntero cuelga de <body> (ver EtapaDelEditor.vue).
// Colores solo por token.
.editor-bandeja
	display: flex
	flex-direction: column
	gap: 10px
	padding: 14px
	border: 1px solid var(--color-border)
	border-radius: 12px
	background: var(--bg-card)
	transition: border-color .15s ease, box-shadow .15s ease

.editor-bandeja__cabecera
	display: flex
	align-items: center
	justify-content: space-between
	gap: 8px

.editor-bandeja__titulo
	display: inline-flex
	align-items: center
	gap: 8px
	font-size: 0.92rem
	font-weight: 700
	color: var(--color-text-primary)

.editor-bandeja__contador
	min-width: 24px
	padding: 1px 8px
	border-radius: 999px
	background: var(--bg-section)
	color: var(--color-text-secondary)
	font-size: 0.75rem
	font-weight: 600
	text-align: center

.editor-bandeja__ayuda
	margin: 0
	color: var(--color-text-secondary)
	font-size: 0.76rem
	line-height: 1.4

.editor-bandeja__fuente
	display: flex
	flex-direction: column

// La zona de soltar: el texto de vacia y el del rechazo van encima, sin tapar el arrastre
.editor-bandeja__zona
	position: relative

.editor-bandeja__lista
	position: relative
	z-index: 1
	display: flex
	flex-direction: column
	gap: 8px
	min-height: 84px
	padding: 6px
	border: 1.5px dashed var(--color-border)
	border-radius: 10px
	transition: border-color .15s ease, background .15s ease

	// Un campo de una etapa que pasa por aca, mientras se arrastra: un renglon, no la tarjeta entera
	> .editor-elemento.editor-diseno-hueco
		height: 40px
		overflow: hidden

.editor-bandeja__item
	min-width: 0

.editor-bandeja__tarjeta
	display: flex
	align-items: center
	gap: 8px
	min-width: 0
	padding: 7px 8px 7px 8px
	border: 1px solid var(--color-border)
	border-radius: 10px
	background: var(--bg-card)
	cursor: grab
	user-select: none
	transition: border-color .15s ease

	&:hover
		border-color: var(--color-primary)

.editor-bandeja__agarre
	flex: 0 0 auto
	color: var(--color-text-secondary)
	font-size: 0.8rem

.editor-bandeja__nombre
	flex: 1 1 auto
	min-width: 0
	font-size: 0.8rem
	font-weight: 600
	color: var(--color-text-primary)
	white-space: nowrap
	overflow: hidden
	text-overflow: ellipsis

// La fuente del separador: punteada, como los separadores del lienzo
.editor-bandeja__tarjeta--separador
	border-style: dashed

	.editor-bandeja__nombre
		flex: 0 0 auto
		font-weight: 500
		color: var(--color-text-secondary)

.editor-bandeja__linea
	flex: 1 1 auto
	min-width: 16px
	height: 0
	border-top: 1px solid var(--color-border)

.editor-bandeja__pista
	flex: 0 0 auto
	color: var(--color-text-secondary)
	font-size: 0.7rem
	white-space: nowrap

.editor-bandeja__agregar
	display: inline-flex
	align-items: center
	gap: 4px
	flex: 0 0 auto
	padding: 3px 9px
	border: 1px solid var(--color-border)
	border-radius: 999px
	background: var(--bg-card)
	color: var(--color-primary)
	font-size: 0.74rem
	font-weight: 600
	line-height: 1.3
	cursor: pointer
	transition: background .15s ease, border-color .15s ease

	&:hover
		background: var(--bg-nav-hover)
		border-color: var(--color-primary)

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)
		border-color: var(--color-primary)

// Recien sacado con la ✕: un destello para encontrarlo en la bandeja
.editor-bandeja__item--destacado .editor-bandeja__tarjeta
	animation: editor-elemento-destello 1.4s ease

// Los dos textos van ENCIMA de la lista (z-index 2) pero no la tapan para el arrastre: sin eventos
// de puntero, Sortable (que busca el destino con elementFromPoint) los saltea y encuentra la lista.
// Tienen que ir encima porque mientras se ofrece como destino la lista se pinta de fondo.
.editor-bandeja__vacia,
.editor-bandeja__rechazo
	position: absolute
	top: 0
	left: 0
	right: 0
	bottom: 0
	z-index: 2
	display: flex
	align-items: center
	justify-content: center
	gap: 8px
	padding: 10px 14px
	color: var(--color-text-secondary)
	font-size: 0.78rem
	line-height: 1.35
	text-align: center
	pointer-events: none

	i
		flex: 0 0 auto
		font-size: 1rem

// El rechazo ademas TAPA los sacados (tiene fondo): mientras se arrastra un obligatorio, lo unico
// que importa de la bandeja es que ahi no se puede soltar
.editor-bandeja__rechazo
	border-radius: 10px
	background: var(--bg-section)
	color: var(--color-text-primary)
	font-weight: 600

// Mientras se arrastra un campo que se puede sacar: la bandeja se ofrece como destino
.editor-bandeja--recibe
	border-color: var(--color-primary)

	.editor-bandeja__lista
		border-color: var(--color-primary)
		background: var(--bg-nav-hover)

	// El texto de vacia baja al fondo: arriba es donde aparece el hueco del campo que se suelta
	.editor-bandeja__vacia
		align-items: flex-end
		color: var(--color-primary)

// Mientras se arrastra un obligatorio: la bandeja se apaga
.editor-bandeja--rechaza
	.editor-bandeja__lista
		border-color: var(--color-border)

// Con el hueco adentro, el texto de vacia se corre del todo (:has() es mejora progresiva)
.editor-bandeja__zona:has(.editor-diseno-hueco) .editor-bandeja__vacia
	opacity: 0
</style>
