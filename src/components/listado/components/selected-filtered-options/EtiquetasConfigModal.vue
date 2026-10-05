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

			<!--
				Sección 3: vista previa. Dibuja la misma disposición que el PDF (disposicion.js, port de
				DisposicionDeEtiquetaIndividual de la API), en px a la escala de la medida, con el artículo real.
			-->
			<h6 class="m-b-10">Vista previa</h6>
			<div
			v-if="articulos_seleccionados.length > 1"
			class="etiqueta-preview-paginador d-flex align-items-center justify-content-center m-b-10">
				<b-button
				size="sm"
				variant="link"
				title="Artículo anterior"
				:disabled="preview_indice <= 0"
				@click="preview_articulo_anterior">
					‹
				</b-button>
				<span class="small text-muted">
					{{ preview_indice + 1 }} de {{ articulos_seleccionados.length }}
				</span>
				<b-button
				size="sm"
				variant="link"
				title="Artículo siguiente"
				:disabled="preview_indice >= articulos_seleccionados.length - 1"
				@click="preview_articulo_siguiente">
					›
				</b-button>
			</div>
			<div class="etiqueta-preview-wrapper d-flex justify-content-center m-b-10">
				<div
				class="etiqueta-preview-box"
				:style="preview_box_style">
					<div
					v-for="elemento in preview_elementos"
					:key="elemento.id"
					:class="elemento.clase"
					:style="elemento.style">{{ elemento.texto }}</div>
				</div>
			</div>
			<p
			v-if="preview_nota"
			class="etiqueta-preview-nota small text-muted text-center m-b-20">
				{{ preview_nota }}
			</p>
			<div
			v-else
			class="m-b-20"></div>

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
import { env } from '@/runtime_config'
import {
	MM_POR_PT,
	calcular_disposicion,
	frases_de_ajuste,
	resolver_codigo_barras_alto,
	resolver_interlineado,
	resolver_propiedades,
	textos_de_articulo,
	tiene_codigo_de_barras,
} from '@/components/listado/components/selected-filtered-options/etiquetas-individuales/disposicion'

/** Interlineado por defecto entre bloques (mm), igual que el PDF. */
const DEFAULT_INTERLINEADO = 1

/** Ancho máximo de la vista previa, en px. */
const PREVIEW_ANCHO_MAXIMO_PX = 260

/** Alto máximo de la vista previa, en px. */
const PREVIEW_ALTO_MAXIMO_PX = 170

