<template>
	<!--
		Barra de filtros fijos (prompt 06 del grupo 179): un control por cada filtro configurado
		en FiltroFijoModal.vue, renderizado a la par del pill del buscador general, con el mismo
		lenguaje visual (pill blanco chico, borde sutil, sombra leve). Es casi presentacional: no
		toca el $api y lo unico que hace con el store es pedir el catalogo liviano de las relaciones
		(asegurar_catalogos); fuera de eso solo emite 'input' (cambio de valor), 'quitar' (boton x)
		y 'enter' (para que el orquestador dispare la busqueda igual que con el input principal).
	-->
	<div class="filtros-fijos" v-if="filtros && filtros.length">
		<div
		v-for="filtro in filtros"
		:key="filtro.key"
		class="filtros-fijos__item">

			<!-- Etiqueta con el nombre de la propiedad, para saber que se esta filtrando -->
			<span class="filtros-fijos__label">{{ filtro.text }}</span>

			<!-- Caso relacion: select con las opciones de la relacion (opcionesRelacion arma siempre
				la primera opcion "Seleccione X" con value 0, igual que otros selects del sistema, y
				no repite ninguna opcion). Ojo con el :selected de cada <option>: las opciones pueden
				llegar DESPUES del primer render (el catalogo liviano se pide al montar) y un
				<select :value> de Vue 2 no se vuelve a posicionar solo cuando aparecen opciones: un
				valor guardado (default_value) quedaria mostrando "Seleccione" con el filtro activo. La
				comparacion es con == y no con ===: el valor guardado puede venir como numero o como
				string y las options llevan el id numerico. -->
			<select
			v-if="filtro.filter_kind === 'relation'"
			class="filtros-fijos__select"
			:data-testid="'filtro-fijo-'+filtro.key"
			:value="valorActual(filtro)"
			@change="onRelationChange(filtro, $event)"
			@keyup.enter="$emit('enter')">
				<option
				v-for="option in opcionesRelacion(filtro)"
				:key="option.value"
				:value="option.value"
				:selected="option.value == valorActual(filtro)">{{ option.text }}</option>
			</select>

			<!-- Caso comparacion numerica: etiqueta del operador en texto + input numerico -->
			<template v-else-if="filtro.filter_kind === 'numeric_comparison'">
				<span class="filtros-fijos__operator">{{ textoOperador(filtro.operator) }}</span>
				<input
				type="number"
				class="filtros-fijos__number"
				:data-testid="'filtro-fijo-'+filtro.key"
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
			:data-testid="'filtro-fijo-quitar-'+filtro.key"
			title="Quitar filtro"
			@click="$emit('quitar', { key: filtro.key })">×</button>
		</div>
	</div>
</template>
<script>
/**
 * Stores que tienen CATALOGO LIVIANO: la API les expone `GET /api/<store>/options` (id + name) y
 * el store lo guarda en `state.options` con la accion `getOptions` (`options_loaded` dice si ya
 * llego). Desde el grupo 332 (4/8/2026) y la mision 43 (12/8/2026) `provider` y `client` ya no
 * se descargan completos al iniciar sesion: `state.models` arranca vacio y el catalogo entero
 * vive en `state.options`.
 *
 * Es una lista cerrada A PROPOSITO y no "todo store del factory __base_store": `category`,
 * `sub_category` y `brand` no tienen ruta `/options` (`GET /api/category/options` lo resolveria
 * el Route::resource como `show('options')` y dejaria `state.options` con basura), asi que
 * siguen leyendo `models`, que para ellos viene cargado al entrar. Si un store nuevo suma su
 * ruta `/options` en la API, se agrega ACA.
 */
const STORES_CON_CATALOGO_LIVIANO = ['provider', 'client']

