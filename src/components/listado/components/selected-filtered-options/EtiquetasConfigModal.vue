<template>
	<b-modal
	id="etiquetas-config-modal"
	title="Configurar etiquetas"
	size="lg"
	hide-footer
	@show="on_modal_show">

		<div v-if="loading_medidas" class="text-center p-20">
			Cargando medidas...
		</div>

		<div v-else>
			<!-- Sección 1: medida -->
			<h6 class="m-b-10">Medida de etiqueta</h6>

			<div class="d-flex align-items-start flex-wrap m-b-10">
				<b-form-select
				class="flex-grow-1 m-r-10"
				style="min-width: 220px"
				v-model="medida_seleccionada_id"
				:options="medida_select_options"></b-form-select>

			</div>

			<div
			v-if="medidas.length"
			class="m-b-15">
				<div
				v-for="medida in medidas"
				:key="medida.id"
				class="d-flex align-items-center justify-content-between m-b-5">
					<span class="text-muted small">
						{{ medida_etiqueta_texto_lista(medida) }}
						<span v-if="medida.es_predeterminada"> (predeterminada)</span>
					</span>
					<b-button
					size="sm"
					variant="outline-danger"
					:disabled="medida.es_predeterminada || deleting_medida_id === medida.id"
					:title="medida.es_predeterminada ? 'No se pueden eliminar medidas predeterminadas' : 'Eliminar medida'"
					@click="eliminar_medida(medida)">
						<i class="icon-trash"></i>
					</b-button>
				</div>
			</div>
			<b-button
			size="sm"
			variant="outline-primary"
			@click="mostrar_form_nueva_medida = !mostrar_form_nueva_medida">
				<i class="icon-plus"></i>
				Crear nuevo medida
			</b-button>

			<b-collapse v-model="mostrar_form_nueva_medida">
				<b-card class="m-b-15 m-t-15">
					<b-form @submit.prevent="guardar_nueva_medida">
						<b-row>
							<b-col cols="12" md="4">
								<b-form-group
								label="Nombre (opcional)"
								description="Si no completás, se mostrará el tamaño en mm">
									<b-form-input
									v-model.trim="nueva_medida.nombre"
									maxlength="80"
									placeholder="Ej: Etiqueta góndola"></b-form-input>
								</b-form-group>
							</b-col>
							<b-col cols="6" md="3">
								<b-form-group label="Ancho (mm)">
									<b-form-input
									type="number"
									min="10"
									max="200"
									v-model.number="nueva_medida.ancho"></b-form-input>
								</b-form-group>
							</b-col>
							<b-col cols="6" md="3">
								<b-form-group label="Alto (mm)">
									<b-form-input
									type="number"
									min="10"
									max="200"
									v-model.number="nueva_medida.alto"></b-form-input>
								</b-form-group>
							</b-col>
							<b-col cols="12" md="2" class="d-flex align-items-end">
								<b-button
								type="submit"
								variant="primary"
								block
								:disabled="guardando_medida">
									Guardar
								</b-button>
							</b-col>
						</b-row>
					</b-form>
				</b-card>
			</b-collapse>

			<hr>

			<!-- Ajustes de impresión -->
			<h6 class="m-b-10">Ajustes de impresión</h6>
			<b-row class="m-b-15">
				<b-col cols="12" md="6">
					<b-form-group
					label="Alto del código de barras (mm)"
					:description="'Por defecto para esta medida: ' + default_codigo_barras_alto_label + ' mm'">
						<b-form-input
						type="number"
						min="4"
						max="50"
						v-model.number="codigo_barras_alto"></b-form-input>
					</b-form-group>
				</b-col>
				<b-col cols="12" md="6">
					<b-form-group
					label="Espacio entre bloques (mm)"
					description="Margen vertical entre cada dato de la etiqueta. Por defecto: 1 mm">
						<b-form-input
						type="number"
						min="0"
						max="30"
						v-model.number="interlineado"></b-form-input>
					</b-form-group>
				</b-col>
			</b-row>

			<hr>

			<!-- Sección 2: propiedades -->
			<h6 class="m-b-10">Propiedades a mostrar</h6>
			<p class="small text-muted m-b-10">
				Activá las propiedades y arrastrá para definir el orden en la etiqueta (de arriba hacia abajo).
			</p>

			<div class="m-b-10">
				<b-form-checkbox
				v-for="prop in propiedades_disponibles"
				:key="prop.key"
				class="m-b-5"
				:checked="propiedad_esta_activa(prop.key)"
				@change="toggle_propiedad(prop.key, $event)">
					{{ prop.label }}
				</b-form-checkbox>
			</div>

			<div class="propiedades-orden-table-wrapper m-b-15">
				<table class="table table-sm table-bordered propiedades-orden-table m-b-0">
					<thead class="thead-light">
						<tr>
							<th class="col-orden" scope="col"></th>
							<th class="col-campo" scope="col">Campo</th>
							<th class="col-fuente text-center" scope="col">Fuente (pt)</th>
							<th class="col-negrita text-center" scope="col">Negrita</th>
						</tr>
					</thead>
					<draggable
					v-model="propiedades_items"
					tag="tbody"
					handle=".drag-handle"
					:animation="150"
					ghost-class="propiedad-row-ghost">
						<tr
						v-for="item in propiedades_items"
						:key="item.key"
						class="propiedad-orden-row">
							<td class="col-orden text-center align-middle">
								<span
								class="drag-handle"
								title="Arrastrar para reordenar">
									<i class="icon-list"></i>
								</span>
							</td>
							<td class="col-campo align-middle">
								<span class="propiedad-orden-label">{{ label_propiedad(item.key) }}</span>
								<span
								v-if="item.key === 'codigo_barras'"
								class="small text-muted d-block">
									Imagen de barras
								</span>
							</td>
							<td class="col-fuente text-center align-middle">
								<b-input-group
								v-if="item.key !== 'codigo_barras'"
								append="pt"
								size="sm"
								class="fuente-input-group">
									<b-form-input
									type="number"
									min="6"
									max="24"
									size="sm"
									v-model.number="item.font_size"></b-form-input>
								</b-input-group>
								<span
								v-else
								class="text-muted">—</span>
							</td>
							<td class="col-negrita text-center align-middle">
								<b-form-checkbox
								v-if="item.key !== 'codigo_barras'"
								v-model="item.negrita"
								class="m-0 d-inline-block negrita-checkbox"
								:aria-label="'Negrita para ' + label_propiedad(item.key)">
								</b-form-checkbox>
								<span
								v-else
								class="text-muted">—</span>
							</td>
						</tr>
					</draggable>
				</table>
				<p
				v-if="!propiedades_items.length"
				class="small text-muted text-center m-t-10 m-b-0">
					Activá al menos un campo arriba para configurar el orden y los estilos.
				</p>
			</div>

			<hr>

			<!-- Sección 3: preview orientativo -->
			<h6 class="m-b-10">Vista previa</h6>
			<div class="etiqueta-preview-wrapper d-flex justify-content-center m-b-20">
				<div
				class="etiqueta-preview-box"
				:style="preview_box_style">
					<div
					class="etiqueta-preview-content"
					:style="preview_content_style">
					<div
					v-for="item in propiedades_items"
					:key="'preview-'+item.key"
					class="etiqueta-preview-line"
					:style="preview_line_style(item)">
						<template v-if="item.key === 'codigo_barras'">
							<span class="etiqueta-preview-barcode">▮▮▮ código de barras ▮▮▮</span>
						</template>
						<template v-else>
							<span :style="preview_text_style(item)">{{ preview_texto_propiedad(item.key) }}</span>
						</template>
					</div>
					</div>
				</div>
			</div>

			<div class="d-flex justify-content-end">
				<b-button
				variant="secondary"
				class="m-r-10"
				@click="$bvModal.hide('etiquetas-config-modal')">
					Cancelar
				</b-button>
				<b-button
				variant="primary"
				:disabled="!puede_generar_pdf"
				@click="generar_pdf">
					Generar PDF
				</b-button>
			</div>
		</div>
	</b-modal>