/**
 * Propiedades que el usuario puede incluir en la etiqueta (clave API / PDF).
 */
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
			// Posición (en articulos_seleccionados) del artículo que muestra la vista previa
			preview_indice: 0,
		}
	},
	watch: {
		/**
		 * Al cambiar la medida, recalcula el alto por defecto del código de barras.
		 */
		medida_seleccionada_id() {
			this.aplicar_default_codigo_barras_alto()
		},
		/**
		 * Con otra selección de artículos, la vista previa vuelve al primero.
		 */
		articulos_seleccionados() {
			this.preview_indice = 0
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
		 * Ancho de la etiqueta en mm, entero como lo toma el PDF.
		 *
		 * @returns {number}
		 */
		preview_ancho_mm() {
			if (!this.medida_seleccionada) {
				return 0
			}
			return parseInt(this.medida_seleccionada.ancho, 10) || 0
		},
		/**
		 * Alto de la etiqueta en mm, entero como lo toma el PDF.
		 *
		 * @returns {number}
		 */
		preview_alto_mm() {
			if (!this.medida_seleccionada) {
				return 0
			}
			return parseInt(this.medida_seleccionada.alto, 10) || 0
		},
		/**
		 * Escala de la vista previa, en px por mm: la etiqueta entera entra en 260 × 170 px.
		 *
		 * @returns {number}
		 */
		preview_escala() {
			if (!this.preview_ancho_mm || !this.preview_alto_mm) {
				return 1
			}
			return Math.min(PREVIEW_ANCHO_MAXIMO_PX / this.preview_ancho_mm, PREVIEW_ALTO_MAXIMO_PX / this.preview_alto_mm)
		},
		/**
		 * Tamaño de la caja de la vista previa: la etiqueta a escala, sin padding (el borde va por fuera).
		 *
		 * @returns {object}
		 */
		preview_box_style() {
			if (!this.preview_ancho_mm || !this.preview_alto_mm) {
				return { width: '120px', height: '60px' }
			}
			return {
				width: (this.preview_ancho_mm * this.preview_escala) + 'px',
				height: (this.preview_alto_mm * this.preview_escala) + 'px',
			}
		},
		/**
		 * Artículo real que muestra la vista previa (el del paginador).
		 *
		 * @returns {object|null}
		 */
		preview_articulo() {
			if (!this.articulos_seleccionados.length) {
				return null
			}
			if (this.preview_indice >= 0 && this.preview_indice < this.articulos_seleccionados.length) {
				return this.articulos_seleccionados[this.preview_indice]
			}
			return this.articulos_seleccionados[0]
		},
		/**
		 * Alto del código de barras que va a pedir el PDF, resuelto como en la API (vacío → default de la medida).
		 *
		 * @returns {number}
		 */
		preview_codigo_alto_pedido() {
			return resolver_codigo_barras_alto(this.codigo_barras_alto, this.preview_alto_mm)
		},
		/**
		 * Disposición de la etiqueta del artículo de la vista previa: la misma que calcula el PDF con la
		 * medida, las fuentes, la negrita, el orden, el código y el interlineado elegidos.
		 *
		 * @returns {object|null} null si todavía no hay medida, propiedades o artículo.
		 */
		preview_disposicion() {
			if (!this.preview_ancho_mm || !this.preview_alto_mm || !this.propiedades_items.length || !this.preview_articulo) {
				return null
			}
			return calcular_disposicion({
				ancho: this.preview_ancho_mm,
				alto: this.preview_alto_mm,
				propiedades: resolver_propiedades(this.propiedades_items),
				codigo_alto: this.preview_codigo_alto_pedido,
				interlineado: resolver_interlineado(this.interlineado),
				textos: textos_de_articulo(this.preview_articulo, this.owner),
				tiene_codigo: tiene_codigo_de_barras(this.preview_articulo),
			})
		},
		/**
		 * Elementos a dibujar en la caja (una entrada por línea de texto y una por código de barras),
		 * en posición absoluta y en px.
		 *
		 * @returns {Array<{id: string, clase: string, texto: string, style: object}>}
		 */
		preview_elementos() {
			let elementos = []
			// Disposición calculada (en mm)
			let disposicion = this.preview_disposicion
			if (!disposicion) {
				return elementos
			}
			// px por mm
			let escala = this.preview_escala
			// Ancho de cada línea de texto: la etiqueta entera, como la Cell del PDF
			let ancho_linea_px = this.preview_ancho_mm * escala
			disposicion.bloques.forEach(bloque => {
				if (bloque.tipo === 'codigo') {
					elementos.push({
						id: 'codigo-' + bloque.key,
						clase: 'etiqueta-preview-codigo',
						texto: '',
						style: {
							top: (bloque.y * escala) + 'px',
							left: (bloque.x * escala) + 'px',
							width: (bloque.ancho * escala) + 'px',
							height: (bloque.alto * escala) + 'px',
						},
					})
					return
				}
				// Letra en px: pt → mm → px
				let letra_px = bloque.tamano * MM_POR_PT * escala
				// Alto de cada línea en px
				let alto_linea_px = bloque.alto_linea * escala
				bloque.lineas.forEach((linea, indice) => {
					elementos.push({
						id: bloque.key + '-' + indice,
						clase: 'etiqueta-preview-linea',
						texto: linea,
						style: {
							top: ((bloque.y + indice * bloque.alto_linea) * escala) + 'px',
							left: '0px',
							width: ancho_linea_px + 'px',
							height: alto_linea_px + 'px',
							lineHeight: alto_linea_px + 'px',
							fontSize: letra_px + 'px',
							fontWeight: bloque.negrita ? 'bold' : 'normal',
						},
					})
				})
			})
			return elementos
		},
		/**
		 * Nota debajo de la vista previa cuando el PDF tuvo que ajustar la etiqueta para que entre.
		 *
		 * @returns {string} Vacío si no hubo ajuste.
		 */
		preview_nota() {
			let frases = frases_de_ajuste(this.preview_disposicion, this.preview_codigo_alto_pedido, key => this.label_propiedad(key))
			return frases.join(' ')
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
		 * Al abrir el modal, recarga medidas desde la API y la vista previa vuelve al primer artículo.
		 */
		on_modal_show() {
			this.preview_indice = 0
			this.aplicar_valores_por_defecto_impresion()
			this.inicializar_propiedades_items()
			this.cargar_medidas()
		},
		/**
		 * Muestra en la vista previa el artículo anterior de la selección.
		 */
		preview_articulo_anterior() {
			if (this.preview_indice > 0) {
				this.preview_indice--
			}
		},
		/**
		 * Muestra en la vista previa el artículo siguiente de la selección.
		 */
		preview_articulo_siguiente() {
			if (this.preview_indice < this.articulos_seleccionados.length - 1) {
				this.preview_indice++
			}
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
			let link = env('VUE_APP_API_URL')
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

// La etiqueta a escala: sin padding (el borde va por fuera) y como papel, también en tema oscuro
.etiqueta-preview-box
	position: relative
	overflow: hidden
	box-sizing: content-box
	padding: 0
	flex-shrink: 0
	border: 1px dashed rgba(0, 0, 0, .4)
	background: #fff
	color: #000
	font-family: Arial, Helvetica, 'Liberation Sans', sans-serif

// Cada línea de texto ocupa el ancho de la etiqueta, centrada, en la `y` que calculó la disposición
.etiqueta-preview-linea
	position: absolute
	margin: 0
	padding: 0
	white-space: nowrap
	text-align: center
	color: #000

// El código de barras: barras dibujadas por CSS del tamaño que tiene en el PDF
.etiqueta-preview-codigo
	position: absolute
	background: repeating-linear-gradient(90deg, #000 0, #000 2px, #fff 2px, #fff 3px, #000 3px, #000 4px, #fff 4px, #fff 6px, #000 6px, #000 9px, #fff 9px, #fff 10px, #000 10px, #000 11px, #fff 11px, #fff 13px)

.etiqueta-preview-nota
	max-width: 420px
	margin-left: auto
	margin-right: auto

.propiedades-orden-table-wrapper
	border-radius: 4px
	overflow: hidden

.propiedades-orden-table
	background: var(--bg-card, #fff)

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
	background: var(--bg-card, #fff)

	&:hover
		background: var(--bg-hover, rgba(0, 0, 0, .02))

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
	color: var(--color-text-secondary, rgba(0, 0, 0, .45))
	border-radius: 4px

	&:hover
		color: var(--color-text-primary, rgba(0, 0, 0, .75))
		background: var(--bg-hover, rgba(0, 0, 0, .06))

	&:active
		cursor: grabbing
</style>
