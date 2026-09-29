<template>
	<!--
		Editor de un Diseño de etiqueta de gondola (mision disenos-etiquetas-gondola, 29/9/2026).

		Modal propio, no el generico del ABM: armar una etiqueta es arrastrar campos. Misma forma que el
		editor de los Diseños de Vender: `scrollable` para que el pie (Cancelar / Guardar) quede siempre
		a la vista, `no-close-on-backdrop` para que un clic afuera no tire un rato de trabajo, y si se
		cierra con cambios sin guardar, pregunta.

		Tres zonas: la bandeja "Campos del artículo" (izquierda), el tamaño de la etiqueta y el lienzo
		(centro), y el panel del campo elegido (derecha). En tablet el panel y la bandeja bajan debajo
		del lienzo, uno al lado del otro; en el telefono, todo en una columna y el modal a pantalla
		completa.

		Se abre desde la solapa con this.$refs.editor.abrir(modelo) (null = diseño nuevo).
	-->
	<b-modal
	:id="id_del_modal"
	ref="modal"
	size="xl"
	scrollable
	no-close-on-backdrop
	:title="titulo"
	dialog-class="editor-etiqueta__dialogo"
	body-class="editor-etiqueta__cuerpo"
	@show="abierto = true"
	@shown="al_mostrarse"
	@hide="al_ocultar"
	@hidden="al_ocultarse">

		<div
		v-if="diseno"
		class="editor-etiqueta">

			<cabecera-del-editor
			ref="cabecera"
			:nombre.sync="nombre"
			:nombre_invalido="nombre_invalido"
			:puede_deshacer="historial.length > 0"
			@update:nombre="nombre_invalido = false"
			@deshacer="deshacer"
			@restablecer="restablecer"></cabecera-del-editor>

			<!-- La ayuda que hace que se entienda en dos segundos -->
			<ul class="editor-etiqueta__ayuda">
				<li>
					<i class="bi bi-arrows-move"></i>
					Arrastrá un campo para moverlo: se alinea solo con los bordes y con los otros campos.
				</li>
				<li>
					<i class="bi bi-bounding-box"></i>
					Tirá de un borde o una esquina para agrandarlo o achicarlo.
				</li>
				<li class="editor-etiqueta__ayuda-teclado">
					<i class="bi bi-keyboard"></i>
					Con un campo elegido: flechas para moverlo de a 1 mm, Supr para quitarlo.
				</li>
			</ul>

			<div class="editor-etiqueta__area">

				<bandeja-de-campos
				class="editor-etiqueta__bandeja"
				:listas="listas"
				:usa_listas="usa_listas"
				:lleno="lleno"
				@agarrar="agarrar_de_la_bandeja"
				@agregar="agregar({ plantilla: $event, posicion: null })"></bandeja-de-campos>

				<div class="editor-etiqueta__centro">
					<tamano-de-la-etiqueta
					:diseno="diseno"
					@columnas="cambiar_columnas"
					@filas="cambiar_filas"
					@alto="cambiar_alto"
					@marco="diseno.marco = $event"></tamano-de-la-etiqueta>

					<lienzo-de-etiqueta
					ref="lienzo"
					:diseno="diseno"
					:seleccionado_id="seleccionado_id"
					:muestra="muestra"
					:listas="listas"
					@seleccionar="seleccionado_id = $event"
					@agregar="agregar"
					@quitar="quitar"
					@inicio-arrastre="al_empezar_arrastre"
					@fin-arrastre="al_terminar_arrastre"></lienzo-de-etiqueta>
				</div>

				<panel-del-campo
				class="editor-etiqueta__panel"
				:elemento="elemento_seleccionado"
				:listas="listas"
				:ancho_mm="ancho_mm"
				:alto_mm="diseno.alto_mm"
				@quitar="quitar"></panel-del-campo>
			</div>
		</div>

		<template #modal-footer>
			<div class="editor-etiqueta__pie">
				<span
				v-if="hay_cambios"
				class="editor-etiqueta__sin-guardar">
					<span class="editor-etiqueta__punto"></span>
					Cambios sin guardar
				</span>
				<div class="editor-etiqueta__botones">
					<!-- La prueba sale con lo GUARDADO: solo en un diseño que ya existe -->
					<b-button
					v-if="modelo_id"
					variant="outline-secondary"
					class="editor-etiqueta__prueba"
					:disabled="guardando"
					:title="ids_de_prueba.length ? 'Abre el PDF con este diseño y algunos de tus artículos' : SIN_ARTICULOS_PARA_PROBAR"
					@click="imprimir_prueba">
						<i class="bi bi-printer"></i>
						Imprimir una prueba
					</b-button>
					<b-button
					variant="outline-secondary"
					:disabled="guardando"
					@click="cerrar(false)">
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
import BandejaDeCampos from './BandejaDeCampos'
import TamanoDeLaEtiqueta from './TamanoDeLaEtiqueta'
import LienzoDeEtiqueta from './LienzoDeEtiqueta'
import PanelDelCampo from './PanelDelCampo'
import {
	TOPE_DE_CAMPOS,
	FILAS_MINIMO,
	FILAS_MAXIMO,
	ancho_de_etiqueta,
	alto_sugerido,
	filas_por_hoja,
	escalar_elementos,
	encerrar_en_la_etiqueta,
} from '../geometria'
import { buscar_lista } from '../catalogo'
import { diseno_actual } from '../diseno_actual'
import {
	normalizar_diseno,
	serializar_diseno,
	huella_del_diseno,
	nuevo_elemento,
	lugar_libre,
} from '../diseno'
import { crear_diseno, actualizar_diseno, mensaje_de_error, abrir_prueba, SIN_ARTICULOS_PARA_PROBAR } from '../api_de_disenos'
import { ids_para_la_prueba } from '../muestra'
import { avisar } from '@/components/abm/disenos-de-vender/avisos'

