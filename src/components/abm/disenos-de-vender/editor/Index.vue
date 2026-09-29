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
			@update:nombre="nombre_invalido = false"
			@restablecer="restablecer"></cabecera-del-editor>

			<!-- La ayuda que hace que se entienda en dos segundos: se arrastra, el borde cambia el ancho -->
			<ul class="editor-diseno__ayuda">
				<li>
					<i class="bi bi-arrows-move"></i>
					Arrastrá un campo para moverlo, dentro de su etapa o a otra.
				</li>
				<li>
					<i class="bi bi-arrow-left-right"></i>
					Tirá de su borde izquierdo o derecho para cambiarle el ancho.
				</li>
				<li>
					<i class="bi bi-x-lg"></i>
					Sacalo con la cruz o soltándolo en la bandeja.
				</li>
			</ul>
			<p class="editor-diseno__nota">
				El ancho se usa desde tablets en adelante; en el teléfono cada campo va a lo ancho, como siempre.
			</p>

			<div
			v-if="sin_buscador"
			class="editor-diseno__aviso"
			role="status">
				<i class="bi bi-exclamation-triangle"></i>
				<span>{{ TEXTO_FALTA_BUSCADOR }} Sin ninguno no se pueden agregar artículos a la venta.</span>
			</div>

			<div class="editor-diseno__area">

				<!-- El lienzo: las tres etapas y los botones fijos de la venta -->
				<div class="editor-diseno__marco">
					<div class="editor-diseno__lienzo">
						<etapa-del-editor
						v-for="(etapa, indice) in ETAPAS"
						:key="etapa"
						:etapa="etapa"
						:numero="indice + 1"
						:lista="etapas[etapa]"
						:move="permitir_movimiento"
						:bloque_fijo="etapa === 'etapa_2' ? 'Tabla de artículos (fija)' : null"
						:destacado="destacado"
						@sacar="sacar_elemento(etapa, $event)"
						@inicio-arrastre="al_empezar_arrastre"
						@fin-arrastre="al_terminar_arrastre"></etapa-del-editor>

						<div class="editor-diseno-fijo editor-diseno-fijo--botones">
							<i class="bi bi-lock-fill"></i>
							<span>Botones de la venta: Limpiar, Imprimir, WhatsApp y Guardar (fijos)</span>
						</div>
					</div>
				</div>

				<bandeja-de-sacados
				class="editor-diseno__bandeja"
				:sacados="sacados"
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
import EtapaDelEditor from './EtapaDelEditor'
import BandejaDeSacados from './BandejaDeSacados'
import {
	ETAPAS,
	KEY_SEPARADOR,
	elemento,
	es_obligatorio,
} from '@/components/vender/layout/elementos'
import { serializar_diseno } from '@/components/vender/layout/resolver_diseno'
import {
	armar_estado_de_trabajo,
	armar_diseno_completo,
	huella_del_estado,
	indice_por_defecto,
	falta_buscador,
	identidad,
} from './estado_del_editor'
import { crear_diseno, actualizar_diseno, mensaje_de_error } from '../api_de_disenos'
import { avisar } from '../avisos'

/* Nombre que se sugiere al crear un diseño */
const NOMBRE_SUGERIDO = 'Nuevo diseño'

/* Lo que se dice cuando el diseño se queda sin buscadores (plan de la mision, §7) */
const TEXTO_FALTA_BUSCADOR = 'Dejá al menos un buscador de artículos (código de barras o buscador por nombre).'

/* Cuanto dura el resaltado de un campo recien movido con "Agregar" o con la ✕ (ms) */
const DURACION_DEL_DESTACADO = 1600

/**
 * Listas de trabajo vacias, una por etapa.
 *
 * @returns {Object}
 */
