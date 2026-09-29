<template>
	<!--
		El lienzo del editor de etiquetas (mision disenos-etiquetas-gondola, 29/9/2026): la etiqueta
		dibujada a escala sobre una "mesa" gris, con cada campo que se puede agarrar y mover, y agrandar
		o achicar tirando de sus bordes y esquinas.

		Todo el arrastre es con pointer events propios (andan igual con mouse, lapiz y dedo):
		- Agarrar un campo y moverlo: imán de 1 mm y guias contra los bordes y el centro de la etiqueta
		  y de los otros campos (arrastre.js). Con Alt apretado, sin imán.
		- Pasar el mouse por el borde de un campo: aparecen las 8 manijas (4 bordes y 4 esquinas) con el
		  cursor que corresponde. Tirar de una agranda o achica, con el mismo imán y guias.
		- Un campo de la bandeja se puede traer arrastrando (empezar_nuevo): mientras esta arriba de la
		  etiqueta se ve donde va a caer.
		- Con un campo elegido: flechas = 1 mm (Shift: 5 mm, Alt: 0,1 mm), Supr = quitarlo, Esc = soltarlo.

		Los campos se mueven mutando x/y/w/h del elemento que llega por props (el dueño del diseño es el
		editor, Index.vue); lo estructural (elegir, agregar, quitar) se avisa con eventos.
	-->
	<div class="lienzo-etiqueta">

		<div
		ref="mesa"
		class="lienzo-etiqueta__mesa"
		@pointerdown.self="$emit('seleccionar', null)">

			<div
			ref="papel"
			class="lienzo-etiqueta__papel"
			:class="{
				'lienzo-etiqueta__papel--con-marco': diseno.marco,
				'lienzo-etiqueta__papel--con-grilla': mostrar_grilla,
			}"
			:style="estilo_del_papel"
			@pointerdown.self="$emit('seleccionar', null)"
			@contextmenu.prevent>

				<div
				v-for="elemento in diseno.elementos"
				:key="elemento.id"
				:ref="'campo_' + elemento.id"
				class="lienzo-campo"
				:class="clases_del_campo(elemento)"
				:style="rectangulo(elemento)"
				:data-id="elemento.id"
				tabindex="0"
				role="button"
				:aria-label="nombre(elemento) + '. Arrastralo para moverlo; con las flechas, de a 1 milímetro.'"
				:title="nombre(elemento)"
				@pointerdown="agarrar($event, elemento, null)"
				@focus="$emit('seleccionar', elemento.id)"
				@keydown="al_tocar_tecla($event, elemento)">

					<contenido-del-campo
					:elemento="elemento"
					:zoom="zoom"
					:muestra="muestra"
					:listas="listas"
					editando></contenido-del-campo>

					<span
					v-for="manija in MANIJAS"
					:key="manija"
					class="lienzo-campo__manija"
					:class="'lienzo-campo__manija--' + manija"
					:style="{ cursor: cursor_de_manija(manija) }"
					aria-hidden="true"
					@pointerdown.stop="agarrar($event, elemento, manija)"></span>

					<!-- La medida mientras se agranda o achica -->
					<span
					v-if="gesto && gesto.empezado && gesto.modo === 'redimensionar' && gesto.id === elemento.id"
					class="lienzo-campo__medida">{{ medida(elemento) }}</span>
				</div>

				<!-- Donde va a caer el campo que se trae de la bandeja -->
				<div
				v-if="nuevo && nuevo.sobre_el_papel"
				class="lienzo-campo lienzo-campo--nuevo"
				:style="rectangulo(nuevo.elemento)">
					<contenido-del-campo
					:elemento="nuevo.elemento"
					:zoom="zoom"
					:muestra="muestra"
					:listas="listas"
					editando></contenido-del-campo>
				</div>

				<!-- Guias de alineacion -->
				<span
				v-for="x in guias.verticales"
				:key="'v' + x"
				class="lienzo-etiqueta__guia lienzo-etiqueta__guia--vertical"
				:style="{ left: (x * zoom) + 'px' }"></span>
				<span
				v-for="y in guias.horizontales"
				:key="'h' + y"
				class="lienzo-etiqueta__guia lienzo-etiqueta__guia--horizontal"
				:style="{ top: (y * zoom) + 'px' }"></span>

				<!-- Etiqueta vacia: una pista en el medio -->
				<p
				v-if="!diseno.elementos.length && !nuevo"
				class="lienzo-etiqueta__vacia">
					Arrastrá acá los datos del artículo que querés en la etiqueta
				</p>
			</div>
		</div>

		<div class="lienzo-etiqueta__pie">
			<span class="lienzo-etiqueta__leyenda">
				Etiqueta de {{ texto_de_la_medida }}
				<template v-if="!diseno.marco"> · el borde punteado no se imprime</template>
			</span>
			<span
			class="lienzo-etiqueta__zoom"
			role="group"
			aria-label="Acercar o alejar la etiqueta">
				<button
				type="button"
				class="lienzo-etiqueta__boton"
				title="Alejar"
				aria-label="Alejar"
				:disabled="zoom_usuario <= ZOOM_USUARIO_MINIMO"
				@click="cambiar_zoom(-0.25)">
					<i class="bi bi-zoom-out"></i>
				</button>
				<button
				type="button"
				class="lienzo-etiqueta__boton lienzo-etiqueta__boton--texto"
				title="Volver al tamaño que entra en la pantalla"
				@click="zoom_usuario = 1">{{ Math.round(zoom_usuario * 100) }}%</button>
				<button
				type="button"
				class="lienzo-etiqueta__boton"
				title="Acercar"
				aria-label="Acercar"
				:disabled="zoom_usuario >= ZOOM_USUARIO_MAXIMO"
				@click="cambiar_zoom(0.25)">
					<i class="bi bi-zoom-in"></i>
				</button>
			</span>
		</div>

		<!-- La ficha que sigue al puntero mientras se trae un campo de la bandeja y todavia no esta sobre la etiqueta -->
		<div
		v-if="nuevo && nuevo.empezado && !nuevo.sobre_el_papel"
		class="lienzo-etiqueta__ficha"
		:style="{ left: nuevo.cliente_x + 'px', top: nuevo.cliente_y + 'px' }">
			<i
			class="bi"
			:class="nuevo.plantilla.icono"></i>
			{{ nuevo.plantilla.nombre }}
		</div>
	</div>
