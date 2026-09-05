<template>
	<div>
    	<model
    	v-if="show_btn_create"
    	@modelSaved="modelSaved"
    	:model_name="model_name"></model>

		<search-modal
		:_id="_id"
		:set_first_row_selected="set_first_row_selected"
		:limpiar_resultados_de_busqueda="limpiar_resultados_de_busqueda"
		:query_value="query"
		:prop="prop"
		:auto_select="auto_select"
		:model_name="model_name"
		:placeholder="_placeholder"
		:str_limint="str_limint"
		:preview_results="preview_results"
		:model="model"
		:models_to_search="models_to_search"
		:save_if_not_exist="save_if_not_exist"
		:show_btn_create="show_btn_create"
		:search_from_api="search_from_api"
		:props_to_show="props_to_show"
		:search_modal_extra_properties="search_modal_extra_properties"
		:search_modal_omit_property_keys="search_modal_omit_property_keys"
		:props_to_filter="props_to_filter"
		:search_function="search_function"
		:props_extras="props_extras"
		:props_to_send_to_api="props_to_send_to_api"
		:emit_selected_with_null="emit_selected_with_null"
		:function_props_to_send_to_api="function_props_to_send_to_api"
		:tax_id_afip_lookup_on_second_enter="tax_id_afip_lookup_on_second_enter"
		:no_exist_message="no_exist_message"
		:contexto="contexto"
		:preference_scope="preference_scope"
		@callSearchModal="callSearchModal"
		@setQuery="setQuery"
		@setNotShowModel="setNotShowModel"
		@setSelected="setSelected"
		@requestClientAfipLookup="onRequestClientAfipLookupFromModal">
			
			<template #search_input_right>
				<slot name="search_input_right"></slot>
			</template>
			
		</search-modal>

		<div
		class="search-component">
			<div class="cont-search-input-btn">
				<div class="cont-search cont-search--field">
					<div
					class="search-field"
					:class="is_disabled ? 'search-field--disabled' : ''">
						<!--
							Este input esta controlado por v-model: su valor sale de `query` en cada render. Quien lo
							limpie o lo escriba desde afuera (Vender, Devoluciones) tiene que usar setInputValueSync,
							que despacha el evento 'input'. Un `input.value = ''` suelto se ve limpio un instante y el
							proximo re-render lo vuelve a llenar (bug del 5/8/2026 en Vender).
						-->
						<input
						:disabled="is_disabled"
						class="input-search search-field__input form-control"
						type="text"
						autocomplete="off"
						:id="_id"
						:data-testid="_id"
						:data-tour="data_tour"
						@click="callSearchModal"
						@keyup="callSearchModal"
						v-model="query"
						:placeholder="_placeholder">

						<div
						class="search-field__icon"
						@click="abrirDesdeIcono">
							<i :class="input_icon"></i>
						</div>
					</div>
				</div>
				<!--
					Lugar a la derecha del input que abre el modal de busqueda.

					Hasta el 13/8/2026 aca vivia un segundo input, "Buscar dentro de <modelos>", que
					filtraba en memoria los modelos ya cargados en la relacion. Lucas lo saco: el
					espacio pasa a ocuparlo el boton que elige que columnas se ven en la tabla de la
					relacion, que es la accion que el usuario busca en ese lugar. Quien llene este
					slot decide que va: hoy lo llena ModelForm con ese boton.
				-->
				<slot name="input_right"></slot>
			</div>
		</div>
		<selected-info
		:is_disabled="is_disabled"
		:model_name="model_name"
		:prop="prop"
		:show_selected="show_selected"
		:selected_model="selected_model"
		@clearSelected="clearSelected"></selected-info>
	</div>
</template>
<script>
import SearchModal from '@/common-vue/components/search/Modal'

