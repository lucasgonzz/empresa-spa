<template>
<div
class="cat-revision"
data-testid="categorias-revision">

	<!--
		Las tres solapas con la cantidad de cada una en el nombre. Es el horizontal-nav del sistema en
		modo autonomo (guia de estilo §5): el componente pinta y avisa; que pedir lo decide esta
		revision. Los numeros salen de los conteos vivos que mantiene el store.
	-->
	<div
	ref="solapas"
	class="cat-revision__solapas">
		<horizontal-nav
		v-if="solapa"
		:items="items_de_solapas"
		:selected_item_value="solapa"
		:show_display="false"
		emitir_setSelected_al_inicio
		@setSelected="al_elegir_solapa"></horizontal-nav>
	</div>

	<p
	v-if="solapa === 'a_revisar'"
	class="cat-revision__nota"
	data-testid="categorias-nota-a-revisar">
		<i
		class="bi bi-info-circle"
		aria-hidden="true"></i>
		Estos artículos todavía no tienen la categoría que sugiere la IA: la reciben recién cuando los aprobás. Hasta entonces quedan sin categoría.
	</p>

	<barra-de-revision
	v-model="buscar_input"
	:solapa="solapa"
	:cantidad_en_pagina="items.length"
	:cantidad_seleccionados="seleccionados.length"
	:todos_seleccionados="todos_seleccionados"
	:algunos_seleccionados="algunos_seleccionados"
	:ocupado="lote_en_curso"
	:puede_gestionar="puede_gestionar"
	@seleccionar_pagina="seleccionar_pagina"
	@aprobar_seleccionados="resolver_seleccionados('aprobar')"
	@rechazar_seleccionados="resolver_seleccionados('rechazar')"></barra-de-revision>

	<div
	class="cat-revision__contenido"
	:data-solapa="solapa">

		<div
		v-if="cargando_items && !items.length"
		class="cat-revision__cargando"
		data-testid="categorias-items-cargando">
			<b-spinner
			small
			variant="primary"></b-spinner>
			<span>Cargando artículos…</span>
		</div>

		<empty-state
		v-else-if="error_items && !items.length"
		data-testid="categorias-items-error"
		icon_class="bi bi-cloud-slash"
		title="No pudimos traer los artículos"
		hint="Revisá la conexión y volvé a intentar.">
			<b-button
			class="btn-modulo"
			variant="outline-primary"
			data-testid="categorias-items-reintentar"
			@click="cargar_items()">
				Reintentar
			</b-button>
		</empty-state>

		<empty-state
		v-else-if="!items.length"
		data-testid="categorias-solapa-vacia"
		:icon_class="vacio.icono"
		:title="vacio.titulo"
		:hint="vacio.pista"></empty-state>

		<transition-group
		v-else
		tag="ul"
		name="cat-rev-fila"
		class="cat-revision__lista"
		:class="clase_de_lista"
		:data-testid="'categorias-lista-' + solapa">
			<fila-de-revision
			v-for="item in items"
			:key="item.id"
			:item="item"
			:seleccionado="esta_seleccionado(item.id)"
			:procesando="esta_procesando(item.id)"
			:puede_gestionar="puede_gestionar"
			@seleccionar="al_seleccionar(item, $event)"
			@aprobar="resolver_uno(item, 'aprobar')"
			@rechazar="resolver_uno(item, 'rechazar')"></fila-de-revision>
		</transition-group>

		<paginacion-de-revision
		:total="total_items"
		:pagina="pagina"
		:por_pagina="por_pagina"
		:cargando="cargando_items"
		@cambiar_pagina="cambiar_pagina"
		@cambiar_por_pagina="cambiar_por_pagina"></paginacion-de-revision>

	</div>

</div>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
import EmptyState from '@/common-vue/components/display/EmptyState'
import BarraDeRevision from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/BarraDeRevision'
import FilaDeRevision from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/FilaDeRevision'
import PaginacionDeRevision from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/PaginacionDeRevision'
import { SOLAPAS, cantidad_de, entero_es } from '@/components/alertas/components/lista-de-alertas-table/catalogo/categorias/textos'
import { es_cancelacion } from '@/store/category_proposal'

