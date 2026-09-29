/*
	El "Diseño de Vender" en uso, para todo lo que en Vender depende de DONDE esta cada campo
	(mision diseno-vender-configurable, 28/9/2026).

	Lo mezclan:
	- las tres etapas (components/vender/components/stage-1/2/3/Index.vue): si se dibujan, su
	  subtitulo, si arrancan abiertas y el enfoque de un campo que les toca;
	- la grilla de cada etapa (components/vender/layout/GrillaDeEtapa.vue): que campos dibuja;
	- la reserva (components/vender/layout/ReservaDeElementos.vue): que campos monta escondidos;
	- la barra de resumen (VenderStage1SummaryBar.vue) y los atajos de teclado
	  (mixins/vender/keyboard_shortcuts.js, que lo trae a views/Vender.vue): para llevar el foco a
	  un campo, este en la etapa que este;
	- el aviso de los descuentos/recargos del cliente (mixins/vender/ajustes_del_cliente.js): para
	  decir en que etapa estan los paneles.

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
	no nombra y descarta lo que no conoce, y despues por aplicar_elementos_forzados(), que vuelve a
	su lugar lo que el diseño saco pero este usuario necesita igual (la cantidad, con "pedir la
	cantidad al vender" prendido). Lo que sale de aca es siempre un diseño completo.

	🔴 La copia de localStorage es por DUEÑO y no por usuario: el diseño en uso es uno para todo el
	negocio (decision de Lucas, 28/9/2026), asi que un empleado que entra sin conexion ve el mismo
	que vio cualquier otro usuario del negocio en esa computadora.

	-------------------------------------------------------------------------------------------------
	🔴 Que se DIBUJA y que se MONTA no es lo mismo
	-------------------------------------------------------------------------------------------------

	Antes de los diseños cada componente de las tres etapas estaba SIEMPRE montado: el v-if vivia
	adentro de cada uno, y varios hacen cosas al montarse o miran el store aunque no se vean (ver
	ReservaDeElementos.vue). Para no perder eso:
	- La grilla de una etapa monta TODOS los campos ubicados en ella, esten disponibles o no; el que
	  no corresponde se esconde solo con su v-if y la celda vacia no ocupa lugar (:empty).
	  items_de_la_grilla_de_vender().
	- Lo que ninguna grilla monta (los sacados, y lo ubicado en una etapa que no se dibuja) lo monta
	  la reserva, escondido. elementos_de_la_reserva_de_vender().
	- Unica excepcion, igual que antes: con el tope de items por venta alcanzado, los campos que
	  agregan articulos no se montan en ningun lado (antes los sacaba el v-if de
	  remito/header-form/Index.vue).
	elementos_de_etapa_de_vender() (los DISPONIBLES) queda para lo que es del diseño y no del
	montaje: que marcadores se dibujan, el subtitulo, si la etapa tiene campos y si se mantiene
	abierta.

	-------------------------------------------------------------------------------------------------
	Llevar el foco a un campo (reemplaza al evento viejo que solo sabia abrir la etapa 1)
	-------------------------------------------------------------------------------------------------

	Con un diseño, el metodo de pago o el cliente pueden estar en cualquier etapa, asi que quien
	pide el foco (los lapices de la barra de resumen, F1 a F4, el tour de la demo) no puede saber
	que etapa abrir. El pedido viaja por el evento de $root EVENTO_ENFOCAR_ELEMENTO con la key del
	elemento; cada etapa lo escucha, y la que lo dibuja se abre y lo enfoca
	(enfocar_elemento_de_vender_en_esta_etapa). Se pide con enfocar_elemento_de_vender(), que avisa
	si el campo se puede usar pero el diseño en uso no lo muestra.
*/
import {
	resolver_diseno,
	elementos_visibles,
	etapa_tiene_elementos,
	etapa_se_mantiene_abierta,
	aplicar_elementos_forzados,
	diseno_en_uso,
} from '@/components/vender/layout/resolver_diseno'
import {
	ELEMENTOS,
	ETAPAS,
	es_marcador,
	es_entrada_de_articulos,
	esta_disponible,
} from '@/components/vender/layout/elementos'

