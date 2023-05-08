<template>
<div>
	<import-history
	:model_name="model_name"
	:show_history="show_history"></import-history>

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
		href="/files/articulos-base.xlsx" download
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
					Operaciones a realizar
				</strong>
			</p>
			<b-form-radio
			:value="0"
			v-model="create_and_edit">
				Solo editar {{ plural(model_name) }} existentes
			</b-form-radio>
			<b-form-radio
			:value="1"
			v-model="create_and_edit">
				Cargar nuevos {{ plural(model_name) }} y editar existentes
			</b-form-radio>
		</div>
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
							@click="setColumn(column, index)">
								{{ column.text }}
							</span>
							<div>
								<b-form-input
								type="number"
								v-model="column.position"></b-form-input>
								<b-form-checkbox
								v-if="canIgnore(column)"
								class="m-t-10"
								:unchecked_value="0"
								:value="1"
								v-model="column.ignored">
									Ignorar
								</b-form-checkbox>
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

		<b-form-group
		label="Archivo Excel para importar">
			<b-form-file
			browse-text="Buscar"
			v-model="file"
			variant="primary"
			:state="Boolean(file)"
			placeholder="Seleccione el archivo o arrastralo hasta aquí"
			drop-placeholder="Solta el archivo aqui..."
			></b-form-file>
		</b-form-group>

		<hr>
		<btn-loader
		:disabled="!file"
		@clicked="upload"
		text="Importar"
		:loader="loading"></btn-loader>
		<p
		class="m-t-15 text-primary text-center"
		v-if="loading">
			<strong>
				Por favor aguarde, esto podria tardar unos minutos...
			</strong>
		</p>
	</b-modal>
</div>
</template>
<script>
import Advises from '@/common-vue/components/import/Advises'
import BtnLoader from '@/common-vue/components/BtnLoader'
export default { 
	components: {
		Advises,
		BtnLoader,
		ImportHistory: () => import('@/common-vue/components/import/ImportHistory'),
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
	},
	created() {
		this.setPositions()
	},
	computed: {
		title() {
			return 'Importar '+this.plural(this.model_name)
		},
		id() {
			return 'import-'+this.model_name 
		},
	},
	data() {
		return {
			loading: false,
			file: null,
			start_row: 2,
			finish_row: '',
			percentage: '',
			provider_id: 0,
			columns_: [], 
			positions_seted: false,
			create_and_edit: 1,
			show_history: false,
		}
	},
	methods: {
		canIgnore(column) {
			return typeof column.can_not_ignore == 'undefined'
		},
		setColumn(a, index) {
			let last_columns_position = 0
			this.columns_.forEach(column => {
				column = Number(column.position)
				if (column != '') {
					if (column > last_columns_position) {
						last_columns_position = column  
					}
				}
			}) 
			last_columns_position++
			this.columns_[index].position = last_columns_position
		},
		setPositions() {
			if (this.positions_seted) {
				this.clear()
			} else {
				this.setColumnsPositions()
			}
		},
		setColumnsPositions() {
			this.columns_ = []
			let position = 1
			console.log(this.columns_)
			this.columns.forEach(column => {
				this.columns_.push({
					text: column.text,
					description: column.description,
					position: position,
					ignored: 0,
					can_not_ignore: typeof column.can_not_ignore != 'undefined' ? true : undefined,
				})
				position++
			})
			this.positions_seted = true
		},
		clear() {
			let index = 0
			this.columns_.forEach(column => {
				column.position = ''
				column.ignored = 0
			})
			this.positions_seted = false
		},	
		upload() {
			this.loading = true
			let config = {headers: { 'content-type': 'multipart/form-data' }}
			let form_data = new FormData();
			form_data.append('models', this.file)
			form_data.append('start_row', this.start_row)
			form_data.append('finish_row', this.finish_row)
			form_data.append('create_and_edit', this.create_and_edit)
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
			this.$api.post(this.routeString(this.model_name)+'/excel/import', form_data, config)
			.then(res => {
				this.loading = false
				this.file = null
				this.$bvModal.hide(this.id)
				this.$store.dispatch(this.model_name+'/getModels')
				this.actions.forEach(action => {
					this.$store.dispatch(action)
				})
				console.log(res)
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		},
		showHistory() {
			this.show_history = !this.show_history
			this.$bvModal.show('import-history')
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
</style>