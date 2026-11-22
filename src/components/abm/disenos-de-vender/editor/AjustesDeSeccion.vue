<template>
	<!--
		Panel de ajustes de una seccion del editor de Diseños de Vender (mision
		vender-secciones-personalizables, 22/11/2026). Se despliega debajo del header de la seccion
		(EtapaDelEditor.vue), sin popover, y cada cambio sube como un solo evento `ajuste`:

			{ tipo: 'meta', id, propiedad, valor }   titulo, descripcion, color o plegado
			{ tipo: 'alto', id, valor }              alto en doceavos (1..12)
			{ tipo: 'fijo', id, valor }              alto fijo (true) o automatico (false)
			{ tipo: 'columna_nueva' | 'banda_nueva' | 'apilar_campos' | 'quitar', id }

		que resuelve el editor (Index.vue) con operaciones_de_secciones.js. Los botones de las tres
		acciones traen `acciones[...]` ({ok, motivo}); si no se puede, el boton queda deshabilitado y el
		motivo se ve como texto debajo (un boton deshabilitado no muestra su title).

		Titulo y descripcion son texto del usuario: acá solo se leen y escriben en inputs (v-model),
		nunca se pintan como HTML.
	-->
	<div
	class="editor-ajustes"
	:class="'acento-' + seccion.color">

		<div class="editor-ajustes__fila">
			<label
			class="editor-ajustes__campo editor-ajustes__campo--ancho"
			:for="id_del_campo('titulo')">
				<span class="editor-ajustes__rotulo">Título</span>
				<input
				:id="id_del_campo('titulo')"
				type="text"
				class="form-control form-control-sm"
				:value="seccion.titulo"
				:placeholder="titulo_por_defecto"
				:maxlength="LARGO_DEL_TITULO"
				@input="cambiar_meta('titulo', $event.target.value)">
			</label>

			<label
			class="editor-ajustes__campo editor-ajustes__campo--ancho"
			:for="id_del_campo('descripcion')">
				<span class="editor-ajustes__rotulo">Descripción</span>
				<input
				:id="id_del_campo('descripcion')"
				type="text"
				class="form-control form-control-sm"
				:value="seccion.descripcion || ''"
				:placeholder="descripcion_automatica || 'Automática: lista los campos de la sección'"
				:maxlength="LARGO_DE_LA_DESCRIPCION"
				@input="cambiar_meta('descripcion', $event.target.value)">
			</label>
		</div>

		<div class="editor-ajustes__fila">
			<div class="editor-ajustes__campo">
				<span class="editor-ajustes__rotulo">Color</span>
				<div
				class="editor-ajustes__colores"
				role="radiogroup"
				aria-label="Color de la sección">
					<button
					v-for="color in COLORES"
					:key="color"
					type="button"
					role="radio"
					class="editor-ajustes__color"
					:class="['acento-' + color, { 'editor-ajustes__color--elegido': color === seccion.color }]"
					:aria-checked="color === seccion.color ? 'true' : 'false'"
					:aria-label="PALETA[color].nombre"
					:title="PALETA[color].nombre"
					@click="cambiar_meta('color', color)"></button>
				</div>
			</div>

			<div class="editor-ajustes__campo">
				<span class="editor-ajustes__rotulo">Alto</span>
				<div class="editor-ajustes__alto">
					<div
					class="editor-ajustes__segmentos"
					role="radiogroup"
					aria-label="Tipo de alto">
						<button
						type="button"
						role="radio"
						class="editor-ajustes__segmento"
						:class="{ 'editor-ajustes__segmento--elegido': seccion.alto_fijo }"
						:aria-checked="seccion.alto_fijo ? 'true' : 'false'"
						@click="$emit('ajuste', { tipo: 'fijo', id: etapa, valor: true })">
							Fijo
						</button>
						<button
						type="button"
						role="radio"
						class="editor-ajustes__segmento"
						:class="{ 'editor-ajustes__segmento--elegido': !seccion.alto_fijo }"
						:aria-checked="!seccion.alto_fijo ? 'true' : 'false'"
						@click="$emit('ajuste', { tipo: 'fijo', id: etapa, valor: false })">
							Automático
						</button>
					</div>

					<span
					v-if="seccion.alto_fijo"
					class="editor-ajustes__pasos">
						<button
						type="button"
						class="editor-ajustes__paso"
						:disabled="seccion.alto <= 1"
						aria-label="Achicar el alto"
						@click="$emit('ajuste', { tipo: 'alto', id: etapa, valor: seccion.alto - 1 })">
							<i class="bi bi-dash-lg"></i>
						</button>
						<span class="editor-ajustes__valor">{{ seccion.alto }}/12</span>
						<button
						type="button"
						class="editor-ajustes__paso"
						:disabled="seccion.alto >= 12"
						aria-label="Agrandar el alto"
						@click="$emit('ajuste', { tipo: 'alto', id: etapa, valor: seccion.alto + 1 })">
							<i class="bi bi-plus-lg"></i>
						</button>
					</span>
				</div>
			</div>

			<label
			class="editor-ajustes__campo"
			:for="id_del_campo('plegado')">
				<span class="editor-ajustes__rotulo">Plegable</span>
				<select
				:id="id_del_campo('plegado')"
				class="custom-select custom-select-sm"
				:disabled="!se_puede_plegar"
				@change="cambiar_meta('plegado', $event.target.value)">
					<option
					value="no"
					:selected="seccion.plegado === 'no'">No</option>
					<option
					value="si_hay_venta"
					:selected="seccion.plegado === 'si_hay_venta'">Sí, se pliega si la venta ya tiene datos</option>
					<option
					value="arranca_plegada"
					:selected="seccion.plegado === 'arranca_plegada'">Sí, arranca plegada</option>
				</select>
				<small
				v-if="!se_puede_plegar"
				class="editor-ajustes__motivo">{{ motivo_sin_plegar }}</small>
			</label>
		</div>

		<div class="editor-ajustes__acciones">
			<div class="editor-ajustes__accion">
				<b-button
				size="sm"
				:variant="accion('apilar_campos').sugerido ? 'outline-primary' : 'outline-secondary'"
				:disabled="!accion('apilar_campos').ok"
				@click="$emit('ajuste', { tipo: 'apilar_campos', id: etapa })">
					<i class="bi bi-distribute-vertical"></i>
					Poner los campos uno abajo del otro
				</b-button>
				<small
				v-if="!accion('apilar_campos').ok"
				class="editor-ajustes__motivo">{{ accion('apilar_campos').motivo }}</small>
				<small
				v-else-if="accion('apilar_campos').sugerido"
				class="editor-ajustes__motivo">La columna es angosta: conviene poner los campos uno abajo del otro.</small>
			</div>

			<div class="editor-ajustes__accion">
				<b-button
				size="sm"
				variant="outline-secondary"
				:disabled="!accion('columna_nueva').ok"
				@click="$emit('ajuste', { tipo: 'columna_nueva', id: etapa })">
					<i class="bi bi-layout-sidebar-inset-reverse"></i>
					Poner en una columna nueva a la derecha
				</b-button>
				<small
				v-if="!accion('columna_nueva').ok"
				class="editor-ajustes__motivo">{{ accion('columna_nueva').motivo }}</small>
			</div>

			<div class="editor-ajustes__accion">
				<b-button
				size="sm"
				variant="outline-secondary"
				:disabled="!accion('banda_nueva').ok"
				@click="$emit('ajuste', { tipo: 'banda_nueva', id: etapa })">
					<i class="bi bi-layout-text-window"></i>
					Bajar a una fila de secciones nueva
				</b-button>
				<small
				v-if="!accion('banda_nueva').ok"
				class="editor-ajustes__motivo">{{ accion('banda_nueva').motivo }}</small>
			</div>

			<div class="editor-ajustes__accion">
				<b-button
				size="sm"
				variant="outline-danger"
				:disabled="!accion('quitar').ok"
				@click="$emit('ajuste', { tipo: 'quitar', id: etapa })">
					<i class="bi bi-trash3"></i>
					Quitar sección
				</b-button>
				<small
				v-if="!accion('quitar').ok"
				class="editor-ajustes__motivo">{{ accion('quitar').motivo }}</small>
			</div>
		</div>
	</div>
