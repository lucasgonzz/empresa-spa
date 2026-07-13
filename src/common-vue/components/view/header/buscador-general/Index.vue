<template>
	<!--
		Buscador general: reemplazo evolucionado de BuscadorRapido. Busca por OR entre las props
		propias tildadas + las relaciones tildadas (whereHas) contra el endpoint global-search,
		y permite que cada módulo inyecte sus propios filtros extra vía el slot "search_extra".
		No tiene ancho fijo: se adapta al contenedor (el view-header lo centra y limita el ancho).
	-->
	<div class="buscador-general">
		<b-input-group class="buscador-general__group">

			<!-- Prepend: desplegable checklist de props propias / relaciones a incluir en la búsqueda -->
			<b-input-group-prepend>
				<properties-dropdown
				:own_props="own_props"
				:relation_props="relation_props"
				:selected_props="selected_props"
				:selected_relations="selected_relations"
				@toggle-prop="toggleProp"
				@toggle-relation="toggleRelation"></properties-dropdown>
			</b-input-group-prepend>

			<!-- Input de texto: dispara la búsqueda con Enter -->
			<b-form-input
			autocomplete="off"
			v-model="query_value"
			:placeholder="placeholder"
			@keyup.enter="buscar"></b-form-input>

			<!-- Slot para que cada módulo inyecte sus propios filtros (ej: categoría, con/sin stock) -->
			<slot name="search_extra"></slot>

			<b-input-group-append>
				<!-- Botón buscar -->
				<b-button
				variant="primary"
				@click="buscar">
					<i class="icon-search"></i>
				</b-button>

				<!-- Botón limpiar: solo visible cuando hay una búsqueda del buscador general activa -->
				<b-button
				v-if="is_filtered_by_buscador"
				variant="outline-secondary"
				@click="limpiar">
					<i class="icon-undo"></i>
				</b-button>
			</b-input-group-append>
		</b-input-group>
	</div>
