<template>
<div>
	<import-history
	:model_name="model_name"
	:show_history="show_history"></import-history>

	<import-status></import-status>

	<b-modal
	size="lg"
	:title="title"
	:id="id"
	hide-footer>

		<div
		v-if="model_name == 'article'">
			
			<b-button
			@click="showHistory"
			variant="primary">
				<i class="icon-eye"></i>
				Historial de importaciones
			</b-button>

			<hr>
			<p>
				<strong>
					Opcion 1. Descargar el archivo Modelo en formato Excel
				</strong>
			</p>
			<p
			class="m-b-0">
				Comience por descargar el archivo modelo con los títulos de las columnas que ComercioCity necesita para importar los datos de sus {{ plural(model_name) }}.
			</p>
			<b-button
			class="m-t-10"
			@click="base_export"
			variant="success">
				Descargar el archivo modelo
			</b-button>
			<hr>
			<p>
				<strong>
					Opcion 2. Tambien puede tomar un archivo Excel ya existente, e indicar que columna de su archivo corresponde a que propiedad. 
				</strong>
			</p>
		</div>

		<hr>	
		<div>	
			<p>
				<strong>
					Identificación
				</strong>
			</p>
			<p
			v-for="(identification, index) in identifications"
			:key="index">
				{{index + 1}}: {{ identification }}
			</p>
		</div>
		<hr>	
		<div>

				
			<column-positions-guardadas
			v-if="model_name == 'article'"
			:positions_seted="positions_seted"
			:start_row="start_row"
			:columns="columns_"></column-positions-guardadas>

			<p>
				<strong>
					Posición de las columnas en el Excel
				</strong>
			</p>
			<b-button
			class="m-b-15 m-t-15"
			block
			size="sm"
			variant="outline-primary"
			id="limpiar_posiciones"
			@click="setPositions">
				<span
				v-if="positions_seted">
					Limpiar posiciones
				</span>
				<span
				v-else>
					Resetear posiciones
				</span>
			</b-button>
			<b-form-row> 
				<b-col
				:cols="excel_column(column, 12)"
				:md="excel_column(column, 4)"
				v-for="(column, index) in columns_"
				:key="'import-column-' + index + '-' + (column.text || column.group_title || '')">

					<div
					v-if="column.group_title">
						<hr>
						<h4
						class="m-t-20 m-b-20">
							{{ column.group_title }}
						</h4>
					</div>

					<div 
					v-else-if="column.text"
					class="import-column-card shadow-3"
					:class="{ 'import-column-card--has-help': has_column_help(column) }">
						<div 
						:id="'cont-input-prop-'+index"
						class="cont-inputs">
							<div class="import-column-label">
								<span
								class="btn btn-link import-column-title"
								@click="setColumn(index)">
									{{ column.text }} 
								</span>
								<b-button
								v-if="has_column_help(column)"
								size="sm"
								:variant="get_column_help_btn_variant(column)"
								class="import-column-help-btn"
								:class="get_column_help_btn_active_class(column)"
								@click.stop="$set(column, 'show_description', !column.show_description)"
								:title="column.show_description ? 'Ocultar instrucciones' : 'Ver instrucciones'">
									<i
									class="import-column-help-icon"
									:class="column.show_description ? 'icon-up' : 'icon-down'"></i>
								</b-button>
							</div>
							<div class="import-column-input">

								<b-form-input
								:id="column.text.replaceAll(' ', '_')+'-position'"
								@keyup="set_position(index)"
								maxlength="2"
								v-model="column.letra"></b-form-input>

							</div>
						</div>

						<!--
							Prompt 310: flag "permitir valores en blanco" por columna mapeada.
							Solo se muestra si la columna ya tiene una posición asignada (mapeada),
							para no ensuciar la pantalla con columnas que ni siquiera se van a importar.
						-->
						<div
						v-if="column.position !== ''"
						class="import-column-blank-flag">
							<b-form-checkbox
							:id="'blank-flag-'+index"
							size="sm"
							v-model="column.allow_blank">
								<span class="import-column-blank-flag-text">
									Permitir valores en blanco
								</span>
							</b-form-checkbox>
						</div>

						<transition name="import-description-slide">
							<div
							v-if="has_column_help(column) && column.show_description"
							class="import-column-description"
							:class="{ 'import-column-description--relation': column.help && column.help.has_relation_options }">
								<span class="import-column-description-label">
									Instrucciones
								</span>
								<p
								v-if="column.help && column.help.text"
								class="import-column-description-text m-b-0">
									{{ column.help.text }}
								</p>
								<div
								v-if="column.help && column.help.has_relation_options"
								class="import-column-values-block"
								:class="{ 'm-t-10': column.help.text }">
									<span class="import-column-values-title">
										{{ column.help.values_label }}
									</span>
									<div
									v-if="column.help.values.length > 0"
									class="import-column-values-list">
										<span
										v-for="(value, value_index) in column.help.values"
										:key="'import-value-' + index + '-' + value_index"
										class="import-column-value-chip">
											{{ value }}
										</span>
									</div>
									<p
									v-else
									class="import-column-description-text import-column-description-empty m-b-0">
										Los valores se tomarán de los registros existentes en el sistema.
									</p>
								</div>
							</div>
						</transition>
					</div>
				</b-col>
			</b-form-row>
		</div>

		<advises
		:advises="advises"></advises>	

		<hr>

		<slot></slot>
		
		<b-form-group
		label="Fila a partir de la cual empezar a importar">
			<b-form-input
			type="number"
			v-model="start_row"
			placeholder="Fila a partir de la cual empezar a importar"></b-form-input>
		</b-form-group>

		<hr>
		
		<b-form-group
		description="Dejar en blanco para importar hasta la ulitma fila"
		label="Ultima fila hasta la cual importar">
			<b-form-input
			type="number"
			v-model="finish_row"
			placeholder="Ultima fila hasta la cual importar"></b-form-input>
		</b-form-group>

		<hr>


		<div
		v-if="pedir_operacion_a_realizar">
			<p>
				<strong>
					Operaciones a realizar
				</strong>
			</p>
			<b-form-radio
			class="radio-option"
			:value="0"
			size="lg"
			v-model="create_and_edit">
				<span
				id="solo_actualizar">
					Solo editar {{ plural(model_name) }} existentes
				</span>
			</b-form-radio>
			<b-form-radio
			class="radio-option"
			:value="1"
			size="lg"
			v-model="create_and_edit">
				<span
				id="cargar_y_actualizar">
					Cargar nuevos {{ plural(model_name) }} y editar existentes
				</span>
			</b-form-radio>

			<hr>
			<div
			v-if="model_name == 'article'">
				

				<div
				class="checkbox-group-option">

					<!-- 1 -->
					<b-form-checkbox
					class="radio-option"
					:value="1"
					:unchecked-value="0"
					size="lg"
					v-model="permitir_provider_code_repetido">
						<div class="j-start align-start">
							
							<div class="f-columns">
								
								<span>
									Permitir códigos de proveedor repetidos
								</span>
								<p
								class="text-description">
									Un mismo código de proveedor puede pertenecer a mas de un articulo
								</p>
							</div>

							<b-button
							class="m-l-20 m-t-5"
							size="sm"
							variant="outline-success"
							id="permitir_provider_code_repetido">?</b-button>

							<b-popover
							triggers="click"  
							placement="right"
							target="permitir_provider_code_repetido" 
							>
								<p>
									Si está activado, el sistema acepta duplicados: el mismo "codigo de proveedor" puede estar en más de un artículo.
								</p>
								<p>
									Si está desactivado, el "codigo de proveedor" se considera único: si ya existe, el import actualizará el artículo existente en lugar de crear uno nuevo.
								</p>
								<p>
									Cuándo usarlo:
									Activarlo cuando tu proveedor maneja variantes o líneas distintas con el mismo código, o cuando el Excel viene con duplicados intencionales.
								</p>			
							</b-popover>
						</div>

					</b-form-checkbox>
					

					<!-- 2 -->
					<b-form-checkbox
					v-if="permitir_provider_code_repetido"
					class="radio-option"
					:value="1"
					:unchecked-value="0"
					size="lg"
					v-model="permitir_provider_code_repetido_en_multi_providers">
						<div class="j-start align-start">
							
							<div class="f-columns">
								<span>
									Permitir repetir el mismo código de proveedor en distintos proveedores
								</span>
								<p
								class="text-description">
									Un mismo codigo de proveedor, puede pertenecer a articulos de distintos proveedores.
								</p>
							</div>

							<b-button
							id="permitir_provider_code_repetido_en_multi_providers"
							class="m-l-20 m-t-5"
							size="sm"
							variant="outline-success">?</b-button>

							<b-popover
							triggers="click"  
							placement="right"
							target="permitir_provider_code_repetido_en_multi_providers" 
							>
								<p>
									Si está activado, el mismo código puede aparecer en artículos asociados a distintos proveedores.
								</p>
								<p>
									Si está desactivado, se intenta evitar que el mismo "codigo de proveedor" se use en distintos proveedores (si hay coincidencias, el comportamiento dependerá de si habilitaste “Actualizar artículos de otros proveedores”).
								</p>
								<p>
									Cuándo usarlo:
								</p>
								<p>
									Activarlo si el "codigo de proveedor" no es globalmente único y depende del proveedor.
								</p>			
								<p>
									Desactivarlo si querés que el "codigo de proveedor" sea “único a nivel sistema” aunque permitas duplicados dentro de un proveedor.
								</p>
							</b-popover>
						</div>
					</b-form-checkbox>


					
				</div>


				<!-- 3 -->
				<div
				class="checkbox-group-option">
					

					<b-form-checkbox
					class="radio-option"
					:value="1"
					:unchecked-value="0"
					size="lg"
					v-model="actualizar_articulos_de_otro_proveedor">
						<div class="j-start align-start">
							
							<div class="f-columns">
								<span
								id="cargar_y_actualizar">
									Actualizar artículos de otros proveedores
								</span>
								<p
								class="text-description">
									Si en este excel aparecen articulos de otro proveedor, define si también se actualizan.
								</p>
							</div>

							<b-button
							id="actualizar_articulos_de_otro_proveedor"
							class="m-l-20 m-t-5"
							size="sm"
							variant="outline-success">?</b-button>

							<b-popover
							triggers="click"  
							placement="right"
							target="actualizar_articulos_de_otro_proveedor" 
							>
								<p>
									Cuando el Excel trae un "codigo de proveedor" que ya existe en artículos de otros proveedores:
								</p>
								<p>
									Activado: también se actualizan esos artículos.
								</p>
								<p>
									Desactivado: solo se actualizan los artículos del proveedor del Excel (los de otros proveedores se ignoran).
								</p>
								<p>
									Cuándo usarlo:
								</p>			
								<p>
									Activarlo si querés mantener precios/stock sincronizados entre proveedores para el mismo código.
								</p>
								<p>
									Dejarlo desactivado si cada proveedor se administra de forma independiente.
								</p>
							</b-popover>
						</div>
					</b-form-checkbox>

					<b-form-checkbox
					v-if="actualizar_articulos_de_otro_proveedor"
					class="radio-option"
					:value="1"
					:unchecked-value="0"
					size="lg"
					v-model="actualizar_proveedor">
						<div class="j-start align-start">
							
							<div class="f-columns">
								<span>
									Actualizar el proveedor de los articulos
								</span>
								<p
								class="text-description">
									Ya que vas a actualizar todos los artículos con los que haya coincidencias (pertenezcan o no al proveedor que indicaste), al activar esta opción vas a cambiar el proveedor de todos los artículos que hayan tenido cambios. 
								</p>
								<p
								class="text-description">
									Si lo desactivas, los artículos que pertenezcan a otro proveedor van a seguir perteneciendo a ese proveedor.
								</p>
							</div>
						</div>
					</b-form-checkbox>
				</div>
				
				<!-- 4 -->
				<div
				v-if="permitir_provider_code_repetido"
				class="checkbox-group-option">
					
					<b-form-checkbox
					class="radio-option"
					:value="1"
					:unchecked-value="0"
					size="lg"
					v-model="actualizar_por_provider_code">
						<div class="j-start align-start">
							
							<div class="f-columns">
								<span>
									Actualizar por código de proveedor
								</span>
								<p
								class="text-description">
									Si se activa, cuando se encuentre un codigo de proveedor repetido, se actualizan las coincidencias de ese codigo. 
								</p>
								<p
								class="text-description">
									Si se desactiva, cuando se encuentre un codigo de proveedor repetido, se crea un nuevo articulo con ese codigo.
								</p>
								<p class="text-description">
									Desactivarlo cuando se importe excel por primera vez
								</p>
							</div>

							<b-button
							id="actualizar_por_provider_code"
							class="m-l-20 m-t-5"
							size="sm"
							variant="outline-success">?</b-button>

							<b-popover
							triggers="click"  
							placement="right"
							target="actualizar_por_provider_code" 
							>
								<p>
									Activado (modo sincronización): si existe uno o más artículos con ese "codigo de proveedor", se actualizan todas las coincidencias permitidas por la configuración (por ejemplo, solo del proveedor actual si “Actualizar otros proveedores” está desactivado).
								</p>
								<p>
									Desactivado (modo carga): el import crea nuevos artículos, aunque ya existan artículos con el mismo "codigo de proveedor".
								</p>
								<p>
									Cuándo usarlo:
								</p>			
								<p>
									Desactivado para primera carga (querés crear todo lo que viene en el Excel).
								</p>
								<p>
									Activado para reimportar y actualizar inventario (stock/precio/datos) de artículos existentes.
								</p>
							</b-popover>
						</div>
					</b-form-checkbox>
				</div>

						


				<div class="ayudas">
					<hr>
					<h4>
						Combinaciones típicas
					</h4>

					<div 
					@click="set_cominacion('primer_carga')"
					class="ayuda">
						
						<h6>
							Primera carga (crear todo):
						</h6>
						<p>
							Permitir códigos repetidos ✅
						</p>
						<p>
							Actualizar por código ❌
							<span>
								➡️ Crea artículos nuevos, tantos como codigo de proveedor haya repetidos.
							</span>
						</p>
					</div>

					<div 
					@click="set_cominacion('actualizacion')"
					class="ayuda">
						<h6>
							Sincronización (actualizar existentes):
						</h6>
						<p>
							Permitir códigos repetidos ✅
						</p>
						<p>
							Actualizar por código ✅
							<span>
								➡️ Actualiza todos los artículos que coincidan por codigo de proveedor (según las reglas de proveedores).
							</span>
						</p>
					</div>

					<div 
					@click="set_cominacion('actualizacion')"
					class="ayuda">
						<h6>
							Si hay coincidencias en otros proveedores
						</h6>
						<p>
							Actualizar artículos de otros proveedores ❌: solo se actualiza el proveedor actual.
						</p>
						<p>
							Actualizar artículos de otros proveedores ✅: también se actualizan coincidencias en otros proveedores.
						</p>
					</div>






				</div>

			</div>

			<hr>	
		</div>

		<b-form-group
		label="Archivo Excel para importar">
			<b-form-file
			browse-text="Buscar"
			:id="'input-file-'+this.model_name"
			v-model="file"
			variant="primary"
			:state="Boolean(file)"
			@change="onFileChange"
			placeholder="Seleccione el archivo o arrastralo hasta aquí"
			drop-placeholder="Solta el archivo aqui..."
			></b-form-file>
		</b-form-group>

		<hr>
		<btn-loader
		id="btn_importar"
		:disabled="!file"
		@clicked="upload"
		text="Importar"
		:loader="loading"></btn-loader>
		
		
		<div
		class="m-t-15 text-primary text-center"
		v-if="varias_solicitudes && loading">
			<b-progress 
			class="m-b-10"
			variant="primary" :value="solicitud_numero" :max="cantidad_solicitudes" show-progress animated></b-progress>
			<strong
			v-if="!demora_de_todas_las_solicitud">
				Por favor aguarde, calculando demora...
			</strong>
			<strong
			v-else>
				Por favor aguarde, quedan {{ demora_de_todas_las_solicitud.toFixed(0) }} segundos...
			</strong>
		</div>

		<p
		class="m-t-15 text-primary text-center"
		v-else-if="!varias_solicitudes && loading">
			<strong>
				Por favor aguarde, esto podria tardar unos minutos...
			</strong>
		</p>
	</b-modal>
