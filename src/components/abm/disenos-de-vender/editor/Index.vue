<template>
	<!--
		Editor de un Diseño de Vender (mision diseno-vender-configurable, 28/9/2026).

		Modal propio, no el generico del ABM: editar un diseño es arrastrar y soltar. `scrollable`
		para que el nombre de arriba se pueda scrollear pero el pie (Cancelar / Guardar) quede siempre
		a la vista; y `no-close-on-backdrop` porque un clic afuera no puede tirar un rato de trabajo
		(igual se avisa si se cierra con cambios sin guardar, ver al_ocultar).

		Se abre desde la solapa con this.$refs.editor.abrir(modelo, en_uso).
	-->
	<b-modal
	:id="id_del_modal"
	ref="modal"
	size="xl"
	scrollable
	no-close-on-backdrop
	:title="titulo"
	dialog-class="editor-diseno__dialogo"
	body-class="editor-diseno__cuerpo"
	@show="abierto = true"
	@shown="al_mostrarse"
	@hide="al_ocultar"
	@hidden="al_ocultarse">

		<div class="editor-diseno">

			<cabecera-del-editor
			ref="cabecera"
			:nombre.sync="nombre"
			:en_uso.sync="en_uso"
			:en_uso_bloqueado="en_uso_original"
			:nombre_invalido="nombre_invalido"
			:nota_del_diseno="nota_del_diseno"
			:texto_restablecer="texto_restablecer"
			@update:nombre="nombre_invalido = false"
			@restablecer="restablecer"></cabecera-del-editor>

			<!-- La ayuda que hace que se entienda en dos segundos: se arrastra, el borde cambia el ancho -->
			<ul class="editor-diseno__ayuda">
				<li>
					<i class="bi bi-arrows-move"></i>
					Arrastrá un campo para moverlo, dentro de su sección o a otra.
				</li>
				<li>
					<i class="bi bi-arrow-left-right"></i>
					Tirá de su borde izquierdo o derecho para cambiarle el ancho.
				</li>
				<li>
					<i class="bi bi-x-lg"></i>
					Sacalo con la cruz o soltándolo en la bandeja.
				</li>
				<li>
					<i class="bi bi-grip-vertical"></i>
					Movés una sección con su agarre; con «Ajustes» le cambiás título, color, alto y columna.
				</li>
			</ul>
			<p class="editor-diseno__nota">
				El ancho se usa desde tablets en adelante; en el teléfono cada campo va a lo ancho, como siempre.
				Las columnas y el alto fijo de las secciones rigen desde pantallas de 992 px; en pantallas más chicas
				las secciones se apilan y el alto es automático.
			</p>

			<div
			v-if="sin_buscador"
			class="editor-diseno__aviso"
			role="status">
				<i class="bi bi-exclamation-triangle"></i>
				<span>{{ TEXTO_FALTA_BUSCADOR }} Sin ninguno no se pueden agregar artículos a la venta.</span>
			</div>

			<div class="editor-diseno__area">

				<!-- El lienzo: las secciones en su disposicion (filas y columnas) y los botones fijos de la venta -->
				<div class="editor-diseno__marco">
					<div class="editor-diseno__lienzo">
						<disposicion-del-editor
						:estado="estado_de_trabajo"
						:move="permitir_movimiento"
						:destacado="destacado"
						@sacar="sacar_elemento($event.id, $event.item)"
						@ajuste="al_ajustar_seccion"
						@ancho-de-columna="cambiar_ancho_de_columna_desde_el_lienzo"
						@agregar-seccion="agregar_una_seccion"
						@fin-de-arrastre-de-secciones="dejar_prolija_la_disposicion"
						@inicio-arrastre="al_empezar_arrastre"
						@fin-arrastre="al_terminar_arrastre"></disposicion-del-editor>

						<div class="editor-diseno-fijo editor-diseno-fijo--botones">
							<i class="bi bi-lock-fill"></i>
							<span>Botones de la venta: Limpiar, Imprimir, WhatsApp y Guardar (fijos)</span>
						</div>
					</div>
				</div>

				<bandeja-de-sacados
				class="editor-diseno__bandeja"
				:sacados="sacados"
				:ids_de_secciones="ids_de_secciones"
				:titulos_de_secciones="titulos_de_secciones"
				:move="permitir_movimiento"
				:arrastrando="arrastrando"
				:destacado="destacado"
				@agregar="agregar_desde_bandeja"
				@inicio-arrastre="al_empezar_arrastre"
				@fin-arrastre="al_terminar_arrastre"></bandeja-de-sacados>
			</div>
		</div>

		<template #modal-footer>
			<div class="editor-diseno__pie">
				<span
				v-if="hay_cambios"
				class="editor-diseno__sin-guardar">
					<span class="editor-diseno__punto"></span>
					Cambios sin guardar
				</span>
				<div class="editor-diseno__botones">
					<b-button
					variant="outline-secondary"
					:disabled="guardando"
					@click="cancelar">
						Cancelar
					</b-button>
					<b-button
					variant="primary"
					:disabled="guardando"
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
import CabeceraDelEditor from './CabeceraDelEditor'
import DisposicionDelEditor from './DisposicionDelEditor'
import BandejaDeSacados from './BandejaDeSacados'
import {
	KEY_SEPARADOR,
	elemento,
	es_marcador,
	es_obligatorio,
} from '@/components/vender/layout/elementos'
import { serializar_diseno } from '@/components/vender/layout/resolver_diseno'
import {
	ancho_de_columna_de,
	es_layout_de_plantilla,
	escalar_cols_a_columna,
	ids_en_orden,
	layout_de_plantilla,
	seccion_de_respaldo,
} from '@/components/vender/layout/secciones'
import {
	agregar_seccion,
	apilar_campos,
	cambiar_alto,
	cambiar_alto_fijo,
	cambiar_ancho_de_columna,
	limpiar_disposicion,
	mover_a_banda_nueva,
	mover_a_columna_nueva,
	quitar_seccion,
} from './operaciones_de_secciones'
import {
	armar_estado_de_trabajo,
	armar_diseno_completo,
	huella_del_estado,
	huella_del_diseno,
	indice_por_defecto,
	falta_buscador,
	identidad,
	contar_marcadores,
	TOPE_DE_MARCADORES_POR_ETAPA,
} from './estado_del_editor'
import { crear_diseno, actualizar_diseno, mensaje_de_error } from '../api_de_disenos'
import { avisar } from '../avisos'