</template>
<script>
export default {
	/**
	 * BuscadorGeneral — buscador único por modelo, derivado de la definición declarativa
	 * (src/models/<model_name>.js). Las props propias del modelo (text/textarea/number) se
	 * tildan por default; las relaciones (props type: 'search' con key terminada en "_id")
	 * quedan disponibles para que el usuario las agregue a mano.
	 *
	 * Al buscar, dispara la action `runGlobalSearch` del store del modelo, que persiste el
	 * payload completo para que la paginación pueda repetir la misma búsqueda.
	 *
	 * Uso mínimo:
	 *   <buscador-general model_name="article"></buscador-general>
	 */
	components: {
		PropertiesDropdown: () => import('@/common-vue/components/view/header/buscador-general/PropertiesDropdown'),
	},
	props: {
		/**
		 * Nombre del modelo en el store, en la ruta del endpoint y en src/models.
		 */
		model_name: {
			type: String,
			required: true,
		},

		/**
		 * Texto de placeholder del input de búsqueda.
		 */
		placeholder: {
			type: String,
			default: 'Buscar...',
		},

		/**
		 * Filtros extra propios del módulo (ej: categoría, con/sin stock del Listado de artículos).
		 * Formato esperado por el backend: [{ key, operator, value }].
		 */
		extra_filters: {
			type: Array,
			default: function () {
				return []
			},
		},
	},
	data() {
		return {
			// Texto ingresado por el usuario en el buscador.
			query_value: '',
			// Keys de own_props tildadas para la búsqueda (default: todas).
			selected_props: [],
			// Keys de relation_props tildadas para la búsqueda (default: ninguna).
			selected_relations: [],
		}
	},
	computed: {
		/**
		 * Props propias del modelo, buscables por texto/número: type en text/textarea/number,
		 * que no sean relación, que no tengan el flag `not_use_in_global_search`, y que tengan
		 * `key` (descarta las entradas `group_title`, que no representan una columna).
		 *
		 * @returns {Array} [{ key, text, ... }]
		 */
		own_props() {
			let model_properties = require('@/models/' + this.model_name).default.properties
			return model_properties.filter(function (property) {
				return property.key
					&& ['text', 'textarea', 'number'].indexOf(property.type) !== -1
					&& !property.not_use_in_global_search
			})
		},

		/**
		 * Relaciones buscables del modelo: props con type "search" y key terminada en "_id".
		 * Para cada una se deriva la relación Eloquent (sin el sufijo "_id") y las props por las
		 * que se busca dentro de esa relación (`global_search_relation_props`, default ['name']).
		 *
		 * @returns {Array} [{ key, text, relation, props }]
		 */
		relation_props() {
			let model_properties = require('@/models/' + this.model_name).default.properties
			let relations = []
			model_properties.forEach(function (property) {
				if (!property.key || property.type !== 'search' || property.key.slice(-3) !== '_id') {
					return
				}
				relations.push({
					key: property.key,
					text: property.text,
					relation: property.key.replace('_id', ''),
					props: property.global_search_relation_props || ['name'],
				})
			})
			return relations
		},

		/**
		 * Indica si hay una búsqueda del buscador general activa (payload persistido en el store).
		 * Controla la visibilidad del botón limpiar.
		 *
		 * @returns {Boolean}
		 */
		is_filtered_by_buscador() {
			return !!this.$store.state[this.model_name].global_search_payload
		},
	},
	created() {
		// Default: todas las props propias tildadas, ninguna relación.
		let default_selected_props = []
		this.own_props.forEach(function (property) {
			default_selected_props.push(property.key)
		})
		this.selected_props = default_selected_props
	},
	methods: {
		/**
		 * Tilda/destilda una prop propia de la búsqueda.
		 *
		 * @param {String} key
		 */
		toggleProp(key) {
			let index = this.selected_props.indexOf(key)
			if (index === -1) {
				this.selected_props.push(key)
			} else {
				this.selected_props.splice(index, 1)
			}
		},

		/**
		 * Tilda/destilda una relación de la búsqueda.
		 *
		 * @param {String} key
		 */
		toggleRelation(key) {
			let index = this.selected_relations.indexOf(key)
			if (index === -1) {
				this.selected_relations.push(key)
			} else {
				this.selected_relations.splice(index, 1)
			}
		},

		/**
		 * Ejecuta la búsqueda general: arma el payload (props/relaciones tildadas + extra_filters)
		 * y lo despacha a `runGlobalSearch`. Requiere al menos 2 caracteres de texto, salvo que
		 * haya extra_filters activos (en ese caso se puede buscar solo con los extras).
		 */
		buscar() {
			// Si hay extra_filters activos, se permite buscar sin texto (ej: solo por categoría).
			let has_extra_filters = this.extra_filters && this.extra_filters.length > 0

			if (this.query_value.trim().length < 2 && !has_extra_filters) {
				this.$toast.error('Ingrese al menos 2 caracteres')
				return
			}

			// Arma relation_props con la forma que espera el backend: { relation, props }.
			let relation_props_payload = []
			let relation_props_disponibles = this.relation_props
			this.selected_relations.forEach(function (relation_key) {
				let relation_prop = relation_props_disponibles.find(function (item) {
					return item.key === relation_key
				})
				if (relation_prop) {
					relation_props_payload.push({
						relation: relation_prop.relation,
						props: relation_prop.props,
					})
				}
			})

			let payload = {
				// ⚠️ Se llama `query_value`, no `query`: en el backend `$request->query` es el
				// InputBag de Symfony y no el input del mismo nombre.
				query_value: this.query_value,
				props: this.selected_props,
				relation_props: relation_props_payload,
				extra_filters: this.extra_filters,
				page: 1,
			}

			this.$store.dispatch(this.model_name + '/runGlobalSearch', payload)
		},

		/**
		 * Limpia el criterio de texto, resetea el filtered del store (mismos commits que
		 * BuscadorRapido) y limpia el payload persistido del buscador general.
		 */
		limpiar() {
			this.query_value = ''

			this.$store.commit(this.model_name + '/setFiltered', [])
			this.$store.commit(this.model_name + '/setIsFiltered', false)
			this.$store.commit(this.model_name + '/setSelected', [])
			this.$store.commit(this.model_name + '/setFilterPage', 1)
			this.$store.commit(this.model_name + '/setTotalFilterPages', null)
			this.$store.commit(this.model_name + '/setTotalFilterResults', 0)
			this.$store.commit(this.model_name + '/set_filtered_without_filter_form', false)
			this.$store.commit(this.model_name + '/setGlobalSearchPayload', null)
		},
	},
}
</script>
<style lang="sass">
// Estética Apple: minimalista, sin ancho fijo (lo define el contenedor), sin ruido visual.
.buscador-general
	width: 100%

	.buscador-general__group
		width: 100%

		input
			height: 38px
</style>
