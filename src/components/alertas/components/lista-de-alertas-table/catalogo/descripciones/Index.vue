<template>
<div
class="desc-revision"
data-testid="alertas-descripciones"
:data-solapa="solapa">

	<div
	class="desc-revision__encabezado"
	data-testid="descripciones-encabezado">
		<h2 class="desc-revision__titulo">{{ textos.titulo }}</h2>
		<p class="desc-revision__intro">{{ textos.intro }}</p>
	</div>

	<div class="desc-revision__tarjeta">

		<!--
			Las dos solapas con la cantidad de cada una en el nombre. Es el horizontal-nav del sistema en
			modo autonomo, igual que la revision de categorias: el componente pinta y avisa; que pedir lo
			decide esta seccion. Los numeros salen de los conteos vivos que mantiene el store.
		-->
		<div
		ref="solapas"
		class="desc-revision__solapas">
			<horizontal-nav
			v-if="solapa"
			:items="items_de_solapas"
			:selected_item_value="solapa"
			:show_display="false"
			emitir_setSelected_al_inicio
			@setSelected="al_elegir_solapa"></horizontal-nav>
		</div>

		<p
		v-if="items.length"
		class="desc-revision__nota"
		:data-testid="'descripciones-nota-' + (solapa === 'a_revisar' ? 'a-revisar' : 'publicadas')">
			<i
			class="bi bi-info-circle"
			aria-hidden="true"></i>
			<span>{{ solapa === 'a_revisar' ? textos.nota_a_revisar : textos.nota_publicadas }}</span>
		</p>

		<barra-de-descripciones
		v-model="buscar_input"
		:solapa="solapa"
		:cantidad_en_pagina="items.length"
		:cantidad_seleccionados="seleccionados.length"
		:todos_seleccionados="todos_seleccionados"
		:algunos_seleccionados="algunos_seleccionados"
		:ocupado="lote_en_curso"
		@seleccionar_pagina="seleccionar_pagina"
		@aprobar_seleccionadas="resolver_seleccionadas('aprobar')"
		@descartar_seleccionadas="resolver_seleccionadas('descartar')"></barra-de-descripciones>

		<div
		class="desc-revision__contenido"
		:data-solapa="solapa">

			<div
			v-if="cargando_items && !items.length"
			class="desc-revision__cargando"
			data-testid="descripciones-items-cargando">
				<b-spinner
				small
				variant="primary"></b-spinner>
				<span>Cargando descripciones…</span>
			</div>

			<empty-state
			v-else-if="error_items && !items.length"
			data-testid="descripciones-items-error"
			icon_class="bi bi-cloud-slash"
			:title="textos.error.titulo"
			:hint="textos.error.pista">
				<b-button
				class="btn-modulo"
				variant="outline-primary"
				data-testid="descripciones-items-reintentar"
				@click="cargar_items()">
					Reintentar
				</b-button>
			</empty-state>

			<empty-state
			v-else-if="!items.length"
			data-testid="descripciones-vacio"
			:icon_class="vacio.icono"
			:title="vacio.titulo"
			:hint="vacio.pista"></empty-state>

			<transition-group
			v-else
			tag="ul"
			name="desc-rev-fila"
			class="desc-revision__lista"
			:class="{ 'desc-revision__lista--cargando': cargando_items }"
			:data-testid="'descripciones-lista-' + solapa">
				<fila-de-descripcion
				v-for="item in items"
				:key="item.article_id"
				:item="item"
				:solapa="solapa"
				:seleccionado="esta_seleccionado(item.article_id)"
				:procesando="esta_procesando(item.article_id)"
				:editando="esta_editando(item.article_id)"
				@seleccionar="al_seleccionar(item, $event)"
				@aprobar="aprobar(item)"
				@descartar="descartar(item)"
				@editar="empezar_a_editar(item)"
				@cancelar_edicion="dejar_de_editar(item.article_id)"
				@guardar="guardar(item, $event)"
				@quitar="quitar(item)"></fila-de-descripcion>
			</transition-group>

			<paginacion-de-descripciones
			:total="total_items"
			:pagina="pagina"
			:por_pagina="por_pagina"
			:cargando="cargando_items"
			@cambiar_pagina="cambiar_pagina"
			@cambiar_por_pagina="cambiar_por_pagina"></paginacion-de-descripciones>

		</div>
	</div>

