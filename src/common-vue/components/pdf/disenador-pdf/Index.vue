<template>
	<!--
		Diseñador de PDF (misión diseno-pdf-configurable, 1/10/2026): arma el diseño exacto del PDF
		de una venta (remito o factura de ARCA), un presupuesto o un pedido online arrastrando cajas y
		campos, con el mismo lenguaje que el editor de Diseños de Vender.

		Modal propio, como el de Vender: `scrollable` para que la hoja se pueda scrollear pero el pie
		(Cancelar / Guardar) quede siempre a la vista, y `no-close-on-backdrop` porque un clic afuera
		no puede tirar un rato de trabajo (igual se avisa si se cierra con cambios, ver al_ocultar).

		Se abre desde el registro del ABM (PdfColumnProfileEditor.vue) con this.$refs.disenador.abrir().
	-->
	<b-modal
	:id="id_del_modal"
	ref="modal"
	size="xl"
	scrollable
	no-close-on-backdrop
	:title="titulo"
	dialog-class="disenador-pdf__dialogo"
	body-class="disenador-pdf__cuerpo"
	@show="al_mostrar"
	@hide="al_ocultar"
	@hidden="al_ocultarse">

		<div
		class="disenador-pdf"
		data-testid="cuerpo-disenador-pdf">

			<div
			v-if="cargando"
			class="disenador-pdf__estado"
			role="status">
				<span class="spinner-border spinner-border-sm"></span>
				<span>Cargando el diseñador…</span>
			</div>

			<!-- Con una API vieja (404) o sin conexión: el formulario sigue andando, el diseñador avisa -->
			<div
			v-else-if="error_de_carga"
			class="disenador-pdf__estado disenador-pdf__estado--error"
			role="alert">
				<i
				class="bi bi-exclamation-triangle"
				aria-hidden="true"></i>
				<div>
					<p class="disenador-pdf__estado-titulo">No se pudo abrir el diseñador</p>
					<p class="disenador-pdf__estado-detalle">{{ error_de_carga }}</p>
					<b-button
					variant="outline-primary"
					size="sm"
					@click="cargar">
						Reintentar
					</b-button>
				</div>
			</div>

			<template v-else-if="catalogo">
				<div class="disenador-pdf__cabecera">
					<controles-de-hoja></controles-de-hoja>

					<div class="disenador-pdf__acciones">
						<b-button
						v-if="se_puede_probar"
						variant="outline-primary"
						size="sm"
						class="disenador-pdf__prueba"
						:disabled="hay_cambios"
						:title="hay_cambios ? 'Guardá los cambios para verlos en el PDF' : 'Abre el PDF del último comprobante con este diseño'"
						data-testid="ver-prueba-disenador-pdf"
						@click="ver_pdf_de_prueba">
							<i class="bi bi-file-earmark-pdf"></i>
							Ver un PDF de prueba
						</b-button>
						<p
						v-if="se_puede_probar && hay_cambios"
						class="disenador-pdf__nota-de-accion">Guardá los cambios para verlos en el PDF.</p>
						<p
						v-if="nota_del_diseno"
						class="disenador-pdf__nota-de-accion">{{ nota_del_diseno }}</p>
					</div>
				</div>

				<!-- La ayuda que hace que se entienda en dos segundos (como en Vender) -->
				<ul class="disenador-pdf__ayuda">
					<li>
						<i class="bi bi-arrows-move"></i>
						Arrastrá un campo de la bandeja a una caja, o una caja para moverla.
					</li>
					<li>
						<i class="bi bi-arrow-left-right"></i>
						Tirá del borde izquierdo o derecho de una caja para cambiarle el ancho.
					</li>
					<li>
						<i class="bi bi-hand-index-thumb"></i>
						Tocá una caja o un campo para cambiarle el título, el estilo o la letra.
					</li>
					<li>
						<i class="bi bi-table"></i>
						Las columnas de la tabla también: arrastralas para ordenarlas y tirá de sus bordes.
					</li>
				</ul>
				<p class="disenador-pdf__nota">
					La hoja se ve a escala, con datos de ejemplo. En cada comprobante se imprime lo que tenga datos: una caja sin ninguno no ocupa lugar.
				</p>

				<!-- El Modelo se cambió en el formulario y no se guardó: no se guarda el diseño -->
				<div
				v-if="modelo_cambiado_sin_guardar"
				class="disenador-pdf__aviso disenador-pdf__aviso--bloquea"
				role="alert"
				data-testid="aviso-modelo-disenador-pdf">
					<i
					class="bi bi-exclamation-triangle"
					aria-hidden="true"></i>
					<span>{{ AVISO_MODELO_SIN_GUARDAR }}</span>
				</div>

				<!-- Una factura de ARCA que llegó guardada en A5: no se guarda hasta elegir otra hoja -->
				<div
				v-if="arca_no_entra_en_la_hoja"
				class="disenador-pdf__aviso disenador-pdf__aviso--bloquea"
				role="alert"
				data-testid="aviso-a5-arca-disenador-pdf">
					<i
					class="bi bi-exclamation-triangle"
					aria-hidden="true"></i>
					<span>{{ MOTIVO_A5_EN_ARCA }} Elegí otra hoja para poder guardar.</span>
				</div>

				<!-- A5 con el pie en cada hoja (venta, presupuesto o pedido online): vale, pero conviene saberlo -->
				<div
				v-if="pocos_renglones_por_hoja"
				class="disenador-pdf__aviso"
				role="status"
				data-testid="aviso-a5-pie-disenador-pdf">
					<i
					class="bi bi-info-circle"
					aria-hidden="true"></i>
					<span>{{ AVISO_A5_CON_PIE_EN_CADA_HOJA }}</span>
				</div>

				<div class="disenador-pdf__area">
					<!-- El marco de la hoja: en el teléfono la hoja se desliza de costado adentro de él -->
					<div class="disenador-pdf__marco">
						<hoja-del-disenador></hoja-del-disenador>
					</div>

					<div class="disenador-pdf__lateral">
						<panel-de-propiedades></panel-de-propiedades>
						<bandeja-de-campos></bandeja-de-campos>
					</div>
				</div>
			</template>
		</div>

		<template #modal-footer>
			<div class="disenador-pdf__pie">
				<span
				v-if="hay_cambios"
				class="disenador-pdf__sin-guardar">
					<span class="disenador-pdf__punto"></span>
					Cambios sin guardar
				</span>
				<b-button
				v-if="puede_volver_al_de_siempre"
				variant="link"
				size="sm"
				class="disenador-pdf__volver"
				:disabled="guardando"
				data-testid="volver-disenador-pdf"
				@click="volver_al_de_siempre">
					<i class="bi bi-arrow-counterclockwise"></i>
					Volver al diseño de siempre
				</b-button>
				<div class="disenador-pdf__botones">
					<b-button
					variant="outline-secondary"
					:disabled="guardando"
					data-testid="cancelar-disenador-pdf"
					@click="cancelar">
						{{ hay_cambios ? 'Cancelar' : 'Cerrar' }}
					</b-button>
					<b-button
					variant="primary"
					:disabled="guardando || !catalogo"
					data-testid="guardar-disenador-pdf"
					@click="guardar">
						<span
						v-if="guardando"
						class="spinner-border spinner-border-sm m-r-5"></span>
						Guardar diseño
					</b-button>
				</div>
			</div>
		</template>
	</b-modal>
