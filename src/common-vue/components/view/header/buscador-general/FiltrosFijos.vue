<template>
	<!--
		Barra de filtros fijos (prompt 06 del grupo 179): un control por cada filtro configurado
		en FiltroFijoModal.vue, renderizado a la par del pill del buscador general, con el mismo
		lenguaje visual (pill blanco chico, borde sutil, sombra leve). Es presentacional: no toca
		el store ni el $api, solo emite 'input' (cambio de valor), 'quitar' (boton x) y 'enter'
		(para que el orquestador dispare la busqueda igual que con el input principal).
	-->
	<div class="filtros-fijos" v-if="filtros && filtros.length">
		<div
		v-for="filtro in filtros"
		:key="filtro.key"
		class="filtros-fijos__item">

			<!-- Etiqueta con el nombre de la propiedad, para saber que se esta filtrando -->
			<span class="filtros-fijos__label">{{ filtro.text }}</span>

			<!-- Caso relacion: select con las opciones de la relacion (get_options_simple ya
				trae la primera opcion "Seleccione X" con value 0, igual que otros selects del
				sistema) -->
			<select
			v-if="filtro.filter_kind === 'relation'"
			class="filtros-fijos__select"
			:value="valorActual(filtro)"
			@change="onRelationChange(filtro, $event)"
			@keyup.enter="$emit('enter')">
				<option
				v-for="option in opcionesRelacion(filtro)"
				:key="option.value"
				:value="option.value">{{ option.text }}</option>
			</select>

			<!-- Caso comparacion numerica: etiqueta del operador en texto + input numerico -->
			<template v-else-if="filtro.filter_kind === 'numeric_comparison'">
				<span class="filtros-fijos__operator">{{ textoOperador(filtro.operator) }}</span>
				<input
				type="number"
				class="filtros-fijos__number"
				:value="valorActual(filtro)"
				@input="onNumberInput(filtro, $event)"
				@keyup.enter="$emit('enter')">
			</template>

			<!-- Caso presencia de valor: select con las 3 opciones fijas -->
			<select
			v-else-if="filtro.filter_kind === 'numeric_presence'"
			class="filtros-fijos__select"
			:value="valorActual(filtro)"
			@change="onPresenceChange(filtro, $event)"
			@keyup.enter="$emit('enter')">
				<option
				v-for="option in presence_options"
				:key="option.value"
				:value="option.value">{{ option.text }}</option>
			</select>

			<!-- Boton de quitar: discreto, aparece marcado al hover (ver estilos) -->
			<button
			type="button"
			class="filtros-fijos__remove"
			title="Quitar filtro"
			@click="$emit('quitar', { key: filtro.key })">×</button>
		</div>
	</div>