</div>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
import EmptyState from '@/common-vue/components/display/EmptyState'
import BarraDeDescripciones from '@/components/alertas/components/lista-de-alertas-table/catalogo/descripciones/BarraDeDescripciones'
import FilaDeDescripcion from '@/components/alertas/components/lista-de-alertas-table/catalogo/descripciones/FilaDeDescripcion'
import PaginacionDeDescripciones from '@/components/alertas/components/lista-de-alertas-table/catalogo/descripciones/PaginacionDeDescripciones'
import { SOLAPAS, SOLAPAS_VALIDAS, TEXTOS, cantidad_de_descripciones, entero_es, frase_del_lote, frase_de_las_omitidas } from '@/components/alertas/components/lista-de-alertas-table/catalogo/descripciones/textos'
import { avisar } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/avisos'
import { es_cancelacion } from '@/store/ai_description_review'

/** Espera antes de buscar mientras se escribe (la misma que la revisión de categorías). */
const ESPERA_BUSCADOR_MS = 400

/**
 * Espera antes de pedir el número rojo después de una acción: quien revisa aprueba varias seguidas,
 * y con esto se pide una sola vez al final de la racha (lo mismo que categorias/Index.vue).
 */
const ESPERA_RESUMEN_MS = 600

/**
 * Sub-solapa Descripciones de Alertas → Catálogo (misión alertas-descripciones, 14/10/2026).
 *
 * Cuando la IA arma la descripción de un artículo y no está segura de que la información que
 * encontró corresponda exactamente a ese producto, la API no la publica: la deja acá, en "A revisar",
 * y recién al aprobarla pasa a verse en la tienda y en la ficha del artículo (decisión D1). "Publicadas"
 * muestra las de IA que ya se ven, para corregir o quitar alguna que se haya colado mal (D3). La ve
 * todo el que ve Catálogo (D2).
 *
 * Es el mismo recorrido que la revisión de categorías (categorias/RevisionDeDudosos.vue): dos solapas
 * con su cantidad, buscador por nombre o código, paginado en el servidor (25, 50 o 100) y, en "A
 * revisar", aprobar y descartar de a una o de a muchas. Además se puede editar cada una en el lugar.
 *
 *  - Cada acción saca la fila de la lista (A revisar, o Quitar en Publicadas) o la reemplaza por la
 *    que devuelve la API (Guardar en Publicadas), muestra un aviso corto y, al final de la racha, pide
 *    el número rojo. Los números de las solapas no se ajustan a mano: cada respuesta trae los conteos
 *    y el store los aplica.
 *  - Aprobar o descartar de a muchas pide confirmación y usa el cargando global. Quitar una publicada
 *    también pide confirmación: es la única acción de a una que borra algo que ya se ve.
 *  - Los errores los muestra el interceptor global (un 4xx con `message` sale como aviso): acá no se
 *    repite el toast. Si una acción falla, la lista se vuelve a pedir para mostrar lo real (otra
 *    persona pudo haberla resuelto), salvo un 422 al guardar: ahí la edición queda abierta con lo
 *    escrito para corregirlo.
 */