</template>
<script>
import ControlesDeHoja from './ControlesDeHoja'
import HojaDelDisenador from './HojaDelDisenador'
import PanelDePropiedades from './PanelDePropiedades'
import BandejaDeCampos from './BandejaDeCampos'
import acciones_del_disenador from './acciones_del_disenador'
import acciones_de_la_tabla from './acciones_de_la_tabla'
import guardado_del_disenador from './guardado_del_disenador'
import {
	HOJA_DE_SIEMPRE,
	MOTIVO_A5_EN_ARCA,
	AVISO_A5_CON_PIE_EN_CADA_HOJA,
	AVISO_MODELO_SIN_GUARDAR,
	LOGO_DEL_PDF_POR_DEFECTO_MM,
	es_hoja_a5,
	es_verdadero,
	tiene_diseno,
	catalogo_valido,
	mapa_de_definiciones,
	armar_estado,
	huella_del_diseno,
	keys_en_uso,
	ubicar,
	hoja_del_perfil,
	ancho_util,
} from './estado_del_disenador'
import {
	total_de_la_grilla,
	columnas_ocultas,
	suma_de_columnas,
	huella_de_la_tabla,
	columnas_a_mm,
} from './tabla_del_disenador'
import { traer_catalogo, traer_perfil, traer_opciones_de_columnas, mensaje_de_error } from './api_del_disenador'
import {
	emisor_chip_keys,
	FISCAL_REQUIRED_EMISOR_KEYS,
	default_header_layout,
} from '@/common-vue/components/pdf/header-designer/header_designer_catalog'

/* Escala (px de pantalla por mm de hoja) hasta que la hoja se mide por primera vez */
const ESCALA_INICIAL = 3.5

/**
 * Un encabezado vacío, con la forma de header_layout.
 *
 * @returns {Object}
 */
function encabezado_vacio() {
	return {
		emisor: {
			izquierda: [],
			derecha: [],
		},
		receptor: {
			izquierda: [],
		},
	}
}

/**
 * Diseñador de PDF: el modal y el estado de trabajo.
 *
 * El estado (las dos zonas, la hoja, el encabezado) lo arma y lo desarma estado_del_disenador.js;
 * acá se orquesta el ciclo del modal: abrir, pedir el catálogo, armar el estado, saber si hay
 * cambios y cerrar. Lo que piden las piezas de la hoja (mover, agregar, quitar, seleccionar...)
 * está en el mixin acciones_del_disenador.js, lo de la tabla de artículos en acciones_de_la_tabla.js
 * (misión diseno-ticket-comandera) y el guardado en guardado_del_disenador.js. Las zonas, las
 * cajas, la tabla y la bandeja mutan sus listas por referencia (vuedraggable `:list`), así que
 * este componente es el dueño de los arrays y los ve cambiar.
 *
 * Las piezas de adentro (hoja, zonas, cajas, campos, panel, bandeja) reciben ESTE componente por
 * `provide`/`inject` con el nombre `disenador` (son muchas capas para pasar todo por props). Lo
 * que usan:
 * - datos: catalogo, limites, definiciones, categorias_por_key, fijos_por_key, superior, pie, hoja,
 *   encabezado, emisor_paleta, logo_size_mm, escala, es_fiscal, obligatorios_del_emisor,
 *   modelo_del_perfil, seleccion_actual, destacado, arrastrando, keys_en_uso, ancho_util_mm,
 *   ancho_de_referencia_mm, cuando_sale_el_pie; y de la tabla: tabla ({columnas, visibles}),
 *   columnas_ocultas, total_de_la_tabla, suma_de_la_tabla, lugar_libre_en_la_tabla,
 *   mm_libres_en_la_tabla, columnas_sugeridas_puestas, pedido_de_columnas.
 * - acciones: permitir_movimiento, al_empezar_arrastre, al_terminar_arrastre, seleccionar,
 *   quitar_item, quitar_campo, agregar_caja, agregar_campo, mostrar_campo, clonar_campo,
 *   clonar_de_la_fuente, restablecer_estilo, elegir_formato, cambiar_margen, cambiar_escala,
 *   cambiar_logo; y de la tabla: agregar_columna, quitar_columna, cambiar_ancho_de_columna,
 *   cols_maximo_de_columna, mm_de_columna, alternar_salto_de_columna, mostrar_columna,
 *   mostrar_columnas_en_la_bandeja, avisar_tabla_completa.
 *
 * 🔌 Para el modo ticket (lo enchufa otro constructor sobre esto): la tabla se convierte contra
 * `ancho_util_de_la_tabla_mm` (hoy el ancho útil de la hoja; en ticket, el ancho del rollo) y
 * `total_de_la_tabla` (el `grilla_de_tabla` del catálogo), y si tocar SOLO la tabla pasa el perfil
 * a cajas lo decide `tocar_la_tabla_pasa_a_cajas` (D10: en hoja no, en ticket sí).
 */