/* Nombre que se sugiere al crear un diseño */
const NOMBRE_SUGERIDO = 'Nuevo diseño'

/* Lo que se dice cuando el diseño se queda sin buscadores (plan de la mision, §7) */
const TEXTO_FALTA_BUSCADOR = 'Dejá al menos un buscador de artículos (código de barras o buscador por nombre).'

/* Cuanto dura el resaltado de un campo recien movido con "Agregar" o con la ✕ (ms) */
const DURACION_DEL_DESTACADO = 1600

/* Texto del boton de restablecer segun a que vuelve el diseño */
const TEXTO_RESTABLECER_PREDETERMINADO = 'Restablecer el diseño predeterminado'
const TEXTO_RESTABLECER_AGIL = 'Restablecer el diseño ágil'

/**
 * Modal editor de un Diseño de Vender.
 *
 * El estado de trabajo (etapas, sacados, ocultos...) lo arma y lo desarma estado_del_editor.js; aca
 * se orquesta: abrir, mover entre la bandeja y las etapas, validar, guardar y avisar si se cierra
 * con cambios sin guardar. Las etapas y la bandeja mutan sus listas por referencia (vuedraggable
 * `:list`), asi que este componente es el dueño de los arrays y los ve cambiar sin eventos.
 */
export default {
	name: 'EditorDeDisenoDeVender',
	components: {
		CabeceraDelEditor,
		DisposicionDelEditor,
		BandejaDeSacados,
	},
	data() {
		return {
			/* Constantes para el template */
			TEXTO_FALTA_BUSCADOR: TEXTO_FALTA_BUSCADOR,
			/* id del b-modal (tambien scopea los estilos de los inputs, ver el <style>) */
			id_del_modal: 'editor-diseno-vender',
			/* true entre el show y el hidden del modal */
			abierto: false,
			/* id del diseño que se edita, o null si es uno nuevo */
			modelo_id: null,
			nombre: '',
			/* Si va a quedar en uso al guardar */
			en_uso: false,
			/* Si ya estaba en uso al abrir (el interruptor queda bloqueado) */
			en_uso_original: false,
			/* Estado de trabajo (ver estado_del_editor.js); `etapas` y `ocultos` van por id de seccion */
			etapas: {},
			sacados: [],
			ocultos: {},
			orden_original: {},
			sacados_ocultos: [],
			/* Metadatos de cada seccion, la disposicion en filas y columnas y la plantilla de origen ('agil' o null) */
			secciones: {},
			disposicion: [],
			plantilla: null,
			/* Huella del estado al abrir: si la de ahora es distinta, hay cambios sin guardar */
			huella_inicial: '',
			/*
				Si la base del lienzo es un diseño del sistema (layout null, o solo con la plantilla del
				diseño ágil): un diseño nuevo, uno guardado asi, o cualquiera despues de "Restablecer".
				Mientras el lienzo no se toque desde esa base, el diseño "sigue al del sistema" (ver
				sigue_al_sistema y guardar()).
			*/
			base_es_del_sistema: false,
			/* Si en esta edicion se toco "Restablecer" */
			restablecido: false,
			/* Huella de SOLO el diseño en su base (al abrir o al restablecer): si cambia, el lienzo se toco */
			huella_del_diseno_base: '',
			guardando: false,
			/* Se pone en true para cerrar sin la pregunta de cambios sin guardar (despues de guardar, o ya confirmado) */
			cerrar_sin_preguntar: false,
			/* Lo que se esta arrastrando ahora: {key, obligatorio, desde: 'etapa'|'bandeja'|'fuente'}, o null */
			arrastrando: null,
			/* Identidad del item resaltado un momento (recien movido), o null */
			destacado: null,
			/* Timer del resaltado */
			timer_del_destacado: null,
			/* true despues de intentar guardar sin nombre */
			nombre_invalido: false,
			/*
				true si en el arrastre en curso ya se aviso que una etapa llego al tope de marcadores: el
				`move` se llama en cada paso del arrastre, y sin esto el aviso saldria decenas de veces
			*/
			tope_avisado: false,
		}
	},
	computed: {
		/**
		 * Titulo del modal.
		 *
		 * @returns {string}
		 */
		titulo() {
			return this.modelo_id ? 'Editar diseño de Vender' : 'Nuevo diseño de Vender'
		},
		/**
		 * El estado de trabajo completo, en la forma que esperan las funciones de estado_del_editor.js.
		 *
		 * @returns {Object}
		 */
		estado_de_trabajo() {
			return {
				etapas: this.etapas,
				sacados: this.sacados,
				ocultos: this.ocultos,
				orden_original: this.orden_original,
				sacados_ocultos: this.sacados_ocultos,
				secciones: this.secciones,
				disposicion: this.disposicion,
				plantilla: this.plantilla,
			}
		},
		/**
		 * Ids de las secciones del diseño en orden de lectura.
		 *
		 * @returns {Array<string>}
		 */
		ids_de_secciones() {
			return ids_en_orden(this.disposicion)
		},
		/**
		 * Titulo de cada seccion por id (el de la bandeja de sacados: "vuelve a «Titulo»").
		 *
		 * @returns {Object}
		 */
		titulos_de_secciones() {
			let titulos = {}
			let self = this
			this.ids_de_secciones.forEach(function (id) {
				titulos[id] = self.secciones[id] ? self.secciones[id].titulo : ''
			})
			return titulos
		},
		/**
		 * La base a la que vuelve "Restablecer": el layout de la plantilla de origen del diseño (el ágil)
		 * o null (el predeterminado).
		 *
		 * @returns {Object|null}
		 */
		layout_de_origen() {
			return this.plantilla ? layout_de_plantilla(this.plantilla) : null
		},
		/**
		 * Texto del boton de restablecer: dice a que vuelve el diseño.
		 *
		 * @returns {string}
		 */
		texto_restablecer() {
			return this.plantilla === 'agil' ? TEXTO_RESTABLECER_AGIL : TEXTO_RESTABLECER_PREDETERMINADO
		},
		/**
		 * Si hay cambios sin guardar respecto de lo que habia al abrir. Depende de las listas y de los
		 * `cols` de cada item, asi que se recalcula con cada arrastre y cada cambio de ancho.
		 *
		 * @returns {boolean}
		 */
		hay_cambios() {
			if (!this.abierto || !this.huella_inicial) {
				return false
			}
			return huella_del_estado(this.nombre, this.en_uso, this.estado_de_trabajo, this.sigue_al_sistema) !== this.huella_inicial
		},
		/**
		 * Si el lienzo cambio respecto de su base (la del momento de abrir, o la de "Restablecer").
		 * Cambiar el nombre o el "En uso" NO es tocar el diseño.
		 *
		 * @returns {boolean}
		 */
		diseno_tocado() {
			return huella_del_diseno(this.estado_de_trabajo) !== this.huella_del_diseno_base
		},
		/**
		 * Si al guardar el diseño va a quedar (o seguir) como el diseño del sistema, con layout null:
		 * la base es la del sistema y el lienzo no se toco. Es lo que la tarjeta muestra como "Diseño
		 * original del sistema", el que se acomoda solo a las extensiones y a cada usuario.
		 *
		 * @returns {boolean}
		 */
		sigue_al_sistema() {
			return this.base_es_del_sistema && !this.diseno_tocado
		},
		/**
		 * La linea que, debajo de "Restablecer", dice si el diseño sigue al del sistema o va a dejar de
		 * seguirlo al guardar. Mismo nombre que usa la tarjeta de la solapa ("Diseño original del
		 * sistema"). Null en un diseño fijo que no viene del sistema.
		 *
		 * @returns {string|null}
		 */
		nota_del_diseno() {
			if (!this.abierto) {
				return null
			}
			let del_sistema = this.plantilla === 'agil' ? 'Diseño ágil del sistema' : 'Diseño original del sistema'
			if (this.sigue_al_sistema) {
				return del_sistema + ': se acomoda solo a las extensiones y a la preferencia de cada usuario.'
			}
			if (this.base_es_del_sistema) {
				return 'Con estos cambios, al guardar el diseño queda fijo y deja de seguir al ' + del_sistema.toLowerCase() + '.'
			}
			return null
		},
		/**
		 * Si el diseño se quedo sin codigo de barras ni buscador por nombre (y el negocio tiene alguno).
		 *
		 * @returns {boolean}
		 */
		sin_buscador() {
			return this.abierto && falta_buscador(this.etapas, this)
		},
	},
	beforeDestroy() {
		clearTimeout(this.timer_del_destacado)
	},
	methods: {
		/**
		 * Abre el editor.
		 *
		 * @param {Object|null} modelo el vender_layout a editar, o null para crear uno nuevo (arranca
		 *                             con el predeterminado, nombre sugerido y sin estar en uso)
		 * @param {boolean} esta_en_uso si ese modelo es el que esta en uso ahora
		 * @returns {void}
		 */
		abrir(modelo, esta_en_uso) {
			this.aplicar_estado(armar_estado_de_trabajo(modelo ? modelo.layout : null, this))

			this.modelo_id = modelo ? modelo.id : null
			this.nombre = modelo ? String(modelo.name || '') : NOMBRE_SUGERIDO
			this.en_uso_original = !!(modelo && esta_en_uso)
			this.en_uso = this.en_uso_original
			this.nombre_invalido = false
			this.guardando = false
			this.cerrar_sin_preguntar = false
			this.arrastrando = null
			this.destacado = null

			/* Un diseño nuevo arranca del predeterminado: su base tambien es la del sistema */
			this.base_es_del_sistema = !modelo || es_layout_de_plantilla(modelo.layout)
			this.restablecido = false
			this.huella_del_diseno_base = huella_del_diseno(this.estado_de_trabajo)
			this.huella_inicial = huella_del_estado(this.nombre, this.en_uso, this.estado_de_trabajo, this.base_es_del_sistema)

			this.$refs.modal.show()
		},
		/**
		 * Carga un estado de trabajo en el componente (al abrir y al restablecer).
		 *
		 * @param {Object} estado salida de armar_estado_de_trabajo()
		 * @returns {void}
		 */
		aplicar_estado(estado) {
			/*
				Los contenedores por id (`etapas`, `ocultos`, `secciones`, `orden_original`) se vuelven a
				armar como objetos nuevos: una seccion agregada o quitada suma o saca una CLAVE, y Vue 2 no
				ve las claves nuevas de un objeto que ya observa.
			*/
			this.etapas = Object.assign({}, estado.etapas)
			this.sacados = estado.sacados
			this.ocultos = Object.assign({}, estado.ocultos)
			this.orden_original = Object.assign({}, estado.orden_original)
			this.sacados_ocultos = estado.sacados_ocultos
			this.secciones = Object.assign({}, estado.secciones)
			this.disposicion = estado.disposicion
			this.plantilla = estado.plantilla || null
		},
		/**
		 * Ya visible: en un diseño nuevo, el nombre queda enfocado y seleccionado para reemplazarlo.
		 *
		 * @returns {void}
		 */
		al_mostrarse() {
			if (!this.modelo_id && this.$refs.cabecera) {
				this.$refs.cabecera.enfocar_nombre()
			}
		},
		/**
		 * `move` de vuedraggable para todas las listas del editor.
		 *
		 * - Un obligatorio NO se puede soltar en la bandeja (se mueve y se le cambia el ancho, pero no
		 *   se saca: decision de Lucas, 28/9/2026).
		 * - La fuente de los marcadores no se suelta en la bandeja (no tiene sentido y se descartaria).
		 * - Un marcador que ENTRA a una etapa (nuevo desde la fuente, o traido de otra etapa) se
		 *   rechaza si esa etapa ya tiene el tope de ese tipo (TOPE_DE_MARCADORES_POR_ETAPA), con un
		 *   aviso. Reordenarlo dentro de su misma etapa siempre se puede.
		 *
		 * @param {Object} evento evento de vuedraggable (to, from, draggedContext, relatedContext)
		 * @returns {boolean} false cancela el movimiento
		 */
		permitir_movimiento(evento) {
			let destino = evento && evento.to && evento.to.getAttribute ? evento.to.getAttribute('data-zona') : null
			let origen = evento && evento.from && evento.from.getAttribute ? evento.from.getAttribute('data-zona') : null

			let arrastrado = evento && evento.draggedContext ? evento.draggedContext.element : null

			if (destino === 'bandeja') {
				if (origen === 'fuente') {
					return false
				}
				return !(arrastrado && es_obligatorio(arrastrado.key))
			}

			if (arrastrado && es_marcador(arrastrado.key) && evento.to !== evento.from) {
				let etapa = evento.to && evento.to.getAttribute ? evento.to.getAttribute('data-etapa') : null
				let lista = etapa ? this.etapas[etapa] : null

				/* La lista de datos todavia no tiene al que se arrastra: se cuenta lo que ya estaba */
				if (lista && contar_marcadores(lista, arrastrado.key) >= TOPE_DE_MARCADORES_POR_ETAPA) {
					this.avisar_tope_de_marcadores(arrastrado.key)
					return false
				}
			}

			return true
		},
		/**
		 * Avisa, una sola vez por arrastre, que la etapa ya tiene el tope de marcadores de ese tipo.
		 *
		 * @param {string} key KEY_SEPARADOR o KEY_SALTO_DE_FILA
		 * @returns {void}
		 */
		avisar_tope_de_marcadores(key) {
			if (this.tope_avisado) {
				return
			}
			this.tope_avisado = true
			let que = key === KEY_SEPARADOR ? 'separadores' : 'saltos de fila'
			avisar(this, 'warning', 'Cada sección admite hasta ' + TOPE_DE_MARCADORES_POR_ETAPA + ' ' + que + '. Quitá alguno de esa sección para poner otro.')
		},
		/**
		 * Empieza un arrastre: se anota que se arrastra y desde donde, para que la bandeja muestre si
		 * lo acepta o lo rechaza.
		 *
		 * @param {Object} evento evento `start` de Sortable (evento.item es el elemento del DOM)
		 * @returns {void}
		 */
		al_empezar_arrastre(evento) {
			let item = evento ? evento.item : null
			let desde = 'etapa'

			if (evento && evento.from && evento.from.getAttribute) {
				let zona = evento.from.getAttribute('data-zona')
				if (zona === 'bandeja' || zona === 'fuente') {
					desde = zona
				}
			}

			this.arrastrando = {
				key: item ? item.getAttribute('data-key') : null,
				obligatorio: !!(item && item.getAttribute('data-obligatorio') === 'si'),
				desde: desde,
			}
			this.tope_avisado = false
		},
		/**
		 * Termina un arrastre (se haya soltado o no en algun lado).
		 *
		 * @returns {void}
		 */
		al_terminar_arrastre() {
			this.arrastrando = null
		},
		/**
		 * La ✕ de un campo: lo saca de su etapa y lo manda al principio de la bandeja. Un marcador
		 * (separador o salto de fila) no va a la bandeja: se quita y listo.
		 *
		 * @param {string} etapa
		 * @param {Object} item
		 * @returns {void}
		 */
		sacar_elemento(etapa, item) {
			if (!item || es_obligatorio(item.key)) {
				return
			}

			let lista = this.etapas[etapa]
			let indice = lista.indexOf(item)

			if (indice === -1) {
				return
			}

			lista.splice(indice, 1)

			if (es_marcador(item.key)) {
				return
			}

			this.sacados.unshift(item)
			this.destacar(item)
		},
		/**
		 * "Agregar" de la bandeja: el campo vuelve a su seccion de siempre (o, si el diseño ya no la
		 * tiene, a la de respaldo: la primera que no es la de la tabla de articulos), al lado del
		 * campo que lo precede en el diseño predeterminado (indice_por_defecto), con su ancho de
		 * siempre escalado a la columna donde vive la seccion, y se lo muestra resaltado.
		 *
		 * @param {Object} item {key, cols}
		 * @returns {void}
		 */
		agregar_desde_bandeja(item) {
			let definicion = item ? elemento(item.key) : null

			if (!definicion) {
				return
			}

			let indice = this.sacados.indexOf(item)
			if (indice !== -1) {
				this.sacados.splice(indice, 1)
			}

			let destino = seccion_de_respaldo(definicion.etapa, this.ids_de_secciones)
			let lista = this.etapas[destino]

			item.cols = escalar_cols_a_columna(item.cols, ancho_de_columna_de(this.disposicion, destino))
			lista.splice(indice_por_defecto(lista, item.key, this), 0, item)

			this.destacar(item)
			this.llevar_a_la_vista(item)
		},
		/**
		 * Un ajuste de una seccion desde su panel (titulo, descripcion, color, plegado, alto, alto fijo,
		 * columna nueva, fila nueva o quitar). Los de texto, color y plegado cambian el metadato en el
		 * lugar; el resto son operaciones de operaciones_de_secciones.js, que si no se pueden avisan
		 * con su motivo.
		 *
		 * @param {Object} ajuste {tipo, id, propiedad?, valor?}
		 * @returns {void}
		 */
		al_ajustar_seccion(ajuste) {
			let trabajo = this.estado_de_trabajo
			let resultado = null

			if (ajuste.tipo === 'meta') {
				if (this.secciones[ajuste.id]) {
					this.secciones[ajuste.id][ajuste.propiedad] = ajuste.valor
				}
				return
			}

			if (ajuste.tipo === 'alto') {
				resultado = cambiar_alto(trabajo, ajuste.id, ajuste.valor)
			} else if (ajuste.tipo === 'fijo') {
				resultado = cambiar_alto_fijo(trabajo, ajuste.id, ajuste.valor)
			} else if (ajuste.tipo === 'columna_nueva') {
				resultado = mover_a_columna_nueva(trabajo, ajuste.id)
			} else if (ajuste.tipo === 'banda_nueva') {
				resultado = mover_a_banda_nueva(trabajo, ajuste.id)
			} else if (ajuste.tipo === 'apilar_campos') {
				resultado = apilar_campos(trabajo, ajuste.id)
			} else if (ajuste.tipo === 'quitar') {
				resultado = quitar_seccion(trabajo, ajuste.id, this)
				if (resultado.ok) {
					avisar(this, 'info', 'Sección quitada. Sus campos opcionales quedaron en la bandeja de sacados.')
				}
			}

			if (resultado) {
				this.terminar_operacion(trabajo, resultado, false)
			}
		},
		/**
		 * Cambio de ancho de una columna (manija entre columnas o − / + de su barra). Durante el
		 * arrastre de la manija no se avisa cada vez que topa con el minimo.
		 *
		 * @param {Object} pedido {banda, columna, delta, silencioso?}
		 * @returns {void}
		 */
		cambiar_ancho_de_columna_desde_el_lienzo(pedido) {
			let trabajo = this.estado_de_trabajo
			let resultado = cambiar_ancho_de_columna(trabajo, pedido.banda, pedido.columna, pedido.delta)
			this.terminar_operacion(trabajo, resultado, !!pedido.silencioso)
		},
		/**
		 * "Agregar sección": una vacia en una fila nueva al final, y el lienzo la muestra.
		 *
		 * @returns {void}
		 */
		agregar_una_seccion() {
			let self = this
			let trabajo = this.estado_de_trabajo
			let resultado = agregar_seccion(trabajo, this)

			this.terminar_operacion(trabajo, resultado, false)

			if (resultado.ok) {
				this.$nextTick(function () {
					let modal = document.getElementById(self.id_del_modal)
					let tarjeta = modal ? modal.querySelector('.editor-etapa[data-seccion="' + resultado.id + '"]') : null
					if (tarjeta && typeof tarjeta.scrollIntoView == 'function') {
						tarjeta.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
					}
				})
			}
		},
		/**
		 * Termina una operacion de secciones: vuelve a asignar los contenedores al componente (para
		 * que Vue vea las claves nuevas o las que se fueron) y, si no se pudo hacer, avisa por que.
		 *
		 * @param {Object} trabajo el estado de trabajo que mutó la operacion
		 * @param {{ok: boolean, motivo: (string|null)}} resultado
		 * @param {boolean} silencioso true para no avisar cuando no se pudo
		 * @returns {void}
		 */
		terminar_operacion(trabajo, resultado, silencioso) {
			this.aplicar_estado(trabajo)

			if (!resultado.ok && !silencioso && resultado.motivo) {
				avisar(this, 'warning', resultado.motivo)
			}
		},
		/**
		 * Despues de arrastrar una seccion de una columna a otra: saca las columnas y filas que
		 * quedaron vacias (su ancho pasa a la vecina) y rehace los anchos para que sumen 12.
		 *
		 * @returns {void}
		 */
		dejar_prolija_la_disposicion() {
			limpiar_disposicion(this.estado_de_trabajo)
		},
		/**
		 * Resalta un item un momento (el que se acaba de mover con un boton).
		 *
		 * @param {Object} item
		 * @returns {void}
		 */
		destacar(item) {
			let self = this
			clearTimeout(this.timer_del_destacado)
			/* Se apaga y se vuelve a prender en el proximo tick para que la animacion corra de nuevo */
			this.destacado = null
			this.$nextTick(function () {
				self.destacado = es_marcador(item.key) ? identidad(item) : item.key
				self.timer_del_destacado = setTimeout(function () {
					self.destacado = null
				}, DURACION_DEL_DESTACADO)
			})
		},
		/**
		 * Scrollea el lienzo hasta el campo recien agregado (puede haber caido en una etapa que no se
		 * esta viendo, sobre todo en el telefono, donde la bandeja queda debajo de todo).
		 *
		 * @param {Object} item
		 * @returns {void}
		 */
		llevar_a_la_vista(item) {
			let self = this
			this.$nextTick(function () {
				/* El b-modal se monta colgando de <body>: se lo busca por su id, no dentro de this.$el */
				let modal = document.getElementById(self.id_del_modal)
				let tarjeta = modal ? modal.querySelector('.editor-diseno__lienzo [data-key="' + item.key + '"]') : null
				if (tarjeta && typeof tarjeta.scrollIntoView == 'function') {
					tarjeta.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
				}
			})
		},
		/**
		 * Vuelve al diseño de origen del sistema, sin tocar el nombre ni el "En uso": el ágil si el
		 * diseño viene de esa plantilla (this.plantilla), y si no el predeterminado (resolver_diseno(null)).
		 * Lo marca como del sistema: si se guarda sin tocar nada mas del lienzo, viaja la base del
		 * sistema (`layout: null`, o solo la plantilla) y el diseño vuelve a acomodarse solo a las
		 * extensiones y a cada usuario.
		 *
		 * Si el lienzo ya es el de origen no hay nada que perder: no pregunta (y si ademas ya era
		 * del sistema, no hace nada). Si no, pregunta, porque se pierde lo armado hasta ahora aunque
		 * todavia no este guardado.
		 *
		 * @returns {void}
		 */
		restablecer() {
			let self = this
			let origen = armar_estado_de_trabajo(this.layout_de_origen, this)
			let nombre_del_origen = this.plantilla === 'agil' ? 'el diseño ágil' : 'el diseño predeterminado'

			let actual = huella_del_diseno(this.estado_de_trabajo)
			let original = huella_del_diseno(origen)

			if (actual === original) {
				if (this.sigue_al_sistema) {
					avisar(this, 'info', 'Este diseño ya es el original del sistema.')
					return
				}
				/* Un diseño fijo identico al de origen: se lo marca para que vuelva a ser el del sistema */
				this.marcar_como_del_sistema()
				avisar(this, 'info', 'Listo: al guardar, este diseño vuelve a ser el original del sistema.')
				return
			}

			this.$bvModal.msgBoxConfirm('Cada sección y cada campo vuelven a su lugar, ancho y alto de siempre, y los sacados vuelven a Vender. El nombre y el "En uso" no cambian, y nada se guarda hasta que toques Guardar. Si guardás sin mover nada más, el diseño vuelve a acomodarse solo, como el original del sistema.', {
				title: '¿Restablecer ' + nombre_del_origen + '?',
				okTitle: 'Restablecer',
				okVariant: 'primary',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(function (confirmado) {
				if (confirmado) {
					self.aplicar_estado(armar_estado_de_trabajo(self.layout_de_origen, self))
					self.marcar_como_del_sistema()
				}
			})
			.catch(function () {})
		},
		/**
		 * Toma el lienzo actual como base "del sistema": desde aca, mientras no se toque, al guardar
		 * viaja `layout: null` (ver guardar()).
		 *
		 * @returns {void}
		 */
		marcar_como_del_sistema() {
			this.base_es_del_sistema = true
			this.restablecido = true
			this.huella_del_diseno_base = huella_del_diseno(this.estado_de_trabajo)
		},
		/**
		 * Valida y guarda: POST si es nuevo, PUT si se esta editando. Despues vuelve a pedir la lista
		 * (poner uno en uso apaga a los demas) y cierra.
		 *
		 * Un diseño existente sin cambios no se manda: se cierra y listo.
		 *
		 * 🔴 El `layout` viaja SOLO si el lienzo se toco (o si hay que volver al diseño del sistema):
		 * - Lienzo sin tocar desde el diseño del sistema (nuevo, o restablecido): `layout: null` (o, si
		 *   viene del diseño ágil, solo su plantilla).
		 * - Guardado como del sistema y sin tocar (solo cambio el nombre o el "En uso"): sin la clave.
		 * - Diseño fijo sin tocar: sin la clave.
		 * - Lienzo tocado: el diseño completo, explicito.
		 * Mandarlo siempre "congelaba" el predeterminado al renombrarlo: los anchos quedaban fijados
		 * con la preferencia de "pedir la cantidad" de quien lo edito, y a un empleado con la
		 * preferencia contraria la fila de buscadores le quedaba con un hueco o partida. La API acepta
		 * un PUT parcial y no toca las claves que no vienen.
		 *
		 * @returns {void}
		 */
		guardar() {
			let self = this

			if (this.guardando) {
				return
			}

			let nombre = String(this.nombre || '').trim()

			if (!nombre) {
				this.nombre_invalido = true
				avisar(this, 'error', 'Poné un nombre para el diseño.')
				if (this.$refs.cabecera) {
					this.$refs.cabecera.enfocar_nombre()
				}
				return
			}

			if (falta_buscador(this.etapas, this)) {
				avisar(this, 'error', TEXTO_FALTA_BUSCADOR)
				return
			}

			if (this.modelo_id && !this.hay_cambios) {
				this.cerrar(true)
				return
			}

			let datos = {
				name: nombre,
				en_uso: !!this.en_uso,
			}

			if (this.sigue_al_sistema) {
				/* Nuevo o restablecido, sin tocar el lienzo: nace (o vuelve a ser) el diseño del sistema */
				if (!this.modelo_id || this.restablecido) {
					datos.layout = this.layout_de_origen
				}
				/* Guardado como del sistema y sin tocar: la clave no viaja y el backend no toca el layout */
			} else if (!this.modelo_id || this.diseno_tocado) {
				/* Lienzo tocado: el diseño completo, explicito */
				datos.layout = serializar_diseno(armar_diseno_completo(this.estado_de_trabajo))
			}
			/* Diseño fijo sin tocar (solo cambio el nombre o el "En uso"): la clave no viaja */

			this.guardando = true
			this.$store.commit('auth/setMessage', 'Guardando el diseño de Vender')
			this.$store.commit('auth/setLoading', true)

			let pedido = this.modelo_id
				? actualizar_diseno(this, this.modelo_id, datos)
				: crear_diseno(this, datos)

			pedido
			.then(function () {
				return self.$store.dispatch('vender_layout/getModels')
			})
			.then(function () {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				avisar(self, 'success', datos.en_uso ? 'Diseño guardado. Todo el negocio vende con «' + nombre + '».' : 'Diseño guardado.')
				self.cerrar(true)
			})
			.catch(function (error) {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(error)
				/*
					La lista se vuelve a pedir igual: un 404 (lo borraron desde otro dispositivo) o un 422
					dicen que lo que se ve en la solapa quedo viejo, y la insignia "En uso" no puede
					quedar mintiendo. No se espera la respuesta.
				*/
				self.$store.dispatch('vender_layout/getModels')
				avisar(self, 'error', mensaje_de_error(error, 'No se pudo guardar el diseño. Revisá tu conexión y volvé a intentar.'))
			})
		},
		/**
		 * Boton Cancelar: cierra (preguntando si hay cambios sin guardar).
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
		 * Antes de cerrarse (✕ del encabezado, Escape, Cancelar): si hay cambios sin guardar, frena el
		 * cierre y pregunta. Mientras se guarda no se cierra.
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
		 * Ya cerrado: se limpia el estado para que el proximo abrir arranque de cero.
		 *
		 * @returns {void}
		 */
		al_ocultarse() {
			clearTimeout(this.timer_del_destacado)
			this.abierto = false
			this.modelo_id = null
			this.nombre = ''
			this.en_uso = false
			this.en_uso_original = false
			this.etapas = {}
			this.sacados = []
			this.ocultos = {}
			this.orden_original = {}
			this.sacados_ocultos = []
			this.secciones = {}
			this.disposicion = []
			this.plantilla = null
			this.huella_inicial = ''
			this.base_es_del_sistema = false
			this.restablecido = false
			this.huella_del_diseno_base = ''
			this.guardando = false
			this.cerrar_sin_preguntar = false
			this.arrastrando = null
			this.destacado = null
			this.nombre_invalido = false
		},
	},
}
</script>
<style lang="sass">
// Los estilos del modal van sin `scoped`: b-modal se monta colgando de <body>, fuera de este
// componente, y el clon de Sortable que sigue al puntero tambien. Todo cuelga de clases propias
// (editor-diseno*) o del id del modal. Colores solo por token.

// Ancho: hasta 1440px o el 96% de la pantalla. La regla global de _modals.sass fija .modal-xl en 90%
// con !important; con una clase mas (dialog-class) y el mismo !important, esta le gana por
// especificidad y solo en este modal.
.modal-dialog.modal-xl.editor-diseno__dialogo
	max-width: min(1440px, 96vw) !important

	// El cuerpo es la "mesa" gris y las etapas son tarjetas encima
	.editor-diseno__cuerpo
		padding: 18px 20px 8px
		background: var(--bg-section)

// Telefono: pantalla completa (el lienzo necesita todo el ancho que haya)
@media (max-width: 767.98px)
	.modal-dialog.modal-xl.editor-diseno__dialogo
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

		.editor-diseno__cuerpo
			padding: 14px 12px 6px

// Inputs del modal con el trato "nuevo" del sistema (radio de 8px y anillo de foco suave), en vez
// del default global de _inputs.sass. Patron de contexto/estilo_interfaz_empresa.md: scopeado por el
// id del modal, sin !important.
#editor-diseno-vender
	.form-control,
	.custom-select,
	textarea.form-control
		border-radius: var(--metodo-pago-input-radius)
		border-width: 1px

		&:focus
			border-width: 1px
			border-color: var(--color-primary)
			box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.editor-diseno
	width: 100%
	min-width: 0

	// Tres pistas en un renglon (dos o tres en pantallas chicas), calmas: icono + frase corta
	.editor-diseno__ayuda
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

	.editor-diseno__nota
		margin: 0 0 14px
		color: var(--color-text-secondary)
		font-size: 0.75rem

	.editor-diseno__aviso
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
			color: var(--color-text-warning-strong, var(--warning))
			font-size: 1rem

	// Lienzo + bandeja. La bandeja va a la derecha desde 992px (lg); mas angosto, debajo.
	.editor-diseno__area
		display: grid
		grid-template-columns: minmax(0, 1fr) 270px
		gap: 20px
		align-items: start

	// El lienzo con varias columnas tiene un ancho minimo (ver DisposicionDelEditor.vue): si el marco
	// es mas angosto, se desliza de costado ADENTRO de el. El padding y el margen negativo dejan que
	// las manijas de los costados asomen sobre el gutter sin que el marco las recorte.
	.editor-diseno__marco
		min-width: 0
		overflow-x: auto
		margin: 0 -12px
		padding: 0 12px

	// En escritorio la bandeja acompaña el scroll del modal: siempre a mano para soltar un campo
	.editor-diseno__bandeja
		position: sticky
		top: 0
		max-height: calc(100vh - 12rem)
		overflow-y: auto

	.editor-diseno-fijo--botones
		margin-top: 0

@media (max-width: 991.98px)
	.editor-diseno
		.editor-diseno__area
			grid-template-columns: minmax(0, 1fr)

		.editor-diseno__bandeja
			position: static
			max-height: none
			overflow: visible
			margin-bottom: 12px

// Telefono: el lienzo mantiene la proporcion de las 12 columnas (es un editor del diseño de tablet y
// escritorio) con un ancho minimo legible, y scrollea de costado ADENTRO de su marco. La pagina no
// scrollea de costado.
@media (max-width: 767.98px)
	.editor-diseno
		.editor-diseno__lienzo
			min-width: 560px

// Pie: "Cambios sin guardar" a la izquierda, botones a la derecha
.editor-diseno__pie
	display: flex
	align-items: center
	justify-content: space-between
	flex-wrap: wrap
	gap: 8px 12px
	width: 100%

.editor-diseno__sin-guardar
	display: inline-flex
	align-items: center
	gap: 8px
	color: var(--color-text-secondary)
	font-size: 0.82rem

.editor-diseno__punto
	width: 8px
	height: 8px
	border-radius: 50%
	background: var(--color-text-warning-strong, var(--warning))

.editor-diseno__botones
	display: flex
	gap: 8px
	margin-left: auto

	.btn
		border-radius: 8px
</style>