</template>
<script>
import ContenidoDelCampo from '../ContenidoDelCampo'
import { ancho_de_etiqueta, redondear, encerrar_en_la_etiqueta } from '../geometria'
import { nombre_del_campo, buscar_lista } from '../catalogo'
import { nuevo_elemento } from '../diseno'
import {
	MANIJAS,
	UMBRAL_DE_GUIA_PX,
	lineas_de_referencia,
	calcular_movimiento,
	calcular_redimension,
	cursor_de_manija,
} from './arrastre'

/* Cuanto hay que mover el puntero (px) para que un toque se vuelva arrastre */
const UMBRAL_DE_ARRASTRE_PX = 3

/* Zoom automatico: pixeles por mm, entre estos dos (lo mas grande que entre en el ancho) */
const ZOOM_MAXIMO = 7
const ZOOM_MINIMO = 1.5

/* Alto maximo de la etiqueta en pantalla con el zoom automatico (px) */
const ALTO_MAXIMO_PX = 560

/* Aire de la mesa alrededor de la etiqueta (px, a cada lado): deja lugar para las manijas y las guias */
const AIRE_DE_LA_MESA = 24

/* Multiplicador del zoom que elige el usuario con la lupa */
const ZOOM_USUARIO_MINIMO = 0.5
const ZOOM_USUARIO_MAXIMO = 3

/**
 * Lienzo de la etiqueta.
 */