</template>

<script>
import axios from 'axios'
import draggable from 'vuedraggable'

/**
 * Propiedades que el usuario puede incluir en la etiqueta (clave API / PDF).
 */
/** Interlineado por defecto entre bloques (px), igual que el PDF. */
const DEFAULT_INTERLINEADO = 1

const PROPIEDADES_DISPONIBLES = [
	{ key: 'nombre', label: 'Nombre' },
	{ key: 'codigo_barras', label: 'Código de barras' },
	{ key: 'codigo_proveedor', label: 'Código de proveedor' },
	{ key: 'sku', label: 'SKU' },
	{ key: 'precio', label: 'Precio' },
	{ key: 'categoria', label: 'Categoría' },
	{ key: 'marca', label: 'Marca' },
	{ key: 'fecha_actual', label: 'Fecha actual' },
	{ key: 'nombre_negocio', label: 'Nombre del negocio' },
]

export default {
	name: 'EtiquetasConfigModal',
	components: {
		draggable,
	},
	props: {
		articulos_seleccionados: {
			type: Array,
			default() {
				return []
			},
		},
	},
	data() {
		return {
			loading_medidas: false,
			guardando_medida: false,
			deleting_medida_id: null,
			medidas: [],
			medida_seleccionada_id: null,
			mostrar_form_nueva_medida: false,
			nueva_medida: {
				nombre: '',
				ancho: 100,
				alto: 50,
			},
			propiedades_disponibles: PROPIEDADES_DISPONIBLES,
			propiedades_items: [],
			codigo_barras_alto: 10,
			interlineado: DEFAULT_INTERLINEADO,
		}
	},
	watch: {
		/**
		 * Al cambiar la medida, recalcula el alto por defecto del código de barras.
		 */
		medida_seleccionada_id() {
			this.aplicar_default_codigo_barras_alto()
		},
	},
	computed: {
		/**
		 * Opciones del select de medidas con nombre y dimensiones.
		 */
		medida_select_options() {
			let options = []
			this.medidas.forEach(medida => {
				options.push({
					value: medida.id,
					text: this.medida_etiqueta_texto_select(medida),
				})
			})
			return options
		},
		/**
		 * Medida actualmente elegida en el select.
		 */
		medida_seleccionada() {
			if (!this.medida_seleccionada_id) {
				return null
			}
			let found = null
			this.medidas.forEach(medida => {
				if (medida.id === this.medida_seleccionada_id) {
					found = medida
				}
			})
			return found
		},
		/**
		 * Escala proporcional del preview (máx. 200px de ancho).
		 */
		preview_box_style() {
			if (!this.medida_seleccionada) {
				return { width: '120px', height: '60px' }
			}
			let max_width = 200
			let ancho = this.medida_seleccionada.ancho
			let alto = this.medida_seleccionada.alto
			let escala = max_width / ancho
			return {
				width: Math.round(ancho * escala) + 'px',
				height: Math.round(alto * escala) + 'px',
			}
		},
		/**
		 * Valida que haya artículos, medida y al menos una propiedad.
		 */
		puede_generar_pdf() {
			if (!this.articulos_seleccionados.length || !this.medida_seleccionada || !this.propiedades_items.length) {
				return false
			}
			if (this.codigo_barras_alto < 4 || this.codigo_barras_alto > 50) {
				return false
			}
			if (this.interlineado < 0 || this.interlineado > 30) {
				return false
			}
			let fuentes_validas = true
			this.propiedades_items.forEach(item => {
				if (item.key === 'codigo_barras') {
					return
				}
				if (!item.font_size || item.font_size < 6 || item.font_size > 24) {
					fuentes_validas = false
				}
			})
			return fuentes_validas
		},
		/**
		 * Texto del alto por defecto del código según la medida elegida.
		 */
		default_codigo_barras_alto_label() {
			if (!this.medida_seleccionada) {
				return '10'
			}
			return String(this.calcular_default_codigo_barras_alto(this.medida_seleccionada.alto))
		},
		/**
		 * Escala del preview respecto a la medida real (para márgenes proporcionales).
		 */
		preview_escala() {
			if (!this.medida_seleccionada) {
				return 1
			}
			return 200 / this.medida_seleccionada.ancho
		},
		/**
		 * Centra el bloque de contenido en el preview (como el PDF).
		 */
		preview_content_style() {
			return {
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				width: '100%',
				height: '100%',
			}
		},
	},
	methods: {
		/**
		 * Texto principal de una medida (nombre o dimensiones en mm).
		 *
		 * @param {object} medida
		 * @returns {string}
		 */
		medida_etiqueta_label(medida) {
			if (medida.nombre) {
				return medida.nombre
			}
			return medida.ancho + 'mm × ' + medida.alto + 'mm'
		},
		/**
		 * Texto del select: nombre + medidas, o solo medidas si no hay nombre.
		 *
		 * @param {object} medida
		 * @returns {string}
		 */
		medida_etiqueta_texto_select(medida) {
			if (medida.nombre) {
				return medida.nombre + ' — ' + medida.ancho + 'mm × ' + medida.alto + 'mm'
			}
			return medida.ancho + 'mm × ' + medida.alto + 'mm'
		},
		/**
		 * Texto en el listado de medidas guardadas.
		 *
		 * @param {object} medida
		 * @returns {string}
		 */
		medida_etiqueta_texto_lista(medida) {
			return this.medida_etiqueta_texto_select(medida)
		},
		/**
		 * Misma fórmula que ArticleBarCodeEtiquetasPdf::default_code_height_for_etiqueta_height.
		 *
		 * @param {number} etiqueta_alto
		 * @returns {number}
		 */
		calcular_default_codigo_barras_alto(etiqueta_alto) {
			let alto = parseInt(etiqueta_alto, 10) || 50
			let valor = Math.floor(alto * 0.22)
			if (valor < 8) {
				valor = 8
			}
			if (valor > 14) {
				valor = 14
			}
			return valor
		},
		/**
		 * Asigna el alto por defecto del código según la medida seleccionada.
		 */
		aplicar_default_codigo_barras_alto() {
			if (this.medida_seleccionada) {
				this.codigo_barras_alto = this.calcular_default_codigo_barras_alto(this.medida_seleccionada.alto)
			} else {
				this.codigo_barras_alto = 10
			}
		},
		/**
		 * Restaura interlineado y alto de código a los valores por defecto actuales.
		 */
		aplicar_valores_por_defecto_impresion() {
			this.interlineado = DEFAULT_INTERLINEADO
			this.aplicar_default_codigo_barras_alto()
		},
		/**
		 * Estilo de cada línea del preview (espacio e alto de barras).
		 *
		 * @param {string} key
		 * @returns {object}
		 */
		preview_line_style(item) {
			let margin_px = Math.round((this.interlineado || 0) * this.preview_escala)
			let style = {
				marginBottom: margin_px + 'px',
			}
			if (item.key === 'codigo_barras') {
				let alto_px = Math.round((this.codigo_barras_alto || 10) * this.preview_escala)
				style.minHeight = alto_px + 'px'
				style.display = 'flex'
				style.alignItems = 'center'
				style.justifyContent = 'center'
			}
			return style
		},
		/**
		 * Al abrir el modal, recarga medidas desde la API.
		 */
		on_modal_show() {
			this.aplicar_valores_por_defecto_impresion()
			this.inicializar_propiedades_items()
			this.cargar_medidas()
		},
		/**
		 * Restaura propiedades activas con estilos por defecto.
		 */
		inicializar_propiedades_items() {
			this.propiedades_items = [
				this.crear_config_propiedad('nombre'),
				this.crear_config_propiedad('codigo_barras'),
			]
		},
		/**
		 * Tamaño de fuente por defecto según cantidad de campos (igual que el PDF).
		 *
		 * @param {number} line_count
		 * @returns {number}
		 */
		calcular_font_size_default(line_count) {
			if (line_count <= 2) {
				return 11
			}
			if (line_count <= 4) {
				return 9
			}
			if (line_count <= 6) {
				return 8
			}
			return 7
		},
		/**
		 * Crea la config de una propiedad con font_size y negrita iniciales.
		 *
		 * @param {string} key
		 * @returns {{ key: string, font_size: number, negrita: boolean }}
		 */
		crear_config_propiedad(key) {
			let line_count = this.propiedades_items.length + 1
			let base = this.calcular_font_size_default(line_count)
			let font_size = base
			if (key === 'precio') {
				font_size = base + 1
			}
			return {
				key: key,
				font_size: font_size,
				negrita: false,
			}
		},
		/**
		 * Busca el item de configuración de una propiedad activa.
		 *
		 * @param {string} key
		 * @returns {object|null}
		 */
		propiedad_item_por_key(key) {
			let found = null
			this.propiedades_items.forEach(item => {
				if (item.key === key) {
					found = item
				}
			})
			return found
		},
		/**
		 * Estilo de texto en el preview según fuente y negrita del campo.
		 *
		 * @param {object} item
		 * @returns {object}
		 */
		preview_text_style(item) {
			let font_px = Math.max(7, Math.round((item.font_size || 10) * this.preview_escala))
			return {
				fontSize: font_px + 'px',
				fontWeight: item.negrita ? 'bold' : 'normal',
			}
		},
		/**
		 * GET /api/etiqueta-medidas
		 */
		cargar_medidas() {
			this.loading_medidas = true
			axios.get('/api/etiqueta-medidas')
				.then(res => {
					this.medidas = (res.data && res.data.models) ? res.data.models : []
					if (this.medidas.length && !this.medida_seleccionada_id) {
						this.medida_seleccionada_id = this.medidas[0].id
					}
					this.aplicar_default_codigo_barras_alto()
				})
				.catch(() => {
					this.$toast.error('No se pudieron cargar las medidas de etiqueta')
				})
				.then(() => {
					this.loading_medidas = false
				})
		},
		/**
		 * POST nueva medida personalizada.
		 */
		guardar_nueva_medida() {
			if (!this.nueva_medida.ancho || !this.nueva_medida.alto) {
				this.$toast.warning('Completá ancho y alto')
				return
			}
			let nombre = this.nueva_medida.nombre ? this.nueva_medida.nombre.trim() : ''
			this.guardando_medida = true
			axios.post('/api/etiqueta-medidas', {
				nombre: nombre || null,
				ancho: this.nueva_medida.ancho,
				alto: this.nueva_medida.alto,
			})
				.then(res => {
					let model = res.data && res.data.model
					if (model) {
						this.medidas.push(model)
						this.medida_seleccionada_id = model.id
					}
					this.nueva_medida = { nombre: '', ancho: 100, alto: 50 }
					this.mostrar_form_nueva_medida = false
					this.$toast.success('Medida guardada')
				})
				.catch(err => {
					let msg = (err.response && err.response.data && err.response.data.message)
						? err.response.data.message
						: 'No se pudo guardar la medida'
					this.$toast.error(msg)
				})
				.then(() => {
					this.guardando_medida = false
				})
		},
		/**
		 * DELETE medida (solo no predeterminadas en backend).
		 */
		eliminar_medida(medida) {
			if (medida.es_predeterminada) {
				return
			}
			this.deleting_medida_id = medida.id
			axios.delete('/api/etiqueta-medidas/' + medida.id)
				.then(() => {
					let nuevas = []
					this.medidas.forEach(item => {
						if (item.id !== medida.id) {
							nuevas.push(item)
						}
					})
					this.medidas = nuevas
					if (this.medida_seleccionada_id === medida.id) {
						this.medida_seleccionada_id = this.medidas.length ? this.medidas[0].id : null
					}
					this.$toast.success('Medida eliminada')
				})
				.catch(err => {
					let msg = (err.response && err.response.data && err.response.data.message)
						? err.response.data.message
						: 'No se pudo eliminar la medida'
					this.$toast.error(msg)
				})
				.then(() => {
					this.deleting_medida_id = null
				})
		},
		/**
		 * Indica si una propiedad está en el orden activo.
		 */
		propiedad_esta_activa(key) {
			return this.propiedad_item_por_key(key) !== null
		},
		/**
		 * Activa o desactiva una propiedad en la lista ordenada.
		 */
		toggle_propiedad(key, checked) {
			if (checked) {
				if (!this.propiedad_esta_activa(key)) {
					this.propiedades_items.push(this.crear_config_propiedad(key))
				}
			} else {
				let nuevas = []
				this.propiedades_items.forEach(item => {
					if (item.key !== key) {
						nuevas.push(item)
					}
				})
				this.propiedades_items = nuevas
			}
		},
		/**
		 * Etiqueta legible de una clave de propiedad.
		 */
		label_propiedad(key) {
			let label = key
			this.propiedades_disponibles.forEach(prop => {
				if (prop.key === key) {
					label = prop.label
				}
			})
			return label
		},
		/**
		 * Texto de ejemplo para el preview según la propiedad.
		 */
		preview_texto_propiedad(key) {
			if (key === 'nombre') {
				return 'Nombre del artículo'
			}
			if (key === 'precio') {
				return '$ 1.234,00'
			}
			if (key === 'fecha_actual') {
				return new Date().toLocaleDateString('es-AR')
			}
			if (key === 'nombre_negocio') {
				return (this.owner && this.owner.company_name) ? this.owner.company_name : 'Mi negocio'
			}
			return this.label_propiedad(key)
		},
		/**
		 * Abre el PDF con ids, medida y propiedades en query string.
		 */
		generar_pdf() {
			if (!this.puede_generar_pdf) {
				return
			}
			let ids = []
			this.articulos_seleccionados.forEach(article => {
				ids.push(article.id)
			})
			let propiedades_config = []
			this.propiedades_items.forEach(item => {
				propiedades_config.push({
					key: item.key,
					font_size: parseInt(item.font_size, 10),
					negrita: !!item.negrita,
				})
			})
			let query = [
				'ancho=' + encodeURIComponent(this.medida_seleccionada.ancho),
				'alto=' + encodeURIComponent(this.medida_seleccionada.alto),
				'propiedades_config=' + encodeURIComponent(JSON.stringify(propiedades_config)),
				'codigo_barras_alto=' + encodeURIComponent(this.codigo_barras_alto),
				'interlineado=' + encodeURIComponent(this.interlineado),
			].join('&')
			let link = process.env.VUE_APP_API_URL
				+ '/article/bar-codes-etiquetas-pdf/'
				+ ids.join('-')
				+ '?'
				+ query
			window.open(link)
			// this.$bvModal.hide('etiquetas-config-modal')
		},
	},
}
</script>

