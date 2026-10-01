<template>
	<!--
		Propiedades del bloque fijo de ARCA seleccionado: su descripción (del catálogo) y, en el del
		pie, el interruptor "Mostrar el cuadro de importes" (decisión 4 del plan: el cuadro de importes
		se puede apagar, el QR y el CAE no). Los estilos de las clases dpdf-panel__* y dpdf-toggle están
		en PanelDePropiedades.vue.
	-->
	<div class="dpdf-panel__cuerpo">
		<p
		v-if="descripcion"
		class="dpdf-panel__ayuda dpdf-panel__ayuda--parrafo">{{ descripcion }}</p>

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
			<span class="dpdf-toggle__texto">Mostrar el cuadro de importes</span>
		</label>

		<p class="dpdf-panel__nota">
			<i
			class="bi bi-lock-fill"
			aria-hidden="true"></i>
			<span>Lo pide ARCA: se mueve dentro de su zona, pero no se saca. El QR y el CAE salen siempre.</span>
		</p>
	</div>
</template>
<script>
/**
 * Propiedades de un bloque fijo de ARCA en el panel del diseñador de PDF (misión
 * diseno-pdf-configurable, 1/10/2026). El nombre y la descripción salen de `fijos` del catálogo.
 */
export default {
	name: 'PanelDeFijo',
	inject: ['disenador'],
	props: {
		/* Bloque fijo de trabajo seleccionado: {tipo: 'fijo', key, (importes)} */
		fijo: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Explicación del bloque, del catálogo.
		 *
		 * @returns {string}
		 */
		descripcion() {
			let definicion = this.disenador.fijos_por_key[this.fijo.key]
			return definicion ? definicion.descripcion : ''
		},
		/**
		 * Si el bloque tiene la opción del cuadro de importes (el del pie).
		 *
		 * @returns {boolean}
		 */
		tiene_importes() {
			return Object.prototype.hasOwnProperty.call(this.fijo, 'importes')
		},
	},
}
</script>