export default {
	components: {
		HorizontalNav,
		EmptyState,
		BarraDeDescripciones,
		FilaDeDescripcion,
		PaginacionDeDescripciones,
	},
	data() {
		return {
			textos: TEXTOS,
			/** Solapa visible: a_revisar | publicadas (la decide `created`). */
			solapa: null,
			/** Página visible de artículos (normalizados por el store). */
			items: [],
			pagina: 1,
			por_pagina: 25,
			/** Total de la solapa con el buscador aplicado. */
			total_items: 0,
			ultima_pagina: 1,
			cargando_items: false,
			error_items: false,
			/** true una vez que llegó al menos una página de la solapa actual. */
			items_cargados: false,
			/** Texto que se está escribiendo en el buscador. */
			buscar_input: '',
			/** Texto confirmado (después de la espera) con el que se pide. */
			buscar: '',
			timer_buscar: null,
			/** Ids de artículo tildados en "A revisar". */
			seleccionados: [],
			/** Ids de artículo con una acción en vuelo (sus botones se apagan). */
			procesando_ids: [],
			/** Ids de artículo con la edición abierta. */
			editando_ids: [],
			/** true mientras viaja un aprobar / descartar en lote. */
			lote_en_curso: false,
			/** true mientras hay una caja de confirmación abierta (un doble clic no abre dos). */
			confirmacion_abierta: false,
			/** Contador de pedidos de la lista: una respuesta vieja no pisa una más nueva. */
			pedido_de_items: 0,
			/** Timer del pedido del número rojo (ver `programar_resumen`). */
			timer_resumen: null,
		}
	},
	computed: {
		/** Los conteos vivos de las dos solapas (los mantiene el store con cada respuesta). */
		conteos() {
			return this.$store.getters['ai_description_review/conteos']
		},
		/**
		 * Lo que se incrementa cada vez que alguien pide volver a traer la lista (volver a tocar la
		 * pestaña, "Revisar ahora" estando ya acá). Ver `pedidos_de_recarga` en el store.
		 *
		 * @returns {Number}
		 */
		pedidos_de_recarga() {
			return this.$store.state.ai_description_review.pedidos_de_recarga
		},
		/**
		 * Items del horizontal-nav: "A revisar (3)". `route_value` es el valor de la solapa (el nombre
		 * lleva la cantidad, que cambia) y `testid` deja un data-testid fijo:
		 * nav-item-descripciones-solapa-a_revisar / nav-item-descripciones-solapa-publicadas.
		 *
		 * @returns {Array}
		 */
		items_de_solapas() {
			let self = this
			let items = []
			SOLAPAS.forEach(function (solapa) {
				items.push({
					name: solapa.nombre + ' (' + entero_es(self.conteo(solapa.valor)) + ')',
					route_value: solapa.valor,
					testid: 'descripciones-solapa-' + solapa.valor,
				})
			})
			return items
		},
		todos_seleccionados() {
			let self = this
			return self.items.length > 0 && self.items.every(function (item) {
				return self.esta_seleccionado(item.article_id)
			})
		},
		algunos_seleccionados() {
			return this.seleccionados.length > 0 && !this.todos_seleccionados
		},
		/**
		 * Qué decir cuando la solapa está vacía: no es lo mismo no encontrar nada buscando que no tener
		 * nada para revisar (que es una buena noticia).
		 *
		 * @returns {{icono: String, titulo: String, pista: String}}
		 */
		vacio() {
			if (this.buscar) {
				return {
					icono: 'bi bi-search',
					titulo: 'Ninguna descripción coincide con «' + this.buscar + '»',
					pista: 'Probá con otra parte del nombre o con el código de barras.',
				}
			}
			return this.solapa === 'publicadas' ? TEXTOS.vacio.publicadas : TEXTOS.vacio.a_revisar
		},
	},
	watch: {
		/**
		 * Buscador: espera a que se deje de escribir y recién ahí pide, desde la primera página. Si el
		 * texto confirmado no cambió, no pide nada.
		 */
		buscar_input(texto) {
			let limpio = String(texto || '').trim()
			clearTimeout(this.timer_buscar)
			if (limpio === this.buscar) {
				return
			}
			this.timer_buscar = setTimeout(() => {
				this.buscar = limpio
				this.pagina = 1
				this.seleccionados = []
				this.cargar_items()
			}, ESPERA_BUSCADOR_MS)
		},
		/**
		 * Alguien pidió volver a traer la lista. Si pidió una solapa ("Revisar ahora" y "Revisar en
		 * Alertas" piden A revisar) y es otra que la abierta, se pasa a esa; si no, se vuelve a pedir la
		 * página actual, con lo que está a la vista apagado.
		 */
		pedidos_de_recarga() {
			let pedida = this.$store.state.ai_description_review.solapa_de_la_recarga
			if (SOLAPAS_VALIDAS.indexOf(pedida) !== -1 && pedida !== this.solapa) {
				this.cambiar_solapa(pedida)
				return
			}
			this.cargar_items()
		},
	},
	created() {
		this.solapa = this.solapa_inicial()
		this.cargar_items()
		// El número rojo puede venir de hace rato (se pidió al iniciar sesión): al entrar se pide de
		// nuevo para que la pestaña y la lista digan lo mismo.
		this.$store.dispatch('ai_description_review/get_resumen')
	},
	beforeDestroy() {
		clearTimeout(this.timer_buscar)
		// Si quedó pendiente el pedido del número rojo, sale ahora: si no, el número quedaría viejo
		// hasta el próximo inicio de sesión.
		if (this.timer_resumen) {
			clearTimeout(this.timer_resumen)
			this.timer_resumen = null
			this.$store.dispatch('ai_description_review/get_resumen')
		}
	},
	methods: {
		/**
		 * Un conteo como número, con cero si no vino.
		 *
		 * @param {String} valor a_revisar | publicadas
		 * @returns {Number}
		 */
		conteo(valor) {
			return Number(this.conteos ? this.conteos[valor] : 0) || 0
		},
		/**
		 * Con qué solapa abrir: la que pida la URL (`?solapa=a_revisar`, que es lo que mandan "Revisar
		 * ahora" y "Revisar en Alertas"); si no, "A revisar", salvo que no tenga nada y "Publicadas" sí
		 * (así no se abre en una lista vacía teniendo algo para mirar).
		 *
		 * @returns {String}
		 */
		solapa_inicial() {
			let pedida = this.$route && this.$route.query ? this.$route.query.solapa : null
			if (SOLAPAS_VALIDAS.indexOf(pedida) !== -1) {
				return pedida
			}
			if (this.conteo('a_revisar') === 0 && this.conteo('publicadas') > 0) {
				return 'publicadas'
			}
			return 'a_revisar'
		},
		/**
		 * Pide la página actual de la solapa actual. Con `{ silencioso: true }` no muestra el estado de
		 * carga ni el de error (refrescos que la persona no pidió).
		 *
		 * Si la página quedó fuera de rango (se resolvieron las últimas de la última página), va a la
		 * última que exista.
		 *
		 * @param {Object} opciones { silencioso: Boolean, reintento: Boolean }
		 * @returns {Promise}
		 */
		cargar_items(opciones) {
			let self = this
			if (!self.solapa) {
				return Promise.resolve()
			}
			let silencioso = !!(opciones && opciones.silencioso)
			self.pedido_de_items++
			let este_pedido = self.pedido_de_items

			if (!silencioso) {
				self.cargando_items = true
				self.error_items = false
			}

			return self.$store.dispatch('ai_description_review/get_items', {
				solapa: self.solapa,
				pagina: self.pagina,
				por_pagina: self.por_pagina,
				buscar: self.buscar,
			})
			.then(datos => {
				if (este_pedido !== self.pedido_de_items) {
					return
				}
				self.total_items = datos.total
				self.ultima_pagina = datos.ultima_pagina

				if (!datos.models.length && self.total_items > 0 && self.pagina > self.ultima_pagina) {
					self.pagina = self.ultima_pagina
					return self.cargar_items(opciones)
				}

				self.items = datos.models
				self.recortar_a_lo_visible()
				self.items_cargados = true
				self.cargando_items = false
				self.error_items = false
			})
			.catch(err => {
				console.log(err)
				if (este_pedido !== self.pedido_de_items) {
					return
				}
				// Una cancelación no es un error. Si todavía no había llegado ninguna página, se vuelve a
				// pedir una vez (si no, la solapa quedaría vacía como si no tuviera nada); si la lista ya
				// estaba a la vista, queda lo que se estaba mostrando.
				if (es_cancelacion(err) && !self.items_cargados && !(opciones && opciones.reintento)) {
					return self.cargar_items(Object.assign({}, opciones || {}, { reintento: true }))
				}
				self.cargando_items = false
				if (es_cancelacion(err) && self.items_cargados) {
					return
				}
				if (!silencioso) {
					self.error_items = true
				}
			})
		},
		/**
		 * Clic en una solapa del horizontal-nav.
		 *
		 * @param {Object} item Item del nav ({ name, route_value, testid }).
		 */
		al_elegir_solapa(item) {
			this.cambiar_solapa(item ? item.route_value : null)
		},
		/**
		 * Cambia de solapa y pide su primera página. Volver a tocar la solapa activa recarga: es la
		 * forma de ver lo último. El buscador se conserva; lo que se estaba editando, no (es otra lista).
		 *
		 * @param {String} valor
		 */
		cambiar_solapa(valor) {
			if (SOLAPAS_VALIDAS.indexOf(valor) === -1) {
				return
			}
			this.solapa = valor
			this.pagina = 1
			this.seleccionados = []
			this.editando_ids = []
			this.items = []
			this.total_items = 0
			this.items_cargados = false
			this.cargar_items()
		},
		/**
		 * @param {Number} numero Página elegida en la paginación.
		 */
		cambiar_pagina(numero) {
			this.pagina = Number(numero) || 1
			this.seleccionados = []
			this.cargar_items()
			this.subir_a_las_solapas()
		},
		/**
		 * @param {Number} cantidad 25, 50 o 100.
		 */
		cambiar_por_pagina(cantidad) {
			this.por_pagina = Number(cantidad) || 25
			this.pagina = 1
			this.seleccionados = []
			this.cargar_items()
		},
		/** Después de cambiar de página, la lista nueva arranca arriba: se lleva la vista a las solapas. */
		subir_a_las_solapas() {
			this.$nextTick(() => {
				let solapas = this.$refs.solapas
				if (solapas && typeof solapas.scrollIntoView === 'function') {
					solapas.scrollIntoView({ block: 'start', behavior: 'smooth' })
				}
			})
		},
		esta_seleccionado(id) {
			return this.seleccionados.indexOf(id) !== -1
		},
		esta_procesando(id) {
			return this.procesando_ids.indexOf(id) !== -1
		},
		esta_editando(id) {
			return this.editando_ids.indexOf(id) !== -1
		},
		/**
		 * Tilde de una fila de "A revisar".
		 *
		 * @param {Object} item
		 * @param {Boolean} valor
		 */
		al_seleccionar(item, valor) {
			if (valor) {
				if (!this.esta_seleccionado(item.article_id)) {
					this.seleccionados.push(item.article_id)
				}
				return
			}
			this.seleccionados = this.seleccionados.filter(id => id !== item.article_id)
		},
		/**
		 * "Seleccionar la página": todas las filas visibles (menos las que tienen una acción en vuelo)
		 * o ninguna.
		 *
		 * @param {Boolean} valor
		 */
		seleccionar_pagina(valor) {
			let self = this
			if (!valor) {
				self.seleccionados = []
				return
			}
			let ids = []
			self.items.forEach(function (item) {
				if (!self.esta_procesando(item.article_id)) {
					ids.push(item.article_id)
				}
			})
			self.seleccionados = ids
		},
		/** Después de traer una página, la selección y la edición se quedan solo con lo que sigue a la vista. */
		recortar_a_lo_visible() {
			let self = this
			let visible = function (id) {
				return self.items.some(item => item.article_id === id)
			}
			self.seleccionados = self.seleccionados.filter(visible)
			self.editando_ids = self.editando_ids.filter(visible)
		},
		marcar_procesando(id, valor) {
			if (valor) {
				if (!this.esta_procesando(id)) {
					this.procesando_ids.push(id)
				}
				return
			}
			this.procesando_ids = this.procesando_ids.filter(procesando => procesando !== id)
		},
		/** @param {Object} item */
		empezar_a_editar(item) {
			if (!this.esta_editando(item.article_id)) {
				this.editando_ids.push(item.article_id)
			}
		},
		/** @param {Number} id */
		dejar_de_editar(id) {
			this.editando_ids = this.editando_ids.filter(editando => editando !== id)
		},
		/**
		 * Saca de la lista un artículo que se resolvió. Si la página quedó vacía y hay más, se pide la
		 * que corresponda.
		 *
		 * 🔴 La fila y el total se tocan SOLO si la fila sigue en la lista: si la lista se volvió a pedir
		 * mientras viajaba la acción, lo que llegó ya trae el total del servidor y restarle otra vez lo
		 * dejaría uno abajo (lo mismo que en la revisión de categorías).
		 *
		 * @param {Number} id
		 */
		sacar_item(id) {
			let indice = this.items.findIndex(item => item.article_id === id)
			if (indice !== -1) {
				this.items.splice(indice, 1)
				this.total_items = Math.max(0, this.total_items - 1)
			}
			this.seleccionados = this.seleccionados.filter(seleccionado => seleccionado !== id)
			this.dejar_de_editar(id)
			if (!this.items.length && this.total_items > 0) {
				this.cargar_items()
			}
		},
		/**
		 * Pone en la lista la versión que devolvió la API de un artículo (después de editar una
		 * publicada), en el mismo lugar.
		 *
		 * @param {Object} model Item normalizado.
		 */
		reemplazar_item(model) {
			let indice = this.items.findIndex(item => item.article_id === model.article_id)
			if (indice !== -1) {
				this.items.splice(indice, 1, model)
			}
		},
		/**
		 * Pide el número rojo una vez terminada la racha de acciones (ver `ESPERA_RESUMEN_MS`).
		 */
		programar_resumen() {
			clearTimeout(this.timer_resumen)
			this.timer_resumen = setTimeout(() => {
				this.timer_resumen = null
				this.$store.dispatch('ai_description_review/get_resumen')
			}, ESPERA_RESUMEN_MS)
		},
		/**
		 * Lo común de las acciones de a una: apaga los botones de la fila mientras viaja, y al volver
		 * saca la fila (o la reemplaza, si la API devolvió la nueva versión), avisa y programa el número
		 * rojo.
		 *
		 * Se anota de qué solapa era la fila: si cuando vuelve ya se está mirando la otra, no se toca la
		 * lista. Si falla, el interceptor global ya mostró el motivo (un 4xx con `message` sale como aviso
		 * amarillo) y los conteos que haya traído el error ya los aplicó el store:
		 *  - 404 (otra persona ya la resolvió, o el artículo ya no existe) y 409 (al aprobar: el artículo
		 *    ya tiene una descripción cargada a mano y la API descartó la sugerencia): la fila ya no
		 *    corresponde, sale en el momento y la lista se vuelve a pedir en silencio.
		 *  - 422 (lo escrito no pasó la validación): la edición queda abierta con lo escrito.
		 *  - Cualquier otro (red, 5xx): la lista se vuelve a pedir en silencio para mostrar lo real.
		 *
		 * @param {Object} item
		 * @param {String} accion Acción del store.
		 * @param {*} pedido Lo que recibe la acción.
		 * @param {String} aviso Texto del aviso de éxito.
		 * @returns {Promise<Boolean>} true si la API la resolvió.
		 */
		ejecutar_en_la_fila(item, accion, pedido, aviso) {
			let self = this
			let id = item.article_id
			if (self.esta_procesando(id)) {
				return Promise.resolve(false)
			}
			let solapa_de_la_accion = self.solapa
			self.marcar_procesando(id, true)

			return self.$store.dispatch('ai_description_review/' + accion, pedido)
			.then(respuesta => {
				self.marcar_procesando(id, false)
				if (self.solapa === solapa_de_la_accion) {
					if (accion === 'guardar_publicada') {
						self.dejar_de_editar(id)
						if (respuesta && respuesta.model) {
							self.reemplazar_item(respuesta.model)
						} else {
							self.cargar_items({ silencioso: true })
						}
					} else {
						self.sacar_item(id)
					}
				}
				avisar(self, 'success', aviso)
				self.programar_resumen()
				return true
			})
			.catch(err => {
				console.log(err)
				self.marcar_procesando(id, false)
				let status = err && err.response ? err.response.status : 0
				if (!es_cancelacion(err) && status !== 422 && self.solapa === solapa_de_la_accion) {
					if (status === 404 || status === 409) {
						self.sacar_item(id)
					}
					// `sacar_item` ya pide la página si quedó vacía; si no, se pide acá.
					if (self.items.length) {
						self.cargar_items({ silencioso: true })
					}
				}
				self.programar_resumen()
				return false
			})
		},
		/** Aprueba tal cual la armó la IA. @param {Object} item */
		aprobar(item) {
			return this.ejecutar_en_la_fila(item, 'aprobar', { article_id: item.article_id, secciones: null }, 'Descripción aprobada')
		},
		/** @param {Object} item */
		descartar(item) {
			return this.ejecutar_en_la_fila(item, 'descartar', item.article_id, 'Descripción descartada')
		},
		/**
		 * "Guardar y aprobar" (A revisar) o "Guardar" (Publicadas).
		 *
		 * @param {Object} item
		 * @param {Array} secciones Lo escrito, `[{id, title, content}]`.
		 */
		guardar(item, secciones) {
			if (this.solapa === 'a_revisar') {
				return this.ejecutar_en_la_fila(item, 'aprobar', { article_id: item.article_id, secciones: secciones }, 'Descripción aprobada')
			}
			return this.ejecutar_en_la_fila(item, 'guardar_publicada', { article_id: item.article_id, secciones: secciones }, 'Descripción guardada')
		},
		/**
		 * Quita una publicada, después de confirmar: borra lo que ya se ve en la tienda y en la ficha.
		 *
		 * @param {Object} item
		 */
		quitar(item) {
			let self = this
			if (self.esta_procesando(item.article_id)) {
				return
			}
			self.confirmar(TEXTOS.confirmar_quitar, {
				title: 'Quitar la descripción',
				okTitle: 'Quitar',
				okVariant: 'danger',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				if (!confirmado) {
					return
				}
				return self.ejecutar_en_la_fila(item, 'quitar', item.article_id, 'Descripción quitada')
			})
		},
		/**
		 * Abre una caja de confirmación de a una por vez: mientras hay una abierta, un segundo clic no
		 * abre otra. Resuelve true solo si la persona confirmó; cerrar con Escape o tocando afuera
		 * cuenta como no.
		 *
		 * @param {String} texto
		 * @param {Object} opciones Las de $bvModal.msgBoxConfirm.
		 * @returns {Promise<Boolean>}
		 */
		confirmar(texto, opciones) {
			let self = this
			if (self.confirmacion_abierta) {
				return Promise.resolve(false)
			}
			self.confirmacion_abierta = true
			return self.$bvModal.msgBoxConfirm(texto, opciones)
			.then(confirmado => {
				self.confirmacion_abierta = false
				return confirmado === true
			})
			.catch(err => {
				console.log(err)
				self.confirmacion_abierta = false
				return false
			})
		},
		/**
		 * Aprueba o descarta todas las tildadas de una vez (tal cual las armó la IA), con confirmación y
		 * el indicador global de carga: son muchas a la vez y no tiene que poder repetirse mientras viaja.
		 *
		 * @param {String} accion aprobar | descartar
		 */
		resolver_seleccionadas(accion) {
			let self = this
			let ids = self.seleccionados.slice()
			if (!ids.length || self.lote_en_curso) {
				return
			}
			let cantidad = ids.length
			let texto_cantidad = cantidad_de_descripciones(cantidad)
			let una = cantidad === 1
			let texto = accion === 'aprobar'
				? '¿Aprobar ' + texto_cantidad + '? ' + (una ? 'Pasa' : 'Pasan') + ' a verse en tu tienda online y en la ficha ' + (una ? 'del artículo' : 'de cada artículo') + ', tal como ' + (una ? 'la armó' : 'las armó') + ' la IA.'
				: '¿Descartar ' + texto_cantidad + '? ' + (una ? 'El artículo queda' : 'Esos artículos quedan') + ' sin descripción y ' + (una ? 'podés escribirle' : 'podés escribirles') + ' una a mano cuando quieras.'

			self.confirmar(texto, {
				title: accion === 'aprobar' ? 'Aprobar seleccionadas' : 'Descartar seleccionadas',
				okTitle: accion === 'aprobar' ? 'Aprobar' : 'Descartar',
				okVariant: accion === 'aprobar' ? 'success' : 'danger',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				// Se vuelve a mirar después de la caja: un lote que salió mientras estaba abierta no puede
				// mandar los mismos ids dos veces.
				if (!confirmado || self.lote_en_curso) {
					return
				}
				self.lote_en_curso = true
				self.$store.commit('auth/setMessage', accion === 'aprobar' ? 'Aprobando descripciones' : 'Descartando descripciones')
				self.$store.commit('auth/setLoading', true)

				return self.$store.dispatch('ai_description_review/' + (accion === 'aprobar' ? 'aprobar_varios' : 'descartar_varios'), ids)
				.then(respuesta => {
					self.apagar_el_cargando()
					self.lote_en_curso = false
					self.avisar_resultado_del_lote(accion, cantidad, respuesta)
					self.seleccionados = []
					ids.forEach(id => self.dejar_de_editar(id))
					self.cargar_items()
					self.programar_resumen()
				})
				.catch(err => {
					console.log(err)
					self.apagar_el_cargando()
					self.lote_en_curso = false
					if (!es_cancelacion(err)) {
						self.cargar_items({ silencioso: true })
					}
					self.programar_resumen()
				})
			})
		},
		apagar_el_cargando() {
			this.$store.commit('auth/setLoading', false)
			this.$store.commit('auth/setMessage', '')
		},
		/**
		 * "12 descripciones aprobadas", y si algunas no se pudieron, cuántas y por qué (ver
		 * `frase_de_las_omitidas`).
		 *
		 * @param {String} accion aprobar | descartar
		 * @param {Number} pedidas Cuántas se mandaron.
		 * @param {Object} respuesta {resueltos}
		 */
		avisar_resultado_del_lote(accion, pedidas, respuesta) {
			let resueltas = Number(respuesta && respuesta.resueltos) || 0
			let omitidas = Math.max(0, pedidas - resueltas)
			// Todo aviso pasa por `avisar()` (escapa el mensaje entero: el toast lo pinta como HTML).
			if (resueltas > 0) {
				avisar(this, 'success', frase_del_lote(resueltas, accion))
			}
			if (omitidas > 0) {
				avisar(this, 'warning', frase_de_las_omitidas(omitidas, accion), { duration: 8000 })
			}
		},
	},
}
</script>
<style lang="sass">
// Sin scope: prefijo desc-revision. Todo color va por token con el valor de :root como respaldo (el
// modo oscuro los cambia solos). Las filas, la barra y la paginacion tienen sus propios estilos.
.desc-revision
	text-align: left

