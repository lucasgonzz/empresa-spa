<template>
	<!--
		Propiedades del bloque fijo de ARCA seleccionado: su descripción (del catálogo); en el del
		cliente, el ancho (− N/12 +, de cols_min a 12 según el catálogo, como el de una caja); y en el
		del pie, el interruptor "Mostrar el cuadro de importes" (decisión 4 del plan: el cuadro de
		importes se puede apagar, el QR y el CAE no). Los estilos de las clases dpdf-panel__* y
		dpdf-toggle están en PanelDePropiedades.vue.

		En un ticket de comandera (misión diseno-ticket-comandera, D8) los tres bloques van a lo ancho
		(ninguno cambia de ancho) y el interruptor del pie apaga el IVA (contenido o discriminado); el
		CAE y el QR salen siempre.
	-->
	<div class="dpdf-panel__cuerpo">
		<p
		v-if="descripcion"
		class="dpdf-panel__ayuda dpdf-panel__ayuda--parrafo">{{ descripcion }}</p>

		<!-- El ancho del bloque que cambia de ancho: lo mismo que − / + del bloque en la hoja -->
		<div
		v-if="redimensionable"
		class="dpdf-panel__bloque">
			<span
			id="dpdf-panel-etiqueta-ancho-fijo"
			class="dpdf-panel__etiqueta">Ancho</span>
			<div
			class="dpdf-panel__paso"
			role="group"
			aria-labelledby="dpdf-panel-etiqueta-ancho-fijo">
				<button
				type="button"
				class="dpdf-panel__boton"
				:disabled="cols <= cols_minimo"
				title="Achicar una columna"
				aria-label="Achicar el bloque una columna"
				@click="cambiar_cols(-1)">
					<i class="bi bi-dash-lg"></i>
				</button>
				<span
				class="dpdf-panel__valor"
				aria-live="polite">{{ cols }}/12</span>
				<button
				type="button"
				class="dpdf-panel__boton"
				:disabled="cols >= 12"
				title="Agrandar una columna"
				aria-label="Agrandar el bloque una columna"
				@click="cambiar_cols(1)">
					<i class="bi bi-plus-lg"></i>
				</button>
			</div>
			<small class="dpdf-panel__ayuda">
				De {{ cols_minimo }} a 12 columnas. Con menos de 12, al lado entra una caja.
			</small>
		</div>

		<!-- Toggle tipo iOS, mismo dibujo que el "En uso" del editor de Diseños de Vender -->
		<label
		v-if="tiene_importes"
		class="dpdf-toggle"
		for="dpdf-panel-importes">
			<input
			id="dpdf-panel-importes"
			type="checkbox"
			:checked="fijo.importes"
			data-testid="importes-panel-disenador-pdf"
			@change="fijo.importes = $event.target.checked">
			<span class="dpdf-toggle__pista">
				<span class="dpdf-toggle__perilla"></span>
			</span>
			<span class="dpdf-toggle__texto">{{ disenador.es_ticket ? 'Mostrar el IVA' : 'Mostrar el cuadro de importes' }}</span>
		</label>

		<p class="dpdf-panel__nota">
			<i
			class="bi bi-lock-fill"
			aria-hidden="true"></i>
			<span>{{ nota }}</span>
		</p>
	</div>
</template>
<script>
import { acotar_entero, cols_de_fijo, cols_minimo_de_fijo } from './estado_del_disenador'

/**
 * Propiedades de un bloque fijo de ARCA en el panel del diseñador de PDF (misión
 * diseno-pdf-configurable, 1/10/2026). El nombre, la descripción y si cambia de ancho (y desde
 * cuántas columnas) salen de `fijos` del catálogo. Se muta EN EL LUGAR, como el panel de la caja.
 */
export default {
	name: 'PanelDeFijo',
	inject: ['disenador'],
	props: {
		/* Bloque fijo de trabajo seleccionado: {tipo: 'fijo', key, (cols), (importes)} */
		fijo: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Definición del bloque en el catálogo, o null.
		 *
		 * @returns {Object|null}
		 */
		definicion() {
			return this.disenador.fijos_por_key[this.fijo.key] || null
		},
		/**
		 * Explicación del bloque, del catálogo.
		 *
		 * @returns {string}
		 */
		descripcion() {
			return this.definicion ? this.definicion.descripcion : ''
		},
		/**
		 * Si el bloque cambia de ancho (el del cliente, según el catálogo).
		 *
		 * @returns {boolean}
		 */
		redimensionable() {
			return !!(this.definicion && this.definicion.redimensionable)
		},
		/**
		 * Ancho mínimo: el `cols_min` del catálogo.
		 *
		 * @returns {number}
		 */
		cols_minimo() {
			return cols_minimo_de_fijo(this.definicion)
		},
		/**
		 * Columnas que ocupa: las suyas si cambia de ancho; si no, 12.
		 *
		 * @returns {number}
		 */
		cols() {
			let cols = cols_de_fijo(this.definicion, this.fijo.cols)
			return cols === null ? 12 : cols
		},
		/**
		 * Si el bloque tiene la opción del cuadro de importes (el del pie).
		 *
		 * @returns {boolean}
		 */
		tiene_importes() {
			return Object.prototype.hasOwnProperty.call(this.fijo, 'importes')
		},
		/**
		 * La nota del candado: qué se puede hacer con el bloque.
		 *
		 * @returns {string}
		 */
		nota() {
			if (this.redimensionable) {
				return 'Lo pide ARCA: se mueve dentro de su zona y cambia de ancho, pero no se saca.'
			}
			if (this.tiene_importes) {
				return 'Lo pide ARCA: se mueve dentro de su zona, pero no se saca. El QR y el CAE salen siempre.'
			}
			return 'Lo pide ARCA: se mueve dentro de su zona, pero no se saca.'
		},
	},
	methods: {
		/**
		 * Cambia el ancho del bloque una columna, acotado a cols_min..12 (del catálogo).
		 *
		 * @param {number} paso -1 o 1
		 * @returns {void}
		 */
		cambiar_cols(paso) {
			this.fijo.cols = acotar_entero(this.cols + paso, this.cols_minimo, 12, this.cols)
		},
	},
}
</script>