export default {
	name: 'LienzoDeEtiqueta',
	components: {
		ContenidoDelCampo,
	},
	props: {
		/* El diseño que se edita (normalizado) */
		diseno: {
			type: Object,
			required: true,
		},
		/* id del campo elegido, o null */
		seleccionado_id: {
			type: String,
			default: null,
		},
		/* Datos de muestra (muestra.js) */
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
			MANIJAS: MANIJAS,
			ZOOM_USUARIO_MINIMO: ZOOM_USUARIO_MINIMO,
			ZOOM_USUARIO_MAXIMO: ZOOM_USUARIO_MAXIMO,
			/* Ancho util de la mesa (px, sin su aire), lo mide un ResizeObserver */
			ancho_disponible: 600,
			/* Multiplicador del zoom elegido con la lupa (1 = lo que entra) */
			zoom_usuario: 1,
			/*
				El arrastre de un campo del lienzo en curso, o null:
				{modo: 'mover'|'redimensionar', manija, id, inicio: {x,y,w,h}, puntero_x, puntero_y,
				pointer_id, empezado, lineas}
			*/
			gesto: null,
			/*
				El campo que se trae de la bandeja, o null:
				{plantilla, elemento, pointer_id, inicio_x, inicio_y, cliente_x, cliente_y, empezado, sobre_el_papel}
			*/
			nuevo: null,
			/* Guias a la vista: posiciones en mm */
			guias: { verticales: [], horizontales: [] },
			/* El observador del ancho de la mesa */
			observador: null,
		}
	},
	computed: {
		/**
		 * Ancho de la etiqueta, mm.
		 *
		 * @returns {number}
		 */
		ancho_mm() {
			return ancho_de_etiqueta(this.diseno.columnas)
		},
		/**
		 * Pixeles por mm: lo mas grande que entre en la mesa (sin pasarse de alto), por la lupa.
		 *
		 * @returns {number}
		 */
		zoom() {
			/* 2 px de resto para que el redondeo no haga aparecer la barra de scroll */
			let por_ancho = (this.ancho_disponible - 2) / this.ancho_mm
			let por_alto = ALTO_MAXIMO_PX / this.diseno.alto_mm
			let automatico = Math.min(ZOOM_MAXIMO, por_ancho, por_alto)
			if (automatico < ZOOM_MINIMO) {
				automatico = ZOOM_MINIMO
			}
			return automatico * this.zoom_usuario
		},
		/**
		 * Tamaño de la etiqueta en pantalla y el paso de la grilla de ayuda (5 mm).
		 *
		 * @returns {Object}
		 */
		estilo_del_papel() {
			let paso = 5 * this.zoom
			return {
				width: (this.ancho_mm * this.zoom) + 'px',
				height: (this.diseno.alto_mm * this.zoom) + 'px',
				backgroundSize: paso + 'px ' + paso + 'px',
			}
		},
		/**
		 * La grilla de 5 mm se ve solo mientras se arrastra algo.
		 *
		 * @returns {boolean}
		 */
		mostrar_grilla() {
			return !!((this.gesto && this.gesto.empezado) || (this.nuevo && this.nuevo.sobre_el_papel))
		},
		/**
		 * "66,7 × 40 mm".
		 *
		 * @returns {string}
		 */
		texto_de_la_medida() {
			return this.mm(this.ancho_mm) + ' × ' + this.mm(this.diseno.alto_mm) + ' mm'
		},
	},
	mounted() {
		let self = this
		let mesa = this.$refs.mesa

		if (typeof window.ResizeObserver == 'function') {
			this.observador = new window.ResizeObserver(function (entradas) {
				if (entradas.length) {
					self.ancho_disponible = entradas[0].contentRect.width
				}
			})
			this.observador.observe(mesa)
		} else {
			window.addEventListener('resize', this.medir_la_mesa)
		}
		this.medir_la_mesa()
	},
	beforeDestroy() {
		if (this.observador) {
			this.observador.disconnect()
		}
		window.removeEventListener('resize', this.medir_la_mesa)
		this.soltar_escuchas()
	},
	methods: {
		cursor_de_manija: cursor_de_manija,
		/**
		 * Mide el ancho de la mesa (cuando no hay ResizeObserver, y al montar).
		 *
		 * @returns {void}
		 */
		medir_la_mesa() {
			if (this.$refs.mesa) {
				/* clientWidth incluye el aire (padding) de la mesa; el ResizeObserver mide sin el */
				let ancho = this.$refs.mesa.clientWidth - AIRE_DE_LA_MESA * 2
				if (ancho > 0) {
					this.ancho_disponible = ancho
				}
			}
		},
		/**
		 * Cambia la lupa.
		 *
		 * @param {number} paso
		 * @returns {void}
		 */
		cambiar_zoom(paso) {
			let valor = Math.round((this.zoom_usuario + paso) * 100) / 100
			this.zoom_usuario = Math.min(ZOOM_USUARIO_MAXIMO, Math.max(ZOOM_USUARIO_MINIMO, valor))
		},
		/**
		 * Un numero en mm con coma decimal.
		 *
		 * @param {number} valor
		 * @returns {string}
		 */
		mm(valor) {
			return String(redondear(valor)).replace('.', ',')
		},
		/**
		 * "40 × 13 mm" (la medida de un campo mientras se tira de una manija).
		 *
		 * @param {Object} elemento
		 * @returns {string}
		 */
		medida(elemento) {
			return this.mm(elemento.w) + ' × ' + this.mm(elemento.h) + ' mm'
		},
		/**
		 * Nombre de un campo para el comerciante.
		 *
		 * @param {Object} elemento
		 * @returns {string}
		 */
		nombre(elemento) {
			return nombre_del_campo(elemento, this.listas)
		},
		/**
		 * Posicion y tamaño de un campo en pantalla.
		 *
		 * @param {Object} elemento
		 * @returns {Object}
		 */
		rectangulo(elemento) {
			return {
				left: (elemento.x * this.zoom) + 'px',
				top: (elemento.y * this.zoom) + 'px',
				width: (elemento.w * this.zoom) + 'px',
				height: (elemento.h * this.zoom) + 'px',
			}
		},
		/**
		 * Clases de un campo.
		 *
		 * @param {Object} elemento
		 * @returns {Object}
		 */
		clases_del_campo(elemento) {
			return {
				'lienzo-campo--seleccionado': elemento.id === this.seleccionado_id,
				'lienzo-campo--agarrado': !!(this.gesto && this.gesto.empezado && this.gesto.id === elemento.id),
				'lienzo-campo--con-aviso': elemento.tipo === 'precio_lista' && !buscar_lista(this.listas, elemento.price_type_id),
			}
		},
		/**
		 * El elemento del diseño con ese id.
		 *
		 * @param {string} id
		 * @returns {Object|null}
		 */
		buscar(id) {
			for (let i = 0; i < this.diseno.elementos.length; i++) {
				if (this.diseno.elementos[i].id === id) {
					return this.diseno.elementos[i]
				}
			}
			return null
		},
		/**
		 * Enfoca un campo (despues de agregarlo, o al agarrarlo) sin mover el scroll.
		 *
		 * @param {string} id
		 * @returns {void}
		 */
		enfocar(id) {
			let self = this
			this.$nextTick(function () {
				let referencia = self.$refs['campo_' + id]
				let nodo = Array.isArray(referencia) ? referencia[0] : referencia
				if (nodo && typeof nodo.focus == 'function') {
					try {
						nodo.focus({ preventScroll: true })
					} catch (error) {
						nodo.focus()
					}
				}
			})
		},
		/**
		 * Opciones de las cuentas de arrastre.js para un gesto.
		 *
		 * @param {Object} lineas
		 * @param {Object} evento el ultimo evento del puntero (Alt apaga el imán)
		 * @returns {Object}
		 */
		opciones_de_ajuste(lineas, evento) {
			return {
				lineas: lineas,
				umbral_mm: UMBRAL_DE_GUIA_PX / this.zoom,
				ancho: this.ancho_mm,
				alto: this.diseno.alto_mm,
				con_iman: !evento.altKey,
			}
		},
		/**
		 * Pone las escuchas del puntero en la ventana (asi el arrastre sigue aunque el puntero salga del campo).
		 *
		 * @returns {void}
		 */
		poner_escuchas() {
			window.addEventListener('pointermove', this.al_mover_puntero)
			window.addEventListener('pointerup', this.al_soltar_puntero)
			window.addEventListener('pointercancel', this.al_cancelar_puntero)
		},
		/**
		 * Saca las escuchas del puntero.
		 *
		 * @returns {void}
		 */
		soltar_escuchas() {
			window.removeEventListener('pointermove', this.al_mover_puntero)
			window.removeEventListener('pointerup', this.al_soltar_puntero)
			window.removeEventListener('pointercancel', this.al_cancelar_puntero)
		},
		/**
		 * Agarra un campo del lienzo: para moverlo (manija null) o para agrandarlo/achicarlo.
		 *
		 * @param {PointerEvent} evento
		 * @param {Object} elemento
		 * @param {string|null} manija
		 * @returns {void}
		 */
		agarrar(evento, elemento, manija) {
			/* Solo el boton principal del mouse (el derecho no arrastra) */
			if (evento.pointerType === 'mouse' && evento.button !== 0) {
				return
			}
			if (this.gesto || this.nuevo) {
				return
			}

			/* Sin esto el navegador empieza a seleccionar texto o a arrastrar la foto */
			evento.preventDefault()

			this.$emit('seleccionar', elemento.id)
			this.enfocar(elemento.id)

			this.gesto = {
				modo: manija ? 'redimensionar' : 'mover',
				manija: manija,
				id: elemento.id,
				inicio: { x: elemento.x, y: elemento.y, w: elemento.w, h: elemento.h },
				puntero_x: evento.clientX,
				puntero_y: evento.clientY,
				pointer_id: evento.pointerId,
				empezado: false,
				lineas: null,
			}

			this.poner_escuchas()
		},
		/**
		 * Empieza a traer un campo de la bandeja (lo llama el editor cuando se aprieta un item de la
		 * bandeja). Si se suelta sin haberlo movido, cuenta como un toque: se agrega en un lugar libre.
		 *
		 * @param {PointerEvent} evento
		 * @param {Object} plantilla {tipo, price_type_id, nombre, icono}
		 * @returns {void}
		 */
		empezar_nuevo(evento, plantilla) {
			if (this.gesto || this.nuevo) {
				return
			}

			let elemento = nuevo_elemento(plantilla.tipo, { price_type_id: plantilla.price_type_id }, this.diseno.elementos, this.ancho_mm, this.diseno.alto_mm)

			if (!elemento) {
				return
			}

			this.nuevo = {
				plantilla: plantilla,
				elemento: elemento,
				pointer_id: evento.pointerId,
				inicio_x: evento.clientX,
				inicio_y: evento.clientY,
				cliente_x: evento.clientX,
				cliente_y: evento.clientY,
				empezado: false,
				sobre_el_papel: false,
				lineas: lineas_de_referencia(this.diseno.elementos, null, this.ancho_mm, this.diseno.alto_mm),
			}

			this.poner_escuchas()
		},
		/**
		 * El puntero se mueve con algo agarrado.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		al_mover_puntero(evento) {
			if (this.nuevo) {
				this.mover_nuevo(evento)
				return
			}

			let gesto = this.gesto

			if (!gesto || evento.pointerId !== gesto.pointer_id) {
				return
			}

			let dx_px = evento.clientX - gesto.puntero_x
			let dy_px = evento.clientY - gesto.puntero_y

			if (!gesto.empezado) {
				if (Math.abs(dx_px) < UMBRAL_DE_ARRASTRE_PX && Math.abs(dy_px) < UMBRAL_DE_ARRASTRE_PX) {
					return
				}
				gesto.empezado = true
				gesto.lineas = lineas_de_referencia(this.diseno.elementos, gesto.id, this.ancho_mm, this.diseno.alto_mm)
				this.$emit('inicio-arrastre')
			}

			evento.preventDefault()

			let elemento = this.buscar(gesto.id)
			if (!elemento) {
				return
			}

			let opciones = this.opciones_de_ajuste(gesto.lineas, evento)
			let dx = dx_px / this.zoom
			let dy = dy_px / this.zoom
			let resultado

			if (gesto.modo === 'mover') {
				resultado = calcular_movimiento(gesto.inicio, dx, dy, opciones)
				elemento.x = resultado.x
				elemento.y = resultado.y
			} else {
				resultado = calcular_redimension(gesto.inicio, gesto.manija, dx, dy, opciones)
				elemento.x = resultado.x
				elemento.y = resultado.y
				elemento.w = resultado.w
				elemento.h = resultado.h
			}

			this.guias = resultado.guias
		},
		/**
		 * Mueve el campo que se trae de la bandeja: ficha flotante afuera de la etiqueta, y encima de
		 * ella, el campo en el lugar donde va a caer (con imán y guias).
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		mover_nuevo(evento) {
			let nuevo = this.nuevo

			if (evento.pointerId !== nuevo.pointer_id) {
				return
			}

			if (!nuevo.empezado) {
				if (Math.abs(evento.clientX - nuevo.inicio_x) < UMBRAL_DE_ARRASTRE_PX && Math.abs(evento.clientY - nuevo.inicio_y) < UMBRAL_DE_ARRASTRE_PX) {
					return
				}
				nuevo.empezado = true
			}

			evento.preventDefault()

			nuevo.cliente_x = evento.clientX
			nuevo.cliente_y = evento.clientY

			let papel = this.$refs.papel
			let caja = papel ? papel.getBoundingClientRect() : null

			nuevo.sobre_el_papel = !!caja
				&& evento.clientX >= caja.left && evento.clientX <= caja.right
				&& evento.clientY >= caja.top && evento.clientY <= caja.bottom

			if (!nuevo.sobre_el_papel) {
				this.guias = { verticales: [], horizontales: [] }
				return
			}

			/* El puntero queda en el medio del campo */
			let x = (evento.clientX - caja.left) / this.zoom - nuevo.elemento.w / 2
			let y = (evento.clientY - caja.top) / this.zoom - nuevo.elemento.h / 2
			let desde = { x: 0, y: 0, w: nuevo.elemento.w, h: nuevo.elemento.h }
			let resultado = calcular_movimiento(desde, x, y, this.opciones_de_ajuste(nuevo.lineas, evento))

			nuevo.elemento.x = resultado.x
			nuevo.elemento.y = resultado.y
			this.guias = resultado.guias
		},
		/**
		 * Se suelta el puntero.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		al_soltar_puntero(evento) {
			if (this.nuevo) {
				if (evento.pointerId !== this.nuevo.pointer_id) {
					return
				}
				let nuevo = this.nuevo
				this.terminar()

				if (!nuevo.empezado) {
					/* Un toque sin arrastrar: se agrega en un lugar libre */
					this.$emit('agregar', { plantilla: nuevo.plantilla, posicion: null })
				} else if (nuevo.sobre_el_papel) {
					this.$emit('agregar', {
						plantilla: nuevo.plantilla,
						posicion: encerrar_en_la_etiqueta({ x: nuevo.elemento.x, y: nuevo.elemento.y, w: nuevo.elemento.w, h: nuevo.elemento.h }, this.ancho_mm, this.diseno.alto_mm),
					})
				}
				return
			}

			if (!this.gesto || evento.pointerId !== this.gesto.pointer_id) {
				return
			}

			let empezado = this.gesto.empezado
			this.terminar()

			if (empezado) {
				this.$emit('fin-arrastre')
			}
		},
		/**
		 * El navegador corto el gesto (p. ej. una llamada entrante en el telefono): se suelta donde
		 * quedo, sin agregar nada.
		 *
		 * @param {PointerEvent} evento
		 * @returns {void}
		 */
		al_cancelar_puntero(evento) {
			let empezado = !!(this.gesto && this.gesto.empezado)
			let de_este_gesto = (this.gesto && evento.pointerId === this.gesto.pointer_id) || (this.nuevo && evento.pointerId === this.nuevo.pointer_id)

			if (!de_este_gesto) {
				return
			}

			this.terminar()

			if (empezado) {
				this.$emit('fin-arrastre')
			}
		},
		/**
		 * Limpia el gesto en curso.
		 *
		 * @returns {void}
		 */
		terminar() {
			this.soltar_escuchas()
			this.gesto = null
			this.nuevo = null
			this.guias = { verticales: [], horizontales: [] }
		},
		/**
		 * Teclado sobre un campo elegido: flechas lo mueven, Supr lo quita, Esc lo suelta.
		 *
		 * @param {KeyboardEvent} evento
		 * @param {Object} elemento
		 * @returns {void}
		 */
		al_tocar_tecla(evento, elemento) {
			let paso = evento.altKey ? 0.1 : (evento.shiftKey ? 5 : 1)
			let dx = 0
			let dy = 0

			switch (evento.key) {
				case 'ArrowLeft':
					dx = -paso
					break
				case 'ArrowRight':
					dx = paso
					break
				case 'ArrowUp':
					dy = -paso
					break
				case 'ArrowDown':
					dy = paso
					break
				case 'Delete':
				case 'Backspace':
					evento.preventDefault()
					this.$emit('quitar', elemento.id)
					return
				case 'Escape':
					/* Sin esto el Esc cerraria el modal entero */
					evento.preventDefault()
					evento.stopPropagation()
					this.$emit('seleccionar', null)
					evento.target.blur()
					return
				default:
					return
			}

			evento.preventDefault()

			elemento.x = redondear(Math.min(Math.max(elemento.x + dx, 0), this.ancho_mm - elemento.w))
			elemento.y = redondear(Math.min(Math.max(elemento.y + dy, 0), this.diseno.alto_mm - elemento.h))
		},
	},
}
</script>
<style lang="sass">
// Sin `scoped`: vive adentro del b-modal (colgado de <body>). Todo cuelga de clases propias.
// La mesa y los controles van por token; el papel es blanco fijo en los dos modos (es la vista
// previa de lo que imprime la impresora) y por eso las marcas que van ENCIMA del papel (bordes de
// campo, guias) tienen colores fijos que se leen sobre blanco.
.lienzo-etiqueta
	display: flex
	flex-direction: column
	gap: 8px
	min-width: 0