.desc-revision__encabezado
	margin: 6px 0 12px

.desc-revision__titulo
	margin: 0 0 4px
	font-size: 1.05rem
	font-weight: 700
	line-height: 1.3
	color: var(--color-text-primary, #212529)

.desc-revision__intro
	max-width: 760px
	margin: 0
	font-size: 0.875rem
	line-height: 1.45
	color: var(--color-text-secondary, #6c757d)

// La tarjeta: la misma forma que .card-modulo (radio, borde y sombra de los bloques del sistema).
.desc-revision__tarjeta
	padding: 4px 16px 12px
	border: 1px solid var(--color-border, #dee2e6)
	border-radius: 12px
	background: var(--bg-card, #fff)
	box-shadow: var(--shadow-color, rgba(99, 99, 99, 0.2)) 0px 2px 8px 0px

// El nav trae `margin-top: 15px` en sus hijos (.cont-left > div): con eso alcanza de aire arriba.
.desc-revision__solapas
	scroll-margin-top: 8px

// La nota azul: los dos tokens existen solo en html.dark-mode; en claro manda el literal del respaldo.
.desc-revision__nota
	display: flex
	align-items: flex-start
	gap: 8px
	margin: 12px 0 0
	padding: 10px 12px
	border-radius: 8px
	font-size: 0.84rem
	line-height: 1.45
	background: var(--bg-info-soft, #eef5ff)
	color: var(--color-text-info-strong, #1d4f91)

	i
		flex-shrink: 0
		line-height: 1.45

.desc-revision__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 40px 20px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

.desc-revision__lista
	margin: 0
	padding: 0
	list-style: none
	border-top: 1px solid var(--color-border-secondary, #e9ecef)
	transition: opacity 0.15s ease

// Mientras llega otra pagina, la actual queda un poco apagada en vez de desaparecer.
.desc-revision__lista--cargando
	opacity: 0.5

// Salida de una fila resuelta: se desvanece en vez de desaparecer de golpe.
.desc-rev-fila-leave-active
	transition: opacity 0.2s ease

.desc-rev-fila-leave-to
	opacity: 0

@media (prefers-reduced-motion: reduce)
	.desc-rev-fila-leave-active,
	.desc-revision__lista
		transition: none

@media (max-width: 575px)
	.desc-revision__tarjeta
		padding: 4px 12px 12px
</style>