</template>
<script>
import {
	COLORES,
	LARGO_DE_LA_DESCRIPCION,
	LARGO_DEL_TITULO,
	PALETA,
	SECCION_FIJA,
	titulo_por_defecto,
} from '@/components/vender/layout/secciones'

/**
 * Panel de ajustes de una seccion (mision vender-secciones-personalizables, 22/11/2026): titulo,
 * descripcion, color, alto fijo o automatico, si se pliega, y las acciones de columna, fila y quitar.
 * No cambia nada por su cuenta: todo sube como un evento `ajuste` (ver arriba).
 */
export default {
	name: 'AjustesDeSeccion',
	props: {
		/* Id de la seccion */
		etapa: {
			type: String,
			required: true,
		},
		/* Metadatos de la seccion: {titulo, descripcion, color, alto, alto_fijo, plegado} */
		seccion: {
			type: Object,
			required: true,
		},
		/* La descripcion automatica (la que se usa si no se escribe ninguna), de placeholder */
		descripcion_automatica: {
			type: String,
			default: '',
		},
		/* Que se puede hacer con la seccion: {columna_nueva, banda_nueva, apilar_campos, quitar}, cada uno {ok, motivo} */
		acciones: {
			type: Object,
			default: function () {
				return {}
			},
		},
	},
	data() {
		return {
			COLORES: COLORES,
			PALETA: PALETA,
			LARGO_DEL_TITULO: LARGO_DEL_TITULO,
			LARGO_DE_LA_DESCRIPCION: LARGO_DE_LA_DESCRIPCION,
		}
	},
	computed: {
		/**
		 * El titulo que tiene la seccion mientras el usuario no escriba otro (placeholder del input).
		 *
		 * @returns {string}
		 */
		titulo_por_defecto() {
			return titulo_por_defecto(this.etapa)
		},
		/**
		 * Si el select de "Plegable" se puede usar: una seccion de alto fijo no se pliega (dejaria un
		 * hueco en su columna) y la de la tabla de articulos tampoco.
		 *
		 * @returns {boolean}
		 */
		se_puede_plegar() {
			return !this.seccion.alto_fijo && this.etapa !== SECCION_FIJA
		},
		/**
		 * Por que no se puede plegar.
		 *
		 * @returns {string}
		 */
		motivo_sin_plegar() {
			return this.etapa === SECCION_FIJA
				? 'La tabla de artículos siempre está a la vista.'
				: 'Una sección de alto fijo no se pliega.'
		},
	},
	methods: {
		/**
		 * Id de un campo del panel, unico por seccion (para el for de cada label).
		 *
		 * @param {string} campo
		 * @returns {string}
		 */
		id_del_campo(campo) {
			return 'editor-ajustes-' + this.etapa + '-' + campo
		},
		/**
		 * Sube el cambio de un metadato de texto, color o plegado.
		 *
		 * @param {string} propiedad 'titulo' | 'descripcion' | 'color' | 'plegado'
		 * @param {string} valor
		 * @returns {void}
		 */
		cambiar_meta(propiedad, valor) {
			this.$emit('ajuste', { tipo: 'meta', id: this.etapa, propiedad: propiedad, valor: valor })
		},
		/**
		 * Si se puede hacer una accion (los botones quedan habilitados mientras el padre no diga lo
		 * contrario).
		 *
		 * @param {string} nombre 'columna_nueva' | 'banda_nueva' | 'quitar'
		 * @returns {{ok: boolean, motivo: (string|null), sugerido: (boolean|undefined)}}
		 */
		accion(nombre) {
			return this.acciones[nombre] || { ok: true, motivo: null }
		},
	},
}
</script>
<style lang="sass">
@import '@/components/abm/disenos-de-vender/_acentos_de_etapas'