/** Espera antes de buscar mientras se escribe (lo mismo que el buscador del detalle de imágenes). */
const ESPERA_BUSCADOR_MS = 400

/** Solapas válidas, en el orden del contrato. */
const SOLAPAS_VALIDAS = ['a_revisar', 'asignados', 'sin_categoria']

/**
 * La revisión de lo que la IA no tenía claro, una vez elegido un sistema de categorías: tres
 * solapas —A revisar · Asignados · Sin categoría— paginadas en el servidor (25 por defecto, 50 o
 * 100), con buscador por nombre o código, y en "A revisar" aprobar y rechazar de a uno o de a muchos.
 *
 * Es el mismo recorrido que el detalle de imágenes (imagenes/detalle/Index.vue), más simple porque acá
 * no hay nada corriendo en segundo plano: la lista no se refresca sola.
 *
 *  - Aprobar le asigna al artículo la categoría que sugirió la IA (la API la crea si todavía no
 *    existía). Rechazar lo deja sin categoría ("Sin categoría").
 *  - Cada acción saca la fila de la lista en el momento. Los números de las solapas no se ajustan a
 *    mano: cada respuesta de la API trae los conteos y el store los aplica (ver `conteos`).
 *  - Aprobar o rechazar de a muchos pide confirmación (cambia varios artículos de una vez) y usa el
 *    cargando global; de a uno no hace falta: la fila que se va es la confirmación.
 *
 * Props: `run_id` (la corrida elegida), `conteos` (los vivos que mantiene el store) y
 * `puede_gestionar`. Evento: `revisado`, cada vez que se aprobó o rechazó algo, para que Index.vue
 * refresque el número rojo y el cartel de arriba (después del primer aprobado ya no se puede cambiar
 * de sistema).
 */
