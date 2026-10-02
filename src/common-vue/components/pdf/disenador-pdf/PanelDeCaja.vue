<template>
	<!--
		Propiedades de la caja seleccionada (plan §8.3): título, estilo (tres opciones con una mini
		vista previa), ancho (− N/12 +) y quitar. Todo se cambia EN EL LUGAR sobre la caja (la misma
		de la lista de trabajo): la hoja lo ve al instante. Los estilos de las clases dpdf-panel__*
		están en PanelDePropiedades.vue.
	-->
	<div class="dpdf-panel__cuerpo">
		<div class="dpdf-panel__bloque">
			<label
			for="dpdf-panel-titulo"
			class="dpdf-panel__etiqueta">Título</label>
			<input
			id="dpdf-panel-titulo"
			type="text"
			class="form-control form-control-sm"
			:value="caja.titulo"
			:maxlength="disenador.limites.max_titulo"
			placeholder="Sin título"
			autocomplete="off"
			data-testid="titulo-panel-disenador-pdf"
			@input="caja.titulo = $event.target.value">
			<small class="dpdf-panel__ayuda">Se imprime arriba de los campos, en negrita. Vacío: sin título.</small>
		</div>

		<div class="dpdf-panel__bloque">
			<span
			id="dpdf-panel-etiqueta-estilo"
			class="dpdf-panel__etiqueta">Estilo</span>
			<div
			class="dpdf-panel__estilos"
			role="radiogroup"
			aria-labelledby="dpdf-panel-etiqueta-estilo">
				<button
				v-for="estilo in disenador.limites.estilos_de_caja"
				:key="estilo"
				type="button"
				role="radio"
				class="dpdf-panel__estilo"
				:class="{ 'dpdf-panel__estilo--activo': caja.estilo === estilo }"
				:aria-checked="caja.estilo === estilo ? 'true' : 'false'"
				:data-testid="'estilo-' + estilo + '-panel-disenador-pdf'"
				@click="caja.estilo = estilo">
					<span
					class="dpdf-panel__muestra"
					:class="'dpdf-panel__muestra--' + estilo"
					aria-hidden="true">
						<span class="dpdf-panel__muestra-linea"></span>
						<span class="dpdf-panel__muestra-linea dpdf-panel__muestra-linea--corta"></span>
					</span>
					<span class="dpdf-panel__estilo-nombre">{{ nombre_del_estilo(estilo) }}</span>
				</button>
			</div>
			<small class="dpdf-panel__ayuda">{{ descripcion_del_estilo(caja.estilo) }}</small>
		</div>

		<div class="dpdf-panel__bloque">
			<span
			id="dpdf-panel-etiqueta-ancho"
			class="dpdf-panel__etiqueta">Ancho</span>
			<div
			class="dpdf-panel__paso"
			role="group"
			aria-labelledby="dpdf-panel-etiqueta-ancho">
				<button
				type="button"
				class="dpdf-panel__boton"
				:disabled="caja.cols <= 1"
				title="Achicar una columna"
				aria-label="Achicar la caja una columna"
				@click="cambiar_cols(-1)">
					<i class="bi bi-dash-lg"></i>
				</button>
				<span
				class="dpdf-panel__valor"
				aria-live="polite">{{ caja.cols }}/12</span>
				<button
				type="button"
				class="dpdf-panel__boton"
				:disabled="caja.cols >= 12"
				title="Agrandar una columna"
				aria-label="Agrandar la caja una columna"
				@click="cambiar_cols(1)">
					<i class="bi bi-plus-lg"></i>
				</button>
			</div>
			<small class="dpdf-panel__ayuda">
				{{ caja.campos.length }} {{ caja.campos.length === 1 ? 'campo' : 'campos' }}.
				Una caja que en un comprobante no tiene ningún dato no se imprime.
			</small>
		</div>

		<b-button
		variant="outline-danger"
		size="sm"
		class="dpdf-panel__quitar"
		data-testid="quitar-panel-disenador-pdf"
		@click="disenador.quitar_item(zona, caja)">
			<i class="bi bi-trash3"></i>
			Quitar caja
		</b-button>
	</div>
</template>
<script>
import { acotar_entero } from './estado_del_disenador'
import { nombre_del_estilo, descripcion_del_estilo } from './estilos_de_caja'

/**
 * Propiedades de una caja en el panel del diseñador de PDF (misión diseno-pdf-configurable,
 * 1/10/2026). Los estilos de caja posibles salen de `limites.estilos_de_caja` del catálogo.
 */
export default {
	name: 'PanelDeCaja',
	inject: ['disenador'],
	props: {
		/* Caja de trabajo seleccionada (se muta en el lugar) */
		caja: {
			type: Object,
			required: true,
		},
		/* Zona donde está: 'superior' | 'pie' (para quitarla) */
		zona: {
			type: String,
			required: true,
		},
	},
	methods: {
		/**
		 * Nombre de un estilo de caja.
		 *
		 * @param {string} estilo
		 * @returns {string}
		 */
		nombre_del_estilo(estilo) {
			return nombre_del_estilo(estilo)
		},
		/**
		 * Explicación de un estilo de caja.
		 *
		 * @param {string} estilo
		 * @returns {string}
		 */
		descripcion_del_estilo(estilo) {
			return descripcion_del_estilo(estilo)
		},
		/**
		 * Cambia el ancho de la caja una columna, acotado a 1..12.
		 *
		 * @param {number} paso -1 o 1
		 * @returns {void}
		 */
		cambiar_cols(paso) {
			this.caja.cols = acotar_entero(this.caja.cols + paso, 1, 12, this.caja.cols)
		},
	},
}
</script>