// La mesa: fondo gris, la etiqueta centrada. Si con la lupa no entra, se desliza adentro de la mesa
// (la pagina no scrollea de costado).
.lienzo-etiqueta__mesa
	display: flex
	justify-content: flex-start
	align-items: flex-start
	min-width: 0
	padding: 24px
	border: 1px solid var(--color-border-secondary)
	border-radius: 12px
	background: var(--bg-section)
	overflow: auto

// Centrada con margin auto y no con justify-content: center, porque si la etiqueta es mas ancha que
// la mesa (lupa, o una etiqueta de 1 por fila en el telefono) el centrado de flex la cortaria a la
// izquierda sin forma de llegar con el scroll. Con margin auto, si no entra, arranca al principio.
.lienzo-etiqueta__papel
	position: relative
	flex: 0 0 auto
	margin: 0 auto
	background-color: #fff
	box-shadow: 0 2px 10px rgba(0, 0, 0, .12)
	// Sin marco: el borde se ve punteado (no se imprime)
	outline: 1px dashed #aab1bb
	touch-action: manipulation

// El marco que imprime el PDF: linea negra finita
.lienzo-etiqueta__papel--con-marco
	outline: 1px solid #111
	outline-offset: 0

// Grilla de 5 mm mientras se arrastra (el tamaño del paso lo pone el estilo en linea)
.lienzo-etiqueta__papel--con-grilla
	background-image: linear-gradient(to right, rgba(17, 17, 17, .07) 1px, transparent 1px), linear-gradient(to bottom, rgba(17, 17, 17, .07) 1px, transparent 1px)