/* Evento de $root para llevar el foco a un elemento del diseño: (key, opciones). Lo escuchan las tres etapas. */
export const EVENTO_ENFOCAR_ELEMENTO = 'vender:enfocar-elemento'

/* Prefijo de la copia local del layout en uso; se completa con el id del dueño. */
const PREFIJO_DE_LA_COPIA = 'vender_layout_en_uso_'

/* Aviso cuando se pide el foco de un campo que este negocio puede usar pero el diseño en uso saco. */
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
		 * El diseño en uso, resuelto contra el catalogo y con los elementos forzados de este
		 * usuario de vuelta en su lugar: {version, etapas: {etapa_1..3}, sacados}. Tiene TODOS los
		 * elementos, esten disponibles o no.
		 *
		 * aplicar_elementos_forzados() va aca y no en el editor, a proposito: el editor muestra el
		 * diseño tal como se guardo (con la cantidad en la bandeja y el aviso de que igual
		 * aparece); Vender lo dibuja como lo necesita este usuario.
		 *
		 * @returns {{version: number, etapas: Object, sacados: Array}}
		 */
		diseno_de_vender() {
			return aplicar_elementos_forzados(resolver_diseno(this.layout_de_vender_en_uso, this), this)
		},

		/**
		 * La venta llego al tope de items del negocio (owner.max_items_in_sale). Mientras sea asi
		 * los campos que agregan articulos no se montan en ningun lado, esten en la etapa que
		 * esten, y la etapa 2 muestra el aviso (lo que antes hacia remito/header-form/Index.vue).
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
		 * Los items DISPONIBLES de una etapa: elementos que este negocio/usuario puede usar y
		 * marcadores (sin los que quedan colgando). Ver elementos_visibles() del contrato.
		 *
		 * Es la vista del DISEÑO (subtitulo, si la etapa tiene campos, que marcadores se dibujan),
		 * no la del montaje: la grilla monta mas que esto (ver items_de_la_grilla_de_vender).
		 *
		 * @param {string} etapa 'etapa_1' | 'etapa_2' | 'etapa_3'
		 * @param {Object} [opciones] las de elementos_visibles() (excluir, limpiar_separadores)
		 * @returns {Array}
		 */
		elementos_de_etapa_de_vender(etapa, opciones) {
			return elementos_visibles(this.diseno_de_vender, etapa, this, opciones)
		},

		/**
		 * Si la etapa tiene al menos un campo disponible (no marcador).
		 *
		 * @param {string} etapa
		 * @returns {boolean}
		 */
		etapa_de_vender_tiene_elementos(etapa) {
			return etapa_tiene_elementos(this.diseno_de_vender, etapa, this)
		},

		/**
		 * Si la etapa no puede arrancar plegada ni plegarse sola: tiene un campo que agrega
		 * articulos (hay que poder escanear) o el resumen de la venta (es obligatorio justamente
		 * para que el total se vea). Ver etapa_se_mantiene_abierta() del contrato.
		 *
		 * No mira el tope de items: es una pregunta sobre el diseño, no sobre la venta.
		 *
		 * @param {string} etapa
		 * @returns {boolean}
		 */
		etapa_de_vender_se_mantiene_abierta(etapa) {
			return etapa_se_mantiene_abierta(this.diseno_de_vender, etapa, this)
		},

		/**
		 * Si la grilla de la etapa se dibuja. Las etapas 1 y 3 enteras se dibujan solo si tienen
		 * algun campo disponible; la etapa 2 esta siempre (la tabla de articulos es fija), pero su
		 * grilla solo con campos o con el aviso del tope de items.
		 *
		 * 🔴 Es la UNICA regla de "que grilla se dibuja": la usan las etapas para su v-if y la
		 * reserva para saber que le toca montar a ella. Si divergieran, un campo quedaria montado
		 * dos veces (ids repetidos: getElementById devuelve el primero) o en ningun lado.
		 *
		 * @param {string} etapa
		 * @returns {boolean}
		 */
		grilla_de_vender_se_dibuja(etapa) {
			if (this.etapa_de_vender_tiene_elementos(etapa)) {
				return true
			}
			return etapa === 'etapa_2' && this.tope_de_items_de_vender_alcanzado
		},

		/**
		 * Si el campo es de los que agregan articulos y la venta llego al tope de items: no se
		 * monta en ningun lado mientras dure.
		 *
		 * @param {string} key
		 * @returns {boolean}
		 */
		elemento_de_vender_excluido_por_el_tope(key) {
			return this.tope_de_items_de_vender_alcanzado && es_entrada_de_articulos(key)
		},

		/**
		 * Los items que monta la grilla de una etapa, en orden:
		 * - TODOS los campos ubicados en ella, esten disponibles o no (el que no corresponde se
		 *   esconde solo con su v-if y la celda vacia no ocupa lugar), menos los que agregan
		 *   articulos con el tope alcanzado;
		 * - de los marcadores, solo los que sobreviven a la limpieza de elementos_visibles() (sin
		 *   separadores colgando donde los campos de alrededor no estan disponibles).
		 * Si la grilla de la etapa no se dibuja, ninguno: esos campos los monta la reserva.
		 *
		 * @param {string} etapa
		 * @returns {Array}
		 */
		items_de_la_grilla_de_vender(etapa) {
			if (!this.grilla_de_vender_se_dibuja(etapa)) {
				return []
			}

			let self = this

			/* Ids de los marcadores que quedan despues de limpiar (con el tope ya aplicado) */
			let marcadores_que_quedan = {}
			this.elementos_de_etapa_de_vender(etapa, {
				excluir: function (item) {
					return self.elemento_de_vender_excluido_por_el_tope(item.key)
				},
			}).forEach(function (item) {
				if (es_marcador(item.key)) {
					marcadores_que_quedan[item.id] = true
				}
			})

			let ubicados = (this.diseno_de_vender.etapas && this.diseno_de_vender.etapas[etapa]) || []
			let items = []

			ubicados.forEach(function (item) {
				if (es_marcador(item.key)) {
					if (marcadores_que_quedan[item.id]) {
						items.push(item)
					}
					return
				}
				if (self.elemento_de_vender_excluido_por_el_tope(item.key)) {
					return
				}
				items.push(item)
			})

			return items
		},

		/**
		 * Si la grilla de esa etapa monta el campo.
		 *
		 * @param {string} key
		 * @param {string} etapa
		 * @returns {boolean}
		 */
		elemento_de_vender_se_dibuja_en_la_etapa(key, etapa) {
			let esta = false
			this.items_de_la_grilla_de_vender(etapa).forEach(function (item) {
				if (item.key === key) {
					esta = true
				}
			})
			return esta
		},

		/**
		 * En que etapa monta su grilla el campo, o null si ninguna (esta sacado, en una etapa que
		 * no se dibuja, o afuera por el tope de items).
		 *
		 * @param {string} key
		 * @returns {string|null}
		 */
		etapa_donde_se_dibuja_elemento_de_vender(key) {
			let self = this
			let encontrada = null
			ETAPAS.forEach(function (etapa) {
				if (encontrada === null && self.elemento_de_vender_se_dibuja_en_la_etapa(key, etapa)) {
					encontrada = etapa
				}
			})
			return encontrada
		},

		/**
		 * Los campos del catalogo que no monta ninguna grilla y por lo tanto monta la reserva
		 * (layout/ReservaDeElementos.vue), escondidos: los sacados del diseño y los ubicados en una
		 * etapa que no se dibuja. Nunca uno que ya monte una grilla (quedaria dos veces), y nunca
		 * los que agregan articulos con el tope alcanzado (esos no van en ningun lado).
		 *
		 * @returns {Array<string>} keys, en el orden del catalogo
		 */
		elementos_de_la_reserva_de_vender() {
			let self = this
			let montados = {}

			ETAPAS.forEach(function (etapa) {
				self.items_de_la_grilla_de_vender(etapa).forEach(function (item) {
					if (!es_marcador(item.key)) {
						montados[item.key] = true
					}
				})
			})

			let keys = []

			ELEMENTOS.forEach(function (el) {
				if (montados[el.key] || self.elemento_de_vender_excluido_por_el_tope(el.key)) {
					return
				}
				keys.push(el.key)
			})

			return keys
		},

		/**
		 * Pide llevar el foco a un campo de Vender, este en la etapa que este: la etapa que lo
		 * monta se abre, lo trae a la vista y lo enfoca (ver enfocar_elemento_de_vender_en_esta_etapa).
		 *
		 * Cuando no se puede, en este orden:
		 * - con el tope de items alcanzado, un campo que agrega articulos no existe: no hace nada,
		 *   como antes de los diseños (F1/F2 no encontraban el input);
		 * - si este negocio no puede usar el campo (extension apagada, sin permiso: p. ej. F2 con
		 *   no_usar_codigos_de_barra), no hace nada, como antes;
		 * - si lo puede usar pero el diseño en uso lo saco, avisa con un toast: sin el aviso el
		 *   atajo o el lapiz no harian nada visible y el vendedor pensaria que se rompio.
		 *
		 * Un campo que el diseño ubica pero que este negocio no puede usar se pide igual: su
		 * componente decide si se muestra (la lista de precios se ve al editar un comprobante que
		 * tiene lista aunque la cuenta no venda con listas, igual que antes). Si no muestra nada, la
		 * etapa no hace nada (ver elemento_de_vender_listo_en_esta_etapa).
		 *
		 * @param {string} key key del catalogo (layout/elementos.js)
		 * @param {Object} [opciones]
		 * @param {string} [opciones.selector] que enfocar adentro del campo (por defecto el primer input/select/textarea)
		 * @param {boolean} [opciones.seleccionar] seleccionar el texto despues de enfocar
		 * @returns {boolean} si se pidio el foco
		 */
		enfocar_elemento_de_vender(key, opciones) {
			if (es_marcador(key) || this.elemento_de_vender_excluido_por_el_tope(key)) {
				return false
			}

			if (this.etapa_donde_se_dibuja_elemento_de_vender(key)) {
				this.$root.$emit(EVENTO_ENFOCAR_ELEMENTO, key, opciones || {})
				return true
			}

			if (esta_disponible(key, this)) {
				this.$toast.warning(AVISO_CAMPO_FUERA_DEL_DISENO)
			}

			return false
		},

		/**
		 * Si esta etapa (this) monta el campo en su grilla Y el componente esta mostrando algo. Lo
		 * preguntan las etapas antes de abrirse para un pedido de foco: abrir una etapa plegada
		 * por un campo que no dibuja nada (la caja con el pago repartido, un campo de una
		 * extension apagada) no le sirve de nada al vendedor.
		 *
		 * Mira el DOM (el primer hijo elemento del item) porque "mostrar algo" lo decide el v-if
		 * de cada componente, que desde aca no se ve. El cuerpo plegado es v-show, asi que el
		 * item existe aunque la etapa este cerrada.
		 *
		 * @param {string} key
		 * @param {string} etapa la de this
		 * @returns {boolean}
		 */
		elemento_de_vender_listo_en_esta_etapa(key, etapa) {
			if (!this.elemento_de_vender_se_dibuja_en_la_etapa(key, etapa)) {
				return false
			}

			let raiz = this.$el
			if (!raiz || typeof raiz.querySelector != 'function') {
				return false
			}

			let item = raiz.querySelector('[data-vender-elemento="' + key + '"]')
			return !!(item && item.firstElementChild)
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