</template>
<script>
export default {
	/**
	 * FiltrosFijos — controles de los filtros fijos configurados por el usuario para el
	 * buscador general (relacion / comparacion numerica / presencia de valor), renderizados a
	 * la par del input de busqueda. Componente presentacional: recibe la configuracion y el
	 * valor actual de cada filtro por props, y emite 'input' / 'quitar' / 'enter' hacia el
	 * orquestador (Index.vue), que es quien arma el payload y persiste la configuracion.
	 */
	props: {
		/**
		 * Filtros configurados: [{ key, text, type, filter_kind, operator, default_value }].
		 */
		filtros: {
			type: Array,
			required: true,
		},

		/**
		 * Valor actual elegido para cada filtro, keyeado por `key`.
		 */
		values: {
			type: Object,
			required: true,
		},
	},
	computed: {
		/**
		 * Options fijas del select de "presencia de valor" (mismo criterio que
		 * FiltroFijoModal.vue: Todos / Con valor cargado / Con valor positivo).
		 *
		 * @returns {Array}
		 */
		presence_options() {
			return [
				{ value: 'todos', text: 'Todos' },
				{ value: 'con_valor', text: 'Con valor cargado' },
				{ value: 'positivo', text: 'Con valor positivo' },
			]
		},
	},
	methods: {
		/**
		 * Valor actual del filtro, ya inicializado por el orquestador en `values`. Defensivo:
		 * si por algun motivo todavia no esta la key, devuelve el valor neutro segun el tipo.
		 *
		 * @param {Object} filtro
		 * @returns {*}
		 */
		valorActual(filtro) {
			if (Object.prototype.hasOwnProperty.call(this.values, filtro.key)) {
				return this.values[filtro.key]
			}
			return this.valorNeutro(filtro)
		},

		/**
		 * Valor neutro (sin filtro activo) segun el filter_kind, mismo criterio que usa el
		 * orquestador para inicializar `filtros_values`.
		 *
		 * @param {Object} filtro
		 * @returns {*}
		 */
		valorNeutro(filtro) {
			if (filtro.filter_kind === 'relation') {
				return 0
			}
			if (filtro.filter_kind === 'numeric_comparison') {
				return ''
			}
			return 'todos'
		},

		/**
		 * Options del select de relacion, obtenidas del mixin generals (get_options_simple),
		 * a partir del modelo derivado de la key del filtro (ej: category_id -> category).
		 *
		 * @param {Object} filtro
		 * @returns {Array}
		 */
		opcionesRelacion(filtro) {
			return this.get_options_simple(this.modelNameFromRelationKey({ key: filtro.key }))
		},

		/**
		 * Texto legible del operador de comparacion, para mostrar al lado del input numerico
		 * (mismas opciones que ofrece FiltroFijoModal.vue al configurar el filtro).
		 *
		 * @param {String} operator
		 * @returns {String}
		 */
		textoOperador(operator) {
			let textos = {
				'=': 'Igual a',
				'>': 'Mayor a',
				'<': 'Menor a',
				'>=': 'Mayor o igual a',
				'<=': 'Menor o igual a',
			}
			return textos[operator] || 'Igual a'
		},

		/**
		 * Handler del select de relacion: emite 'input' con el value elegido (numero, id de la
		 * relacion o 0 para "Seleccione...").
		 *
		 * @param {Object} filtro
		 * @param {Event} event
		 * @return {void}
		 */
		onRelationChange(filtro, event) {
			this.$emit('input', { key: filtro.key, value: Number(event.target.value) })
		},

		/**
		 * Handler del input numerico de comparacion: emite 'input' con el valor tal cual lo
		 * tipeo el usuario (string vacio si lo borro, para que el orquestador lo pueda omitir).
		 *
		 * @param {Object} filtro
		 * @param {Event} event
		 * @return {void}
		 */
		onNumberInput(filtro, event) {
			this.$emit('input', { key: filtro.key, value: event.target.value })
		},

		/**
		 * Handler del select de presencia de valor: emite 'input' con la opcion elegida.
		 *
		 * @param {Object} filtro
		 * @param {Event} event
		 * @return {void}
		 */
		onPresenceChange(filtro, event) {
			this.$emit('input', { key: filtro.key, value: event.target.value })
		},
	},
}
</script>
<style lang="sass">
// Barra de filtros fijos: pills chicos, mismo lenguaje visual que el pill del buscador general.
.filtros-fijos
	display: flex
	align-items: center
	flex-wrap: wrap
	gap: 8px

	.filtros-fijos__item
		display: flex
		align-items: center
		gap: 6px
		background: #fff
		border: 1px solid #e2e4e7
		border-radius: 22px
		height: 40px
		padding: 0 10px
		box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px
		transition: border-color 0.15s ease, box-shadow 0.15s ease

		&:focus-within
			border-color: #007bff
			box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px, 0 0 0 3px rgba(0, 123, 255, 0.15)

	.filtros-fijos__label
		font-size: 0.78rem
		color: #86868b
		white-space: nowrap

	.filtros-fijos__operator
		font-size: 0.82rem
		color: #1d1d1f
		white-space: nowrap

	.filtros-fijos__select, .filtros-fijos__number
		border: none
		outline: none
		background: transparent
		font-size: 0.86rem
		color: #1d1d1f
		box-shadow: none
		padding: 0
		max-width: 120px

	.filtros-fijos__number
		width: 80px

	// Boton de quitar: discreto, solo se marca al hover del item entero
	.filtros-fijos__remove
		display: flex
		align-items: center
		justify-content: center
		width: 18px
		height: 18px
		border: none
		background: transparent
		border-radius: 50%
		color: #86868b
		font-size: 0.9rem
		line-height: 1
		cursor: pointer
		opacity: 0
		transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease

		&:hover
			background: #f2f3f4
			color: #1d1d1f

	.filtros-fijos__item:hover .filtros-fijos__remove
		opacity: 1
</style>
