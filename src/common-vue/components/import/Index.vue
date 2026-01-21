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

		<hr>	
		<div>	
			<p>
				<strong>
					Identificación
				</strong>
			</p>
			<p>
				Primero por: Numero
			</p>
			<p
			v-for="(identification, index) in identifications"
			:key="index">
				Despues por: {{ identification }}
			</p>
		</div>
		<hr>	
		<div>

			<column-positions-guardadas
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
				cols="12"
				md="4"
				v-for="(column, index) in columns_">
					<div class="container shadow-3">
						<div 
						class="cont-inputs">
							<span
							class="btn btn-link"
							@click="setColumn(index)">
								{{ column.text }} 
							</span>
							<div>

								<b-form-input
								:id="column.text.replaceAll(' ', '_')+'-position'"
								@keyup="set_position(index)"
								maxlength="2"
								v-model="column.letra"></b-form-input>

							</div>
						</div>
						<p
						v-if="column.description">
							{{ column.description }}
						</p>
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
				
				<b-form-checkbox
				class="radio-option"
				:value="1"
				:unchecked-value="0"
				size="lg"
				v-model="no_actualizar_articulos_de_otro_proveedor">
					<span
					id="cargar_y_actualizar">
						No actualizar articulos que ya pertenezcan a otro proveedor
					</span>
					<p
					class="text-description">
						Si lo activas, por mas que los artículos del excel que subas coincidan con otros artículos ya creados en el sistema, estos últimos deberán pertenecer al proveedor que indiques, solo así se actualizaran.
					</p>
					<p
					class="text-description">
						Si no lo activas, bastara con que los artículos coincidan y se actualizaran, pertenezcan o no al proveedor que indiques.
					</p>
				</b-form-checkbox>
				
				<div
				v-if="!no_actualizar_articulos_de_otro_proveedor">
					
					<hr>
					<b-form-checkbox
					class="radio-option"
					:value="1"
					:unchecked-value="0"
					size="lg"
					v-model="actualizar_proveedor">
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
					</b-form-checkbox>
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
			default: null
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
				return []
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
			no_actualizar_articulos_de_otro_proveedor: 1,
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
				this.$store.commit('column_position/set_selected_column_position_id', 0)
	        }
	    })
	},
	watch: {
		columns() {
			console.log('watch de columns')
			this.set_default_columns_positions()
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
		check_letra(index) {
			let letra = this.columns_[index].letra.toUpperCase()

			console.log('check_letra:')
			console.log(this.columns_[index].letra)
			console.log(letra)
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


		// Lo ejecuto con una column_position creada por el usuario
		set_column_positions_from_selected_columns() {

			let column_position = this.$store.state.column_position.models.find(c => c.id == this.selected_column_position_id)
			
			if (typeof column_position == 'undefined') return

			this.columns_ = []

			// Convierto el json en un array de objetos
			// const columns_array = Object.entries(column_position.positions).map(([key, value]) => {
			// 	return {
			// 		text: key,
			// 		letra: value
			// 	};
			// });

			console.log('column_position:')
			console.log(column_position)
			// Agrego las columnas al array de columnas
			column_position.positions.forEach(column => {
				
				this.columns_.push({
					text: column.text,
					description: column.description,
					letra: column.letra,
					position: column.position,
					ignored: 0,
					can_not_ignore: typeof column.can_not_ignore != 'undefined' ? true : undefined,
				})
			})
			this.positions_seted = true

			this.start_row = Number(column_position.start_row)

			this.props_to_send.provider_id = column_position.provider_id
			this.create_and_edit = column_position.create_and_edit
			this.no_actualizar_articulos_de_otro_proveedor = column_position.no_actualizar_otro_proveedor
		},

		set_default_columns_positions() {
			console.log('Seteando posiciones')
			this.columns_ = []
			let position = 1
			let letra 
			console.log(this.columns_)
			this.columns.forEach(column => {
				
				letra = this.number_to_excel_column(position)

				this.columns_.push({
					text: column.text,
					description: column.description,
					letra: letra,
					position: position,
					ignored: 0,
					can_not_ignore: typeof column.can_not_ignore != 'undefined' ? true : undefined,
				})
				position++
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
				form_data.append('no_actualizar_articulos_de_otro_proveedor', this.no_actualizar_articulos_de_otro_proveedor)
				form_data.append('actualizar_proveedor', this.actualizar_proveedor)


				let index = 0
				this.columns_.forEach(column => {
					if (!column.ignored) {
						form_data.append('prop_'+column.text, column.position)
					} else {
						// form_data.append('prop_ignore_'+column.text, column.position)
						console.log('Se ignoro '+column.text)
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
				this.props_to_send.provider_id = 0

				this.$bvModal.hide(this.id)
				this.$toast.success('Estamos precesando tu archivo, te notificaremos cuando termine', {
					duration: 7000
				})
			}
		},
		guardar_column_position() {

			let positions = [];
			this.columns_.forEach(item => {
				positions.push({
					text: item.text,
					letra: item.letra,
					position: item.position,
				})
			});

			console.log('Se van a guardar estas columnas:')
			console.log(positions)


			this.$api.post('column-position', {
				  // name: this.name,
				  // name: this.column_position_name,
				  model_name: 'article',
				  positions: positions,
				  start_row: this.start_row,
				  provider_id: this.props_to_send.provider_id,
				  create_and_edit: this.create_and_edit,
				  no_actualizar_otro_proveedor: this.no_actualizar_articulos_de_otro_proveedor,
			})
			.then(res => {
				this.$store.commit('column_position/add', res.data.model)
				this.name = ''
			})
			.catch(err => {
				this.$toast.error('Error al guardar')
			})
		},
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

					if (columna_proveedor.position == '' && this.props_to_send.provider_id == 0) {
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

				return
				
			})
			.catch(err => {
				this.loading = false
				this.import_history_id = null
				this.pre_import_id = null
				console.log(err)
				this.hubo_un_error = true
				this.limpiar_temporizador()
				this.$toast.error('Error al importar Excel')
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
.container 
	border: 1px solid rgba(0,0,0,.2)
	padding: 10px
	margin-bottom: 5px
	border-radius: 5px
	.cont-inputs
		display: flex
		flex-direction: row
		justify-content: space-between
		align-items: center
		input 
			width: 100px
	p 
		margin-bottom: 0
		font-size: .8em
		color: rgba(0,0,0,.8)

	.radio-option
		font-size: 30px

.text-description
	font-size: .6em
	margin: 5px 0 


</style>