.lienzo-etiqueta__vacia
	position: absolute
	top: 50%
	left: 50%
	width: 90%
	margin: 0
	transform: translate(-50%, -50%)
	color: #8a929e
	font-size: 0.8rem
	text-align: center
	pointer-events: none

// Guias de alineacion: una linea magenta de lado a lado, un poco mas larga que la etiqueta
.lienzo-etiqueta__guia
	position: absolute
	z-index: 20
	pointer-events: none

.lienzo-etiqueta__guia--vertical
	top: -14px
	bottom: -14px
	width: 0
	border-left: 1px solid #e0267d

.lienzo-etiqueta__guia--horizontal
	left: -14px
	right: -14px
	height: 0
	border-top: 1px solid #e0267d

.lienzo-etiqueta__pie
	display: flex
	align-items: center
	justify-content: space-between
	flex-wrap: wrap
	gap: 6px 12px

.lienzo-etiqueta__leyenda
	color: var(--color-text-secondary)
	font-size: 0.75rem

.lienzo-etiqueta__zoom
	display: inline-flex
	align-items: center
	gap: 2px
	margin-left: auto

.lienzo-etiqueta__boton
	display: inline-flex
	align-items: center
	justify-content: center
	min-width: 30px
	height: 30px
	padding: 0 6px
	border: 0
	border-radius: 8px
	background: transparent
	color: var(--color-text-secondary)
	font-size: 0.9rem
	cursor: pointer

	&:hover:not(:disabled)
		background: var(--bg-hover)
		color: var(--color-text-primary)

	&:disabled
		opacity: .35
		cursor: default

	&:focus
		outline: none

	&:focus-visible
		box-shadow: 0 0 0 3px var(--metodo-pago-focus-ring)

