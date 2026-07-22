<template>
	<!--
		Modal de configuracion de "filtro fijo": se abre al hacer clic en el NOMBRE de una
		propiedad del desplegable del buscador general (PropertiesDropdown.vue). No persiste nada
		ni renderiza controles todavia (eso es el prompt 06): solo arma la configuracion y la emite
		hacia arriba via 'agregar' / 'quitar'. El padre (Index.vue) decide que hacer con eso.
	-->
	<b-modal
	modal-class="filtro-fijo-modal"
	:id="modal_id"
	:title="modal_title"
	hide-footer>

		<!-- Caso 1: relacion (ej Categoria, Proveedor, Bodega). No hay nada que configurar. -->
		<div v-if="tipo_de_filtro === 'relation'" class="filtro-fijo-modal__section">
			<p class="filtro-fijo-modal__text">
				Se va a agregar un selector de <strong>{{ property_text }}</strong> al lado del buscador,
				para filtrar directamente por esa relacion.
			</p>
		</div>

		<!-- Caso 2: numerica (ej Stock, Precio). Dos modos excluyentes. -->
		<div v-else-if="tipo_de_filtro === 'numeric'" class="filtro-fijo-modal__section">
			<p class="filtro-fijo-modal__text">
				Elegi como se va a filtrar <strong>{{ property_text }}</strong> desde el buscador.
			</p>

			<!-- Tarjetas seleccionables (estilo Apple: discretas, sin fondo salido) -->
			<div class="filtro-fijo-modal__cards">
				<button
				type="button"
				class="filtro-fijo-modal__card"
				:class="{ 'filtro-fijo-modal__card--active': filter_kind === 'numeric_comparison' }"
				@click="filter_kind = 'numeric_comparison'">
					<span class="filtro-fijo-modal__card-title">Comparar contra un valor</span>
					<span class="filtro-fijo-modal__card-desc">Igual a, mayor a, menor a, etc.</span>
				</button>
				<button
				type="button"
				class="filtro-fijo-modal__card"
				:class="{ 'filtro-fijo-modal__card--active': filter_kind === 'numeric_presence' }"
				@click="elegirModoPresencia">
					<span class="filtro-fijo-modal__card-title">Segun tenga valor cargado</span>
					<span class="filtro-fijo-modal__card-desc">Todos / con valor cargado / con valor positivo</span>
				</button>
			</div>

			<!-- Sub-configuracion del modo "comparacion": operador + valor inicial opcional -->
			<div v-if="filter_kind === 'numeric_comparison'" class="filtro-fijo-modal__subconfig">
				<label class="filtro-fijo-modal__label">Operador</label>
				<b-form-select
				class="filtro-fijo-modal__select"
				v-model="operator"
				:options="operator_options"></b-form-select>

				<label class="filtro-fijo-modal__label">Valor inicial (opcional)</label>
				<b-form-input
				type="number"
				class="filtro-fijo-modal__input"
				v-model="default_value"
				placeholder="Se puede dejar vacio y completar despues"></b-form-input>
			</div>

			<!-- Sub-configuracion del modo "presencia": con que arranca el select -->
			<div v-if="filter_kind === 'numeric_presence'" class="filtro-fijo-modal__subconfig">
				<p class="filtro-fijo-modal__text filtro-fijo-modal__text--muted">
					El filtro va a ofrecer las opciones <strong>Todos</strong>, <strong>Con valor cargado</strong>
					y <strong>Con valor positivo</strong>.
				</p>
				<label class="filtro-fijo-modal__label">Arranca en</label>
				<b-form-select
				class="filtro-fijo-modal__select"
				v-model="default_value"
				:options="presence_options"></b-form-select>
			</div>
		</div>

		<!-- Caso 3: no soportado (texto, fecha, checkbox, etc). Solo explica, sin boton de agregar. -->
		<div v-else class="filtro-fijo-modal__section">
			<p class="filtro-fijo-modal__text">
				Por ahora esta propiedad solo se puede incluir o excluir de la busqueda por texto con el
				interruptor de la lista. Los filtros propios (a la par del buscador) estan disponibles para
				propiedades numericas y para relaciones.
			</p>
		</div>

		<!-- Footer propio (hide-footer arriba) para poder ocultar "Agregar"/"Quitar" segun el caso -->
		<div class="filtro-fijo-modal__footer">
			<b-button variant="link" @click="cancelar">Cancelar</b-button>
			<b-button
			v-if="ya_agregada"
			variant="outline-danger"
			@click="quitar">
				Quitar del buscador
			</b-button>
			<b-button
			v-if="tipo_de_filtro !== 'no_soportado'"
			variant="primary"
			@click="agregar">
				{{ ya_agregada ? 'Guardar cambios' : 'Agregar al buscador' }}
			</b-button>
		</div>
	</b-modal>