</div>
</template>
<script>
// let XLSX = require('xlsx')
import * as XLSX from 'xlsx/xlsx.mjs'
import Advises from '@/common-vue/components/import/Advises'
import BtnLoader from '@/common-vue/components/BtnLoader'
export default { 
	components: {
		Advises,
		BtnLoader,
		ImportHistory: () => import('@/common-vue/components/import/ImportHistory'),
		ImportStatus: () => import('@/common-vue/components/import/import-status/Index'),
		ColumnPositionsGuardadas: () => import('@/common-vue/components/import/column-positions-guardadas/Index'),
	}, 
	props: {
		model_name: String,
		columns: {
			type: Array,
			default() {
				return []
			}
		},
		actions: {
			type: Array,
			default() {
				return []
			}
		},
		props_to_send: {
			type: Object,
			default() {
				return {}
			}
		},
		advises: {
			type: Array,
			default() {
				return []
			}
		},
		identifications: {
			type: Array,
			default() {
				return [
					'Numero',
					'Código de Barras',
					'Código de Proveedor',
				]
			}
		},
		file_name: {
			type: String,
			default: null,
		},
		pedir_operacion_a_realizar: {
			type: Boolean,
			default: true,
		}
	},
	computed: {
		title() {
			return 'Importar '+this.plural(this.model_name)
		},
		id() {
			return 'import-'+this.model_name 
		},
		limite_filas() {
			if (this.is_local) {
				return 20
			}
			return 70
		},
		selected_column_position_id() {
			return this.$store.state.column_position.selected_column_position_id
		},
	},
	data() {
		return {
			loading: false,
			file: null,
			start_row: 2,
			finish_row: '',
			finish_row_original: '',
			percentage: '',
			columns_: [], 
			positions_seted: false,
			create_and_edit: null,
			actualizar_articulos_de_otro_proveedor: 1,
			registrar_art_cre: 1,
			registrar_art_act: 1,
			permitir_provider_code_repetido: 0,
			permitir_provider_code_repetido_en_multi_providers: 0,
			actualizar_por_provider_code: 0,
			actualizar_proveedor: 0,
			show_history: false,
			archivo_excel_path: null,

			cantidad_solicitudes: 0,
			solicitud_numero: 0,
			varias_solicitudes: false,
			es_la_ultima_solicitud: false,
			import_history_id: null,
			pre_import_id: null,
			hubo_un_error: false,

			es_la_primera_solicitud: false,
			inicio_primera_solicitud: 0,		
			fin_primera_solicitud: 0,		
			demora_de_todas_las_solicitud: 0,
			temporizador: null
		}
	},
	mounted() {
		console.log('Modal Import mounted')
	    this.$root.$on('bv::modal::show', (bvEvent, modalId) => {
	        if (modalId === this.id) {
				this.hubo_un_error = false
				this.demora_de_todas_las_solicitud = 0
				console.log('Se puso hubo_un_error en '+this.hubo_un_error)
				this.set_default_columns_positions()
				this.load_import_stores()
				this.$store.commit('column_position/set_selected_column_position_id', 0)
	        }
	    })
	},
	watch: {
		actualizar_articulos_de_otro_proveedor() {
			if (!this.actualizar_articulos_de_otro_proveedor) {
				this.actualizar_proveedor = 0				
			}
		},
		permitir_provider_code_repetido() {
			if (!this.permitir_provider_code_repetido) {
				this.permitir_provider_code_repetido_en_multi_providers = 0
			}
		},
		columns() {
			console.log('watch de columns')
			this.set_default_columns_positions()
			this.load_import_stores()
		},
		selected_column_position_id() {
			if (this.selected_column_position_id != 0) {
				this.set_column_positions_from_selected_columns()
			} else {
				this.set_default_columns_positions()
			}
		},
	},
	methods: {
		excel_column(column, _default) {
			// console.log('excel_column: '+column.group_title)
			if (column.group_title) {
				return 12
			}
			return _default
		},

		/**
		 * Devuelve props extra de importación evitando errores cuando no se pasaron desde el padre.
		 *
		 * @return {Object} Objeto con propiedades adicionales para el FormData.
		 */
		get_import_extra_props() {
			if (this.props_to_send) {
				return this.props_to_send
			}

			return {}
		},

		/**
		 * Devuelve la clave backend de una columna (snake_case) usada en prop_* del FormData.
		 *
		 * @param {Object} column Columna configurada en el importador concreto.
		 * @return {string} Clave estable para el backend.
		 */
		get_column_prop_key(column) {
			if (column.key) {
				return column.key
			}

			return column.text
		},

		/**
		 * Normaliza el texto de una columna para comparar definiciones y presets guardados.
		 *
		 * @param {string} text Texto visible de la columna.
		 * @return {string} Texto normalizado en minúsculas y sin espacios extremos.
		 */
		normalize_column_text(text) {
			return (text || '').toString().trim().toLowerCase()
		},

		/**
		 * Busca la definición original de una columna según su texto visible.
		 *
		 * @param {string} text Texto de la columna en pantalla.
		 * @return {Object|null} Definición encontrada en `columns` o null.
		 */
		find_column_def_by_text(text) {
			let normalized_text = this.normalize_column_text(text)
			let column_def = null

			this.columns.forEach(column => {
				if (column.text && this.normalize_column_text(column.text) === normalized_text) {
					column_def = column
				}
			})

			return column_def
		},

		/**
		 * Arma la lista de módulos Vuex que deben cargarse para mostrar valores posibles.
		 *
		 * @return {Array} Nombres de módulos del store a consultar con getModels.
		 */
		get_import_store_modules() {
			let store_modules = {}

			this.actions.forEach(action => {
				let action_parts = action.split('/')

				if (action_parts.length >= 2 && action_parts[1] === 'getModels') {
					store_modules[action_parts[0]] = true
				}
			})

			this.columns.forEach(column => {
				if (column.relation_options && column.relation_options.store_module) {
					store_modules[column.relation_options.store_module] = true
				}
			})

			return Object.keys(store_modules)
		},

		/**
		 * Carga en el store los modelos relacionados con columnas de importación y refresca ayudas.
		 */
		load_import_stores() {
			let store_modules = this.get_import_store_modules()
			let promises = []

			store_modules.forEach(store_module => {
				promises.push(this.$store.dispatch(store_module + '/getModels'))
			})

			if (promises.length === 0) {
				return
			}

			Promise.all(promises).then(() => {
				this.refresh_columns_descriptions()
			}).catch(() => {
				this.refresh_columns_descriptions()
			})
		},

		/**
		 * Reconstruye las descripciones visibles de columnas ya renderizadas en el modal.
		 */
		refresh_columns_descriptions() {
			this.columns_.forEach(column => {
				if (!column.text) {
					return
				}

				let column_def = this.find_column_def_by_text(column.text)

				if (column_def) {
					column.help = this.resolve_column_help(column_def)
					column.description = this.get_column_help_text(column.help)
				}
			})
		},

		/**
		 * Indica si la columna tiene ayuda visible para el operador.
		 *
		 * @param {Object} column Columna renderizada en el modal.
		 * @return {boolean} True si hay texto manual o valores de relación.
		 */
		has_column_help(column) {
			if (!column.help) {
				return false
			}

			if (column.help.text) {
				return true
			}

			if (column.help.has_relation_options) {
				return true
			}

			return column.help.values && column.help.values.length > 0
		},

		/**
		 * Define el variant del botón de ayuda según el tipo de instrucciones.
		 *
		 * @param {Object} column Columna renderizada en el modal.
		 * @return {string} Variant bootstrap del botón.
		 */
		get_column_help_btn_variant(column) {
			if (column.help && column.help.has_relation_options) {
				return 'success'
			}

			return 'outline-secondary'
		},

		/**
		 * Clase activa del botón de ayuda según el tipo de instrucciones.
		 *
		 * @param {Object} column Columna renderizada en el modal.
		 * @return {Object} Clases condicionales para el botón.
		 */
		get_column_help_btn_active_class(column) {
			if (!column.show_description) {
				return {}
			}

			if (column.help && column.help.has_relation_options) {
				return { 'import-column-help-btn--active-success': true }
			}

			return { 'import-column-help-btn--active-secondary': true }
		},

		/**
		 * Arma un texto plano de ayuda para presets guardados o compatibilidad legacy.
		 *
		 * @param {Object|null} help Ayuda estructurada de la columna.
		 * @return {string|undefined} Texto resumido de la ayuda.
		 */
		get_column_help_text(help) {
			if (!help) {
				return undefined
			}

			let parts = []

			if (help.text) {
				parts.push(help.text)
			}

			if (help.has_relation_options && help.values.length > 0) {
				parts.push(help.values_label + ': ' + help.values.join(', ') + '.')
			}

			if (parts.length === 0) {
				return undefined
			}

			return parts.join(' ')
		},

		/**
		 * Construye la ayuda estructurada de una columna (texto manual + valores de relaciones).
		 *
		 * @param {Object} column Definición de la columna recibida por props.
		 * @param {Object|null} saved_preset Posición guardada del usuario, si existe.
		 * @return {Object|undefined} Ayuda estructurada para renderizar en el modal.
		 */
		resolve_column_help(column, saved_preset) {
			if (!column) {
				return undefined
			}

			if (!column.relation_options) {
				if (saved_preset && saved_preset.description) {
					return {
						text: saved_preset.description,
						values: [],
						values_label: 'Valores posibles',
						has_relation_options: false,
					}
				}

				if (!column.description) {
					return undefined
				}

				return {
					text: column.description,
					values: [],
					values_label: 'Valores posibles',
					has_relation_options: false,
				}
			}

			let help = {
				text: column.description || null,
				values: [],
				values_label: column.relation_options.prefix || 'Valores posibles',
				has_relation_options: true,
			}

			if (help.values_label.indexOf(':') !== -1) {
				help.values_label = help.values_label.replace(':', '').trim()
			}

			let store_module = column.relation_options.store_module
			let value_prop = column.relation_options.value_prop || 'name'
			let store_state = this.$store.state[store_module]
			let models = store_state && store_state.models ? store_state.models : []

			models.forEach(model => {
				if (model[value_prop]) {
					help.values.push(model[value_prop])
				}
			})

			if (!help.text && help.values.length === 0) {
				help.text = 'Los valores se tomarán de los registros existentes en el sistema.'
			}

			return help
		},

		/**
		 * @deprecated Usar resolve_column_help(). Mantiene compatibilidad con presets guardados.
		 */
		resolve_column_description(column, saved_preset) {
			return this.get_column_help_text(this.resolve_column_help(column, saved_preset))
		},

		check_letra(index) {
			let letra = this.columns_[index].letra.toUpperCase()

			// console.log('check_letra:')
			// console.log(this.columns_[index].letra)
			// console.log(letra)
			this.columns_[index].letra = letra
		},
		number_to_excel_column(n) {
		    let column = '';
		    while (n > 0) {
		        let remainder = (n - 1) % 26;
		        column = String.fromCharCode(65 + remainder) + column;
		        n = Math.floor((n - 1) / 26);
		    }
		    return column;
		},
		excel_column_to_number(column) {
		    let number = 0;
		    for (let i = 0; i < column.length; i++) {
		        number = number * 26 + (column.charCodeAt(i) - 64);
		    }
		    return number;
		},
		base_export() {
			let url = process.env.VUE_APP_API_URL+'/'+this.model_name+'-base/excel/export'
			window.open(url)		
		},
		onFileChange(event) {
		    this.$store.commit('auth/setMessage', 'Cargando archivo...');
		    this.$store.commit('auth/setLoading', true);

		    let file;
		    if (!event.target.files) {
		        file = event.dataTransfer.files[0];
		        console.log('Vino desde drop');
		    } else if (event.target.files && event.target.files.length > 0) {
		        file = event.target.files[0];
		    }

		    // Llamar al procesamiento del archivo
		    this.processFile(file)
		        .then(() => {
		            console.log('Archivo procesado con éxito.');
		        })
		        .catch((error) => {
		            console.error('Error al procesar el archivo:', error);
		            this.$store.commit('auth/setMessage', 'Ocurrió un error al procesar el archivo.');
		        })
		        .finally(() => {
		            this.$store.commit('auth/setLoading', false);
		        });
		},
		async processFile(file) {
		    return new Promise((resolve, reject) => {
		        const reader = new FileReader();
		        reader.onload = (e) => {
		            try {
		                const data = new Uint8Array(e.target.result);
		                const workbook = XLSX.read(data, { type: 'array' });
		                const sheetName = workbook.SheetNames[0];
		                const worksheet = workbook.Sheets[sheetName];
		                const range = XLSX.utils.decode_range(worksheet['!ref']);
		                let rowCount = 0;

		                console.log('Range:', range);

		                let ultima_fila_con_contenido = 1;
		                for (let fila = range.s.r; fila <= range.e.r; ++fila) {
		                    for (let C = range.s.c; C <= range.e.c; ++C) {
		                        const cellAddress = { c: C, r: fila };
		                        const cellRef = XLSX.utils.encode_cell(cellAddress);
		                        const cell = worksheet[cellRef];
		                        if (cell && cell.v !== null && cell.v !== '') {
		                            ultima_fila_con_contenido = fila + 1;
		                            break;
		                        }
		                    }
		                    rowCount++;
		                }

		                console.log('Cantidad de filas:', rowCount);
		                console.log('Última fila con contenido:', ultima_fila_con_contenido);

		                this.finish_row = ultima_fila_con_contenido;
		                console.log('Finish_row:', this.finish_row);

		                resolve();
		            } catch (err) {
		                reject(err);
		            }
		        };
		        reader.readAsArrayBuffer(file);
		    });
		},
		canIgnore(column) {
			return typeof column.can_not_ignore == 'undefined'
		},
		setColumn(index) {

			let ultima_position = 0
			let position = null

			this.columns_.forEach(column => {

				if (column.position != '') {
					position = Number(column.position)
					if (position > ultima_position) {
						ultima_position = position  
					}
				}
			}) 
			ultima_position++
			this.columns_[index].position = ultima_position
			this.columns_[index].letra = this.number_to_excel_column(ultima_position)
			this.print_columns()
		},
		set_position(index) {
			
			this.check_letra(index)

			let column = this.columns_[index]
			if (column && column.letra) {

				let position = this.excel_column_to_number(column.letra)
				this.columns_[index].position = position
			} else {

				this.columns_[index].position = ''
			}

			this.print_columns()
		},	

		print_columns() {

			this.columns_.forEach(column => {
				console.log(column.text+': '+column.position+' - ')+column.letra
			})
		},

		setPositions() {
			if (this.positions_seted) {
				this.clear()
			} else {
				this.set_default_columns_positions()
			}
		},

		set_column_positions_from_selected_columns() {
		    const column_position = this.$store.state.column_position.models.find(
		        c => c.id == this.selected_column_position_id
		    )

		    if (typeof column_position === 'undefined') return

		    // 1) Armo un mapa por "text" normalizado -> { letra, position, description, can_not_ignore }
		    const normalize_key = (val) => {
		        return (val || '').toString().trim().toLowerCase()
		    }

		    const saved_map = {}
		    ;(column_position.positions || []).forEach(item => {
		        if (item && item.text) {
		            const key = normalize_key(item.text)
		            saved_map[key] = {
		                letra: item.letra || '',
		                position: item.position || (item.letra ? this.excel_column_to_number(item.letra) : ''),
		                description: item.description,
		                can_not_ignore: typeof item.can_not_ignore !== 'undefined' ? true : undefined,
		                // Prompt 310: flag "permitir valores en blanco" guardado en el preset (default false para presets viejos).
		                allow_blank: Boolean(item.allow_blank),
		            }
		        }
		    })

		    // 2) Reconstruyo columns_ DESDE this.columns (incluye group_title siempre)
		    this.columns_ = []
		    this.columns.forEach(def => {

		        // Si es título de grupo, lo agrego tal cual (sin posiciones)
		        if (def.group_title) {
		            this.columns_.push({
		                group_title: def.group_title,
		                text: undefined,
		                description: undefined,
		                letra: '',
		                position: '',
		                ignored: 0,
		                can_not_ignore: undefined,
		            })
		            return
		        }

		        // Es columna real: aplico preset si existe
		        const key = normalize_key(def.text)
		        const saved = saved_map[key]

		        this.columns_.push({
		            group_title: undefined,
		            text: def.text,
		            help: this.resolve_column_help(def, saved),
		            description: this.get_column_help_text(this.resolve_column_help(def, saved)),
		            show_description: false,
		            letra: saved ? (saved.letra || '') : '',
		            position: saved ? (saved.position || '') : '',
		            ignored: 0,
		            can_not_ignore: typeof def.can_not_ignore != 'undefined' ? true : undefined,
		            // Prompt 310: flag "permitir valores en blanco" por columna, restaurado desde el preset guardado (default false).
		            allow_blank: saved ? Boolean(saved.allow_blank) : false,
		        })
		    })

		    this.positions_seted = true
		    this.start_row = Number(column_position.start_row)

		    // Props extra (solo aplica a importaciones que envían datos adicionales, ej. artículos).
		    if (this.props_to_send) {
		    	this.props_to_send.provider_id = column_position.provider_id
		    }
		    this.create_and_edit = column_position.create_and_edit
		    // this.actualizar_articulos_de_otro_proveedor = column_position.no_actualizar_otro_proveedor
		},

		// Lo ejecuto con una column_position creada por el usuario
		// set_column_positions_from_selected_columns() {

		// 	let column_position = this.$store.state.column_position.models.find(c => c.id == this.selected_column_position_id)
			
		// 	if (typeof column_position == 'undefined') return

		// 	this.columns_ = []

		// 	// Convierto el json en un array de objetos
		// 	// const columns_array = Object.entries(column_position.positions).map(([key, value]) => {
		// 	// 	return {
		// 	// 		text: key,
		// 	// 		letra: value
		// 	// 	};
		// 	// });

		// 	console.log('column_position:')
		// 	console.log(column_position)
		// 	// Agrego las columnas al array de columnas
		// 	column_position.positions.forEach(column => {
				
		// 		this.columns_.push({
		// 			text: column.text,
		// 			description: column.description,
		// 			letra: column.letra,
		// 			position: column.position,
		// 			ignored: 0,
		// 			can_not_ignore: typeof column.can_not_ignore != 'undefined' ? true : undefined,
		// 		})
		// 	})
		// 	this.positions_seted = true

		// 	this.start_row = Number(column_position.start_row)

		// 	this.props_to_send.provider_id = column_position.provider_id
		// 	this.create_and_edit = column_position.create_and_edit
		// 	this.actualizar_articulos_de_otro_proveedor = column_position.no_actualizar_otro_proveedor
		// },

		set_default_columns_positions() {
			console.log('Seteando posiciones')
			this.columns_ = []
			let position = 1
			let letra 
			console.log(this.columns_)
			this.columns.forEach(column => {

				if (typeof column.group_title == 'undefined') {
					console.log('pidiendo letra para '+column.text)
					letra = this.number_to_excel_column(position)
				}
				
				this.columns_.push({
					group_title: column.group_title,
					text: column.text,
					help: this.resolve_column_help(column),
					description: this.get_column_help_text(this.resolve_column_help(column)),
					show_description: false,
					letra: letra,
					position: position,
					ignored: 0,
					can_not_ignore: typeof column.can_not_ignore != 'undefined' ? true : undefined,
					// Prompt 310: flag "permitir valores en blanco" por columna, default false (omitir celdas vacías).
					allow_blank: false,
				})

				if (typeof column.group_title == 'undefined') {
					position++
				}
				
				if (column.saltear_posiciones) {
					position += column.saltear_posiciones
				}
			})
			this.positions_seted = true

			this.start_row = 2
		},
		clear() {
			let index = 0
			this.columns_.forEach(column => {
				column.position = ''
				column.letra = ''
				column.ignored = 0
				// Prompt 310: al limpiar posiciones, se resetea también el flag de valores en blanco.
				column.allow_blank = false
			})
			this.positions_seted = false
			console.log('Limpiando posiciones')
		},
		async upload() {
			if (this.check()) {

				this.loading = true
				let form_data = new FormData()
				// console.log('file:')
				// console.log(this.file)
				form_data.append('models', this.file)
				form_data.append('start_row', this.start_row)
				form_data.append('finish_row', this.finish_row)
				form_data.append('create_and_edit', this.create_and_edit)
				form_data.append('registrar_art_cre', this.registrar_art_cre)
				form_data.append('registrar_art_act', this.registrar_art_act)
				
				form_data.append('actualizar_articulos_de_otro_proveedor', this.actualizar_articulos_de_otro_proveedor)
				form_data.append('actualizar_proveedor', this.actualizar_proveedor)
				form_data.append('permitir_provider_code_repetido', this.permitir_provider_code_repetido)
				form_data.append('permitir_provider_code_repetido_en_multi_providers', this.permitir_provider_code_repetido_en_multi_providers)
				form_data.append('actualizar_por_provider_code', this.actualizar_por_provider_code)


				let index = 0
				this.columns_.forEach(column => {

				    // Saltar títulos de grupo
				    if (column.text) {

						if (!column.ignored) {
							form_data.append('prop_'+this.get_column_prop_key(column), column.position)

							// Prompt 310: flag "permitir valores en blanco" de esta columna mapeada.
							// Mismo esquema que "prop_<key>": el backend lo lee como "blank_<key>".
							form_data.append('blank_'+this.get_column_prop_key(column), column.allow_blank ? 1 : 0)
						} else {
							// form_data.append('prop_ignore_'+column.text, column.position)
							console.log('Se ignoro '+column.text)
						}
				    }

				})
				if (this.props_to_send) {
					Object.keys(this.props_to_send).forEach(key => {
						form_data.append(key, this.props_to_send[key])
					})
				}

				console.log('finish_row final: '+this.finish_row)


				this.varias_solicitudes = false
				await this.sendRequest(form_data)

				console.log('terminaron de enviarse las solicitudes')
				this.loading = false
				this.file = null

				this.start_row = 2
				this.finish_row = ''
				this.finish_row_original = ''
				this.percentage = ''
				if (this.props_to_send) {
					this.props_to_send.provider_id = 0
				}

				this.$bvModal.hide(this.id)

				if (!this.hubo_un_error && this.model_name == 'article') {
					
					this.$toast.success('Estamos precesando tu archivo, te notificaremos cuando termine', {
						duration: 7000
					})
				}
				

			}
		},

		guardar_column_position() {

		    let positions = []
		    this.columns_.forEach(item => {

		        // Guardar títulos de grupo SOLO como estructura (sin letra/position)
		        if (item.group_title && !item.text) {
		            positions.push({
		                group_title: item.group_title,
		            })
		            return
		        }

		        // Guardar columnas reales
		        if (item.text) {
		            positions.push({
		                text: item.text,
		                description: item.description,
		                letra: item.letra,
		                position: item.position,
		                can_not_ignore: item.can_not_ignore,
		                // Prompt 310: se persiste el flag junto con la posición de la columna.
		                allow_blank: Boolean(item.allow_blank),
		            })
		        }
		    })

		    console.log('Se van a guardar estas columnas:')
		    console.log(positions)

		    this.$api.post('column-position', {
		        model_name: 'article',
		        positions: positions,
		        start_row: this.start_row,
		        provider_id: this.get_import_extra_props().provider_id,
		        create_and_edit: this.create_and_edit,
		        no_actualizar_otro_proveedor: this.actualizar_articulos_de_otro_proveedor,
		    })
		    .then(res => {
		        this.$store.commit('column_position/add', res.data.model)
		        this.name = ''
		    })
		    .catch(err => {
		        this.$toast.error('Error al guardar')
		    })
		},
		
		// guardar_column_position() {

		// 	let positions = [];
		// 	this.columns_.forEach(item => {
		// 		positions.push({
		// 			group_title: item.group_title,
		// 			text: item.text,
		// 			letra: item.letra,
		// 			position: item.position,
		// 		})
		// 	});

		// 	console.log('Se van a guardar estas columnas:')
		// 	console.log(positions)


		// 	this.$api.post('column-position', {
		// 		  // name: this.name,
		// 		  // name: this.column_position_name,
		// 		  model_name: 'article',
		// 		  positions: positions,
		// 		  start_row: this.start_row,
		// 		  provider_id: this.props_to_send.provider_id,
		// 		  create_and_edit: this.create_and_edit,
		// 		  no_actualizar_otro_proveedor: this.actualizar_articulos_de_otro_proveedor,
		// 	})
		// 	.then(res => {
		// 		this.$store.commit('column_position/add', res.data.model)
		// 		this.name = ''
		// 	})
		// 	.catch(err => {
		// 		this.$toast.error('Error al guardar')
		// 	})
		// },
		load_import_status() {
			this.$api.get('import-status')
			.then(res => {
				this.$store.commit('import_status/setModel', res.data.model)
			})
		},
		check() {
			if (this.pedir_operacion_a_realizar) {
				if (this.create_and_edit === null) {
					this.$toast.error('Indique las Operaciones a realizar')
					return false 
				}
			}
			if (this.model_name == 'article') {
				let columna_proveedor = this.columns_.find(column => {
					return column.text == 'Proveedor'
				})

				if (typeof columna_proveedor != 'undefined') {

					if (columna_proveedor.position == '' && this.get_import_extra_props().provider_id == 0) {
						if (confirm('No ha indicado ningun proveedor')) {
							return true
						} else {
							return false
						}
						
					}
				}
			}
			return true
		},
		sendRequest(form_data) {
			console.log('enviando solicitud')
			let config = {headers: { 'content-type': 'multipart/form-data' }}

			return this.$api.post(this.routeString(this.model_name)+'/excel/import', form_data, config)
			.then(res => {
				console.log('se envio')
				console.log(res)
				
				if (this.model_name == 'article') {

					this.load_import_status()
					this.guardar_column_position()
				}

				// if (res.data) {
				this.$emit('import-success', res)
				// }

				return
				
			})
			.catch(err => {
				this.loading = false
				this.import_history_id = null
				this.pre_import_id = null
				console.log(err)
				this.hubo_un_error = true
				this.limpiar_temporizador()
				// this.$toast.error('Error al importar Excel')

				// Levantar modal de notificacion global con fallback si el backend no envió payload estructurado
				let response_data = (err.response && err.response.data) ? err.response.data : {}
				let info_to_show = response_data.info_to_show || []
				let functions_to_execute = response_data.functions_to_execute || []
				let message_text = response_data.message || 'Hubo un error al importar el Excel'

				if (info_to_show.length === 0 && response_data.message) {
					info_to_show = [{
						title: 'Detalle del error',
						value: response_data.message,
					}]
				}

				if (functions_to_execute.length === 0) {
					functions_to_execute = [{
						btn_text: 'Entendido',
						btn_variant: 'primary',
					}]
				}

				this.$store.commit('global_notification/set_message_text', message_text)
				this.$store.commit('global_notification/set_color_variant', 'danger')
				this.$store.commit('global_notification/set_info_to_show', info_to_show)
				this.$store.commit('global_notification/set_functions_to_execute', functions_to_execute)

				this.$bvModal.show('global-notification')
			})
		},
		showHistory() {
			this.show_history = !this.show_history
			this.$bvModal.show('import-history')
		},
		empezar_contador() {
			// console.log('entro en empezar_contador')
			let that = this 
			this.temporizador = setInterval(function() {
				// console.log('demora_de_todas_las_solicitud:')
				// console.log(that.demora_de_todas_las_solicitud)
				if (that.demora_de_todas_las_solicitud > 0) {
					that.demora_de_todas_las_solicitud -= 1; // Restar un segundo al contador
					// console.log('Tiempo restante:', that.demora_de_todas_las_solicitud, 'segundos');
				}

				if (that.demora_de_todas_las_solicitud <= 0) {
					that.limpiar_temporizador()
					console.log('Todas las solicitudes han finalizado');
				}
			}, 1000);
		},
		limpiar_temporizador() {
			if (this.temporizador) {
				clearInterval(this.temporizador); // Detener el temporizador
			}
		}
	}
}
</script>
<style lang="sass">
.import-column-card
	border: 1px solid rgba(0, 0, 0, .08)
	padding: 10px 12px
	margin-bottom: 8px
	border-radius: 10px
	background: #fff
	transition: box-shadow .2s ease, border-color .2s ease

	&.import-column-card--has-help:hover
		border-color: rgba(0, 123, 255, .25)
		box-shadow: 0 4px 14px rgba(15, 23, 42, .08)

	.cont-inputs
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
		gap: 8px

	.import-column-label
		display: flex
		align-items: center
		gap: 4px
		min-width: 0
		flex: 1

	.import-column-title
		padding-left: 0
		padding-right: 0
		text-align: left
		white-space: nowrap
		overflow: hidden
		text-overflow: ellipsis

	.import-column-input
		flex-shrink: 0

		input
			width: 72px
			text-align: center
			font-weight: 600

	.import-column-help-btn
		width: 28px
		height: 28px
		padding: 0
		border-radius: 999px
		display: inline-flex
		align-items: center
		justify-content: center
		flex-shrink: 0

	.import-column-help-btn--active-secondary
		background: rgba(108, 117, 125, .08)
		border-color: rgba(108, 117, 125, .35)
		color: #6c757d

	.import-column-help-btn--active-success
		background: rgba(40, 167, 69, .08)
		border-color: rgba(40, 167, 69, .35)
		color: #28a745

	.import-column-help-icon
		font-size: 11px
		line-height: 1

	.import-column-description
		margin-top: 10px
		padding: 10px 12px
		border-radius: 8px
		background: linear-gradient(180deg, rgba(248, 250, 252, 1) 0%, rgba(241, 245, 249, 1) 100%)
		border-left: 3px solid #6c757d

		&.import-column-description--relation
			border-left-color: #28a745

	.import-column-values-block
		margin-top: 0

	.import-column-values-title
		display: block
		font-size: 11px
		font-weight: 700
		letter-spacing: .04em
		text-transform: uppercase
		color: #059669
		margin-bottom: 8px

	.import-column-values-list
		display: flex
		flex-wrap: wrap
		gap: 6px

	.import-column-value-chip
		display: inline-flex
		align-items: center
		padding: 4px 10px
		border-radius: 999px
		background: rgba(40, 167, 69, .1)
		border: 1px solid rgba(40, 167, 69, .18)
		color: #166534
		font-size: 11px
		line-height: 1.3

	.import-column-description-empty
		font-style: italic
		color: #64748b

	.import-column-description-label
		display: block
		font-size: 11px
		font-weight: 700
		letter-spacing: .04em
		text-transform: uppercase
		color: #64748b
		margin-bottom: 6px

	.import-column-description-text
		font-size: 12px
		line-height: 1.45
		color: #334155

// Prompt 310: flag "permitir valores en blanco" por columna mapeada, estilo sutil (no compite con el resto de la card).
.import-column-blank-flag
	margin-top: 6px
	padding-left: 2px

	.custom-control-label
		font-size: 11px
		color: #64748b

.import-column-blank-flag-text
	font-size: 11px

.import-description-slide-enter-active,
.import-description-slide-leave-active
	transition: all .18s ease

.import-description-slide-enter,
.import-description-slide-leave-to
	opacity: 0
	transform: translateY(-4px)

.radio-option
	margin: 20px 0
	font-size: 30px




.ayudas
	h4 
		font-size: 20px
		margin: 15px 0 10px

.ayuda, .checkbox-group-option
	background: rgba(0,0,0,.1)
	padding: 7px 
	border-radius: 5px
	margin-bottom: 10px
	h6 
		font-size: 16px
		font-weight: bold
	p 
		margin-bottom: 5px

.text-description
	font-size: .6em
	margin: 5px 0 


</style>