.lienzo-etiqueta__boton--texto
	min-width: 52px
	font-size: 0.75rem
	font-weight: 600
	font-variant-numeric: tabular-nums

// La ficha que sigue al puntero cuando se trae un campo de la bandeja (fixed: el modal ya esta sin
// transform cuando se muestra, asi que se ubica contra la ventana)
.lienzo-etiqueta__ficha
	position: fixed
	z-index: 2000
	display: inline-flex
	align-items: center
	gap: 6px
	padding: 6px 12px
	border: 1px solid var(--color-primary)
	border-radius: 8px
	background: var(--bg-card)
	color: var(--color-text-primary)
	font-size: 0.8rem
	font-weight: 600
	white-space: nowrap
	box-shadow: 0 6px 18px var(--shadow-color)
	transform: translate(-50%, -50%)
	pointer-events: none

	i
		color: var(--color-primary)

// Un campo sobre la etiqueta. Borde punteado tenue (no se imprime) para ver donde esta cada uno;
// al pasar el mouse, azul; elegido, azul firme y arriba de los demas.
.lienzo-campo
	position: absolute
	z-index: 1
	outline: 1px dashed rgba(100, 116, 139, .55)
	outline-offset: 0
	cursor: move
	touch-action: none
	user-select: none

	&:hover
		z-index: 3
		outline: 1px solid #3b82f6

	&:focus
		outline: none

	&.lienzo-campo--seleccionado
		z-index: 4
		outline: 2px solid #2563eb
		outline-offset: 0

	&.lienzo-campo--agarrado
		z-index: 5
		box-shadow: 0 4px 14px rgba(37, 99, 235, .25)

	// Un precio de una lista que ya no existe: borde rojo
	&.lienzo-campo--con-aviso
		outline: 1px dashed #dc2626

		&.lienzo-campo--seleccionado
			outline: 2px solid #dc2626

