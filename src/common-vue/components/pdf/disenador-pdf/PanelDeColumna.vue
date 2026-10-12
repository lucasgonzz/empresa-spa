<template>
	<!--
		Propiedades de la columna de la tabla seleccionada (misión diseno-ticket-comandera, 9/10/2026;
		plan §7.2): el rótulo que imprime, el ancho (− N/24 +, de a media columna), "Salto de línea"
		si la opción lo permite y "Quitar de la tabla". Todo se cambia EN EL LUGAR sobre la columna (la
		misma de la tabla de trabajo): la hoja lo ve al instante. Los estilos de las clases
		dpdf-panel__* y dpdf-toggle están en PanelDePropiedades.vue.
	-->
	<div class="dpdf-panel__cuerpo">
		<p class="dpdf-panel__ayuda dpdf-panel__ayuda--parrafo">
			En {{ disenador.es_ticket ? 'el ticket' : 'el PDF' }} el encabezado de esta columna dice «{{ columna.rotulo }}».
		</p>

		<div class="dpdf-panel__bloque">
			<span
			id="dpdf-panel-etiqueta-ancho-columna"
			class="dpdf-panel__etiqueta">Ancho</span>
			<div
			class="dpdf-panel__paso"
			role="group"
			aria-labelledby="dpdf-panel-etiqueta-ancho-columna">
				<button
				type="button"
				class="dpdf-panel__boton"
				:disabled="columna.cols <= 1"
				title="Achicar media columna"
				aria-label="Achicar la columna media columna"
				data-testid="achicar-columna-panel-disenador-pdf"
				@click="disenador.cambiar_ancho_de_columna(columna, -1)">
					<i class="bi bi-dash-lg"></i>
				</button>
				<span
				class="dpdf-panel__valor"
				aria-live="polite"
				data-testid="ancho-columna-panel-disenador-pdf">{{ columna.cols }}/{{ total }}</span>
				<button
				type="button"
				class="dpdf-panel__boton"
				:disabled="columna.cols >= total"
				title="Agrandar media columna"
				aria-label="Agrandar la columna media columna"
				data-testid="agrandar-columna-panel-disenador-pdf"
				@click="disenador.cambiar_ancho_de_columna(columna, 1)">
					<i class="bi bi-plus-lg"></i>
				</button>
			</div>
			<small class="dpdf-panel__ayuda">{{ ayuda_del_ancho }}</small>
		</div>

		<!-- Toggle tipo iOS, como el del cuadro de importes: solo si la columna admite salto de línea -->
		<div
		v-if="columna.permite_salto"
		class="dpdf-panel__bloque">
			<label
			class="dpdf-toggle"
			for="dpdf-panel-salto-columna">
				<input
				id="dpdf-panel-salto-columna"
				type="checkbox"
				:checked="columna.salto"
				data-testid="salto-columna-panel-disenador-pdf"
				@change="disenador.alternar_salto_de_columna(columna)">
				<span class="dpdf-toggle__pista">
					<span class="dpdf-toggle__perilla"></span>
				</span>
				<span class="dpdf-toggle__texto">Salto de línea</span>
			</label>
			<small class="dpdf-panel__ayuda">
				{{ columna.salto ? 'Un texto largo sigue en el renglón de abajo.' : 'Un texto largo se corta al final de la columna.' }}
			</small>
		</div>

		<b-button
		variant="outline-danger"
		size="sm"
		class="dpdf-panel__quitar"
		data-testid="quitar-columna-panel-disenador-pdf"
		@click="disenador.quitar_columna(columna)">
			<i class="bi bi-trash3"></i>
			Quitar de la tabla
		</b-button>
	</div>
</template>
<script>
/**
 * Propiedades de una columna de la tabla en el panel del diseñador de PDF (misión
 * diseno-ticket-comandera, 9/10/2026). Las acciones (ancho con el tope de la fila, salto, quitar)
 * las resuelve el diseñador, que llega por `inject`.
 */
export default {
	name: 'PanelDeColumna',
	inject: ['disenador'],
	props: {
		/* Columna de trabajo seleccionada (ver tabla_del_disenador.js) */
		columna: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Medias columnas de la grilla de la tabla.
		 *
		 * @returns {number}
		 */
		total() {
			return this.disenador.total_de_la_tabla
		},
		/**
		 * La ayuda debajo del ancho: cuánto mide en esta hoja y cuánto queda libre en la fila.
		 *
		 * @returns {string}
		 */
		ayuda_del_ancho() {
			let libre = this.disenador.lugar_libre_en_la_tabla
			let texto = 'Unos ' + this.disenador.mm_de_columna(this.columna) + ' mm en esta hoja. '
			/* En un ticket: los caracteres que le tocan en la comandera (sin el espacio que la separa de la siguiente) */
			let en_el_rollo = this.disenador.es_ticket ? this.disenador.caracteres_de_columna(this.columna) : null
			if (en_el_rollo) {
				texto = en_el_rollo.contenido + (en_el_rollo.contenido === 1 ? ' carácter' : ' caracteres') + ' en la comandera. '
			}
			if (libre <= 0) {
				return texto + 'La tabla ocupa todo el ancho: para agrandarla, achicá otra columna.'
			}
			return texto + 'Quedan ' + libre + (libre === 1 ? ' media columna libre.' : ' medias columnas libres.')
		},
	},
}
</script>