</template>
<script>
export default {
	/**
	 * FiltroFijoModal — configuracion de un "filtro fijo" (control propio a la par del input del
	 * buscador general) para una propiedad puntual del modelo. Segun el tipo de la propiedad
	 * (relacion / numerica / no soportada) muestra un contenido distinto. No persiste nada: solo
	 * emite 'agregar' / 'quitar' con la configuracion resultante, el padre (Index.vue) decide que
	 * hacer con eso (store + backend, prompt 06).
	 */
	props: {
		/**
		 * Nombre del modelo (para armar un id de modal que no colisione entre buscadores).
		 */
		model_name: {
			type: String,
			required: true,
		},

		/**
		 * Propiedad del modelo que se esta configurando: { key, text, type }. null cuando no hay
		 * ninguna en edicion (modal cerrado).
		 */
		property: {
			type: Object,
			default: null,
		},

		/**
		 * Configuracion ya guardada de esa propiedad como filtro fijo, si existia:
		 * { filter_kind, operator, default_value }. null si todavia no estaba agregada.
		 */
		config_actual: {
			type: Object,
			default: null,
		},
	},
	data() {
		return {
			// Tipo de filtro elegido: 'relation' (fijo, no se elige) | 'numeric_comparison' |
			// 'numeric_presence' | null (numerica sin elegir modo todavia).
			filter_kind: null,
			// Operador para el modo 'numeric_comparison': '=', '>', '<', '>=', '<='.
			operator: '>',
			// Valor inicial del control: numero (comparacion) o 'todos'/'con_valor'/'positivo' (presencia).
			default_value: null,
		}
	},
	computed: {
		/**
		 * Id del b-modal, derivado del model_name para que no colisione si hay dos buscadores
		 * generales montados a la vez (ej: modal + listado de fondo).
		 *
		 * @returns {String}
		 */
		modal_id() {
			return this.model_name + '-filtro-fijo-modal'
		},

		/**
		 * Texto de la propiedad en edicion, o vacio si no hay ninguna (defensivo).
		 *
		 * @returns {String}
		 */
		property_text() {
			return this.property && this.property.text ? this.property.text : ''
		},

		/**
		 * Titulo del modal, dinamico segun la propiedad en edicion.
		 *
		 * @returns {String}
		 */
		modal_title() {
			return this.property_text ? 'Filtro fijo: ' + this.property_text : 'Filtro fijo'
		},

		/**
		 * Clasifica la propiedad en edicion segun el mismo criterio que props_filtrables en
		 * Index.vue: relacion (search/select con key terminada en "_id"), numerica (type number)
		 * o no soportada (cualquier otro tipo, ej text/textarea/date/checkbox).
		 *
		 * @returns {String} 'relation' | 'numeric' | 'no_soportado'
		 */
		tipo_de_filtro() {
			if (!this.property) {
				return 'no_soportado'
			}
			let is_relation = (this.property.type === 'search' || this.property.type === 'select')
				&& this.property.key && this.property.key.slice(-3) === '_id'
			if (is_relation) {
				return 'relation'
			}
			if (this.property.type === 'number') {
				return 'numeric'
			}
			return 'no_soportado'
		},

		/**
		 * True si la propiedad en edicion ya tenia una configuracion guardada como filtro fijo
		 * (cambia el texto del boton principal y muestra el boton de quitar).
		 *
		 * @returns {Boolean}
		 */
		ya_agregada() {
			return !!this.config_actual
		},

		/**
		 * Options del select de operador de comparacion numerica.
		 *
		 * @returns {Array}
		 */
		operator_options() {
			return [
				{ value: '=', text: 'Igual a' },
				{ value: '>', text: 'Mayor a' },
				{ value: '<', text: 'Menor a' },
				{ value: '>=', text: 'Mayor o igual a' },
				{ value: '<=', text: 'Menor o igual a' },
			]
		},

		/**
		 * Options del select de "con que arranca" para el modo de presencia de valor.
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
	watch: {
		/**
		 * Cada vez que cambia la propiedad en edicion (se abre el modal para otra fila), reinicia
		 * el estado interno: si ya habia config_actual la usa, si no arranca con los defaults.
		 */
		property() {
			this.inicializarEstado()
		},
	},
	methods: {
		/**
		 * Inicializa filter_kind / operator / default_value desde config_actual (si la propiedad
		 * ya estaba agregada como filtro fijo) o con los defaults del tipo de filtro.
		 *
		 * @return {void}
		 */
		inicializarEstado() {
			if (this.config_actual) {
				this.filter_kind = this.config_actual.filter_kind || null
				this.operator = this.config_actual.operator || '>'
				this.default_value = typeof this.config_actual.default_value !== 'undefined'
					? this.config_actual.default_value
					: null
				return
			}
			// Sin config previa: relacion no necesita elegir nada, numerica arranca sin modo
			// elegido (el usuario clickea una de las dos tarjetas).
			this.filter_kind = this.tipo_de_filtro === 'relation' ? 'relation' : null
			this.operator = '>'
			this.default_value = null
		},

		/**
		 * Selecciona el modo "presencia" para una propiedad numerica y arranca el select en
		 * 'todos' (default pedido por la especificacion), ya que el modo 'numeric_presence' es
		 * un valor de filter_kind, no de tipo_de_filtro.
		 * @return {void}
		 */
		elegirModoPresencia() {
			this.filter_kind = 'numeric_presence'
			this.default_value = 'todos'
		},

		/**
		 * Emite 'agregar' con la configuracion elegida y cierra el modal. Para relacion no hay
		 * nada que configurar mas alla del filter_kind fijo.
		 *
		 * @return {void}
		 */
		agregar() {
			if (!this.property) {
				return
			}
			this.$emit('agregar', {
				key: this.property.key,
				filter_kind: this.filter_kind,
				operator: this.filter_kind === 'numeric_comparison' ? this.operator : null,
				default_value: this.default_value,
			})
			this.$bvModal.hide(this.modal_id)
		},

		/**
		 * Emite 'quitar' con la key de la propiedad y cierra el modal.
		 *
		 * @return {void}
		 */
		quitar() {
			if (!this.property) {
				return
			}
			this.$emit('quitar', { key: this.property.key })
			this.$bvModal.hide(this.modal_id)
		},

		/**
		 * Cierra el modal sin emitir nada.
		 *
		 * @return {void}
		 */
		cancelar() {
			this.$bvModal.hide(this.modal_id)
		},
	},
}
</script>
<style lang="sass">
.filtro-fijo-modal
	.filtro-fijo-modal__section
		margin-bottom: 8px

	.filtro-fijo-modal__text
		font-size: 0.9rem
		color: #1d1d1f
		margin-bottom: 0

		&.filtro-fijo-modal__text--muted
			color: #6e6e73
			font-size: 0.85rem

	// Tarjetas seleccionables estilo Apple: borde sutil, sin fondo salido, resalta al elegir
	.filtro-fijo-modal__cards
		display: flex
		flex-direction: column
		gap: 8px
		margin: 14px 0

	.filtro-fijo-modal__card
		display: flex
		flex-direction: column
		align-items: flex-start
		gap: 2px
		width: 100%
		text-align: left
		border: 1px solid #e2e4e7
		background: #fff
		border-radius: 10px
		padding: 10px 14px
		cursor: pointer
		transition: border-color 0.15s ease, background 0.15s ease

		&:hover
			border-color: #c7cacf

		&.filtro-fijo-modal__card--active
			border-color: #007bff
			background: rgba(0, 123, 255, 0.06)

		.filtro-fijo-modal__card-title
			font-size: 0.9rem
			font-weight: 600
			color: #1d1d1f

		.filtro-fijo-modal__card-desc
			font-size: 0.78rem
			color: #6e6e73

	.filtro-fijo-modal__subconfig
		margin-top: 10px

	.filtro-fijo-modal__label
		display: block
		font-size: 0.8rem
		color: #4b4f56
		margin-bottom: 4px
		margin-top: 10px

	.filtro-fijo-modal__select, .filtro-fijo-modal__input
		width: 100%

	.filtro-fijo-modal__footer
		display: flex
		justify-content: flex-end
		gap: 8px
		margin-top: 18px
</style>