export default {
	/**
	 * FiltrosFijos — controles de los filtros fijos configurados por el usuario para el
	 * buscador general (relacion / comparacion numerica / presencia de valor), renderizados a
	 * la par del input de busqueda. Casi presentacional: recibe la configuracion y el valor actual
	 * de cada filtro por props, y emite 'input' / 'quitar' / 'enter' hacia el orquestador
	 * (Index.vue), que es quien arma el payload y persiste la configuracion. La unica excepcion es
	 * que pide al store el catalogo liviano de las relaciones que lo tienen (asegurar_catalogos).
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
	created() {
		// Filtros fijos que ya vienen configurados al montar el componente (los guardados del
		// usuario): se pide el catalogo de sus relaciones ahora, no cuando abra el desplegable.
		this.asegurar_catalogos()
	},
	watch: {
		/**
		 * Cuando se agrega un filtro fijo (o se reemplaza la lista entera al cargar la configuracion
		 * guardada) hay que pedir el catalogo de la relacion nueva. Es un watch y NO un llamado desde
		 * opcionesRelacion() / el render: `getOptions` solo se frena con `options_loaded`, asi que
		 * despachar desde el render la volveria a pedir en cada re-render mientras la respuesta
		 * esta en vuelo, y ademas un render no tiene que tener efectos secundarios.
		 *
		 * @return {void}
		 */
		filtros() {
			this.asegurar_catalogos()
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
		 * Si el store del modelo tiene catalogo liviano (ver STORES_CON_CATALOGO_LIVIANO).
		 *
		 * @param {String} model_name Nombre del store (ej: 'provider').
		 * @returns {Boolean}
		 */
		tiene_catalogo_liviano(model_name) {
			return STORES_CON_CATALOGO_LIVIANO.indexOf(model_name) !== -1
		},

		/**
		 * Pide al store el catalogo liviano (`getOptions`) de cada filtro fijo de relacion cuyo store
		 * lo tiene y todavia no lo cargo. Idempotente: se frena si ya esta cargado (`options_loaded`)
		 * o si ya hay un pedido en vuelo (`loading_options`), asi que llamarla de nuevo es barato.
		 * Se invoca desde created() y desde el watch de `filtros`; NUNCA desde el render.
		 *
		 * @returns {void}
		 */
		asegurar_catalogos() {
			if (!this.filtros) {
				return
			}
			this.filtros.forEach(filtro => {
				if (filtro.filter_kind !== 'relation') {
					return
				}
				let model_name = this.modelNameFromRelationKey({ key: filtro.key })
				if (!this.tiene_catalogo_liviano(model_name)) {
					return
				}
				let store = this.$store.state[model_name]
				if (store && !store.options_loaded && !store.loading_options) {
					this.$store.dispatch(model_name + '/getOptions')
				}
			})
		},

		/**
		 * Options del select de relacion, a partir del modelo derivado de la key del filtro (ej:
		 * category_id -> category). Devuelve SIEMPRE, como primera opcion, "Seleccione X" con value 0
		 * (igual que get_options_simple), y despues:
		 *
		 * - store inexistente: nada mas (antes tiraba un TypeError en pleno render).
		 * - store con catalogo liviano ya cargado: el catalogo completo (`options`).
		 * - store con catalogo liviano todavia sin cargar: lo que haya en `models` mientras tanto,
		 *   que puede estar vacio (se completa solo cuando llega `options`).
		 * - resto de los stores: `models`, que para ellos viene cargado al entrar.
		 *
		 * Se deduplica por `id` en todos los casos. `models` puede traer un mismo registro dos veces
		 * (dos descargas solapadas, ver `descarga_de_models_token` en __base_store) y un `:key`
		 * repetido en el v-for rompe el render del select; por eso no se confia en que la fuente
		 * venga limpia.
		 *
		 * No usa get_options_simple a proposito: ese helper lo comparten otros consumidores y solo
		 * lee `models`, que para provider/client ya no es el catalogo completo.
		 *
		 * @param {Object} filtro
		 * @returns {Array} [{ value, text }]
		 */
		opcionesRelacion(filtro) {
			let model_name = this.modelNameFromRelationKey({ key: filtro.key })

			let store = this.$store.state[model_name]
			if (!store) {
				// Sin store no hay de donde sacar opciones. Se chequea ANTES de singular(): ese helper hace
				// `require('@/models/'+model_name)` y revienta si tampoco existe el modelo, que es lo que pasa
				// con las relaciones cuya key no coincide con el store (ej: from_address_id), y justo ese es
				// el caso en que este return tiene que evitar el error en pleno render. El rotulo sale del
				// texto del propio filtro.
				return [{ value: 0, text: 'Seleccione ' + (filtro.text || model_name) }]
			}

			let opciones = [{ value: 0, text: 'Seleccione ' + this.singular(model_name) }]

			let fuente = store.models
			if (this.tiene_catalogo_liviano(model_name) && store.options_loaded) {
				fuente = store.options
			}

			/** Ids ya agregados: un objeto auxiliar mantiene la deduplicacion en O(n). */
			let ya_vistos = {}
			let items = fuente || []
			items.forEach(item => {
				if (Object.prototype.hasOwnProperty.call(ya_vistos, item.id)) {
					return
				}
				ya_vistos[item.id] = true
				opciones.push({ value: item.id, text: item.name })
			})

			return opciones
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
		background: var(--bg-section, #fff)
		border: 1px solid var(--color-border, #e2e4e7)
		border-radius: 22px
		height: 40px
		padding: 0 10px
		box-shadow: var(--shadow-color, rgba(99, 99, 99, 0.2)) 0px 2px 8px 0px
		transition: border-color 0.15s ease, box-shadow 0.15s ease

		&:focus-within
			border-color: var(--color-primary, #007bff)
			box-shadow: var(--shadow-color, rgba(99, 99, 99, 0.2)) 0px 2px 8px 0px, 0 0 0 3px rgba(0, 123, 255, 0.15)

	.filtros-fijos__label
		font-size: 0.78rem
		color: var(--color-text-secondary, #86868b)
		white-space: nowrap

	.filtros-fijos__operator
		font-size: 0.82rem
		color: var(--color-text-primary, #1d1d1f)
		white-space: nowrap

	.filtros-fijos__select, .filtros-fijos__number
		border: none
		outline: none
		background: transparent
		font-size: 0.86rem
		color: var(--color-text-primary, #1d1d1f)
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
		color: var(--color-text-secondary, #86868b)
		font-size: 0.9rem
		line-height: 1
		cursor: pointer
		opacity: 0
		transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease

		&:hover
			background: var(--bg-hover, #f2f3f4)
			color: var(--color-text-primary, #1d1d1f)

	.filtros-fijos__item:hover .filtros-fijos__remove
		opacity: 1
</style>