export default {
	name: 'DisenadorPdf',
	components: {
		ControlesDeHoja,
		HojaDelDisenador,
		PanelDePropiedades,
		BandejaDeCampos,
	},
	mixins: [
		acciones_del_disenador,
		acciones_de_la_tabla,
		guardado_del_disenador,
	],
	provide() {
		return {
			disenador: this,
		}
	},
	props: {
		/*
			El pdf_column_profile del formulario del ABM (el mismo objeto). Se lee al abrir y, al
			guardar, se le copian con $set las claves del diseño (CLAVES_DEL_DISENO).
		*/
		model: {
			type: Object,
			required: true,
		},
	},
	data() {
		return {
			/* Textos de los avisos de arriba del lienzo (ver estado_del_disenador.js), para el template */
			MOTIVO_A5_EN_ARCA: MOTIVO_A5_EN_ARCA,
			AVISO_A5_CON_PIE_EN_CADA_HOJA: AVISO_A5_CON_PIE_EN_CADA_HOJA,
			AVISO_MODELO_SIN_GUARDAR: AVISO_MODELO_SIN_GUARDAR,
			/* id del b-modal (también scopea los estilos de los inputs, ver el <style>) */
			id_del_modal: 'disenador-pdf',
			/* true entre el show y el hidden del modal */
			abierto: false,
			/* true mientras se pide el catálogo */
			cargando: false,
			/* Por qué no se pudo abrir (texto para el usuario), o null */
			error_de_carga: null,
			/* Número del último pedido del catálogo: una respuesta de un pedido viejo se ignora */
			pedido_en_curso: 0,
			/* Respuesta del catálogo (GET pdf-column-profiles/page-layout-catalog), o null */
			catalogo: null,
			/* El Modelo del perfil GUARDADO (GET pdf-column-profiles/{id}), o null si no se pudo leer o es nuevo */
			modelo_guardado: null,
			/* Las dos zonas de trabajo (ver estado_del_disenador.js) */
			superior: [],
			pie: [],
			/*
				La tabla de trabajo (ver acciones_de_la_tabla.js y tabla_del_disenador.js): `columnas`
				son todas las del catálogo de columnas, `visibles` las de la tabla en su orden (la lista
				que muta vuedraggable).
			*/
			tabla: {
				columnas: [],
				visibles: [],
			},
			/* Catálogo de columnas del modelo (GET pdf-column-options), para rearmar la tabla después de guardar */
			opciones_de_columnas: [],
			/* Lo que suman en mm las columnas visibles GUARDADAS (si la hoja nueva no las deja entrar, la tabla viaja) */
			suma_mm_de_la_base: 0,
			/* Huella de la tabla al abrir (o al último guardado): si cambia, la tabla se guarda */
			huella_base_de_la_tabla: '',
			/* true si el perfil no tenía columnas visibles y el diseñador puso las sugeridas (falta guardar) */
			columnas_sugeridas_puestas: false,
			/* Contador: cada vez que sube, la bandeja abre "Columnas de la tabla" (ver mostrar_columnas_en_la_bandeja) */
			pedido_de_columnas: 0,
			/* La hoja: {ancho, alto, margen} en mm */
			hoja: {
				ancho: HOJA_DE_SIEMPRE.ancho,
				alto: HOJA_DE_SIEMPRE.alto,
				margen: HOJA_DE_SIEMPRE.margen,
			},
			/* El encabezado del negocio: copia de trabajo de header_layout (el receptor no se toca) */
			encabezado: encabezado_vacio(),
			/* Datos del negocio que no están en el encabezado (paleta de abajo del encabezado) */
			emisor_paleta: [],
			/* Tamaño del logo (mm), copia de trabajo de logo_size_mm */
			logo_size_mm: LOGO_DEL_PDF_POR_DEFECTO_MM,
			/* Px de pantalla por mm de hoja: la mide HojaDelDisenador */
			escala: ESCALA_INICIAL,
			/* Si el perfil tenía un diseño con cajas al abrir (o al último guardado) */
			tenia_diseno: false,
			/*
				Si la base del lienzo es "el diseño de siempre" (page_layout null): un perfil que nunca
				se diseñó, o cualquiera después de "Volver al diseño de siempre". Mientras el lienzo y la
				hoja no se toquen desde esa base, al guardar NO viaja page_layout (ver datos_para_guardar).
			*/
			base_es_de_siempre: true,
			/* Si en esta edición se tocó "Volver al diseño de siempre" */
			restablecido: false,
			/* Huellas de la base: del lienzo + la hoja, del emisor y del logo */
			huella_base_del_diseno: '',
			huella_base_del_emisor: '',
			logo_base: LOGO_DEL_PDF_POR_DEFECTO_MM,
			/* Huella de todo al abrir (o al guardar): si la de ahora es distinta, hay cambios sin guardar */
			huella_inicial: '',
			/* Lo seleccionado en la hoja: {tipo: 'caja'|'campo'|'fijo', item}, o null */
			seleccion: null,
			/* Lo que se está arrastrando: {tipo, desde} (atributos data-tipo y data-lista), o null */
			arrastrando: null,
			/* Identidad de lo resaltado un momento ('caja:<id>', '<ui_id>'...), o null */
			destacado: null,
			/* Timer del resaltado */
			timer_del_destacado: null,
			/* true si en el arrastre en curso ya se avisó un tope (el `move` se llama en cada paso) */
			tope_avisado: false,
			guardando: false,
			/* true para cerrar sin la pregunta de cambios sin guardar (después de guardar, o ya confirmado) */
			cerrar_sin_preguntar: false,
		}
	},
	computed: {
		/**
		 * Título del modal: "Diseñar PDF — {nombre}".
		 *
		 * @returns {string}
		 */
		titulo() {
			let nombre = String(this.model && this.model.name ? this.model.name : '').trim()
			return 'Diseñar PDF — ' + (nombre || 'diseño nuevo')
		},
		/**
		 * El modelo del perfil ('sale' | 'budget' | 'order').
		 *
		 * @returns {string}
		 */
		modelo_del_perfil() {
			return this.catalogo ? this.catalogo.model_name : this.model.model_name
		},
		/**
		 * Si el diseño es de una factura de ARCA (lo decide la API: venta con "Es factura de ARCA").
		 *
		 * @returns {boolean}
		 */
		es_fiscal() {
			return !!(this.catalogo && this.catalogo.es_fiscal)
		},
		/**
		 * Si el diseño es de una factura de ARCA para la regla de la hoja A5: lo que dice la API o,
		 * en una venta, el "Es factura de ARCA" del formulario (pedido de la sesión madre, 1/10/2026).
		 *
		 * @returns {boolean}
		 */
		es_factura_de_arca() {
			return this.es_fiscal || (this.modelo_del_perfil === 'sale' && es_verdadero(this.model.is_afip_ticket))
		},
		/**
		 * Si la hoja de ahora es la A5 del catálogo.
		 *
		 * @returns {boolean}
		 */
		hoja_es_a5() {
			return !!this.catalogo && es_hoja_a5(this.catalogo.formatos_de_hoja, this.hoja)
		},
		/**
		 * Una factura de ARCA en A5: en esa hoja no entra completo el cuadro de importes, QR y CAE.
		 * El botón de A5 queda deshabilitado (ControlesDeHoja), y si el perfil llegó guardado así se
		 * avisa arriba del lienzo y no se guarda hasta elegir otra hoja (ver guardar()).
		 *
		 * @returns {boolean}
		 */
		arca_no_entra_en_la_hoja() {
			return this.es_factura_de_arca && this.hoja_es_a5
		},
		/**
		 * Un comprobante en A5 con "Mostrar pie de página en cada hoja" (venta, presupuesto o pedido
		 * online: los tres lo tienen, ver models/pdf_column_profile.js): vale, pero entran pocos
		 * renglones por hoja. Solo un aviso suave.
		 *
		 * @returns {boolean}
		 */
		pocos_renglones_por_hoja() {
			return this.hoja_es_a5 && es_verdadero(this.model.show_totals_on_each_page)
		},
		/**
		 * Si el Modelo del formulario no es el del perfil guardado (se cambió y no se guardó): el
		 * lienzo se armó con el catálogo del Modelo nuevo, pero la API normaliza con el guardado. Se
		 * avisa arriba del lienzo y no se deja guardar (ver guardar()).
		 *
		 * @returns {boolean}
		 */
		modelo_cambiado_sin_guardar() {
			return !!(this.model.id && this.modelo_guardado && this.modelo_guardado !== this.model.model_name)
		},
		/**
		 * Límites del catálogo (constantes de DisenoDePaginaPdf).
		 *
		 * @returns {Object}
		 */
		limites() {
			return this.catalogo ? this.catalogo.limites : {}
		},
		/**
		 * Campos del catálogo por key.
		 *
		 * @returns {Object}
		 */
		definiciones() {
			return this.catalogo ? mapa_de_definiciones(this.catalogo.campos) : {}
		},
		/**
		 * Categorías del catálogo por key.
		 *
		 * @returns {Object}
		 */
		categorias_por_key() {
			let mapa = {}
			;(this.catalogo ? this.catalogo.categorias : []).forEach(function (categoria) {
				mapa[categoria.key] = categoria
			})
			return mapa
		},
		/**
		 * Bloques fijos del catálogo por key.
		 *
		 * @returns {Object}
		 */
		fijos_por_key() {
			let mapa = {}
			;(this.catalogo ? this.catalogo.fijos : []).forEach(function (fijo) {
				mapa[fijo.key] = fijo
			})
			return mapa
		},
		/**
		 * Datos del negocio que no se pueden sacar del encabezado (factura de ARCA).
		 *
		 * @returns {Array<string>}
		 */
		obligatorios_del_emisor() {
			return this.es_fiscal ? FISCAL_REQUIRED_EMISOR_KEYS : []
		},
		/**
		 * El estado de trabajo, en la forma que esperan las funciones de estado_del_disenador.js.
		 *
		 * @returns {{superior: Array, pie: Array}}
		 */
		estado_de_trabajo() {
			return {
				superior: this.superior,
				pie: this.pie,
			}
		},
		/**
		 * Keys de los campos que ya están en la hoja.
		 *
		 * @returns {Object}
		 */
		keys_en_uso() {
			return keys_en_uso(this.estado_de_trabajo)
		},
		/**
		 * La selección vigente con su lugar ({tipo, item, caja, zona}), o null si lo seleccionado ya
		 * no está (se sacó o se soltó en la bandeja). La caja y la zona se calculan cada vez: un
		 * campo seleccionado pudo haberse arrastrado a otra caja.
		 *
		 * @returns {Object|null}
		 */
		seleccion_actual() {
			if (!this.seleccion) {
				return null
			}
			/* Una columna de la tabla: vale mientras siga en la tabla (si se sacó, nada seleccionado) */
			if (this.seleccion.tipo === 'columna') {
				if (this.tabla.visibles.indexOf(this.seleccion.item) === -1) {
					return null
				}
				return {
					tipo: 'columna',
					item: this.seleccion.item,
					caja: null,
					zona: 'tabla',
				}
			}
			let ubicacion = ubicar(this.estado_de_trabajo, this.seleccion.item)
			if (!ubicacion) {
				return null
			}
			return {
				tipo: this.seleccion.tipo,
				item: this.seleccion.item,
				caja: ubicacion.caja,
				zona: ubicacion.zona,
			}
		},
		/**
		 * Ancho útil de la hoja (mm).
		 *
		 * @returns {number}
		 */
		ancho_util_mm() {
			return ancho_util(this.hoja)
		},
		/**
		 * Medias columnas de la grilla de la tabla: el `grilla_de_tabla` del catálogo, o 24 (D-L3).
		 *
		 * @returns {number}
		 */
		total_de_la_tabla() {
			return total_de_la_grilla(this.catalogo)
		},
		/**
		 * El ancho (mm) contra el que se convierten las columnas de la tabla (D9): el ancho útil de
		 * la hoja. 🔌 En el modo ticket es el ancho del rollo: es el punto donde se enchufa.
		 *
		 * @returns {number}
		 */
		ancho_util_de_la_tabla_mm() {
			return this.ancho_util_mm
		},
		/**
		 * Las columnas que no están en la tabla, en el orden del catálogo (la bandeja las ofrece).
		 *
		 * @returns {Array}
		 */
		columnas_ocultas() {
			return columnas_ocultas(this.tabla.columnas, this.tabla.visibles)
		},
		/**
		 * Medias columnas que ocupan las columnas de la tabla.
		 *
		 * @returns {number}
		 */
		suma_de_la_tabla() {
			return suma_de_columnas(this.tabla.visibles)
		},
		/**
		 * Medias columnas libres en la fila de la tabla (nunca negativo: la suma no pasa de la grilla).
		 *
		 * @returns {number}
		 */
		lugar_libre_en_la_tabla() {
			let libre = this.total_de_la_tabla - this.suma_de_la_tabla
			return libre > 0 ? libre : 0
		},
		/**
		 * Lo libre de la fila en milímetros de esta hoja (para el texto de debajo de la tabla).
		 *
		 * @returns {number}
		 */
		mm_libres_en_la_tabla() {
			return columnas_a_mm(this.lugar_libre_en_la_tabla, this.ancho_util_de_la_tabla_mm, this.total_de_la_tabla)
		},
		/**
		 * Huella de la tabla de ahora: columnas, orden, medias columnas, salto y el ancho útil contra
		 * el que se convierten (cambiar la hoja recalcula los mm: también es un cambio de la tabla).
		 *
		 * @returns {string}
		 */
		huella_de_la_tabla_actual() {
			if (!this.catalogo) {
				return ''
			}
			return huella_de_la_tabla(this.tabla.visibles, this.ancho_util_de_la_tabla_mm, this.total_de_la_tabla)
		},
		/**
		 * Si la tabla cambió respecto de su base (o cambió el ancho útil): al guardar, viaja
		 * `pdf_column_options` completo (plan §7.2).
		 *
		 * @returns {boolean}
		 */
		tabla_cambiada() {
			return this.huella_de_la_tabla_actual !== this.huella_base_de_la_tabla
		},
		/**
		 * D10: si tocar SOLO la tabla pasa el perfil a imprimirse con cajas.
		 *
		 * - En hoja, NO: el PDF de siempre ya lee las columnas del pivot, así que un perfil de siempre
		 *   cambia su tabla y sigue siendo de siempre (no viaja page_layout).
		 * - En ticket, SÍ: el Ticket 2.0 de siempre no lee el pivot, y sin pasar a diseñado el cambio
		 *   no se vería. 🔌 Es el criterio que el modo ticket ajusta si hace falta; hoy se lee del
		 *   `es_ticket` del catálogo (contrato §3.3), que una API vieja no manda (= hoja).
		 *
		 * @returns {boolean}
		 */
		tocar_la_tabla_pasa_a_cajas() {
			return !!(this.catalogo && this.catalogo.es_ticket)
		},
		/**
		 * Si lo que se tocó hace que, al guardar, el perfil quede (o pase a) imprimirse con cajas: el
		 * lienzo o la hoja, o la tabla cuando eso cuenta (D10).
		 *
		 * @returns {boolean}
		 */
		cambio_que_pasa_a_cajas() {
			return this.diseno_tocado || (this.tabla_cambiada && this.tocar_la_tabla_pasa_a_cajas)
		},
		/**
		 * El ancho (mm) contra el que se dibuja la hoja: el de la hoja más ancha que se puede elegir
		 * (o el de la hoja de ahora, si es personalizada y más ancha).
		 *
		 * @returns {number}
		 */
		ancho_de_referencia_mm() {
			let referencia = Number(this.hoja.ancho) || HOJA_DE_SIEMPRE.ancho
			;(this.catalogo ? this.catalogo.formatos_de_hoja : []).forEach(function (formato) {
				if (Number(formato.ancho_mm) > referencia) {
					referencia = Number(formato.ancho_mm)
				}
			})
			return referencia
		},
		/**
		 * Cuándo sale el pie: en cada hoja con "Mostrar pie de página en cada hoja" (venta, presupuesto
		 * o pedido online: los tres lo tienen desde la segunda tanda, 1/10/2026); si no, en la última.
		 *
		 * @returns {string}
		 */
		cuando_sale_el_pie() {
			if (es_verdadero(this.model.show_totals_on_each_page)) {
				return 'sale en cada hoja'
			}
			return 'sale en la última hoja'
		},
		/**
		 * Huella del lienzo y la hoja de ahora.
		 *
		 * @returns {string}
		 */
		huella_del_diseno_actual() {
			if (!this.catalogo) {
				return ''
			}
			return huella_del_diseno(this.estado_de_trabajo, this.hoja, this.limites)
		},
		/**
		 * Huella de los datos del negocio en el encabezado (los dos lados, en orden).
		 *
		 * @returns {string}
		 */
		huella_del_emisor_actual() {
			return JSON.stringify(this.encabezado.emisor)
		},
		/**
		 * Si el lienzo o la hoja cambiaron respecto de su base (la del momento de abrir, la del
		 * último guardado o la de "Volver al diseño de siempre").
		 *
		 * @returns {boolean}
		 */
		diseno_tocado() {
			return this.huella_del_diseno_actual !== this.huella_base_del_diseno
		},
		/**
		 * Si al guardar el perfil va a quedar (o seguir) con el PDF de siempre: la base es la de
		 * siempre y ni el lienzo ni la hoja se tocaron (ni la tabla, si en este modo eso pasa el
		 * perfil a cajas: D10, ver tocar_la_tabla_pasa_a_cajas).
		 *
		 * @returns {boolean}
		 */
		sigue_de_siempre() {
			return this.base_es_de_siempre && !this.cambio_que_pasa_a_cajas
		},
		/**
		 * Si se cambiaron los datos del negocio del encabezado.
		 *
		 * @returns {boolean}
		 */
		emisor_tocado() {
			return this.huella_del_emisor_actual !== this.huella_base_del_emisor
		},
		/**
		 * Si se cambió el tamaño del logo.
		 *
		 * @returns {boolean}
		 */
		logo_tocado() {
			return Number(this.logo_size_mm) !== Number(this.logo_base)
		},
		/**
		 * Huella de todo lo que el diseñador puede guardar, la tabla incluida. `sigue_de_siempre`
		 * entra porque volver al diseño de siempre es un cambio aunque el lienzo quede igual.
		 *
		 * @returns {string}
		 */
		huella_total() {
			return JSON.stringify({
				diseno: this.huella_del_diseno_actual,
				tabla: this.huella_de_la_tabla_actual,
				emisor: this.huella_del_emisor_actual,
				logo: Number(this.logo_size_mm),
				sigue_de_siempre: this.sigue_de_siempre,
			})
		},
		/**
		 * Si hay cambios sin guardar.
		 *
		 * @returns {boolean}
		 */
		hay_cambios() {
			if (!this.abierto || !this.catalogo || !this.huella_inicial) {
				return false
			}
			return this.huella_total !== this.huella_inicial
		},
		/**
		 * "Volver al diseño de siempre" se ofrece si el perfil tiene diseño o el lienzo se tocó
		 * (plan §8.3): o sea, si al guardar NO va a quedar con el PDF de siempre.
		 *
		 * @returns {boolean}
		 */
		puede_volver_al_de_siempre() {
			return !!this.catalogo && !this.sigue_de_siempre
		},
		/**
		 * Si se ofrece "Ver un PDF de prueba": hay un comprobante para probar y el perfil ya existe
		 * (sin cambios sin guardar se habilita: el PDF sale con lo guardado).
		 *
		 * @returns {boolean}
		 */
		se_puede_probar() {
			return !!(this.catalogo && this.catalogo.comprobante_de_prueba && this.model.id)
		},
		/**
		 * La línea que dice si el perfil imprime con el PDF de siempre o con estas cajas.
		 *
		 * @returns {string|null}
		 */
		nota_del_diseno() {
			if (!this.catalogo) {
				return null
			}
			if (this.sigue_de_siempre) {
				/* D10: en hoja, cambiar la tabla no pasa el perfil a cajas (el PDF de siempre la lee igual) */
				if (this.tabla_cambiada) {
					return 'Diseño de siempre: el PDF sale como hasta ahora, con las columnas de esta tabla. Cuando muevas algo más de la hoja y guardes, pasa a imprimirse con estas cajas.'
				}
				return 'Diseño de siempre: el PDF sale como hasta ahora. Cuando muevas algo de la hoja y guardes, pasa a imprimirse con estas cajas.'
			}
			if (this.base_es_de_siempre) {
				return 'Con estos cambios, al guardar el PDF pasa a imprimirse con estas cajas.'
			}
			return null
		},
	},
	beforeDestroy() {
		clearTimeout(this.timer_del_destacado)
	},
	methods: {
		/**
		 * Abre el diseñador. El catálogo se pide en al_mostrar (el `show` del modal), no acá: si el
		 * modal todavía se está cerrando, bootstrap-vue posterga el show hasta el `hidden`, y un
		 * pedido hecho acá se descartaría en ese `hidden` (al_ocultarse) y el diseñador quedaría
		 * cargando para siempre.
		 *
		 * @returns {void}
		 */
		abrir() {
			this.$refs.modal.show()
		},
		/**
		 * El modal empieza a mostrarse: arranca de cero y pide el catálogo (con el diseño derivado
		 * y el comprobante de prueba).
		 *
		 * @returns {void}
		 */
		al_mostrar() {
			this.reiniciar()
			this.abierto = true
			this.cargar()
		},
		/**
		 * Pide el catálogo y arma el estado. Lo que llega tarde (de un pedido anterior, o con el
		 * modal ya cerrado) se ignora.
		 *
		 * @returns {void}
		 */
		cargar() {
			let self = this
			let pedido = this.pedido_en_curso + 1
			let parametros = {
				model_name: this.model.model_name,
				is_afip_ticket: es_verdadero(this.model.is_afip_ticket) ? 1 : 0,
			}

			if (this.model.id) {
				parametros.profile_id = this.model.id
			}

			this.pedido_en_curso = pedido
			this.cargando = true
			this.error_de_carga = null
			this.modelo_guardado = null

			/*
				Con el catálogo va el de COLUMNAS de la tabla (GET pdf-column-options, misión
				diseno-ticket-comandera): la tabla se arma acá adentro. Si falla, el diseñador abre igual
				y la tabla se arma con las columnas que ya tiene el perfil.

				Con un perfil ya creado se pide también el perfil GUARDADO: si el Modelo del formulario no
				es el guardado (se cambió y no se guardó), la API normalizaría el diseño con el de la base
				y el diseñador no deja guardar (ver modelo_cambiado_sin_guardar). Si ese pedido falla, el
				diseñador abre igual, sin ese chequeo.
			*/
			let modelo = this.model.model_name
			let pedidos = [
				traer_catalogo(this, parametros),
				traer_opciones_de_columnas(this, modelo).catch(function (error) {
					console.log('diseño de PDF: no se pudo leer el catálogo de columnas', error)
					return null
				}),
			]
			if (this.model.id) {
				pedidos.push(traer_perfil(this, this.model.id).catch(function (error) {
					console.log('diseño de PDF: no se pudo leer el perfil guardado', error)
					return null
				}))
			}

			Promise.all(pedidos)
			.then(function (respuestas) {
				if (pedido !== self.pedido_en_curso || !self.abierto) {
					return
				}
				self.cargando = false

				let catalogo = respuestas[0] ? respuestas[0].data : null
				if (!catalogo_valido(catalogo)) {
					self.error_de_carga = 'La respuesta del servidor no tiene la forma esperada. Probá de nuevo en un rato.'
					return
				}

				/* Las columnas del modelo (filtradas como lo hace el editor del formulario), o null si no llegaron */
				let modelos = respuestas[1] && respuestas[1].data && Array.isArray(respuestas[1].data.models) ? respuestas[1].data.models : null
				let opciones = modelos ? modelos.filter(function (opcion) {
					return opcion && opcion.id !== null && typeof opcion.id != 'undefined' && opcion.model_name === modelo
				}) : null

				let guardado = respuestas[2] && respuestas[2].data ? respuestas[2].data.model : null
				self.modelo_guardado = guardado && guardado.model_name ? guardado.model_name : null

				self.aplicar_catalogo(catalogo, opciones)
			})
			.catch(function (error) {
				if (pedido !== self.pedido_en_curso) {
					return
				}
				console.log(error)
				self.cargando = false

				let estado = error && error.response ? error.response.status : null
				if (estado === 404) {
					self.error_de_carga = 'El servidor todavía no tiene el diseñador de PDF: se habilita cuando se actualice el sistema.'
					return
				}
				self.error_de_carga = mensaje_de_error(error, 'Revisá tu conexión y volvé a intentar.')
			})
		},
		/**
		 * Arma el estado de trabajo con el catálogo: el diseño del perfil si tiene uno, y si no el
		 * derivado (lo que el perfil imprime hoy); la hoja; el encabezado; la tabla (contra el ancho
		 * útil de esa hoja). Después toma las bases y, si la tabla quedó sin columnas, pone las
		 * sugeridas (después: así cuentan como cambio sin guardar).
		 *
		 * @param {Object} catalogo
		 * @param {Array|null} opciones catálogo de columnas del modelo (null si no llegó)
		 * @returns {void}
		 */
		aplicar_catalogo(catalogo, opciones) {
			let con_diseno = tiene_diseno(this.model.page_layout)
			let estado = armar_estado(con_diseno ? this.model.page_layout : catalogo.diseno_derivado, catalogo)

			/* Primero el catálogo: es_fiscal, los límites y la grilla de la tabla dependen de él */
			this.catalogo = catalogo
			this.superior = estado.superior
			this.pie = estado.pie
			this.hoja = hoja_del_perfil(this.model, con_diseno, catalogo.limites)
			this.armar_encabezado()
			/* La tabla después de la hoja: sus medias columnas salen de los mm sobre ese ancho útil (D9) */
			this.opciones_de_columnas = Array.isArray(opciones) ? opciones : []
			this.armar_la_tabla(this.opciones_de_columnas)
			this.seleccion = null

			this.tenia_diseno = con_diseno
			this.base_es_de_siempre = !con_diseno
			this.restablecido = false
			this.tomar_bases()
			this.poner_columnas_sugeridas()
		},
		/**
		 * Arma la copia de trabajo del encabezado desde header_layout (o el de siempre) y el logo.
		 * En una factura de ARCA, los datos obligatorios que falten van al final de la derecha, como
		 * hacía el diseñador de encabezado al guardar.
		 *
		 * @returns {void}
		 */
		armar_encabezado() {
			let guardado = this.model.header_layout
			if (typeof guardado == 'string') {
				try {
					guardado = JSON.parse(guardado)
				} catch (e) {
					guardado = null
				}
			}

			let base = guardado && typeof guardado == 'object' ? guardado : default_header_layout(this.es_fiscal, this.model.model_name)
			let emisor = base.emisor || {}
			let receptor = base.receptor || {}
			let izquierda = Array.isArray(emisor.izquierda) ? emisor.izquierda.slice() : []
			let derecha = Array.isArray(emisor.derecha) ? emisor.derecha.slice() : []

			if (this.es_fiscal) {
				FISCAL_REQUIRED_EMISOR_KEYS.forEach(function (key) {
					if (izquierda.indexOf(key) === -1 && derecha.indexOf(key) === -1) {
						derecha.push(key)
					}
				})
			}

			this.encabezado = {
				emisor: {
					izquierda: izquierda,
					derecha: derecha,
				},
				receptor: {
					izquierda: Array.isArray(receptor.izquierda) ? receptor.izquierda.slice() : [],
				},
			}

			let colocados = izquierda.concat(derecha)
			this.emisor_paleta = emisor_chip_keys(this.es_fiscal).filter(function (key) {
				return colocados.indexOf(key) === -1
			})

			/*
				El tamaño EFECTIVO del logo, con el mismo orden que el PDF (NewSalePdf / ProfileDocumentPdf):
				el del perfil; si no tiene, el global del dueño (pdf_image_size); si tampoco, 35 mm. Así la
				hoja "a escala" no miente. Sin tocar la manija no viaja (el perfil sigue en null y el PDF
				sigue usando el global del dueño).
			*/
			let logo = parseInt(this.model.logo_size_mm, 10)
			if (!(logo > 0)) {
				let del_duenio = this.owner ? parseInt(this.owner.pdf_image_size, 10) : NaN
				logo = del_duenio > 0 ? del_duenio : LOGO_DEL_PDF_POR_DEFECTO_MM
			}
			this.logo_size_mm = logo
		},
		/**
		 * Toma lo de ahora como base: sin cambios sin guardar y, si no es de siempre, "no tocado".
		 *
		 * @returns {void}
		 */
		tomar_bases() {
			this.huella_base_del_diseno = this.huella_del_diseno_actual
			this.huella_base_de_la_tabla = this.huella_de_la_tabla_actual
			this.huella_base_del_emisor = this.huella_del_emisor_actual
			this.logo_base = this.logo_size_mm
			this.huella_inicial = this.huella_total
		},
		/**
		 * Deja todo como antes de abrir.
		 *
		 * @returns {void}
		 */
		reiniciar() {
			clearTimeout(this.timer_del_destacado)
			this.cargando = false
			this.error_de_carga = null
			this.catalogo = null
			this.modelo_guardado = null
			this.superior = []
			this.pie = []
			this.tabla = {
				columnas: [],
				visibles: [],
			}
			this.opciones_de_columnas = []
			this.suma_mm_de_la_base = 0
			this.huella_base_de_la_tabla = ''
			this.columnas_sugeridas_puestas = false
			this.hoja = {
				ancho: HOJA_DE_SIEMPRE.ancho,
				alto: HOJA_DE_SIEMPRE.alto,
				margen: HOJA_DE_SIEMPRE.margen,
			}
			this.encabezado = encabezado_vacio()
			this.emisor_paleta = []
			this.logo_size_mm = LOGO_DEL_PDF_POR_DEFECTO_MM
			this.tenia_diseno = false
			this.base_es_de_siempre = true
			this.restablecido = false
			this.huella_base_del_diseno = ''
			this.huella_base_del_emisor = ''
			this.logo_base = LOGO_DEL_PDF_POR_DEFECTO_MM
			this.huella_inicial = ''
			this.seleccion = null
			this.arrastrando = null
			this.destacado = null
			this.tope_avisado = false
			this.guardando = false
			this.cerrar_sin_preguntar = false
		},
		/**
		 * Botón Cancelar / Cerrar: cierra (preguntando si hay cambios sin guardar).
		 *
		 * @returns {void}
		 */
		cancelar() {
			this.cerrar(false)
		},
		/**
		 * Cierra el modal.
		 *
		 * @param {boolean} sin_preguntar true para no preguntar por cambios sin guardar
		 * @returns {void}
		 */
		cerrar(sin_preguntar) {
			if (sin_preguntar) {
				this.cerrar_sin_preguntar = true
			}
			this.$refs.modal.hide('cerrar')
		},
		/**
		 * Antes de cerrarse (✕ del encabezado, Escape, Cancelar): si hay cambios sin guardar, frena
		 * el cierre y pregunta. Mientras se guarda no se cierra.
		 *
		 * @param {Object} evento BvModalEvent (preventDefault frena el cierre)
		 * @returns {void}
		 */
		al_ocultar(evento) {
			let self = this

			if (this.guardando) {
				evento.preventDefault()
				return
			}

			if (this.cerrar_sin_preguntar || !this.hay_cambios) {
				return
			}

			evento.preventDefault()

			this.$bvModal.msgBoxConfirm('Si salís ahora, se pierden los cambios que hiciste en este diseño.', {
				title: '¿Salir sin guardar?',
				okTitle: 'Salir sin guardar',
				okVariant: 'danger',
				cancelTitle: 'Seguir editando',
				centered: true,
			})
			.then(function (salir) {
				if (salir) {
					self.cerrar(true)
				}
			})
			.catch(function () {})
		},
		/**
		 * Ya cerrado: se limpia el estado para que el próximo abrir arranque de cero (y una respuesta
		 * del catálogo que llegue tarde se ignora).
		 *
		 * @returns {void}
		 */
		al_ocultarse() {
			this.abierto = false
			this.pedido_en_curso = this.pedido_en_curso + 1
			this.reiniciar()
		},
	},
}
</script>
<style lang="sass">
// El hueco, lo levantado y el destello, compartidos por todas las piezas del diseñador
@import '@/common-vue/components/pdf/disenador-pdf/_arrastre'