/* Nombre que se sugiere al crear un diseño */
const NOMBRE_SUGERIDO = 'Nuevo diseño'

/* Cuantos pasos guarda "Deshacer" */
const TOPE_DEL_HISTORIAL = 60

/* Cuanto se espera (ms) a que se calmen los cambios para anotar un paso de "Deshacer" (agrupa las flechas y lo que se tipea) */
const ESPERA_PARA_ANOTAR = 350

/**
 * Modal editor de un Diseño de etiqueta.
 *
 * El diseño que se edita es una copia normalizada (diseno.js) del que esta en el store. El lienzo y
 * el panel le cambian x/y/w/h y la letra a los elementos de forma directa; lo estructural (agregar,
 * quitar, tamaño de la etiqueta, restablecer, deshacer) pasa por aca.
 */
export default {
	name: 'EditorDeDisenoDeEtiqueta',
	components: {
		CabeceraDelEditor,
		BandejaDeCampos,
		TamanoDeLaEtiqueta,
		LienzoDeEtiqueta,
		PanelDelCampo,
	},
	props: {
		/* Datos del articulo de muestra (muestra.js), los arma la solapa */
		muestra: {
			type: Object,
			required: true,
		},
		/* Listas de precios del negocio */
		listas: {
			type: Array,
			default: function () {
				return []
			},
		},
	},
	data() {
		return {
			SIN_ARTICULOS_PARA_PROBAR: SIN_ARTICULOS_PARA_PROBAR,
			/* id del b-modal (tambien scopea los estilos, ver el <style>) */
			id_del_modal: 'editor-etiqueta-gondola',
			/* true entre el show y el hidden del modal */
			abierto: false,
			/* id del diseño que se edita, o null si es uno nuevo */
			modelo_id: null,
			/* price_type_id del modelo (la lista para la que el sistema lo genero), para "Restablecer" */
			modelo_price_type_id: null,
			nombre: '',
			/* El nombre al abrir (para saber si cambio) */
			nombre_inicial: '',
			/* El diseño que se edita (normalizado), o null con el modal cerrado */
			diseno: null,
			/* Huella del diseño al abrir: si la de ahora es distinta, el diseño cambio */
			huella_inicial: '',
			/* id del campo elegido en el lienzo, o null */
			seleccionado_id: null,
			/* true mientras se arrastra en el lienzo (no se anotan pasos de "Deshacer" a mitad) */
			arrastrando: false,
			/* Pasos anteriores para "Deshacer" (huellas del diseño) */
			historial: [],
			/* Huella del ultimo paso anotado */
			foto_actual: '',
			/* Timer para anotar un paso cuando se calman los cambios */
			timer_de_foto: null,
			guardando: false,
			/* true para cerrar sin la pregunta de cambios sin guardar */
			cerrar_sin_preguntar: false,
			/* true despues de intentar guardar sin nombre */
			nombre_invalido: false,
		}
	},
	computed: {
		/**
		 * Titulo del modal.
		 *
		 * @returns {string}
		 */
		titulo() {
			return this.modelo_id ? 'Editar diseño de etiqueta' : 'Nuevo diseño de etiqueta'
		},
		/**
		 * Si el negocio trabaja con listas de precios.
		 *
		 * @returns {boolean}
		 */
		usa_listas() {
			return this.ownerUsesListasDePrecio()
		},
		/**
		 * Ancho de la etiqueta, mm.
		 *
		 * @returns {number}
		 */
		ancho_mm() {
			return this.diseno ? ancho_de_etiqueta(this.diseno.columnas) : 0
		},
		/**
		 * El campo elegido, o null.
		 *
		 * @returns {Object|null}
		 */
		elemento_seleccionado() {
			if (!this.diseno || !this.seleccionado_id) {
				return null
			}
			let id = this.seleccionado_id
			return this.diseno.elementos.find(function (elemento) {
				return elemento.id === id
			}) || null
		},
		/**
		 * Si la etiqueta ya tiene el tope de campos.
		 *
		 * @returns {boolean}
		 */
		lleno() {
			return !!this.diseno && this.diseno.elementos.length >= TOPE_DE_CAMPOS
		},
		/**
		 * Los articulos con que sale "Imprimir una prueba".
		 *
		 * @returns {Array}
		 */
		ids_de_prueba() {
			return ids_para_la_prueba(this)
		},
		/**
		 * Si hay cambios sin guardar (nombre o diseño).
		 *
		 * @returns {boolean}
		 */
		hay_cambios() {
			if (!this.abierto || !this.diseno) {
				return false
			}
			return String(this.nombre || '').trim() !== this.nombre_inicial
				|| huella_del_diseno(this.diseno) !== this.huella_inicial
		},
	},
	watch: {
		/*
			Cada cambio del diseño (menos a mitad de un arrastre) anota un paso de "Deshacer" cuando se
			calma: asi diez flechas seguidas o un texto tipeado son un solo paso.
		*/
		diseno: {
			deep: true,
			handler() {
				if (!this.abierto || !this.diseno || this.arrastrando) {
					return
				}
				this.programar_foto()
			},
		},
	},
	beforeDestroy() {
		clearTimeout(this.timer_de_foto)
		window.removeEventListener('keydown', this.al_tocar_tecla)
	},
	methods: {
		/**
		 * Abre el editor.
		 *
		 * @param {Object|null} modelo el article_ticket_design a editar, o null para crear uno nuevo
		 *                             (arranca con el diseño de siempre)
		 * @returns {void}
		 */
		abrir(modelo) {
			this.modelo_id = modelo ? modelo.id : null
			this.modelo_price_type_id = modelo && modelo.price_type_id ? Number(modelo.price_type_id) : null
			this.diseno = modelo
				? normalizar_diseno(modelo.diseno, this.lista_existente(this.modelo_price_type_id))
				: diseno_actual(this.lista_para_el_diseno_de_siempre())
			this.nombre = modelo ? String(modelo.name || '') : NOMBRE_SUGERIDO
			this.nombre_inicial = this.nombre.trim()
			this.huella_inicial = huella_del_diseno(this.diseno)
			this.foto_actual = this.huella_inicial
			this.historial = []
			this.seleccionado_id = null
			this.arrastrando = false
			this.guardando = false
			this.cerrar_sin_preguntar = false
			this.nombre_invalido = false

			this.$refs.modal.show()
		},
		/**
		 * Ya visible: en un diseño nuevo, el nombre queda enfocado y seleccionado para reemplazarlo.
		 *
		 * @returns {void}
		 */
		al_mostrarse() {
			/*
				Los atajos (Ctrl + Z) se escuchan en la ventana mientras el modal esta abierto, y no en el
				contenedor del editor: despues de quitar un campo con Supr, de soltarlo con Esc o de tocar
				la mesa, el foco queda en <body> y un keydown en el contenedor ya no llegaba.
			*/
			window.removeEventListener('keydown', this.al_tocar_tecla)
			window.addEventListener('keydown', this.al_tocar_tecla)

			if (!this.modelo_id && this.$refs.cabecera) {
				this.$refs.cabecera.enfocar_nombre()
			}
		},
		/**
		 * El id de una lista si existe en el negocio, o null.
		 *
		 * @param {number|null} id
		 * @returns {number|null}
		 */
		lista_existente(id) {
			return buscar_lista(this.listas, id) ? Number(id) : null
		},
		/**
		 * La lista del precio grande para el diseño de siempre: la del precio que ya tiene el diseño,
		 * o la del modelo, o la primera del negocio. Null si no trabaja con listas (precio final).
		 *
		 * @returns {number|null}
		 */
		lista_para_el_diseno_de_siempre() {
			if (!this.usa_listas || !this.listas.length) {
				return null
			}
			let self = this
			let del_diseno = this.diseno ? this.diseno.elementos.find(function (elemento) {
				return elemento.tipo === 'precio_lista' && self.lista_existente(elemento.price_type_id)
			}) : null

			if (del_diseno) {
				return Number(del_diseno.price_type_id)
			}
			return this.lista_existente(this.modelo_price_type_id) || Number(this.listas[0].id)
		},
		/**
		 * Programa anotar un paso de "Deshacer".
		 *
		 * @returns {void}
		 */
		programar_foto() {
			let self = this
			clearTimeout(this.timer_de_foto)
			this.timer_de_foto = setTimeout(function () {
				self.tomar_foto()
			}, ESPERA_PARA_ANOTAR)
		},
		/**
		 * Anota un paso de "Deshacer" si el diseño cambio desde el ultimo.
		 *
		 * @returns {void}
		 */
		tomar_foto() {
			clearTimeout(this.timer_de_foto)
			this.timer_de_foto = null

			if (!this.diseno) {
				return
			}

			let foto = huella_del_diseno(this.diseno)

			if (foto !== this.foto_actual) {
				this.historial.push(this.foto_actual)
				if (this.historial.length > TOPE_DEL_HISTORIAL) {
					this.historial.shift()
				}
				this.foto_actual = foto
			}
		},
		/**
		 * Vuelve un paso atras.
		 *
		 * @returns {void}
		 */
		deshacer() {
			/* Si habia un cambio esperando a anotarse, se anota primero (asi se deshace ese) */
			if (this.timer_de_foto) {
				this.tomar_foto()
			}

			if (!this.historial.length) {
				return
			}

			let anterior = this.historial.pop()
			this.foto_actual = anterior
			this.diseno = normalizar_diseno(JSON.parse(anterior), null)
		},
		/**
		 * Empieza un arrastre en el lienzo: si habia un cambio esperando a anotarse (flechas, letra),
		 * se anota ahora como su propio paso, y el timer no puede dispararse a mitad del arrastre.
		 *
		 * @returns {void}
		 */
		al_empezar_arrastre() {
			this.tomar_foto()
			this.arrastrando = true
		},
		/**
		 * Termino un arrastre en el lienzo: se anota el paso enseguida.
		 *
		 * @returns {void}
		 */
		al_terminar_arrastre() {
			this.arrastrando = false
			this.tomar_foto()
		},
		/**
		 * Atajos del editor: Ctrl + Z deshace (menos adentro de un campo de texto, donde deshace lo
		 * tipeado, como siempre).
		 *
		 * @param {KeyboardEvent} evento
		 * @returns {void}
		 */
		al_tocar_tecla(evento) {
			if (!this.abierto || !this.diseno) {
				return
			}

			let objetivo = evento.target
			let etiqueta = objetivo && objetivo.tagName ? objetivo.tagName.toLowerCase() : ''
			let en_un_texto = etiqueta === 'input' || etiqueta === 'textarea' || etiqueta === 'select' || !!(objetivo && objetivo.isContentEditable)

			/* Una pregunta abierta encima del editor (otro modal) no deshace nada */
			if (objetivo && objetivo.closest && objetivo.closest('.modal') && !objetivo.closest('#' + this.id_del_modal)) {
				return
			}

			if ((evento.ctrlKey || evento.metaKey) && !evento.shiftKey && String(evento.key).toLowerCase() === 'z' && !en_un_texto) {
				evento.preventDefault()
				this.deshacer()
			}
		},
		/**
		 * Empieza a traer un campo de la bandeja: el arrastre lo maneja el lienzo.
		 *
		 * @param {PointerEvent} evento
		 * @param {Object} plantilla
		 * @returns {void}
		 */
		agarrar_de_la_bandeja(evento, plantilla) {
			if (this.lleno || !this.$refs.lienzo) {
				return
			}
			this.$refs.lienzo.empezar_nuevo(evento, plantilla)
		},
		/**
		 * Agrega un campo: donde se solto, o en el primer lugar libre. Queda elegido.
		 *
		 * @param {{plantilla: Object, posicion: Object|null}} pedido
		 * @returns {void}
		 */
		agregar(pedido) {
			if (this.lleno) {
				avisar(this, 'warning', 'La etiqueta ya tiene ' + TOPE_DE_CAMPOS + ' campos. Quitá alguno para agregar otro.')
				return
			}

			let plantilla = pedido.plantilla
			let elemento = nuevo_elemento(plantilla.tipo, { price_type_id: plantilla.price_type_id }, this.diseno.elementos, this.ancho_mm, this.diseno.alto_mm)

			if (!elemento) {
				return
			}

			if (pedido.posicion) {
				elemento.x = pedido.posicion.x
				elemento.y = pedido.posicion.y
				encerrar_en_la_etiqueta(elemento, this.ancho_mm, this.diseno.alto_mm)
			} else {
				let lugar = lugar_libre(this.diseno.elementos, elemento.w, elemento.h, this.ancho_mm, this.diseno.alto_mm)
				if (lugar) {
					elemento.x = lugar.x
					elemento.y = lugar.y
					encerrar_en_la_etiqueta(elemento, this.ancho_mm, this.diseno.alto_mm)
				} else {
					avisar(this, 'info', 'No quedaba lugar libre: lo puse arriba a la izquierda. Arrastralo donde quieras o achicá otro campo.')
				}
			}

			this.diseno.elementos.push(elemento)
			this.seleccionado_id = elemento.id
			this.$refs.lienzo.enfocar(elemento.id)
		},
		/**
		 * Quita un campo de la etiqueta.
		 *
		 * @param {string} id
		 * @returns {void}
		 */
		quitar(id) {
			let indice = this.diseno.elementos.findIndex(function (elemento) {
				return elemento.id === id
			})
			if (indice === -1) {
				return
			}
			this.diseno.elementos.splice(indice, 1)
			if (this.seleccionado_id === id) {
				this.seleccionado_id = null
			}
		},
		/**
		 * Cambia cuantas etiquetas van por fila, escalando los campos a lo ancho.
		 *
		 * @param {number} columnas
		 * @returns {void}
		 */
		cambiar_columnas(columnas) {
			if (columnas === this.diseno.columnas) {
				return
			}
			let ancho_viejo = this.ancho_mm
			let ancho_nuevo = ancho_de_etiqueta(columnas)
			escalar_elementos(this.diseno.elementos, ancho_viejo, this.diseno.alto_mm, ancho_nuevo, this.diseno.alto_mm)
			this.diseno.columnas = columnas
		},
		/**
		 * Cambia cuantas filas van por hoja: el alto se calcula solo.
		 *
		 * @param {number} filas
		 * @returns {void}
		 */
		cambiar_filas(filas) {
			let acotadas = Math.min(FILAS_MAXIMO, Math.max(FILAS_MINIMO, Math.round(filas)))
			this.poner_alto(alto_sugerido(acotadas))
			this.diseno.filas = acotadas
		},
		/**
		 * Cambia el alto a mano: las filas que entran se recalculan.
		 *
		 * @param {number} alto_mm
		 * @returns {void}
		 */
		cambiar_alto(alto_mm) {
			this.poner_alto(alto_mm)
			/*
				`filas` es informativo y el contrato lo acota a 1..20; el PDF usa las que entran de verdad
				(con 10 mm de alto son 28, y eso es lo que dice "Entran ...")
			*/
			this.diseno.filas = Math.min(FILAS_MAXIMO, filas_por_hoja(alto_mm))
		},
		/**
		 * Pone un alto nuevo escalando los campos a lo alto.
		 *
		 * @param {number} alto_mm
		 * @returns {void}
		 */
		poner_alto(alto_mm) {
			if (alto_mm === this.diseno.alto_mm) {
				return
			}
			escalar_elementos(this.diseno.elementos, this.ancho_mm, this.diseno.alto_mm, this.ancho_mm, alto_mm)
			this.diseno.alto_mm = alto_mm
		},
		/**
		 * "Restablecer el diseño de siempre": pregunta y vuelve a la etiqueta de siempre (con la lista
		 * de precios que corresponda). El nombre no cambia y nada se guarda hasta tocar Guardar.
		 *
		 * @returns {void}
		 */
		restablecer() {
			let self = this

			this.$bvModal.msgBoxConfirm('La etiqueta vuelve a ser la de siempre: 3 por fila, precio grande arriba, nombre, código de barras y fecha. El nombre no cambia y nada se guarda hasta que toques Guardar (y podés deshacerlo).', {
				title: '¿Restablecer el diseño de siempre?',
				okTitle: 'Restablecer',
				okVariant: 'primary',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(function (confirmado) {
				if (confirmado) {
					self.tomar_foto()
					self.diseno = diseno_actual(self.lista_para_el_diseno_de_siempre())
					self.seleccionado_id = null
				}
			})
			.catch(function () {})
		},
		/**
		 * Valida y guarda: POST si es nuevo, PUT (solo lo que cambio) si se esta editando. Despues
		 * vuelve a pedir la lista (la solapa y el menu de Listado quedan al dia) y cierra.
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

			if (!this.diseno.elementos.length) {
				avisar(this, 'error', 'La etiqueta está vacía: agregale al menos un dato del artículo.')
				return
			}

			/* Un precio de una lista borrada no imprimiria nada, y la API lo descartaria sin avisar */
			let precio_sin_lista = this.diseno.elementos.find(function (elemento) {
				return elemento.tipo === 'precio_lista' && !buscar_lista(self.listas, elemento.price_type_id)
			})
			if (precio_sin_lista) {
				this.seleccionado_id = precio_sin_lista.id
				avisar(this, 'error', 'Hay un precio de una lista que ya no existe. Elegí otra lista en el panel o quitalo.')
				return
			}

			if (this.modelo_id && !this.hay_cambios) {
				this.cerrar(true)
				return
			}

			let datos = {}

			if (!this.modelo_id || nombre !== this.nombre_inicial) {
				datos.name = nombre
			}
			if (!this.modelo_id || huella_del_diseno(this.diseno) !== this.huella_inicial) {
				datos.diseno = serializar_diseno(this.diseno)
			}

			this.guardando = true
			this.$store.commit('auth/setMessage', 'Guardando el diseño de etiqueta')
			this.$store.commit('auth/setLoading', true)

			let pedido = this.modelo_id
				? actualizar_diseno(this, this.modelo_id, datos)
				: crear_diseno(this, datos)

			pedido
			.then(function () {
				return self.$store.dispatch('article_ticket_design/getModels')
			})
			.then(function () {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				avisar(self, 'success', 'Diseño «' + nombre + '» guardado. Ya lo tenés para imprimir en Listado.')
				self.cerrar(true)
			})
			.catch(function (error) {
				self.guardando = false
				self.$store.commit('auth/setLoading', false)
				self.$store.commit('auth/setMessage', '')
				console.log(error)
				/* Si lo borraron desde otro lado (404), la solapa tiene que dejar de mostrarlo */
				self.$store.dispatch('article_ticket_design/getModels')
				avisar(self, 'error', mensaje_de_error(error, 'No se pudo guardar el diseño. Revisá tu conexión y volvé a intentar.'))
			})
		},
		/**
		 * "Imprimir una prueba": abre el PDF con el diseño guardado y hasta 6 articulos del store. Con
		 * cambios sin guardar, primero pide guardar (la prueba sale con lo guardado).
		 *
		 * @returns {void}
		 */
		imprimir_prueba() {
			if (this.hay_cambios) {
				avisar(this, 'warning', 'Guardá los cambios antes de imprimir la prueba: la prueba sale con el diseño guardado.')
				return
			}
			if (!abrir_prueba(this.modelo_id, this.ids_de_prueba)) {
				avisar(this, 'info', SIN_ARTICULOS_PARA_PROBAR)
			}
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
		 * Antes de cerrarse (✕, Escape, Cancelar): si hay cambios sin guardar, frena y pregunta.
		 * Mientras se guarda no se cierra.
		 *
		 * @param {Object} evento BvModalEvent
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

			this.$bvModal.msgBoxConfirm('Si salís ahora, se pierden los cambios que hiciste en esta etiqueta.', {
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
		 * Ya cerrado: se limpia todo para que el proximo abrir arranque de cero.
		 *
		 * @returns {void}
		 */
		al_ocultarse() {
			window.removeEventListener('keydown', this.al_tocar_tecla)
			clearTimeout(this.timer_de_foto)
			this.timer_de_foto = null
			this.abierto = false
			this.modelo_id = null
			this.modelo_price_type_id = null
			this.nombre = ''
			this.nombre_inicial = ''
			this.diseno = null
			this.huella_inicial = ''
			this.seleccionado_id = null
			this.arrastrando = false
			this.historial = []
			this.foto_actual = ''
			this.guardando = false
			this.cerrar_sin_preguntar = false
			this.nombre_invalido = false
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: b-modal se monta colgando de <body>. Todo cuelga de clases propias (editor-etiqueta*)
// o del id del modal. Colores solo por token.

// Ancho: hasta 1480px o el 96% de la pantalla. La regla global de _modals.sass fija .modal-xl en 90%
// con !important; con una clase mas (dialog-class) y el mismo !important, esta le gana por
// especificidad y solo en este modal (mismo recurso que el editor de Diseños de Vender).
.modal-dialog.modal-xl.editor-etiqueta__dialogo
	max-width: min(1480px, 96vw) !important

	.editor-etiqueta__cuerpo
		padding: 18px 20px 8px
		background: var(--bg-section)

// Telefono: pantalla completa
@media (max-width: 767.98px)
	.modal-dialog.modal-xl.editor-etiqueta__dialogo
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

		.editor-etiqueta__cuerpo
			padding: 14px 12px 6px

.editor-etiqueta
	width: 100%
	min-width: 0
	text-align: left

	.editor-etiqueta__ayuda
		display: flex
		flex-wrap: wrap
		gap: 6px 22px
		margin: 0 0 14px
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

	// Tres zonas: bandeja | tamaño + lienzo | panel
	.editor-etiqueta__area
		display: grid
		grid-template-columns: 230px minmax(0, 1fr) 270px
		grid-template-areas: "bandeja centro panel"
		gap: 16px
		align-items: start

	.editor-etiqueta__bandeja
		grid-area: bandeja
		// En escritorio la bandeja acompaña el scroll del modal: siempre a mano para arrastrar
		position: sticky
		top: 0
		max-height: calc(100vh - 13rem)
		overflow-y: auto

	.editor-etiqueta__centro
		grid-area: centro
		display: flex
		flex-direction: column
		gap: 12px
		min-width: 0

	.editor-etiqueta__panel
		grid-area: panel
		position: sticky
		top: 0

// Tablet: el lienzo arriba a todo el ancho; el panel y la bandeja debajo, uno al lado del otro
@media (max-width: 991.98px)
	.editor-etiqueta
		.editor-etiqueta__area
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr)
			grid-template-areas: "centro centro" "panel bandeja"

		.editor-etiqueta__bandeja,
		.editor-etiqueta__panel
			position: static
			max-height: none
			overflow: visible

// Telefono: una sola columna (lienzo, panel del campo, bandeja). Sin teclado fisico, la pista de
// las flechas no va.
@media (max-width: 767.98px)
	.editor-etiqueta
		.editor-etiqueta__area
			grid-template-columns: minmax(0, 1fr)
			grid-template-areas: "centro" "panel" "bandeja"

		.editor-etiqueta__ayuda-teclado
			display: none !important

// Pie: "Cambios sin guardar" a la izquierda, botones a la derecha
.editor-etiqueta__pie
	display: flex
	align-items: center
	justify-content: space-between
	flex-wrap: wrap
	gap: 8px 12px
	width: 100%

.editor-etiqueta__sin-guardar
	display: inline-flex
	align-items: center
	gap: 8px
	color: var(--color-text-secondary)
	font-size: 0.82rem

.editor-etiqueta__punto
	width: 8px
	height: 8px
	border-radius: 50%
	background: var(--color-text-warning-strong, var(--warning))

.editor-etiqueta__botones
	display: flex
	flex-wrap: wrap
	justify-content: flex-end
	gap: 8px
	margin-left: auto

	.btn
		display: inline-flex
		align-items: center
		gap: 6px
		border-radius: 8px
</style>