// El campo que se esta trayendo de la bandeja, en el lugar donde va a caer
.lienzo-campo--nuevo
	z-index: 6
	outline: 2px dashed #2563eb
	background: rgba(37, 99, 235, .06)
	pointer-events: none

// Manijas: invisibles hasta que se pasa el mouse por el campo (pero ya dan el cursor al pasar por el
// borde), firmes en el campo elegido.
.lienzo-campo__manija
	position: absolute
	z-index: 2
	opacity: 0
	transition: opacity .12s ease

	// Bordes: una franja de 10px centrada en el borde, con una pildora en el medio
	&.lienzo-campo__manija--n,
	&.lienzo-campo__manija--s
		left: 7px
		right: 7px
		height: 10px

		&::after
			content: ''
			position: absolute
			top: 3px
			left: 50%
			width: 18px
			max-width: 70%
			height: 4px
			border-radius: 999px
			background: #2563eb
			transform: translateX(-50%)

	&.lienzo-campo__manija--n
		top: -5px

	&.lienzo-campo__manija--s
		bottom: -5px

	&.lienzo-campo__manija--e,
	&.lienzo-campo__manija--w
		top: 7px
		bottom: 7px
		width: 10px

		&::after
			content: ''
			position: absolute
			left: 3px
			top: 50%
			width: 4px
			height: 18px
			max-height: 70%
			border-radius: 999px
			background: #2563eb
			transform: translateY(-50%)

	&.lienzo-campo__manija--e
		right: -5px

	&.lienzo-campo__manija--w
		left: -5px

	// Esquinas: un cuadradito blanco con borde azul, arriba de las franjas
	&.lienzo-campo__manija--nw,
	&.lienzo-campo__manija--ne,
	&.lienzo-campo__manija--sw,
	&.lienzo-campo__manija--se
		z-index: 3
		width: 10px
		height: 10px
		border: 1.5px solid #2563eb
		border-radius: 2px
		background: #fff

	&.lienzo-campo__manija--nw
		top: -5px
		left: -5px

	&.lienzo-campo__manija--ne
		top: -5px
		right: -5px

	&.lienzo-campo__manija--sw
		bottom: -5px
		left: -5px

	&.lienzo-campo__manija--se
		bottom: -5px
		right: -5px