// Los estilos del modal van sin `scoped`: b-modal se monta colgando de <body>, fuera de este
// componente, y el clon de Sortable que sigue al puntero también. Todo cuelga de clases propias
// (disenador-pdf*, dpdf-*) o del id del modal. Colores solo por token.

// Ancho: hasta 1440px o el 96% de la pantalla, como el editor de Diseños de Vender. La regla global
// de _modals.sass fija .modal-xl en 90% con !important; con una clase más (dialog-class) y el mismo
// !important, esta le gana por especificidad y solo en este modal.
.modal-dialog.modal-xl.disenador-pdf__dialogo
	max-width: min(1440px, 96vw) !important

	// El cuerpo es la "mesa" gris; la hoja, el panel y la bandeja van encima
	.disenador-pdf__cuerpo
		padding: 18px 20px 8px
		background: var(--bg-section)

// Teléfono: pantalla completa
@media (max-width: 767.98px)
	.modal-dialog.modal-xl.disenador-pdf__dialogo
		max-width: 100% !important
		width: 100%
		height: 100%
		max-height: 100%
		margin: 0

		.modal-content
			height: 100%
			max-height: 100%
			border: 0
			border-radius: 0

		.modal-content > .modal-header,
		.modal-content > .modal-footer
			border-radius: 0

		.disenador-pdf__cuerpo
			padding: 14px 12px 6px