export default {
	components: {
		HorizontalNav,
		EmptyState,
		BarraDeRevision,
		FilaDeRevision,
		PaginacionDeRevision,
	},
	props: {
		/** La corrida elegida: de ahí salen los artículos. */
		run_id: {
			type: Number,
			required: true,
		},
		/** `{a_revisar, asignados, sin_categoria}`: los conteos vivos del store. */
		conteos: {
			type: Object,
			default: () => ({ a_revisar: 0, asignados: 0, sin_categoria: 0 }),
		},
		/** false si quien mira no puede aprobar ni rechazar. */
		puede_gestionar: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			/** Solapa visible: a_revisar | asignados | sin_categoria (la decide `created`). */
			solapa: null,
			/** Página visible de artículos (normalizados por el store). */
			items: [],
			pagina: 1,
			por_pagina: 25,
			/** Total de la solapa con el buscador aplicado (del paginador). */
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
			/** Ids tildados en "A revisar". */
			seleccionados: [],
			/** Ids con una acción en vuelo (sus botones se apagan). */
			procesando_ids: [],
			/** true mientras viaja un aprobar / rechazar en lote. */
			lote_en_curso: false,
			/**
			 * true mientras hay una caja de confirmación abierta. Un doble clic no tiene que abrir
			 * dos cajas ni mandar dos veces lo mismo.
			 */
			confirmacion_abierta: false,
			/** Contador de pedidos de la lista: una respuesta vieja no pisa una más nueva. */
			pedido_de_items: 0,
		}
	},
	computed: {
		/**
		 * Items del horizontal-nav: "A revisar (150)". `route_value` es el valor de la solapa (el
		 * nombre lleva la cantidad, que cambia) y `testid` deja un data-testid fijo.
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
					testid: 'solapa-categorias-' + solapa.valor,
				})
			})
			return items
		},
		todos_seleccionados() {
			let self = this
			return self.items.length > 0 && self.items.every(function (item) {
				return self.esta_seleccionado(item.id)
			})
		},
		algunos_seleccionados() {
			return this.seleccionados.length > 0 && !this.todos_seleccionados
		},
		clase_de_lista() {
			return { 'cat-revision__lista--cargando': this.cargando_items }
		},
		/**
		 * Qué decir cuando la solapa está vacía: no es lo mismo no encontrar nada buscando que no
		 * tener nada para revisar (que es una buena noticia).
		 *
		 * @returns {Object} { icono, titulo, pista }
		 */
		vacio() {
			if (this.buscar) {
				return {
					icono: 'bi bi-search',
					titulo: 'Ningún artículo coincide con «' + this.buscar + '»',
					pista: 'Probá con otra parte del nombre o con el código de barras.',
				}
			}
			if (this.solapa === 'a_revisar') {
				return {
					icono: 'bi bi-check2-all',
					titulo: 'No hay artículos para revisar',
					pista: 'Cuando la IA no está segura de la categoría de un artículo, lo deja acá para que lo apruebes o lo rechaces.',
				}
			}
			if (this.solapa === 'asignados') {
				return {
					icono: 'bi bi-tags',
					titulo: 'Todavía no se ubicó ningún artículo',
					pista: 'Los artículos que la IA ubicó con seguridad, y los que aprobás, aparecen acá con su categoría.',
				}
			}
			return {
				icono: 'bi bi-check2-circle',
				titulo: 'No quedó ningún artículo sin categoría',
				pista: 'Todos los artículos quedaron con categoría: la IA los ubicó o los aprobaste vos.',
			}
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
	},
	created() {
		this.solapa = this.solapa_inicial()
		this.cargar_items()
	},
	beforeDestroy() {
		clearTimeout(this.timer_buscar)
	},
	methods: {
		/**
		 * Un conteo de la revisión como número, con cero si no vino.
		 *
		 * @param {String} valor a_revisar | asignados | sin_categoria
		 * @returns {Number}
		 */
		conteo(valor) {
			return Number(this.conteos ? this.conteos[valor] : 0) || 0
		},
		/**
		 * Con qué solapa abrir: "A revisar" si tiene algo (es lo que hay que hacer); si no, la primera
		 * que tenga artículos, en el orden de las solapas; si ninguna tiene, "A revisar".
		 *
		 * @returns {String}
		 */
		solapa_inicial() {
			let elegida = 'a_revisar'
			let encontrada = false
			let self = this
			SOLAPAS_VALIDAS.forEach(function (valor) {
				if (!encontrada && self.conteo(valor) > 0) {
					elegida = valor
					encontrada = true
				}
			})
			return elegida
		},
		/**
		 * Pide la página actual de la solapa actual. Con `{ silencioso: true }` no muestra el estado
		 * de carga ni el de error (refrescos que la persona no pidió).
		 *
		 * Si la página quedó fuera de rango (se resolvieron los últimos de la última página), va a la
		 * última que exista. Un error de la API (409, 5xx) ya lo anunció el interceptor global: acá solo
		 * se muestra el estado de error con su reintento.
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

			return self.$store.dispatch('category_proposal/get_items', {
				run_id: self.run_id,
				solapa: self.solapa,
				page: self.pagina,
				per_page: self.por_pagina,
				buscar: self.buscar,
			})
			.then(datos => {
				if (este_pedido !== self.pedido_de_items) {
					return
				}
				let pagina = datos.models
				self.total_items = pagina.total
				self.ultima_pagina = pagina.last_page

				if (!pagina.data.length && self.total_items > 0 && self.pagina > self.ultima_pagina) {
					self.pagina = self.ultima_pagina
					return self.cargar_items(opciones)
				}

				self.items = pagina.data
				self.recortar_seleccion()
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
		 * forma de ver lo último. El buscador se conserva.
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
		/**
		 * Después de cambiar de página, la lista nueva arranca arriba: se lleva la vista a las
		 * solapas, que es donde empieza.
		 */
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
		/**
		 * Tilde de una fila de "A revisar".
		 *
		 * @param {Object} item
		 * @param {Boolean} valor
		 */
		al_seleccionar(item, valor) {
			if (valor) {
				if (!this.esta_seleccionado(item.id)) {
					this.seleccionados.push(item.id)
				}
				return
			}
			this.quitar_de_seleccion(item.id)
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
				if (!self.esta_procesando(item.id)) {
					ids.push(item.id)
				}
			})
			self.seleccionados = ids
		},
		quitar_de_seleccion(id) {
			this.seleccionados = this.seleccionados.filter(seleccionado => seleccionado !== id)
		},
		/** Después de traer una página, la selección se queda solo con lo que sigue a la vista. */
		recortar_seleccion() {
			let self = this
			self.seleccionados = self.seleccionados.filter(function (id) {
				return self.items.some(item => item.id === id)
			})
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
		/**
		 * Saca de la lista un artículo que se resolvió. Si la página quedó vacía y hay más, se pide la
		 * que corresponda.
		 *
		 * 🔴 La fila y el total se tocan SOLO si la fila sigue en la lista: si la lista se volvió a
		 * pedir mientras viajaba la acción, lo que llegó ya trae el total del servidor y restarle otra
		 * vez lo dejaría uno abajo (con 26 por revisar, el artículo 26 quedaría inalcanzable).
		 *
		 * @param {Number} id
		 */
		sacar_item(id) {
			let indice = this.items.findIndex(item => item.id === id)
			if (indice !== -1) {
				this.items.splice(indice, 1)
				this.total_items = Math.max(0, this.total_items - 1)
			}
			this.quitar_de_seleccion(id)
			if (!this.items.length && this.total_items > 0) {
				this.cargar_items()
			}
		},
		/**
		 * Aprueba o rechaza un artículo de "A revisar". Sin cartel de éxito a propósito: se revisan de
		 * a muchos, y la fila que se va es la confirmación. Si falla (409: ya no estaba para revisar;
		 * 404), el interceptor global muestra el motivo y la lista se vuelve a pedir para mostrar lo
		 * real.
		 *
		 * Se anota de qué solapa era la fila: si cuando vuelve ya se está mirando otra, no se toca la
		 * lista (sacar la fila de la solapa equivocada movía los números de otra).
		 *
		 * @param {Object} item
		 * @param {String} accion aprobar | rechazar (acción del store).
		 * @returns {Promise<Boolean>} true si la API la resolvió.
		 */
		resolver_uno(item, accion) {
			let self = this
			if (self.esta_procesando(item.id)) {
				return Promise.resolve(false)
			}
			let solapa_de_la_accion = self.solapa
			self.marcar_procesando(item.id, true)

			return self.$store.dispatch('category_proposal/' + accion, item.id)
			.then(() => {
				self.marcar_procesando(item.id, false)
				if (self.solapa === solapa_de_la_accion) {
					self.sacar_item(item.id)
				}
				self.$emit('revisado')
				return true
			})
			.catch(err => {
				console.log(err)
				self.marcar_procesando(item.id, false)
				if (!es_cancelacion(err) && self.solapa === solapa_de_la_accion) {
					self.cargar_items({ silencioso: true })
				}
				self.$emit('revisado')
				return false
			})
		},
		/**
		 * Abre una caja de confirmación de a una por vez: mientras hay una abierta, un segundo clic
		 * (el doble clic de siempre) no abre otra. Resuelve true solo si la persona confirmó; cerrar
		 * con Escape o tocando afuera cuenta como no.
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
		 * Aprueba o rechaza todos los tildados de una vez, con confirmación (cambia varios artículos
		 * juntos) y el indicador global de carga: son muchos a la vez y no tiene que poder repetirse
		 * mientras viaja.
		 *
		 * @param {String} accion aprobar | rechazar
		 */
		resolver_seleccionados(accion) {
			let self = this
			let ids = self.seleccionados.slice()
			if (!ids.length || self.lote_en_curso) {
				return
			}
			let cantidad = ids.length
			let texto_cantidad = cantidad_de(cantidad, 'artículo', 'artículos')

			let texto = accion === 'aprobar'
				? '¿Aprobar ' + texto_cantidad + '? ' + (cantidad === 1 ? 'Se le asigna' : 'Se les asigna') + ' la categoría que sugirió la IA (si todavía no existe, se crea).'
				: '¿Rechazar ' + texto_cantidad + '? ' + (cantidad === 1 ? 'Queda sin categoría.' : 'Quedan sin categoría.')

			self.confirmar(texto, {
				title: accion === 'aprobar' ? 'Aprobar seleccionados' : 'Rechazar seleccionados',
				okTitle: accion === 'aprobar' ? 'Aprobar' : 'Rechazar',
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
				self.$store.commit('auth/setMessage', accion === 'aprobar' ? 'Aprobando artículos' : 'Rechazando artículos')
				self.$store.commit('auth/setLoading', true)

				return self.$store.dispatch('category_proposal/' + (accion === 'aprobar' ? 'aprobar_varios' : 'rechazar_varios'), ids)
				.then(respuesta => {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					self.lote_en_curso = false
					self.avisar_resultado_del_lote(accion, respuesta)
					self.seleccionados = []
					self.cargar_items()
					self.$emit('revisado')
				})
				.catch(err => {
					console.log(err)
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					self.lote_en_curso = false
					if (!es_cancelacion(err)) {
						self.cargar_items({ silencioso: true })
					}
					self.$emit('revisado')
				})
			})
		},
		/**
		 * "12 artículos aprobados", y si algunos no se pudieron, cuántos.
		 *
		 * @param {String} accion aprobar | rechazar
		 * @param {Object} respuesta {procesados, omitidos}
		 */
		avisar_resultado_del_lote(accion, respuesta) {
			let datos = respuesta || {}
			let procesados = Number(datos.procesados) || 0
			let omitidos = Number(datos.omitidos) || 0
			let participio = accion === 'aprobar'
				? (procesados === 1 ? 'aprobado' : 'aprobados')
				: (procesados === 1 ? 'rechazado' : 'rechazados')

			if (procesados > 0) {
				this.$toast.success(entero_es(procesados) + (procesados === 1 ? ' artículo ' : ' artículos ') + participio)
			}
			if (omitidos > 0) {
				this.$toast.warning(
					(omitidos === 1 ? '1 no se pudo ' : entero_es(omitidos) + ' no se pudieron ')
					+ (accion === 'aprobar' ? 'aprobar' : 'rechazar') + ' porque ya se habían resuelto.',
					{ duration: 8000 }
				)
			}
		},
	},
}
</script>
<style lang="sass">
// Sin scope: prefijo cat-revision. Todo color va por token con el valor de :root como fallback. Las
// filas y la barra tienen sus propios estilos (FilaDeRevision.vue, BarraDeRevision.vue).
.cat-revision
	text-align: left

.cat-revision__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 40px 20px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

// El nav trae `margin-top: 15px` en sus hijos (.cont-left > div): con eso alcanza de aire arriba.
.cat-revision__solapas
	scroll-margin-top: 8px

.cat-revision__nota
	display: flex
	align-items: flex-start
	gap: 8px
	margin: 12px 0 0
	font-size: 0.8125rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

	i
		flex-shrink: 0
		line-height: 1.4

.cat-revision__lista
	margin: 0
	padding: 0
	list-style: none
	border-top: 1px solid var(--color-border-secondary, #e9ecef)
	transition: opacity 0.15s ease

// Mientras llega otra pagina, la actual queda un poco apagada en vez de desaparecer.
.cat-revision__lista--cargando
	opacity: 0.5

// Salida de una fila resuelta: se desvanece en vez de desaparecer de golpe.
.cat-rev-fila-leave-active
	transition: opacity 0.2s ease

.cat-rev-fila-leave-to
	opacity: 0

@media (prefers-reduced-motion: reduce)
	.cat-rev-fila-leave-active,
	.cat-revision__lista
		transition: none
</style>