.lienzo-campo:hover .lienzo-campo__manija
	opacity: .75

.lienzo-campo .lienzo-campo__manija:hover,
.lienzo-campo--seleccionado .lienzo-campo__manija,
.lienzo-campo--agarrado .lienzo-campo__manija
	opacity: 1

// La medida mientras se tira de una manija: pastilla azul debajo del campo
.lienzo-campo__medida
	position: absolute
	top: 100%
	left: 50%
	z-index: 10
	margin-top: 8px
	padding: 2px 8px
	border-radius: 999px
	background: #2563eb
	color: #fff
	font-family: inherit
	font-size: 0.72rem
	font-weight: 700
	white-space: nowrap
	font-variant-numeric: tabular-nums
	transform: translateX(-50%)
	pointer-events: none

// Telefono: menos aire alrededor de la etiqueta, para que la etiqueta aproveche el ancho
@media (max-width: 575.98px)
	.lienzo-etiqueta__mesa
		padding: 16px 14px

// Pantallas tactiles (sin mouse): las manijas solo en el campo elegido y mas grandes para el dedo.
// En los campos no elegidos no reciben el toque: tocar cerca del borde elige y mueve el campo.
@media (hover: none), (pointer: coarse)
	.lienzo-campo .lienzo-campo__manija
		pointer-events: none

	.lienzo-campo--seleccionado .lienzo-campo__manija
		pointer-events: auto

	.lienzo-campo__manija
		&.lienzo-campo__manija--n,
		&.lienzo-campo__manija--s
			height: 20px

		&.lienzo-campo__manija--n
			top: -10px

		&.lienzo-campo__manija--s
			bottom: -10px

		&.lienzo-campo__manija--e,
		&.lienzo-campo__manija--w
			width: 20px

		&.lienzo-campo__manija--e
			right: -10px

		&.lienzo-campo__manija--w
			left: -10px

		&.lienzo-campo__manija--n::after,
		&.lienzo-campo__manija--s::after
			top: 8px

		&.lienzo-campo__manija--e::after,
		&.lienzo-campo__manija--w::after
			left: 8px

		&.lienzo-campo__manija--nw,
		&.lienzo-campo__manija--ne,
		&.lienzo-campo__manija--sw,
		&.lienzo-campo__manija--se
			width: 18px
			height: 18px

		&.lienzo-campo__manija--nw
			top: -9px
			left: -9px

		&.lienzo-campo__manija--ne
			top: -9px
			right: -9px

		&.lienzo-campo__manija--sw
			bottom: -9px
			left: -9px

		&.lienzo-campo__manija--se
			bottom: -9px
			right: -9px
</style>