function etapas_vacias() {
	let etapas = {}
	ETAPAS.forEach(function (etapa) {
		etapas[etapa] = []
	})
	return etapas
}

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
		EtapaDelEditor,
		BandejaDeSacados,
	},
	data() {
		return {
			/* Constantes para el template */
			ETAPAS: ETAPAS,
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
			/* Estado de trabajo (ver estado_del_editor.js) */
			etapas: etapas_vacias(),
			sacados: [],
			ocultos: etapas_vacias(),
			orden_original: {},
			sacados_ocultos: [],
			/* Huella del estado al abrir: si la de ahora es distinta, hay cambios sin guardar */
			huella_inicial: '',
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
			}
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
			return huella_del_estado(this.nombre, this.en_uso, this.estado_de_trabajo) !== this.huella_inicial
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
			this.huella_inicial = huella_del_estado(this.nombre, this.en_uso, this.estado_de_trabajo)

			this.$refs.modal.show()
		},
		/**
		 * Carga un estado de trabajo en el componente (al abrir y al restablecer).
		 *
		 * @param {Object} estado salida de armar_estado_de_trabajo()
		 * @returns {void}
		 */
		aplicar_estado(estado) {
			this.etapas = estado.etapas
			this.sacados = estado.sacados
			this.ocultos = estado.ocultos
			this.orden_original = estado.orden_original
			this.sacados_ocultos = estado.sacados_ocultos
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
		 * - La fuente del separador no se suelta en la bandeja (no tiene sentido y se descartaria).
		 *
		 * @param {Object} evento evento de vuedraggable (to, from, draggedContext, relatedContext)
		 * @returns {boolean} false cancela el movimiento
		 */
		permitir_movimiento(evento) {
			let destino = evento && evento.to && evento.to.getAttribute ? evento.to.getAttribute('data-zona') : null
			let origen = evento && evento.from && evento.from.getAttribute ? evento.from.getAttribute('data-zona') : null

			if (destino !== 'bandeja') {
				return true
			}

			if (origen === 'fuente') {
				return false
			}

			let arrastrado = evento.draggedContext ? evento.draggedContext.element : null

			if (arrastrado && es_obligatorio(arrastrado.key)) {
				return false
			}

			return true
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
		 * La ✕ de un campo: lo saca de su etapa y lo manda al principio de la bandeja. Un separador
		 * no va a la bandeja: se quita y listo.
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

			if (item.key === KEY_SEPARADOR) {
				return
			}

			this.sacados.unshift(item)
			this.destacar(item)
		},
		/**
		 * "Agregar" de la bandeja: el campo vuelve a su etapa de siempre, al lado del campo que lo
		 * precede en el diseño predeterminado (indice_por_defecto), y se lo muestra resaltado.
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

			let lista = this.etapas[definicion.etapa]
			lista.splice(indice_por_defecto(lista, item.key, this), 0, item)

			this.destacar(item)
			this.llevar_a_la_vista(item)
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
				self.destacado = item.key === KEY_SEPARADOR ? identidad(item) : item.key
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
		 * Vuelve al diseño predeterminado del sistema (resolver_diseno(null)), sin tocar el nombre ni
		 * el "En uso". Si ya es el predeterminado no hace nada; si no, pregunta, porque se pierde lo
		 * armado hasta ahora (aunque todavia no este guardado).
		 *
		 * @returns {void}
		 */
		restablecer() {
			let self = this
			let predeterminado = armar_estado_de_trabajo(null, this)

			let actual = JSON.stringify(armar_diseno_completo(this.estado_de_trabajo))
			let original = JSON.stringify(armar_diseno_completo(predeterminado))

			if (actual === original) {
				avisar(this, 'info', 'Este diseño ya está igual al predeterminado.')
				return
			}

			this.$bvModal.msgBoxConfirm('Cada campo vuelve a su lugar y a su ancho de siempre, y los sacados vuelven a Vender. El nombre y el "En uso" no cambian, y nada se guarda hasta que toques Guardar.', {
				title: '¿Restablecer el diseño predeterminado?',
				okTitle: 'Restablecer',
				okVariant: 'primary',
				cancelTitle: 'Cancelar',
				centered: true,
			})
			.then(function (confirmado) {
				if (confirmado) {
					self.aplicar_estado(armar_estado_de_trabajo(null, self))
				}
			})
			.catch(function () {})
		},
		/**
		 * Valida y guarda: POST si es nuevo, PUT si se esta editando. Despues vuelve a pedir la lista
		 * (poner uno en uso apaga a los demas) y cierra.
		 *
		 * Un diseño existente sin cambios no se manda: se cierra y listo (si no, guardar el
		 * predeterminado sin tocarlo lo pasaria de "diseño del sistema" a un diseño fijo).
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
				layout: serializar_diseno(armar_diseno_completo(this.estado_de_trabajo)),
				en_uso: !!this.en_uso,
			}

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
			this.etapas = etapas_vacias()
			this.sacados = []
			this.ocultos = etapas_vacias()
			this.orden_original = {}
			this.sacados_ocultos = []
			this.huella_inicial = ''
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

	.editor-diseno__marco
		min-width: 0

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
		.editor-diseno__marco
			overflow-x: auto
			margin: 0 -12px
			padding: 0 12px

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