// Sin `scoped`: vive dentro del modal del editor (colgado de <body>). Colores solo por token.
.editor-ajustes
	display: flex
	flex-direction: column
	gap: 10px
	padding: 10px 12px
	border-bottom: 1px solid var(--color-border-secondary)
	background: var(--bg-section)
	font-size: 0.8rem

.editor-ajustes__fila
	display: flex
	flex-wrap: wrap
	gap: 10px 16px
	align-items: flex-start

.editor-ajustes__campo
	display: flex
	flex-direction: column
	gap: 3px
	margin: 0
	min-width: 0

.editor-ajustes__campo--ancho
	flex: 1 1 200px

.editor-ajustes__rotulo
	color: var(--color-text-secondary)
	font-size: 0.72rem
	font-weight: 600

// Las siete muestras de color: circulos del color del acento, la elegida con un anillo
.editor-ajustes__colores
	display: flex
	flex-wrap: wrap
	gap: 6px

.editor-ajustes__color
	width: 24px
	height: 24px
	padding: 0
	border: 2px solid var(--bg-card)
	border-radius: 50%
	background: var(--acento-etapa)
	box-shadow: 0 0 0 1px var(--color-border)
	cursor: pointer

	&:hover
		box-shadow: 0 0 0 2px var(--color-border)

	&:focus-visible
		outline: 2px solid var(--color-primary)
		outline-offset: 2px

.editor-ajustes__color--elegido
	box-shadow: 0 0 0 2px var(--color-text-primary)

.editor-ajustes__alto
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 8px

// Fijo / Automatico: dos botones pegados
.editor-ajustes__segmentos
	display: inline-flex
	border: 1px solid var(--color-border)
	border-radius: 8px
	overflow: hidden

.editor-ajustes__segmento
	padding: 3px 10px
	border: 0
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-size: 0.78rem

	& + &
		border-left: 1px solid var(--color-border)

	&:hover
		background: var(--bg-nav-hover)

.editor-ajustes__segmento--elegido
	background: var(--color-primary)
	color: var(--bg-card)

	&:hover
		background: var(--color-primary)

.editor-ajustes__pasos
	display: inline-flex
	align-items: center
	gap: 6px

.editor-ajustes__paso
	display: inline-flex
	align-items: center
	justify-content: center
	width: 24px
	height: 24px
	padding: 0
	border: 1px solid var(--color-border)
	border-radius: 6px
	background: var(--bg-card)
	color: var(--color-text-primary)

	&:hover:not(:disabled)
		background: var(--bg-nav-hover)

	&:disabled
		opacity: .45

.editor-ajustes__valor
	min-width: 38px
	text-align: center
	font-weight: 600

.editor-ajustes__acciones
	display: flex
	flex-wrap: wrap
	gap: 8px 14px

.editor-ajustes__accion
	display: flex
	flex-direction: column
	gap: 3px
	max-width: 260px

	.btn
		border-radius: 8px
		text-align: left

.editor-ajustes__motivo
	color: var(--color-text-secondary)
	font-size: 0.72rem
</style>