<style lang="sass" scoped>
.etiqueta-preview-wrapper
	min-height: 80px

.etiqueta-preview-box
	border: 1px dashed rgba(0, 0, 0, .4)
	background: #fafafa
	padding: 4px
	overflow: hidden

.etiqueta-preview-content
	box-sizing: border-box

.etiqueta-preview-line
	font-size: 10px
	line-height: 1.2
	text-align: center
	width: 100%
	word-break: break-word

.etiqueta-preview-barcode
	font-size: 9px
	letter-spacing: 1px

.propiedades-orden-table-wrapper
	border-radius: 4px
	overflow: hidden

.propiedades-orden-table
	background: #fff

	thead th
		font-size: 12px
		font-weight: 600
		white-space: nowrap
		vertical-align: middle

	.col-orden
		width: 44px

	.col-fuente
		width: 110px

	.col-negrita
		width: 72px

.propiedad-orden-row
	background: #fff

	&:hover
		background: rgba(0, 0, 0, .02)

.propiedad-row-ghost
	opacity: 0.45
	background: rgba(0, 123, 255, .08) !important

.propiedad-orden-label
	font-weight: 500
	font-size: 13px

.fuente-input-group
	max-width: 96px
	margin: 0 auto

.negrita-checkbox
	vertical-align: middle

.drag-handle
	cursor: grab
	display: inline-flex
	align-items: center
	justify-content: center
	width: 28px
	height: 28px
	color: rgba(0, 0, 0, .45)
	border-radius: 4px

	&:hover
		color: rgba(0, 0, 0, .75)
		background: rgba(0, 0, 0, .06)

	&:active
		cursor: grabbing
</style>
