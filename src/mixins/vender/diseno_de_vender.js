/*
	El "Diseño de Vender" en uso, para todo lo que en Vender depende de DONDE esta cada campo
	(mision diseno-vender-configurable, 28/9/2026).

	Lo mezclan:
	- las tres etapas (components/vender/components/stage-1/2/3/Index.vue): si se dibujan, su
	  subtitulo, si arrancan abiertas y el enfoque de un campo que les toca;
	- la grilla de cada etapa (components/vender/layout/GrillaDeEtapa.vue): que campos dibuja;
	- la barra de resumen (VenderStage1SummaryBar.vue) y los atajos de teclado
	  (mixins/vender/keyboard_shortcuts.js, que lo trae a views/Vender.vue): para llevar el foco a
	  un campo, este en la etapa que este.

	-------------------------------------------------------------------------------------------------
	De donde sale el diseño, en este orden
	-------------------------------------------------------------------------------------------------

	1. Del store `vender_layout` (baja con los recursos iniciales al iniciar sesion): el diseño "En
	   uso" segun diseno_en_uso() del contrato. Si el store trae diseños y ninguno esta en uso (no
	   deberia pasar: el backend garantiza uno), el predeterminado.
	2. Si el store esta VACIO —sesion sin conexion, o una API vieja que todavia no conoce el
	   recurso— la copia del layout en uso que quedo en localStorage la ultima vez que el store
	   trajo diseños (clave `vender_layout_en_uso_<id del dueño>`).
	3. Si tampoco hay copia, el diseño predeterminado armado en codigo, que es exactamente el
	   Vender de antes de esta mision.

	En los tres casos el layout pasa por resolver_diseno(), que lo completa con los elementos que
	no nombra y descarta lo que no conoce: lo que sale de aca es siempre un diseño completo.

	🔴 La copia de localStorage es por DUEÑO y no por usuario: el diseño en uso es uno para todo el
	negocio (decision de Lucas, 28/9/2026), asi que un empleado que entra sin conexion ve el mismo
	que vio cualquier otro usuario del negocio en esa computadora.

	-------------------------------------------------------------------------------------------------
	Llevar el foco a un campo (reemplaza al evento viejo que solo sabia abrir la etapa 1)
	-------------------------------------------------------------------------------------------------

	Con un diseño, el metodo de pago o el cliente pueden estar en cualquier etapa, asi que quien
	pide el foco (los lapices de la barra de resumen, F3, F4...) no puede saber que etapa abrir.
	El pedido viaja por el evento de $root EVENTO_ENFOCAR_ELEMENTO con la key del elemento; cada
	etapa lo escucha, y la que lo tiene en su grilla se abre y lo enfoca
	(enfocar_elemento_de_vender_en_esta_etapa). Se pide con enfocar_elemento_de_vender(), que
	antes avisa si el diseño en uso no muestra ese campo.
*/
import {
	resolver_diseno,
	elementos_visibles,
	etapa_tiene_elementos,
	diseno_en_uso,
} from '@/components/vender/layout/resolver_diseno'
import { ETAPAS, KEY_SEPARADOR, es_entrada_de_articulos } from '@/components/vender/layout/elementos'

/* Evento de $root para llevar el foco a un elemento del diseño: (key, opciones). Lo escuchan las tres etapas. */
export const EVENTO_ENFOCAR_ELEMENTO = 'vender:enfocar-elemento'

/* Prefijo de la copia local del layout en uso; se completa con el id del dueño. */
const PREFIJO_DE_LA_COPIA = 'vender_layout_en_uso_'

/* Aviso cuando se pide el foco de un campo que el diseño en uso no muestra. */
const AVISO_CAMPO_FUERA_DEL_DISENO = 'Ese campo no está en el diseño de Vender en uso.'

/* Lo que se enfoca adentro del item cuando quien pide el foco no dice nada mas preciso. */
const CONTROLES_ENFOCABLES = 'input, select, textarea'

/**
 * Clave de localStorage de la copia del diseño en uso de este negocio, o null si todavia no se
 * sabe quien es el dueño.
 *
 * @param {Object|null} owner
 * @returns {string|null}
 */
function clave_de_la_copia(owner) {
	if (!owner || !owner.id) {
		return null
	}
	return PREFIJO_DE_LA_COPIA + owner.id
}

/**
 * Lee la copia local del layout en uso. Devuelve el layout (objeto, o null si el en uso era el
 * predeterminado) o null si no hay copia. Las dos cosas terminan en el predeterminado, asi que
 * no hace falta distinguirlas.
 *
 * 🔴 Todo en try/catch: localStorage puede tirar (ventana privada, datos del sitio bloqueados) y
 * una copia rota no puede tumbar la pantalla de venta.
 *
 * @param {string|null} clave
 * @returns {*}
 */