// Inputs del modal con el trato "nuevo" del sistema (radio de 8px y anillo de foco suave). Patrón
// de contexto/estilo_interfaz_empresa.md: scopeado por el id del modal, sin !important.
#disenador-pdf
	// La letra va acá también: el global de _inputs.sass pone input.form-control en 1.4rem (22,4px,
	// medido en "Buscar campo…" y en el rótulo del panel) y en el diseñador tiene que ser la del resto
	// del modal. Id + clase le gana a input.form-control sin !important.
	.form-control,
	.custom-select,
	textarea.form-control
		border-radius: var(--metodo-pago-input-radius)
		border-width: 1px
		font-size: 0.85rem

		&:focus
			border-width: 1px
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

	// Los chips del encabezado (diseñador de siempre) con bordes por token sobre la hoja: sus
	// estilos traen literales pensados para el modo claro
	.header-designer-chip
		border-color: var(--color-border)
		color: var(--color-text-primary)

	.header-designer-quadrant__list,
	.header-designer-palette__list
		border-color: var(--color-border)

.disenador-pdf
	width: 100%
	min-width: 0
	text-align: left

	.disenador-pdf__estado
		display: flex
		align-items: flex-start
		justify-content: center
		gap: 12px
		padding: 48px 16px
		color: var(--color-text-secondary)
		font-size: 0.9rem

		p
			margin: 0 0 8px

	.disenador-pdf__estado--error
		i
			color: var(--color-text-warning-strong, var(--warning))
			font-size: 1.4rem

	.disenador-pdf__estado-titulo
		color: var(--color-text-primary)
		font-weight: 700

	.disenador-pdf__estado-detalle
		max-width: 520px

	// Hoja y margen a la izquierda; el PDF de prueba y la nota a la derecha
	.disenador-pdf__cabecera
		display: flex
		flex-wrap: wrap
		align-items: flex-start
		gap: 12px 24px
		margin-bottom: 14px

	.disenador-pdf__acciones
		display: flex
		flex-direction: column
		align-items: flex-end
		gap: 6px
		margin-left: auto

		.btn
			display: inline-flex
			align-items: center
			gap: 6px
			border-radius: 8px
			white-space: nowrap

	.disenador-pdf__nota-de-accion
		max-width: 340px
		margin: 0
		color: var(--color-text-secondary)
		font-size: 0.74rem
		line-height: 1.35
		text-align: right

	// Tres pistas en un renglón (dos o tres en pantallas chicas), calmas: ícono + frase corta
	.disenador-pdf__ayuda
		display: flex
		flex-wrap: wrap
		gap: 6px 22px
		margin: 0 0 4px
		padding: 0
		list-style: none
		color: var(--color-text-primary)
		font-size: 0.82rem

		li
			display: inline-flex
			align-items: center
			gap: 7px

		i
			color: var(--color-primary)

	.disenador-pdf__nota
		margin: 0 0 14px
		color: var(--color-text-secondary)
		font-size: 0.75rem

	// Avisos arriba del lienzo: el mismo dibujo que el de "falta un buscador" del editor de Vender
	.disenador-pdf__aviso
		display: flex
		align-items: center
		gap: 10px
		margin-bottom: 14px
		padding: 10px 14px
		border: 1px solid var(--color-border)
		border-radius: 10px
		background: var(--bg-card)
		color: var(--color-text-primary)
		font-size: 0.82rem

		i
			flex: 0 0 auto
			color: var(--color-primary)
			font-size: 1rem

	// El que no deja guardar: borde e ícono de advertencia
	.disenador-pdf__aviso--bloquea
		border-color: var(--color-text-warning-strong, var(--warning))

		i
			color: var(--color-text-warning-strong, var(--warning))

	// Hoja + panel y bandeja. El lateral va a la derecha desde 1200px (xl); más angosto, debajo. No
	// desde 992 como en Vender: la hoja tiene un ancho mínimo legible y a 1024 el marco quedaba en
	// 621px para una hoja de 680 (medido): con el lateral abajo entra entera sin deslizar.
	.disenador-pdf__area
		display: grid
		grid-template-columns: minmax(0, 1fr) 300px
		gap: 20px
		align-items: start

	// El marco de la hoja: si queda más angosto que el ancho mínimo de la hoja (teléfono, o una
	// ventana de escritorio angosta con el lateral al costado), la hoja se desliza de costado ADENTRO
	// de él y la página no. Los 8px de los costados son para lo que asoma de la hoja: las manijas y
	// las guías de las zonas (como el gutter de Vender) y el anillo de lo seleccionado.
	.disenador-pdf__marco
		min-width: 0
		overflow-x: auto
		padding: 0 8px 12px

	// En escritorio el lateral acompaña el scroll del modal: siempre a mano para soltar un campo
	.disenador-pdf__lateral
		position: sticky
		top: 0
		display: flex
		flex-direction: column
		gap: 14px
		max-height: calc(100vh - 12rem)
		overflow-y: auto