export default {
	components: {
		SearchModal,
		SelectedInfo: () => import('@/common-vue/components/search/SelectedInfo'),
		Model: () => import('@/common-vue/components/model/Index'),
	},
	props: {
		id: {
			type: String,
			default: null,
		},
		model: {
			type: Object,
			default: null,
		},
		model_name: {
			type: String,
			default: null,
		},
		prop: {
			type: Object,
			default: null,
		},
		str_limint: {
			type: Number,
			default: 2,
		},
		auto_select: {
			type: Boolean,
			default: true,
		},
		clear_query: {
			type: Boolean,
			default: false,
		},
		show_btn_create: {
			type: Boolean,
			default: false,
		},
		search_from_api: {
			type: Boolean,
			default: false,
		},
		props_to_show: {
			type: Array,
			default: null,
		},
		search_modal_extra_properties: {
			type: Array,
			default() {
				return []
			},
		},
		search_modal_omit_property_keys: {
			type: Array,
			default() {
				return []
			},
		},
		show_selected: {
			type: Boolean,
			default: true,
		},
		placeholder: {
			type: String,
			default: null,
		},
		show_preview_results: {
			type: Boolean,
			default: true,
		},
		save_if_not_exist: {
			type: Boolean,
			default: true,
		},
		clear_query_on_model_change: {
			type: Boolean,
			default: false,
		},
		set_selected_model_with_model_prop: {
			type: Boolean,
			default: false,
		},
		/**
		 * Nombre del modelo padre. Quedo declarada despues de sacar el input de "buscar dentro de"
		 * (13/8/2026) porque varios consumidores la siguen pasando; sin declararla, Vue la dejaria
		 * caer como atributo suelto en el div raiz.
		 */
		model_name_for_search_on_models: {
			type: String,
			default: null,
		},
		props_to_filter: {
			type: Array,
			default: () => {
				return []
			}
		},
		search_function: {
			type: String,
			default: null,
		},
		limpiar_resultados_de_busqueda: {
			type: Boolean,
			default: true,
		},
		props_extras: {
			type: Array,
			default: () => {
				return  []
			}
		},
		emit_selected_with_null: {
			type: Boolean,
			default: false,
		},
		init_query: {
			type: String,
			default: null,
		},
		disabled: {
			type: Boolean,
			default: false,
		},
		props_to_send_to_api: {
			type: Array,
			default: () => {
				return  []
			}
		},
		function_props_to_send_to_api: {
			type: String,
			default: null
		},
		/**
		 * Reenviado al modal de búsqueda: segundo Enter con CUIT/DNI sin resultados abre flujo AFIP (solo si el padre lo usa).
		 */
		tax_id_afip_lookup_on_second_enter: {
			type: Boolean,
			default: false,
		},
		no_exist_message: {
			type: String,
			default: null,
		},
		/**
		 * Clase del ícono mostrado a la izquierda del input de búsqueda.
		 * Permite personalizar el indicador visual por contexto (p. ej. cliente en vender).
		 */
		input_icon: {
			type: String,
			default: 'icon-search',
		},
		/**
		 * Contexto del modulo que reenvia al modal de busqueda (tarea 4, prompt 08 del grupo 179):
		 * 'vender', 'provider_order' o 'recipe'. Se usa para que global-search aplique la logica
		 * propia de ese contexto. Ningun consumidor que sea un listado debe declararlo.
		 */
		contexto: {
			type: String,
			default: null,
		},
		/**
		 * Ancla del data tour de la demo (develop): se propaga al input principal del pill para
		 * que el tour guiado pueda apuntar a este buscador.
		 */
		data_tour: {
			type: String,
			default: null,
		},
		/**
		 * Ambito de la preferencia de columnas de los resultados. Se reenvia tal cual al modal;
		 * la explicacion larga esta en search/Modal.vue.
		 */
		preference_scope: {
			type: String,
			default: null,
		},
	},
	data() {
		return {
			query: '',
			models_to_search: [],
			preview_results: [],
			selected_model: null,
			not_show_modal: false,
			set_first_row_selected: false,
		}
	},
	computed: {
		_id() {
			if (this.id) {
				return this.id 
			}
			return this.model_name
		},
		_placeholder() {
			if (this.placeholder) {
				return this.placeholder
			}
			return 'Agregar '+this.singular(this.model_name)
		},
		is_disabled() {
			if (this.prop && this.prop.only_show) {
				return true 
			}
			if (this.disabled) {
				return true
			}
			return false
		},
	},
	watch: {
		model() {
			this.setSelectedModelProp()
		},
		index_to_update() {
			this.setSelectedModelProp()
		}
	},
	created() {
		this.setSelectedModelProp()
		this.$parent.$on('updateSearch', this.updateSearch())
		if (this.init_query) {
			this.query = this.init_query
		}
	},
	methods: {
		/**
		 * Reemite al consumidor del search-component el pedido de consulta AFIP desde el modal.
		 *
		 * @param {{ query: string, normalized_digits: string }} payload
		 */
		onRequestClientAfipLookupFromModal(payload) {
			this.$emit('requestClientAfipLookup', payload)
		},
		updateSearch() {
			this.setSelectedModelProp()
		},
		setNotShowModel(value) {
			this.not_show_modal = value
		},
		modelSaved(model) {
			if (this.prop.is_between) {
				if (this.prop.is_between.parent_model_prop) {
					let index = this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop].findIndex(_model => {
						return _model.id == model.id 
					})
					if (index == -1) {
						this.$set(this.model[this.prop.is_between.parent_model_prop], this.prop.is_between.model_prop, this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop].concat([model]))
					} else {
						let models = this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop]
						models.splice(index, 1, model)
						this.$set(this.model[this.prop.is_between.parent_model_prop], this.prop.is_between.model_prop, models)
					}
				} else if (this.prop.is_between.store) {
					let index = this.$store.state[this.prop.is_between.store].models.findIndex(_model => {
						return _model.id == this.model[this.prop.is_between.store+'_id'] 
					})
					if (index == -1) {
						this.$set(this.$store.state[this.prop.is_between.store].models[index], this.prop.is_between.model_prop, this.$store.state[this.prop.is_between.store].models[index][this.prop.is_between.model_prop].concat([model]))
					} else {
						let models = this.$store.state[this.prop.is_between.store].models[index][this.prop.is_between.model_prop].splice(index, 1, model)
						this.$set(this.model[this.prop.is_between.parent_model_prop], this.prop.is_between.model_prop, models)
					}
				}
			}
			this.callSearchModal()
			setTimeout(() => {
				document.getElementsByClassName('input-search-modal')[0].focus()
			}, 200)
		},
		clearSelected() {
			if (this.model && this.prop && !this.set_selected_model_with_model_prop) {
				this.model[this.prop.store] = null
				this.model[this.prop.key] = null
			} 
			this.selected_model = null
			this.query = ''
			this.$emit('clearSelected')
		},
		/**
		 * Deja establecidos los resultados con los que el modal ABRE, antes de que el usuario busque
		 * nada: los primeros 10 modelos ya descargados en el store del modelo que se esta por elegir.
		 * Si la prop depende de otra (subcategoria depende de categoria), setModelsToSearch() ya dejo
		 * en models_to_search solo los que corresponden a lo elegido arriba.
		 *
		 * 🔴 Asigna SIEMPRE un array nuevo, incluso vacio, y eso es medio arreglo. El modal toma los
		 * resultados en el watch de la prop preview_results (search/Modal.vue), y un watch solo corre
		 * si cambia la REFERENCIA. Mientras este metodo podia volverse sin asignar --que era lo que
		 * pasaba cada vez que la condicion daba falso-- el modal abria con los resultados de la
		 * busqueda ANTERIOR. Un `if` que envuelva la asignacion vuelve a traer ese bug.
		 *
		 * Que haya precarga o no lo decide show_preview_results, NO limpiar_resultados_de_busqueda.
		 * Son dos preguntas distintas y estaban mezcladas en un if anidado: mientras la precarga
		 * colgaba de "limpiar", los buscadores de los formularios (ModelForm -> FieldSearchInput) no
		 * precargaban nunca, porque por ese camino la prop llegaba en null (ver FieldSearchInput.vue).
		 * Aclaracion honesta: hoy ningun consumidor pasa show_preview_results, asi que esa rama no la
		 * ejercita nadie todavia. Queda como la perilla para apagar la precarga en un buscador puntual
		 * sin volver a mezclarla con "limpiar".
		 *
		 * limpiar_resultados_de_busqueda si decide lo otro: en false, el consumidor pidio conservar la
		 * lista entre aperturas --Vender y Compras eligen un articulo atras del otro sobre los mismos
		 * resultados-- y aca no se toca nada. Sacar ese primer if les rompe ese flujo.
		 *
		 * El `|| []` esta porque models_to_search NO siempre es un array: las ramas is_between y
		 * has_many de setModelsToSearch() lo sacan de una relacion embebida que puede no haber bajado,
		 * y ahi queda undefined. Sin el `|| []` eso es un TypeError adentro de un .then(), o sea sin
		 * rastro en pantalla.
		 *
		 * El otro caso que taparia --search_function que devuelve undefined, como
		 * search_articles_offline(query) llamado sin query (src/mixins/model_functions.js)-- hoy NO se
		 * puede reproducir: los dos consumidores de esa funcion pasan limpiar_resultados_de_busqueda
		 * en false y salen por el return de arriba. Queda como defensa para el dia que un modelo
		 * declare un search_function_for_model_form asincronico, que si pasaria por aca.
		 */
		setPreviewResults() {
			if (!this.limpiar_resultados_de_busqueda) {
				return
			}
			if (!this.show_preview_results) {
				this.preview_results = []
				return
			}
			this.preview_results = (this.models_to_search || []).slice(0, 10)
		},
		async setModelsToSearch() {
			let models = []		
			if (this.search_function && typeof this.search_function != 'undefined') {
				// models = this[this.search_function]()



					let result = this[this.search_function]()

					console.log('search_function:')
					console.log(result)

					if (result instanceof Promise) {
						console.log('es una promesa, esperando')
						models = await result
						console.log('listo, models:')
						console.log(models)

					} else {

						models = result

					}

			} else if (this.prop && this.prop.depends_on && this.model) {
				if (!this.prop.search_depends_on_from_api) {
				 	models = this.modelsStoreFromName(this.model_name)
					models = models.filter(_model => {
						return _model[this.prop.depends_on] == this.model[this.prop.depends_on]
					})
				}
			} else if (this.prop && this.prop.is_between) {
				if (this.prop.is_between.parent_model_prop) {
					if (this.model[this.prop.is_between.parent_model_prop] && this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop].length) {
						models = this.model[this.prop.is_between.parent_model_prop][this.prop.is_between.model_prop]
					} 
				} else if (this.prop.is_between.store && this.model[this.prop.is_between.store+'_id']) {
					let model = this.$store.state[this.prop.is_between.store].models.find(_model => {
						return _model.id == this.model[this.prop.is_between.store+'_id']
					})
					models = model[this.prop.is_between.model_prop]
				}
			} else if (this.prop && this.prop.has_many && this.prop.has_many.models_from_parent_prop) {
				let model = this.$store.state[this.prop.has_many.models_from_parent_prop.parent_model_name].model 
				models = model[this.prop.has_many.models_from_parent_prop.models_prop_name]
			} else {
				models = this.modelsStoreFromName(this.model_name)
			}
			this.models_to_search = models 
		},
		setSelectedModelProp() {
			if (this.show_selected) {
				if (this.prop && this.prop.set_model_on_click_or_prop_with_query_if_null) {
					this.query = this.model[this.prop.key]
					this.selected_model = null
				} else if (this.model && this.prop && this.model[this.prop.key]) {
					let selected_model = null
					if (this.prop.use_store_models) {
						selected_model = this.$store.state[this.modelNameFromRelationKey(this.prop)].models.find(_model => {
							return _model.id == this.model[this.prop.key]
						})
					}

					// Mismo orden que propertyText(): el store es un intento, no una salida.
					// Si el modelo no esta ahi, cae a la relacion embebida, derivada de la
					// clave (no de prop.store), o el campo quedaba vacio al editar un modelo
					// cuyo relacionado no estaba entre los descargados (4/8/2026).
					if (!selected_model) {
						selected_model = this.model[this.modelNameFromRelationKey(this.prop, false, false)]
					}

					this.selected_model = selected_model
				} else if (this.set_selected_model_with_model_prop && this.model) {
					this.selected_model = this.model 
				} else if (this.set_selected_model_with_model_prop) {
					this.selected_model = null
				}
			} 
			if (this.clear_query_on_model_change) {
				this.query = ''
			}
		},
		setQuery(value) {
			this.query = value 
		},
		/**
		 * Abre el modal de busqueda al hacer clic en la lupa. El input ya lo hace con su propio
		 * @click, pero el icono queda fuera del input y sin esto es una zona muerta de 34px justo
		 * donde el usuario apunta.
		 */
		abrirDesdeIcono() {
			if (this.is_disabled) {
				return
			}
			this.callSearchModal()
		},
		callSearchModal() {
			if (!this.not_show_modal) {

				let self = this

				this.set_first_row_selected = !this.set_first_row_selected

				// Corta con los resultados de la apertura anterior en este mismo tick, sin esperar al
				// .then() de abajo. Hoy no se nota: en el camino sincronico --que es el de todos los
				// consumidores actuales-- las dos asignaciones caen en el mismo frame, porque el .then()
				// de una promesa ya resuelta es un microtask y los microtasks se drenan antes de que el
				// navegador pinte. Se deja igual para el dia que los modelos lleguen por una promesa
				// que tarde de verdad: ahi el modal ya estaria abierto mostrando la lista pasada
				// durante todo ese rato.
				if (this.limpiar_resultados_de_busqueda) {
					this.preview_results = []
				}

				// 🔴 Encadenado con .then() y no suelto. setModelsToSearch() esta declarada `async`
				// (deuda vieja, no se agrega mas), asi que SIEMPRE devuelve una promesa. Hoy su cuerpo
				// corre entero sincronico salvo en la rama del search_function que devuelve promesa
				// --la unica que hace await--, asi que llamandola suelta funcionaria igual en todos los
				// consumidores actuales. Se encadena porque esa rama existe: ahi setPreviewResults()
				// correria en el mismo tick y precargaria con los modelos de la apertura ANTERIOR.
				// Sin await: en src/ se usa .then() con `let self = this`.
				// El handler de error va como SEGUNDO argumento de .then() y no como un .catch()
				// encadenado: un .catch() detras tambien atraparia lo que tirara setPreviewResults(),
				// y entonces el mensaje de abajo mentiria y ademas se borraria models_to_search sin
				// motivo. Asi, cada uno cubre lo suyo.
				this.setModelsToSearch()
					.then(function() {
						self.setPreviewResults()
					}, function(error) {
						// Mejor abrir sin precarga que con la lista vieja: si juntar los modelos fallo
						// (un store que no existe, una relacion que no bajo), la asignacion final de
						// setModelsToSearch() no llego a correr y models_to_search sigue con lo de la
						// apertura anterior. Se limpia tambien esa lista, no solo la precarga: la
						// busqueda offline de search/Modal.vue filtra sobre models_to_search, y con la
						// relacion vieja adentro devolveria resultados de otro modelo.
						//
						// console.error y no console.log: antes esto era una promesa sin catch y por lo
						// menos pintaba rojo en la consola. Este archivo ya escupe varios console.log
						// por apertura; un error mas ahi adentro no lo ve nadie.
						console.error('search: no se pudieron juntar los modelos para la precarga', error)
						self.models_to_search = []
						if (self.limpiar_resultados_de_busqueda) {
							self.preview_results = []
						}
					})

				this.$bvModal.show(this._id+'-search-modal')
				setTimeout(() => {
					document.getElementById(this._id+'-search-modal-input').focus()
				}, 100)
			}
		},
		setSelected(model, results) {
			console.log('se va a emitir setSelected con results:')
			console.log(results)
			this.selected_model = model 
			this.$emit('setSelected', {
				model,
				prop: this.prop,
				query: this.query,				
				received_model: this.model,				
				results: results,				
			})
			if (this.clear_query) {
				this.query = ''
			}
			this.setInputValue()
		},
		setInputValue() {
			if (this.selected_model) {
				let input = document.getElementById(this._id)
				input.setAttribute('model_id', this.selected_model.id)
			}
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.search-component
	width: 100%
	// display: flex
.cont-search-input-btn
	display: flex
	align-items: center
	width: 100%
// Los colores van por token con el literal viejo de fallback, adentro del componente: el <style>
// del componente le gana por especificidad a las reglas del tema global, asi que una regla en
// _dark_theme.sass no alcanzaria. El !important de .bg-gray es el que ya estaba, no se agrega uno.
.cont-search
	width: 100%
	position: relative
	display: flex
	flex-direction: row

	// El borde, la sombra y el radio de abajo son del markup VIEJO (un div .icon + un input
	// sueltos), que hoy solo usa BarCodeSearch.vue. Este <style> no es scoped, asi que esa clase
	// es global y ese componente sigue dependiendo de ellos: por eso no se borran.
	// El search-component ya no los usa -- su contenedor declara .cont-search--field y el borde
	// lo dibuja .search-field, que replica los tokens de un input del sistema.
	// OJO: hasta el 5/8/2026 esto estaba al reves (se anulaba el campo desde .cont-search con
	// !important) y el efecto era que el diseno nuevo no se veia NUNCA: siempre ganaba el
	// rectangulo viejo. Si en algun momento parece que el buscador "volvio a verse cuadrado",
	// mira aca primero.
	// Los colores van por token (grupo 360, modo oscuro) con el literal viejo de fallback: el
	// markup viejo tambien tiene que responder al tema.
	&:not(.cont-search--field)
		box-shadow: 0 2px 4px var(--shadow-color, rgba(0, 0, 0, 0.15)) !important
		border: 1px solid var(--color-border, #ced4da)
		border-radius: 0.25rem

// Separacion entre el campo de busqueda y lo que se pone a su derecha (hoy, el boton de columnas
// de la relacion). Antes este margen lo traia el input de "buscar dentro de", que ya no existe.
.cont-search-input-btn > *:not(:first-child)
	margin-left: 10px

// El recuadro de la lupa: era el bloque blanco pegado al input en modo oscuro.
.icon
	background: var(--bg-section, #FFF)
	width: 40px
	display: flex
	flex-direction: row
	align-items: center
	font-size: 1.2em
	justify-content: flex-end
	border-radius: 0.25rem 0 0 0.25rem
	i
		color: var(--color-text-secondary, rgba(0, 0, 0, .6))
	@if ($theme == 'dark')
		background: #333 !important
		i
			color: #FFF
// Estado deshabilitado del buscador.
.bg-gray
	background: var(--bg-hover, #e9ecef) !important
.input-search
	border-radius: 0 0.25rem 0.25rem 0
	box-shadow: none !important
	border: none !important

// Campo del input que abre el modal de busqueda, y del input de "buscar dentro de los modelos
// cargados". Replica los tokens de un input del sistema (src/sass/_inputs.sass y
// common-vue/sass/_inputs.sass): borde de 2px, radio de 5px, la misma sombra y el mismo foco.
// Antes esto era un pill redondeado copiado del buscador general; se cambio el 5/8/2026 porque
// el campo tiene que ser indistinguible del resto de los inputs del formulario, no un control
// aparte. El pill sigue vivo donde tiene sentido: .buscador-general__pill, que es otro componente.
// Rediseñado el 13/8/2026 junto con los campos del formulario del modal (ver el bloque de
// .form-control en model/ModelForm.vue): borde de 1px, esquinas de 10px, la altura de los
// controles del sistema y un anillo suave al enfocar, igual que el pill del buscador general.
// Antes era un rectangulo de 2px que pasaba a 3px al enfocar (movia la fila un pixel) con un halo
// azul de 8px y la sombra gris asimetrica que common-vue/sass/_inputs.sass le pone a todo input.
.search-field
	display: flex
	align-items: center
	width: 100%
	min-height: var(--toolbar-control-h, 36px)
	background: var(--bg-card, #fff)
	border: 1px solid var(--color-border, #ced4da)
	border-radius: 10px
	box-shadow: none
	transition: border-color 0.15s ease, box-shadow 0.15s ease

	&:focus-within
		border-color: var(--color-primary, #007bff)
		box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15)

	// Input plano: el contenedor dibuja el borde, el input solo escribe.
	// El selector incluye .form-control a proposito: sin esa clase empata en especificidad con
	// `.model-form .form-control` (el bloque de campos del formulario del modal) y quien gana
	// depende del orden en que se carguen los chunks. Con ella, este bloque manda siempre.
	.search-field__input.form-control
		flex: 1 1 auto
		min-width: 0
		// height: auto y no el height de Bootstrap: .form-control trae
		// height: calc(1.5em + .75rem + 2px), que ya incluye el borde propio. Como aca el borde lo
		// pone .search-field, ese height dejaria el campo mas alto que el resto.
		height: auto
		min-height: 0
		padding: 0.25rem 0.7rem
		font-size: 0.95rem
		line-height: 1.45
		border: none
		border-radius: 0
		outline: none
		background: transparent
		box-shadow: none

		// src/sass/_inputs.sass le pinta a todo input:focus un borde azul con halo. Sin apagarlo
		// aca se verian DOS bordes azules, el del input adentro del del contenedor.
		&:focus
			border: none
			box-shadow: none
			background: transparent

	// Icono discreto adentro del campo, a la derecha.
	.search-field__icon
		display: flex
		align-items: center
		justify-content: center
		flex: 0 0 auto
		width: 34px
		// Por token: el bloque @if ($theme == 'dark') que estaba aca nunca compila ($theme es
		// siempre 'light' en _custom.scss), asi que en modo oscuro el icono quedaba gris oscuro
		// sobre fondo oscuro.
		color: var(--color-text-secondary, rgba(0, 0, 0, .5))
		cursor: pointer
		i
			font-size: 1.1rem

	// Deshabilitado: gris el campo entero, como cualquier .form-control:disabled. Antes el gris
	// se le ponia solo al icono y quedaba un cuadradito gris adentro de un campo blanco.
	&.search-field--disabled
		background: #e9ecef
		cursor: not-allowed
		.search-field__input
			background: transparent
		.search-field__icon
			cursor: default
</style>