function leer_la_copia(clave) {
	if (!clave) {
		return null
	}
	try {
		let guardado = window.localStorage.getItem(clave)
		if (guardado === null) {
			return null
		}
		return JSON.parse(guardado)
	} catch (e) {
		return null
	}
}

/**
 * Guarda la copia local del layout en uso, solo si cambio.
 *
 * Varios componentes mezclan este mixin y todos miran el store, asi que esto corre varias veces
 * por cada cambio: la comparacion contra lo guardado hace que solo el primero escriba.
 *
 * @param {string|null} clave
 * @param {*} layout objeto, null (predeterminado) o undefined (API que no lo mando)
 * @returns {void}
 */
function escribir_la_copia(clave, layout) {
	if (!clave) {
		return
	}
	try {
		let valor = JSON.stringify(typeof layout == 'undefined' ? null : layout)
		if (window.localStorage.getItem(clave) !== valor) {
			window.localStorage.setItem(clave, valor)
		}
	} catch (e) {
		console.log('diseño de vender: no se pudo guardar la copia local del diseño en uso', e)
	}
}

export default {
	computed: {
		/**
		 * Los diseños del negocio tal como estan en el store. Siempre un array, aunque el modulo
		 * no exista o todavia no haya bajado nada.
		 *
		 * @returns {Array}
		 */
		modelos_de_diseno_de_vender() {
			let modulo = this.$store.state.vender_layout
			return modulo && Array.isArray(modulo.models) ? modulo.models : []
		},

		/**
		 * El layout SIN resolver del diseño en uso: un objeto, o null para el predeterminado.
		 * Ver arriba el orden store -> copia local -> predeterminado.
		 *
		 * @returns {Object|string|null}
		 */
		layout_de_vender_en_uso() {
			let modelos = this.modelos_de_diseno_de_vender

			if (modelos.length) {
				let modelo = diseno_en_uso(modelos)
				return modelo ? modelo.layout : null
			}

			return leer_la_copia(clave_de_la_copia(this.owner))
		},

		/**
		 * El diseño en uso ya resuelto contra el catalogo: {version, etapas: {etapa_1..3}, sacados}.
		 * Tiene TODOS los elementos, esten disponibles o no; lo que se dibuja lo decide
		 * elementos_de_etapa_de_vender().
		 *
		 * @returns {{version: number, etapas: Object, sacados: Array}}
		 */
		diseno_de_vender() {
			return resolver_diseno(this.layout_de_vender_en_uso, this)
		},

		/**
		 * La venta llego al tope de items del negocio (owner.max_items_in_sale). Mientras sea asi
		 * la grilla esconde los elementos que agregan articulos, esten en la etapa que esten, y la
		 * etapa 2 muestra el aviso (lo que antes hacia remito/header-form/Index.vue).
		 *
		 * @returns {boolean}
		 */
		tope_de_items_de_vender_alcanzado() {
			let owner = this.owner
			if (!owner || !owner.max_items_in_sale) {
				return false
			}
			return this.$store.state.vender.items.length >= owner.max_items_in_sale
		},
	},
	watch: {
		/**
		 * Cada vez que el store trae diseños, se guarda la copia local del que esta en uso, para
		 * la proxima sesion sin conexion. `immediate` porque lo normal es que el store ya este
		 * lleno cuando se entra a Vender (baja al iniciar sesion) y ahi no hay ningun cambio que
		 * mirar. Un store vacio no borra la copia: justamente es cuando se la necesita.
		 */
		modelos_de_diseno_de_vender: {
			immediate: true,
			handler(modelos) {
				if (!modelos.length) {
					return
				}
				let modelo = diseno_en_uso(modelos)
				escribir_la_copia(clave_de_la_copia(this.owner), modelo ? modelo.layout : null)
			},
		},
	},
	methods: {
		/**
		 * Los items que se dibujan en una etapa: elementos disponibles para este negocio/usuario y
		 * separadores (sin los que quedan colgando). Ver elementos_visibles() del contrato.
		 *
		 * @param {string} etapa 'etapa_1' | 'etapa_2' | 'etapa_3'
		 * @param {Object} [opciones] las de elementos_visibles() (excluir, limpiar_separadores)
		 * @returns {Array}
		 */
		elementos_de_etapa_de_vender(etapa, opciones) {
			return elementos_visibles(this.diseno_de_vender, etapa, this, opciones)
		},

		/**
		 * Si la etapa tiene al menos un campo (no separador) para dibujar. Una etapa que no tiene
		 * ninguno no se dibuja.
		 *
		 * @param {string} etapa
		 * @returns {boolean}
		 */
		etapa_de_vender_tiene_elementos(etapa) {
			return etapa_tiene_elementos(this.diseno_de_vender, etapa, this)
		},

		/**
		 * Si la etapa tiene algun campo que agrega articulos a la venta (codigo de barras,
		 * buscador, combos, promociones, servicio, cantidad). Una etapa asi tiene que arrancar
		 * abierta: el vendedor no puede escanear en una etapa plegada.
		 *
		 * No mira el tope de items: es una pregunta sobre el diseño, no sobre la venta.
		 *
		 * @param {string} etapa
		 * @returns {boolean}
		 */
		etapa_de_vender_tiene_entrada_de_articulos(etapa) {
			let tiene = false
			this.elementos_de_etapa_de_vender(etapa).forEach(function (item) {
				if (es_entrada_de_articulos(item.key)) {
					tiene = true
				}
			})
			return tiene
		},

		/**
		 * Si el elemento se dibuja en esa etapa del diseño en uso.
		 *
		 * @param {string} key
		 * @param {string} etapa
		 * @returns {boolean}
		 */
		elemento_de_vender_esta_en_la_etapa(key, etapa) {
			let esta = false
			this.elementos_de_etapa_de_vender(etapa).forEach(function (item) {
				if (item.key === key) {
					esta = true
				}
			})
			return esta
		},

		/**
		 * Si el diseño en uso muestra el elemento en alguna etapa (ubicado y disponible para este
		 * negocio). Un elemento sacado, o de una extension apagada, no esta visible.
		 *
		 * @param {string} key
		 * @returns {boolean}
		 */
		elemento_de_vender_esta_visible(key) {
			let self = this
			let visible = false
			ETAPAS.forEach(function (etapa) {
				if (!visible && self.elemento_de_vender_esta_en_la_etapa(key, etapa)) {
					visible = true
				}
			})
			return visible
		},

		/**
		 * Pide llevar el foco a un campo de Vender, este en la etapa que este: la etapa que lo
		 * tiene se abre, lo trae a la vista y lo enfoca (ver enfocar_elemento_de_vender_en_esta_etapa).
		 *
		 * Si el diseño en uso no muestra ese campo avisa con un toast y no pide nada: sin el aviso
		 * el atajo o el lapiz no harian nada visible y el vendedor pensaria que se rompio.
		 *
		 * Un campo que el diseño muestra pero que hoy no se dibuja (un elemento de entrada con el
		 * tope de items alcanzado, la caja con el pago repartido) no avisa: la etapa no lo
		 * encuentra y no pasa nada, igual que antes de los diseños.
		 *
		 * @param {string} key key del catalogo (layout/elementos.js)
		 * @param {Object} [opciones]
		 * @param {string} [opciones.selector] que enfocar adentro del campo (por defecto el primer input/select/textarea)
		 * @param {boolean} [opciones.seleccionar] seleccionar el texto despues de enfocar
		 * @returns {boolean} si se pidio el foco
		 */
		enfocar_elemento_de_vender(key, opciones) {
			if (key === KEY_SEPARADOR || !this.elemento_de_vender_esta_visible(key)) {
				this.$toast.warning(AVISO_CAMPO_FUERA_DEL_DISENO)
				return false
			}

			this.$root.$emit(EVENTO_ENFOCAR_ELEMENTO, key, opciones || {})
			return true
		},

		/**
		 * La parte del enfoque que le toca a la etapa que tiene el elemento, despues de abrirse:
		 * trae el campo a la vista y le da el foco. La llama cada etapa desde su escucha de
		 * EVENTO_ENFOCAR_ELEMENTO; `this` es la etapa.
		 *
		 * El metodo de pago no se enfoca aca: lo hace PaymentMethod.vue escuchando
		 * `vender:focus-payment-method`, porque ademas despliega el select como lista. Van los dos
		 * $nextTick de antes: el componente es asincrono y el select tiene que estar dibujado.
		 *
		 * @param {string} key
		 * @param {Object} [opciones] las de enfocar_elemento_de_vender()
		 * @param {string} bloque alineacion de scrollIntoView: cada etapa dice la suya (ver sus comentarios)
		 * @returns {void}
		 */
		enfocar_elemento_de_vender_en_esta_etapa(key, opciones, bloque) {
			let self = this
			let config = opciones || {}

			/* Primero se deja que Vue dibuje la etapa recien abierta (el v-show del cuerpo) */
			this.$nextTick(function () {
				let raiz = self.$el
				if (!raiz || typeof raiz.querySelector != 'function') {
					return
				}

				let item = raiz.querySelector('[data-vender-elemento="' + key + '"]')
				if (!item) {
					/* No se esta dibujando: p. ej. un elemento de entrada con el tope de items alcanzado */
					return
				}

				item.scrollIntoView({ behavior: 'smooth', block: bloque || 'start' })

				if (key === 'metodo_de_pago') {
					self.$nextTick(function () {
						self.$nextTick(function () {
							self.$root.$emit('vender:focus-payment-method')
						})
					})
					return
				}

				let control = item.querySelector(config.selector || CONTROLES_ENFOCABLES)
				if (!control) {
					return
				}

				control.focus()

				if (config.seleccionar && typeof control.select == 'function') {
					control.select()
				}
			})
		},
	},
}