@media (max-width: 1199.98px)
	.disenador-pdf
		.disenador-pdf__area
			grid-template-columns: minmax(0, 1fr)

		.disenador-pdf__lateral
			position: static
			max-height: none
			overflow: visible
			margin-bottom: 12px

@media (max-width: 991.98px)
	.disenador-pdf
		.disenador-pdf__acciones
			align-items: flex-start
			margin-left: 0

		.disenador-pdf__nota-de-accion
			max-width: none
			text-align: left

// Teléfono: la hoja mantiene un ancho mínimo legible (HojaDelDisenador.vue) y se desliza de costado
// ADENTRO de su marco, que usa todo el ancho de la pantalla. La página no scrollea de costado.
@media (max-width: 767.98px)
	.disenador-pdf
		.disenador-pdf__marco
			margin: 0 -12px
			padding: 0 12px 12px

// Pie: "Cambios sin guardar" y "Volver al diseño de siempre" a la izquierda, botones a la derecha
.disenador-pdf__pie
	display: flex
	align-items: center
	justify-content: space-between
	flex-wrap: wrap
	gap: 8px 12px
	width: 100%

.disenador-pdf__sin-guardar
	display: inline-flex
	align-items: center
	gap: 8px
	color: var(--color-text-secondary)
	font-size: 0.82rem

.disenador-pdf__punto
	width: 8px
	height: 8px
	border-radius: 50%
	background: var(--color-text-warning-strong, var(--warning))

.disenador-pdf__volver.btn
	display: inline-flex
	align-items: center
	gap: 6px
	padding-left: 0
	padding-right: 0
	color: var(--color-primary)
	font-weight: 600

.disenador-pdf__botones
	display: flex
	gap: 8px
	margin-left: auto

	.btn
		border-radius: 8px
</style>
