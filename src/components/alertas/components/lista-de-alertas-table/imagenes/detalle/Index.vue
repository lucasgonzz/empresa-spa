<template>
<div>

	<b-modal
	id="imagenes-asignacion-detalle"
	v-model="visible"
	size="xl"
	scrollable
	modal-class="img-det-modal"
	body-class="img-det-modal__cuerpo"
	:title="titulo"
	@hidden="al_cerrar">

		<div
		class="img-det"
		data-testid="imagenes-modal-detalle"
		:data-asignacion="asignacion ? asignacion.id : null">

			<div
			v-if="cargando_asignacion && !asignacion"
			class="img-det__cargando">
				<b-spinner
				small
				variant="primary"></b-spinner>
				<span>Cargando la asignación…</span>
			</div>

			<empty-state
			v-else-if="error_asignacion && !asignacion"
			data-testid="imagenes-detalle-error"
			icon_class="bi bi-exclamation-circle"
			title="No pudimos abrir esta asignación"
			hint="Puede que ya no exista, o que se haya cortado la conexión. Cerrá y volvé a intentar."></empty-state>

			<template v-else-if="asignacion">

				<encabezado
				:asignacion="asignacion"
				:es_acceso_maestro="es_acceso_maestro"
				:operando="operando_asignacion"
				@detener="detener"
				@reanudar="reanudar"></encabezado>

				<!--
					Las tres solapas en el orden que pidio Lucas, con la cantidad de cada una en el
					nombre. Es el horizontal-nav del sistema en modo autonomo (guia de estilo §5): el
					componente pinta y avisa; que pedir lo decide este detalle.
				-->
				<div
				ref="solapas"
				class="img-det__solapas">
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
				class="img-det__nota"
				data-testid="imagenes-nota-a-revisar">
					<i
					class="bi bi-info-circle"
					aria-hidden="true"></i>
					Estas imágenes todavía no están en los artículos ni en la tienda: aparecen recién cuando las aprobás.
				</p>

				<barra-de-solapa
				v-model="buscar_input"
				:solapa="solapa"
				:cantidad_en_pagina="items.length"
				:cantidad_seleccionados="seleccionados.length"
				:todos_seleccionados="todos_seleccionados"
				:algunos_seleccionados="algunos_seleccionados"
				:ocupado="lote_en_curso"
				:hay_novedades="hay_novedades"
				@actualizar="cargar_items()"
				@seleccionar_pagina="seleccionar_pagina"
				@aprobar_seleccionadas="resolver_seleccionadas('aprobar')"
				@rechazar_seleccionadas="resolver_seleccionadas('rechazar')"></barra-de-solapa>

				<div
				class="img-det__contenido"
				:data-solapa="solapa">

					<div
					v-if="cargando_items && !items.length"
					class="img-det__cargando">
						<b-spinner
						small
						variant="primary"></b-spinner>
						<span>Cargando artículos…</span>
					</div>

					<empty-state
					v-else-if="error_items && !items.length"
					data-testid="imagenes-items-error"
					icon_class="bi bi-cloud-slash"
					title="No pudimos traer los artículos"
					hint="Revisá la conexión y volvé a intentar.">
						<b-button
						class="btn-modulo"
						variant="outline-primary"
						@click="cargar_items()">
							Reintentar
						</b-button>
					</empty-state>

					<empty-state
					v-else-if="!items.length"
					data-testid="imagenes-solapa-vacia"
					:icon_class="vacio.icono"
					:title="vacio.titulo"
					:hint="vacio.pista"></empty-state>

					<!--
						Una lista por solapa, cada una con su fila. Van separadas (y no con un
						<component :is>) porque las tres filas reciben cosas distintas: pasarle a
						todas todo terminaria como atributos sueltos en el <li>.
					-->
					<transition-group
					v-else-if="solapa === 'no_asignadas'"
					tag="ul"
					name="img-det-fila"
					class="img-det__lista"
					:class="clase_de_lista"
					data-testid="imagenes-lista-no-asignadas">
						<fila-no-asignada
						v-for="item in items"
						:key="item.id"
						:item="item"></fila-no-asignada>
					</transition-group>

					<transition-group
					v-else-if="solapa === 'a_revisar'"
					tag="ul"
					name="img-det-fila"
					class="img-det__lista"
					:class="clase_de_lista"
					data-testid="imagenes-lista-a-revisar">
						<fila-a-revisar
						v-for="item in items"
						:key="item.id"
						:item="item"
						:seleccionado="esta_seleccionado(item.id)"
						:procesando="esta_procesando(item.id)"
						@seleccionar="al_seleccionar(item, $event)"
						@aprobar="aprobar(item, $event)"
						@rechazar="rechazar(item)"
						@ampliar="ampliar"></fila-a-revisar>
					</transition-group>

					<transition-group
					v-else
					tag="ul"
					name="img-det-fila"
					class="img-det__lista"
					:class="clase_de_lista"
					data-testid="imagenes-lista-asignadas">
						<fila-asignada
						v-for="item in items"
						:key="item.id"
						:item="item"
						:procesando="esta_procesando(item.id)"
						@quitar="quitar(item)"
						@ampliar="ampliar"></fila-asignada>
					</transition-group>

					<paginacion-items
					:total="total_items"
					:pagina="pagina"
					:por_pagina="por_pagina"
					:cargando="cargando_items"
					@cambiar_pagina="cambiar_pagina"
					@cambiar_por_pagina="cambiar_por_pagina"></paginacion-items>

				</div>

			</template>

		</div>

		<template #modal-footer>
			<b-button
			class="btn-modulo"
			variant="outline-secondary"
			data-testid="imagenes-detalle-cerrar"
			@click="visible = false">
				Cerrar
			</b-button>
		</template>

	</b-modal>

	<visor-imagen
	:imagen="imagen_visor"
	@cerrar="imagen_visor = null"></visor-imagen>

</div>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
import EmptyState from '@/common-vue/components/display/EmptyState'
import Encabezado from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/Encabezado'
import BarraDeSolapa from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/BarraDeSolapa'
import FilaNoAsignada from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/FilaNoAsignada'
import FilaARevisar from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/FilaARevisar'
import FilaAsignada from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/FilaAsignada'
import PaginacionItems from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/PaginacionItems'
import VisorImagen from '@/components/alertas/components/lista-de-alertas-table/imagenes/detalle/VisorImagen'
import { SOLAPAS, esta_activa, conteo, entero_es } from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'
import { es_cancelacion } from '@/store/image_assignment'

/** Cada cuánto se refresca el encabezado mientras la búsqueda sigue corriendo. */
const REFRESCO_MS = 15000

/** Espera antes de buscar mientras se escribe (lo mismo que el buscador de stock mínimo). */
const ESPERA_BUSCADOR_MS = 400

/**
 * Espera antes de pedir los números frescos después de aprobar / rechazar / quitar: quien está
 * revisando aprueba varias seguidas, y con esto se pide una sola vez al final de la racha.
 */
const ESPERA_SINCRONIZACION_MS = 1200

/** Solapas válidas, en el orden del contrato. */
const SOLAPAS_VALIDAS = ['no_asignadas', 'a_revisar', 'asignadas']

/**
 * Detalle de una búsqueda de imágenes (modal xl): encabezado con estado, datos y búsquedas; y
 * las tres solapas —No asignadas · A revisar · Asignadas— paginadas en el servidor (25 por
 * defecto, 50 o 100), con buscador por nombre o código.
 *
 * Se maneja por props: la solapa de Alertas le pasa `asignacion_id` (y opcionalmente la solapa
 * con la que abrir) y este componente se abre solo; al cerrarse avisa con `cerrado` para que la
 * solapa suelte el id y limpie la URL.
 *
 * Lo que cambia algo (aprobar, rechazar, quitar, en lote o de a uno) saca la fila de la lista
 * en el momento y ajusta los contadores de las solapas a mano; un rato después se piden los
 * números reales de la asignación (y el del badge) para que todo quede como lo ve la API.
 */
export default {
	components: {
		HorizontalNav,
		EmptyState,
		Encabezado,
		BarraDeSolapa,
		FilaNoAsignada,
		FilaARevisar,
		FilaAsignada,
		PaginacionItems,
		VisorImagen,
	},
	props: {
		/** Asignación a mostrar (null = cerrado). */
		asignacion_id: {
			type: Number,
			default: null,
		},
		/** Solapa con la que abrir (viene de la URL), o null para que la elija el detalle. */
		solapa_pedida: {
			type: String,
			default: null,
		},
		/**
		 * true si la sesión entró con la clave maestra: la piden Detener / Reanudar de las
		 * búsquedas de todo el catálogo (las de selección y del asistente, cualquiera; plan §13).
		 */
		es_acceso_maestro: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/** Visibilidad del modal (v-model). */
			visible: false,
			/** RunPayload de la asignación abierta. */
			asignacion: null,
			cargando_asignacion: false,
			error_asignacion: false,
			/** true mientras viaja un detener / reanudar. */
			operando_asignacion: false,
			/** Solapa visible: no_asignadas | a_revisar | asignadas. */
			solapa: null,
			/** Conteos de las solapas (los últimos que mandó la API, ajustados a mano al resolver). */
			conteos: {},
			/** Página visible de artículos (ItemPayload). */
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
			 * true mientras hay una caja de confirmación abierta (quitar, rechazar en lote,
			 * detener). Un doble clic no tiene que abrir dos cajas ni mandar dos veces lo mismo.
			 */
			confirmacion_abierta: false,
			/** Imagen abierta en el visor ({ url, titulo, detalle }) o null. */
			imagen_visor: null,
			/** Contador de pedidos de la lista: una respuesta vieja no pisa una más nueva. */
			pedido_de_items: 0,
			timer_sincronizacion: null,
			timer_refresco: null,
		}
	},
	computed: {
		/**
		 * "Asignación de imágenes del 27/09/26 a las 14:05" (la corrida es una asignación; las
		 * búsquedas son las consultas que se cuentan adentro, ver la nota de textos.js).
		 *
		 * @returns {String}
		 */
		titulo() {
			if (!this.asignacion || !this.asignacion.created_at) {
				return 'Asignación de imágenes'
			}
			return 'Asignación de imágenes del ' + this.date(this.asignacion.created_at) + ' a las ' + this.hour(this.asignacion.created_at)
		},
		/**
		 * Items del horizontal-nav: "No asignadas (12)". `route_value` es el valor de la solapa
		 * (el nombre lleva la cantidad, que cambia) y `testid` deja un data-testid fijo.
		 *
		 * @returns {Array}
		 */
		items_de_solapas() {
			let self = this
			let items = []
			SOLAPAS.forEach(function (solapa) {
				items.push({
					name: solapa.nombre + ' (' + entero_es(conteo(self.conteos, solapa.valor)) + ')',
					route_value: solapa.valor,
					testid: 'solapa-imagenes-' + solapa.valor,
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
		/**
		 * Mientras la búsqueda corre, la solapa puede tener más artículos que los que se ven (la
		 * lista no se refresca sola para no moverle las filas a quien está revisando). Con el
		 * buscador puesto no se compara: ahí el total es el de la búsqueda, no el de la solapa.
		 *
		 * @returns {Boolean}
		 */
		hay_novedades() {
			if (!esta_activa(this.asignacion) || this.buscar || !this.items_cargados || this.cargando_items) {
				return false
			}
			return conteo(this.conteos, this.solapa) > this.total_items
		},
		clase_de_lista() {
			return { 'img-det__lista--cargando': this.cargando_items }
		},
		/**
		 * Qué decir cuando la solapa está vacía: no es lo mismo no encontrar nada buscando que no
		 * tener nada para revisar (que es una buena noticia), ni una asignación terminada que una
		 * que sigue corriendo o que todavía no procesó ningún artículo.
		 *
		 * @returns {Object} { icono, titulo, pista }
		 */
		vacio() {
			let corriendo = esta_activa(this.asignacion)
			if (this.buscar) {
				// Lo escrito entre comillas y no "la búsqueda": en esta pantalla "búsqueda" es cada
				// consulta al buscador de imágenes (ver la nota de textos.js).
				return {
					icono: 'bi bi-search',
					titulo: 'Ningún artículo coincide con «' + this.buscar + '»',
					pista: 'Probá con otra parte del nombre o con el código de barras.',
				}
			}
			// Todavía no se procesó ningún artículo (espera turno en la cola, o se frenó antes de
			// llegar al primero): las solapas están vacías por eso, y "No quedó ningún artículo sin
			// imagen" afirmaba un resultado que no existe. Solo con `procesados` en cero de verdad:
			// si el campo no vino, Number() da NaN y queda lo de siempre.
			if (this.asignacion && Number(this.asignacion.procesados) === 0) {
				return {
					icono: 'bi bi-hourglass-split',
					titulo: 'Todavía no se procesó ningún artículo',
					pista: corriendo
						? 'A medida que la asignación avance, cada artículo va a ir apareciendo en una de las tres solapas.'
						: 'La asignación se frenó antes de llegar al primero.',
				}
			}
			if (this.solapa === 'a_revisar') {
				return {
					icono: 'bi bi-check2-all',
					titulo: 'No hay imágenes para revisar',
					pista: corriendo
						? 'La asignación sigue: si aparece una imagen dudosa, va a quedar acá para que decidas.'
						: 'Cuando la IA no está segura de una imagen, la deja acá para que la apruebes o la rechaces.',
				}
			}
			if (this.solapa === 'asignadas') {
				return {
					icono: 'bi bi-image',
					titulo: 'Todavía no se asignó ninguna imagen',
					pista: corriendo
						? 'La asignación sigue: las imágenes van apareciendo acá a medida que se encuentran.'
						: 'Esta asignación no le puso imagen a ningún artículo.',
				}
			}
			return {
				icono: 'bi bi-check2-circle',
				titulo: 'No quedó ningún artículo sin imagen',
				pista: corriendo
					? 'La asignación sigue: si algún artículo no encuentra imagen, va a aparecer acá con el motivo.'
					: 'Todo lo que se buscó tiene imagen asignada o esperando revisión.',
			}
		},
	},
	watch: {
		/**
		 * La solapa de Alertas pide abrir una asignación (clic, "Ver" o link directo). `immediate`
		 * porque el detalle se monta con el id ya puesto cuando se entra por un link.
		 */
		asignacion_id: {
			immediate: true,
			handler(nuevo) {
				if (nuevo) {
					this.abrir(nuevo)
					return
				}
				// La solapa soltó el id con el modal todavía abierto (el botón Atrás del navegador
				// con un detalle abierto por URL): se cierra acá, y el @hidden avisa `cerrado`
				// como en cualquier otro cierre.
				if (this.visible) {
					this.visible = false
				}
			},
		},
		/** Un link directo nuevo sobre la misma asignación, pero con otra solapa. */
		solapa_pedida(nueva) {
			if (nueva && this.asignacion && nueva !== this.solapa) {
				this.cambiar_solapa(nueva)
			}
		},
		/**
		 * Buscador: espera a que se deje de escribir y recién ahí pide, desde la primera página.
		 * Si el texto confirmado no cambió (por ejemplo, al limpiar al abrir), no pide nada.
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
	beforeDestroy() {
		this.detener_refresco()
		clearTimeout(this.timer_buscar)
		// Si se sale de la pantalla con una sincronización en espera (por ejemplo, con el botón
		// "atrás" del navegador justo después de aprobar), los números se piden igual: si no, el
		// número rojo quedaría contando imágenes que ya se resolvieron.
		this.sincronizar_pendiente_sin_esperar()
	},
	methods: {
		/**
		 * Deja el detalle como recién abierto, sin nada de la asignación anterior.
		 *
		 * 🔴 Antes de soltar la asignación anterior, si le quedó una sincronización en espera (se
		 * aprobó algo hace menos de ESPERA_SINCRONIZACION_MS y se abrió otra búsqueda), se hace ya:
		 * cancelarla sin más dejaba la fila de esa búsqueda en la tabla, y el número rojo, con los
		 * números de antes de la aprobación.
		 */
		reiniciar() {
			this.detener_refresco()
			clearTimeout(this.timer_buscar)
			this.sincronizar_pendiente_sin_esperar()
			this.asignacion = null
			this.cargando_asignacion = false
			this.error_asignacion = false
			this.operando_asignacion = false
			this.solapa = null
			this.conteos = {}
			this.items = []
			this.pagina = 1
			this.total_items = 0
			this.ultima_pagina = 1
			this.cargando_items = false
			this.error_items = false
			this.items_cargados = false
			this.buscar_input = ''
			this.buscar = ''
			this.seleccionados = []
			this.procesando_ids = []
			this.lote_en_curso = false
			this.imagen_visor = null
		},
		/**
		 * Abre el modal y trae la asignación; con ella decide la solapa y pide su primera página.
		 * Del lado de la API, abrirla la marca como vista: por eso se vuelve a pedir el resumen
		 * del número rojo.
		 *
		 * @param {Number} id
		 */
		abrir(id) {
			this.reiniciar()
			this.visible = true
			this.cargando_asignacion = true
			this.traer_asignacion(id, false)
		},
		/**
		 * El pedido de la asignación que hace `abrir`. Una cancelación no es un error ("No
		 * pudimos abrir esta asignación" sería mentira): se vuelve a pedir una vez.
		 *
		 * @param {Number} id
		 * @param {Boolean} es_reintento
		 */
		traer_asignacion(id, es_reintento) {
			let self = this
			self.$store.dispatch('image_assignment/get_asignacion', id)
			.then(asignacion => {
				// Mientras viajaba se cerró o se pidió otra: esta respuesta ya no importa.
				if (self.asignacion_id !== id) {
					return
				}
				self.cargando_asignacion = false
				if (!asignacion) {
					self.error_asignacion = true
					return
				}
				self.asignacion = asignacion
				self.conteos = Object.assign({}, asignacion.conteos || {})
				self.solapa = self.solapa_inicial(asignacion)
				self.cargar_items()
				self.programar_refresco()
				self.$store.dispatch('image_assignment/get_resumen')
			})
			.catch(err => {
				console.log(err)
				if (self.asignacion_id !== id) {
					return
				}
				if (es_cancelacion(err) && !es_reintento) {
					self.traer_asignacion(id, true)
					return
				}
				// Un error de verdad, o un segundo corte seguido: el modal no puede quedar en blanco.
				self.cargando_asignacion = false
				self.error_asignacion = true
			})
		},
		/**
		 * Con qué solapa abrir: la que pidió la URL; si no, "A revisar" si tiene algo (pedido de
		 * Lucas); si no, la primera que tenga artículos, en el orden de las solapas.
		 *
		 * @param {Object} asignacion
		 * @returns {String}
		 */
		solapa_inicial(asignacion) {
			if (this.solapa_pedida && SOLAPAS_VALIDAS.indexOf(this.solapa_pedida) !== -1) {
				return this.solapa_pedida
			}
			let conteos = asignacion.conteos
			if (conteo(conteos, 'a_revisar') > 0) {
				return 'a_revisar'
			}
			if (conteo(conteos, 'no_asignadas') > 0) {
				return 'no_asignadas'
			}
			if (conteo(conteos, 'asignadas') > 0) {
				return 'asignadas'
			}
			return 'no_asignadas'
		},
		/**
		 * Pide la página actual de la solapa actual. Con `{ silencioso: true }` no muestra el
		 * estado de carga ni el de error (refrescos que la persona no pidió).
		 *
		 * Si la página quedó fuera de rango (se resolvieron los últimos de la última página), va a
		 * la última que exista.
		 *
		 * @param {Object} opciones { silencioso: Boolean, reintento: Boolean }
		 * @returns {Promise}
		 */
		cargar_items(opciones) {
			let self = this
			if (!self.asignacion || !self.solapa) {
				return Promise.resolve()
			}
			let silencioso = !!(opciones && opciones.silencioso)
			self.pedido_de_items++
			let este_pedido = self.pedido_de_items

			if (!silencioso) {
				self.cargando_items = true
				self.error_items = false
			}

			return self.$store.dispatch('image_assignment/get_items', {
				asignacion_id: self.asignacion.id,
				solapa: self.solapa,
				page: self.pagina,
				per_page: self.por_pagina,
				buscar: self.buscar,
				silencioso: silencioso,
			})
			.then(datos => {
				if (este_pedido !== self.pedido_de_items) {
					return
				}
				let paginador = datos && datos.models ? datos.models : {}
				let items = Array.isArray(paginador.data) ? paginador.data : []
				self.total_items = Number(paginador.total) || 0
				self.ultima_pagina = Number(paginador.last_page) || 1
				if (datos && datos.conteos && !self.procesando_ids.length) {
					self.conteos = Object.assign({}, datos.conteos)
				}

				if (!items.length && self.total_items > 0 && self.pagina > self.ultima_pagina) {
					self.pagina = self.ultima_pagina
					return self.cargar_items(opciones)
				}

				self.items = items
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
				// Una cancelación no es un error. Si todavía no había llegado ninguna página, se
				// vuelve a pedir una vez (si no, la solapa quedaría vacía como si no tuviera nada);
				// si la lista ya estaba a la vista, queda lo que se estaba mostrando.
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
		 * Cambia de solapa y pide su primera página. Volver a tocar la solapa activa recarga: es
		 * la forma de ver lo último mientras la búsqueda corre. El buscador se conserva.
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
		 * "Seleccionar la página": todas las filas visibles (menos las que tienen una acción en
		 * vuelo) o ninguna.
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
		 * Saca de la lista un artículo que se resolvió y mueve su conteo de una solapa a otra.
		 * Si la página quedó vacía y hay más, se pide la que corresponda. Los números reales se
		 * piden un rato después (sincronización).
		 *
		 * Se llama solo si la asignación y la solapa siguen siendo las mismas que cuando se mandó
		 * la acción (lo controla resolver_uno).
		 *
		 * 🔴 La fila y el total se tocan SOLO si la fila sigue en la lista. Si la lista se volvió a
		 * pedir mientras viajaba la acción (otro 422, "actualizar", el fin de la búsqueda, un
		 * cambio de página), lo que llegó ya viene con el total del servidor: restarle otra vez
		 * dejaba el total uno abajo, y con 26 para revisar la página 2 desaparecía y el artículo
		 * 26 quedaba inalcanzable. Los conteos sí se ajustan: mientras hay una acción en vuelo,
		 * ninguna respuesta los pisa (ver cargar_items y aplicar_asignacion), así que siguen siendo
		 * los de antes de la acción.
		 *
		 * @param {Number} id
		 * @param {String} desde Solapa de la que sale.
		 * @param {String} hacia Solapa a la que pasa.
		 */
		sacar_item(id, desde, hacia) {
			let indice = this.items.findIndex(item => item.id === id)
			if (indice !== -1) {
				this.items.splice(indice, 1)
				this.total_items = Math.max(0, this.total_items - 1)
			}

			let conteos = Object.assign({}, this.conteos)
			conteos[desde] = Math.max(0, (Number(conteos[desde]) || 0) - 1)
			conteos[hacia] = (Number(conteos[hacia]) || 0) + 1
			this.conteos = conteos

			this.quitar_de_seleccion(id)

			if (!this.items.length && this.total_items > 0) {
				this.cargar_items()
			}
			this.programar_sincronizacion()
		},
		/**
		 * Aprueba la imagen de un artículo: pasa a estar en el artículo y en la tienda. Sin
		 * cartel de éxito a propósito: se revisan de a muchas, y la fila que se va es la
		 * confirmación. Si falla (422: ya no estaba para revisar, o se borró el artículo), el
		 * interceptor global muestra el motivo y la lista se vuelve a pedir para mostrar lo real.
		 *
		 * @param {Object} item
		 * @param {String|null} candidata Clave de la imagen que se eligió entre las que se
		 *        encontraron (de `alternativas` del item); null = la que propuso el sistema.
		 */
		aprobar(item, candidata) {
			this.resolver_uno(item, 'aprobar', 'a_revisar', 'asignadas', candidata)
		},
		/**
		 * Rechaza la imagen: se descarta y el artículo queda sin imagen (pasa a "No asignadas").
		 *
		 * @param {Object} item
		 */
		rechazar(item) {
			this.resolver_uno(item, 'rechazar', 'a_revisar', 'no_asignadas')
		},
		/**
		 * Lo común de aprobar, rechazar y quitar de a uno.
		 *
		 * 🔴 Se anota de qué asignación y de qué solapa era la fila al mandar la acción. Si cuando
		 * vuelve ya se está mirando otra cosa (se abrió otra búsqueda, o se cambió de solapa), no
		 * se toca nada de lo que se ve: sacar la fila o mover conteos ahí movía los números de la
		 * búsqueda equivocada. Solo se refresca la búsqueda de la acción (su fila en la tabla) y
		 * el número rojo.
		 *
		 * @param {Object} item
		 * @param {String} accion aprobar | rechazar | quitar (acción del store).
		 * @param {String} desde Solapa de la que sale.
		 * @param {String} hacia Solapa a la que pasa.
		 * @param {String|null} candidata Solo al aprobar: la imagen elegida entre las encontradas.
		 * @returns {Promise<Boolean>} true si la API la resolvió.
		 */
		resolver_uno(item, accion, desde, hacia, candidata) {
			let self = this
			if (!self.asignacion || self.esta_procesando(item.id)) {
				return Promise.resolve(false)
			}
			let id_de_la_asignacion = self.asignacion.id
			let solapa_de_la_accion = self.solapa
			self.marcar_procesando(item.id, true)

			// Al aprobar otra imagen que la propuesta, el store recibe {id, candidata}; en todo lo demás, el id.
			let datos = accion === 'aprobar' && candidata ? { id: item.id, candidata: candidata } : item.id

			return self.$store.dispatch('image_assignment/' + accion, datos)
			.then(() => {
				self.marcar_procesando(item.id, false)
				if (self.sigue_siendo(id_de_la_asignacion, solapa_de_la_accion)) {
					self.sacar_item(item.id, desde, hacia)
				} else {
					self.despues_de_cambiar_de_pantalla(id_de_la_asignacion)
				}
				return true
			})
			.catch(err => {
				console.log(err)
				self.marcar_procesando(item.id, false)
				if (self.sigue_siendo(id_de_la_asignacion, solapa_de_la_accion)) {
					// El motivo (422) ya lo mostró el interceptor; lo que se ve tiene que ser lo real.
					self.cargar_items({ silencioso: true })
					self.programar_sincronizacion()
				} else {
					self.despues_de_cambiar_de_pantalla(id_de_la_asignacion)
				}
				return false
			})
		},
		/**
		 * Una acción volvió cuando ya se estaba mirando otra cosa. Si es la misma búsqueda en otra
		 * solapa, se piden sus números reales (los conteos de las solapas son de esta búsqueda y
		 * se tienen que enterar). Si es otra búsqueda, solo se refresca la de la acción: su fila
		 * en la tabla y el número rojo.
		 *
		 * @param {Number} id_de_la_asignacion Asignación de la acción.
		 */
		despues_de_cambiar_de_pantalla(id_de_la_asignacion) {
			if (this.sigue_siendo(id_de_la_asignacion, null)) {
				this.programar_sincronizacion()
				return
			}
			this.refrescar_en_segundo_plano(id_de_la_asignacion)
		},
		/**
		 * True si el detalle sigue mostrando la misma asignación (y, si se pasa, la misma solapa)
		 * que cuando se mandó una acción.
		 *
		 * @param {Number} id_de_la_asignacion
		 * @param {String|null} solapa Si es null, no se compara la solapa.
		 * @returns {Boolean}
		 */
		sigue_siendo(id_de_la_asignacion, solapa) {
			if (!this.asignacion || this.asignacion.id !== id_de_la_asignacion) {
				return false
			}
			return !solapa || this.solapa === solapa
		},
		/**
		 * Trae una asignación sin tocar lo que muestra el detalle: el store actualiza su fila en
		 * la tabla de la solapa (actualizar_asignacion) y después se pide el número rojo. Es lo
		 * que se hace con una búsqueda que ya no es la que se está mirando.
		 *
		 * @param {Number} id
		 * @returns {Promise}
		 */
		refrescar_en_segundo_plano(id) {
			let self = this
			return self.$store.dispatch('image_assignment/get_asignacion', { id: id, silencioso: true })
			.catch(err => {
				console.log(err)
			})
			.then(() => self.$store.dispatch('image_assignment/get_resumen'))
		},
		/**
		 * Abre una caja de confirmación de a una por vez: mientras hay una abierta, un segundo
		 * clic (el doble clic de siempre) no abre otra. Resuelve true solo si la persona confirmó;
		 * cerrar con Escape o tocando afuera cuenta como no.
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
		 * Quita la imagen de un artículo de "Asignadas" (también de la tienda), con confirmación:
		 * es lo único de esta pantalla que le saca algo a un artículo que ya se ve en la tienda.
		 *
		 * @param {Object} item
		 */
		quitar(item) {
			let self = this
			if (self.esta_procesando(item.id)) {
				return
			}
			let nombre = item.article_name || ('el artículo N° ' + item.article_id)
			self.confirmar('¿Quitarle la imagen a «' + nombre + '»? Deja de verse en el artículo y en la tienda.', {
				title: 'Quitar imagen',
				okTitle: 'Quitar',
				okVariant: 'danger',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				// Se vuelve a mirar después de la caja: mientras estaba abierta pudo haber salido
				// otra acción sobre la misma fila.
				if (!confirmado || self.esta_procesando(item.id)) {
					return
				}
				return self.resolver_uno(item, 'quitar', 'asignadas', 'no_asignadas')
				.then(salio_bien => {
					if (salio_bien) {
						self.$toast.success('Listo: le quitamos la imagen al artículo')
					}
				})
			})
		},
		/**
		 * Aprueba o rechaza todas las tildadas de una vez. Rechazar pide confirmación (descarta
		 * las imágenes); aprobar no, porque se deshace con "Quitar". Con el indicador global de
		 * carga: son muchas a la vez y no tiene que poder repetirse mientras viaja.
		 *
		 * @param {String} accion aprobar | rechazar
		 */
		resolver_seleccionadas(accion) {
			let self = this
			let ids = self.seleccionados.slice()
			if (!ids.length || self.lote_en_curso || !self.asignacion) {
				return
			}
			let id_de_la_asignacion = self.asignacion.id
			let cantidad = ids.length
			let texto_cantidad = cantidad + (cantidad === 1 ? ' imagen' : ' imágenes')

			let confirmacion = accion === 'rechazar'
				? self.confirmar('¿Rechazar ' + texto_cantidad + '? Se descartan y esos artículos quedan sin imagen.', {
					title: 'Rechazar seleccionadas',
					okTitle: 'Rechazar',
					okVariant: 'danger',
					cancelTitle: 'No',
					centered: true,
				})
				: Promise.resolve(true)

			confirmacion.then(confirmado => {
				// Se vuelve a mirar después de la caja: un doble clic en "Aprobar seleccionadas"
				// (que no tiene caja) o un lote que salió mientras la caja estaba abierta no
				// pueden mandar los mismos ids dos veces.
				if (!confirmado || self.lote_en_curso || !self.sigue_siendo(id_de_la_asignacion, null)) {
					return
				}
				self.lote_en_curso = true
				self.$store.commit('auth/setMessage', accion === 'aprobar' ? 'Aprobando imágenes' : 'Rechazando imágenes')
				self.$store.commit('auth/setLoading', true)

				return self.$store.dispatch('image_assignment/' + (accion === 'aprobar' ? 'aprobar_varios' : 'rechazar_varios'), ids)
				.then(respuesta => {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					self.lote_en_curso = false
					self.avisar_resultado_del_lote(accion, respuesta)
					if (!self.sigue_siendo(id_de_la_asignacion, null)) {
						self.refrescar_en_segundo_plano(id_de_la_asignacion)
						return
					}
					self.seleccionados = []
					self.cargar_items()
					self.sincronizar()
				})
				.catch(err => {
					console.log(err)
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					self.lote_en_curso = false
					if (self.sigue_siendo(id_de_la_asignacion, null)) {
						self.cargar_items({ silencioso: true })
					}
				})
			})
		},
		/**
		 * "12 imágenes aprobadas", y si algunas no se pudieron, cuántas y el primer motivo.
		 *
		 * @param {String} accion aprobar | rechazar
		 * @param {Object} respuesta {aprobados|rechazados, fallidos: [{id, message}]}
		 */
		avisar_resultado_del_lote(accion, respuesta) {
			let datos = respuesta || {}
			let hechos = Number(accion === 'aprobar' ? datos.aprobados : datos.rechazados) || 0
			let fallidos = Array.isArray(datos.fallidos) ? datos.fallidos : []
			let participio = accion === 'aprobar'
				? (hechos === 1 ? 'aprobada' : 'aprobadas')
				: (hechos === 1 ? 'rechazada' : 'rechazadas')

			if (hechos > 0) {
				this.$toast.success(entero_es(hechos) + (hechos === 1 ? ' imagen ' : ' imágenes ') + participio)
			}
			if (fallidos.length) {
				let motivo = fallidos[0] && fallidos[0].message ? ' ' + fallidos[0].message : ''
				this.$toast.warning(
					(fallidos.length === 1 ? '1 no se pudo ' : entero_es(fallidos.length) + ' no se pudieron ')
					+ (accion === 'aprobar' ? 'aprobar.' : 'rechazar.') + motivo,
					{ duration: 8000 }
				)
			}
		},
		/**
		 * Detiene la búsqueda, con confirmación. En las de todo el catálogo solo lo puede hacer el
		 * acceso maestro (el encabezado ni muestra el botón y la API contesta 403); en las demás,
		 * cualquiera que la ve (plan §13).
		 */
		detener() {
			let self = this
			if (!self.asignacion || self.operando_asignacion) {
				return
			}
			let id_de_la_asignacion = self.asignacion.id
			self.confirmar('¿Detener la asignación? Lo que ya se procesó queda como está y los artículos que faltan no se buscan. Se puede reanudar después.', {
				title: 'Detener la asignación',
				okTitle: 'Detener',
				okVariant: 'danger',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				// Se vuelve a mirar después de la caja (doble clic, u otra búsqueda abierta).
				if (!confirmado || self.operando_asignacion || !self.sigue_siendo(id_de_la_asignacion, null)) {
					return
				}
				self.operando_asignacion = true
				return self.$store.dispatch('image_assignment/detener', id_de_la_asignacion)
				.then(asignacion => {
					self.operando_asignacion = false
					self.$toast.success('La asignación se detuvo')
					if (!self.sigue_siendo(id_de_la_asignacion, null)) {
						self.refrescar_en_segundo_plano(id_de_la_asignacion)
						return
					}
					self.aplicar_asignacion(asignacion)
					self.detener_refresco()
					/*
						sincronizar() y no solo el resumen: detenida, la búsqueda ya salió de proceso,
						y el GET del detalle es lo que la marca como vista. Sin eso, el número rojo
						sumaba uno por la misma búsqueda que se está mirando.
					*/
					self.sincronizar()
				})
				.catch(err => {
					console.log(err)
					self.operando_asignacion = false
				})
			})
		},
		/**
		 * Reanuda una búsqueda detenida, cortada o trabada (en las de todo el catálogo, solo el
		 * acceso maestro; en las demás, cualquiera, plan §13): sigue desde el
		 * primer artículo pendiente.
		 */
		reanudar() {
			let self = this
			if (!self.asignacion || self.operando_asignacion) {
				return
			}
			let id_de_la_asignacion = self.asignacion.id
			self.operando_asignacion = true
			self.$store.dispatch('image_assignment/reanudar', id_de_la_asignacion)
			.then(asignacion => {
				self.operando_asignacion = false
				self.$toast.success('La asignación sigue desde donde quedó')
				// Si mientras viajaba se abrió otra búsqueda, esta respuesta no es la que se ve (su
				// fila en la tabla ya la actualizó el store).
				if (!self.sigue_siendo(id_de_la_asignacion, null)) {
					return
				}
				self.aplicar_asignacion(asignacion)
				self.programar_refresco()
			})
			.catch(err => {
				console.log(err)
				self.operando_asignacion = false
			})
		},
		/**
		 * Aplica una versión nueva de la asignación. Los conteos de las solapas solo se pisan si
		 * no hay acciones en vuelo: si no, un número del servidor anterior a la acción desharía
		 * el ajuste que ya se hizo a mano.
		 *
		 * @param {Object} asignacion RunPayload.
		 */
		aplicar_asignacion(asignacion) {
			if (!asignacion) {
				return
			}
			this.asignacion = asignacion
			if (!this.procesando_ids.length && asignacion.conteos) {
				this.conteos = Object.assign({}, asignacion.conteos)
			}
		},
		/**
		 * Si hay una sincronización en espera, la hace ya para la asignación que se está mostrando,
		 * sin tocar lo que muestra el detalle. La usan el cierre del modal, abrir otra búsqueda
		 * (reiniciar) y salir de la pantalla (beforeDestroy): en los tres casos, cancelarla dejaba
		 * la fila de la tabla y el número rojo con los números de antes de la última acción.
		 *
		 * Una acción que todavía viaja se ocupa sola de lo suyo cuando vuelve (ver resolver_uno).
		 */
		sincronizar_pendiente_sin_esperar() {
			if (!this.timer_sincronizacion) {
				return
			}
			clearTimeout(this.timer_sincronizacion)
			this.timer_sincronizacion = null
			if (this.asignacion) {
				this.refrescar_en_segundo_plano(this.asignacion.id)
				return
			}
			this.$store.dispatch('image_assignment/get_resumen')
		},
		/**
		 * Pide los números reales un rato después de la última acción (ver ESPERA_SINCRONIZACION_MS).
		 */
		programar_sincronizacion() {
			clearTimeout(this.timer_sincronizacion)
			this.timer_sincronizacion = setTimeout(() => {
				this.timer_sincronizacion = null
				this.sincronizar()
			}, ESPERA_SINCRONIZACION_MS)
		},
		/**
		 * Trae la asignación (conteos y búsquedas reales, y de paso actualiza su fila en la tabla
		 * de la solapa) y el resumen del número rojo. Si todavía hay acciones en vuelo, espera.
		 */
		sincronizar() {
			let self = this
			if (!self.asignacion) {
				return
			}
			if (self.procesando_ids.length) {
				self.programar_sincronizacion()
				return
			}
			let id = self.asignacion.id
			self.$store.dispatch('image_assignment/get_asignacion', { id: id, silencioso: true })
			.then(asignacion => {
				if (self.asignacion && self.asignacion.id === id) {
					self.aplicar_asignacion(asignacion)
				}
			})
			.catch(err => {
				console.log(err)
			})
			.then(() => self.$store.dispatch('image_assignment/get_resumen'))
		},
		/**
		 * Mientras la búsqueda corre, el encabezado (avance, búsquedas, conteos de las solapas) se
		 * refresca solo cada 15 s. La lista no: ver `hay_novedades`.
		 */
		programar_refresco() {
			this.detener_refresco()
			if (!esta_activa(this.asignacion)) {
				return
			}
			this.timer_refresco = setInterval(this.refrescar_asignacion, REFRESCO_MS)
		},
		detener_refresco() {
			clearInterval(this.timer_refresco)
			this.timer_refresco = null
		},
		/**
		 * Un tic del refresco. Si la solapa estaba vacía y ya tiene algo, se trae la lista (no
		 * hay filas que mover). Si la búsqueda terminó mientras se miraba, se trae la lista final
		 * y el número rojo, y se deja de refrescar.
		 */
		refrescar_asignacion() {
			let self = this
			if (!self.visible || !self.asignacion) {
				self.detener_refresco()
				return
			}
			if (typeof document !== 'undefined' && document.hidden) {
				return
			}
			let id = self.asignacion.id
			let estaba_activa = esta_activa(self.asignacion)

			self.$store.dispatch('image_assignment/get_asignacion', { id: id, silencioso: true })
			.then(asignacion => {
				if (!asignacion || !self.asignacion || self.asignacion.id !== id) {
					return
				}
				self.aplicar_asignacion(asignacion)

				if (estaba_activa && !esta_activa(asignacion)) {
					self.detener_refresco()
					self.cargar_items({ silencioso: true })
					self.$store.dispatch('image_assignment/get_resumen')
					return
				}
				if (!self.items.length && !self.buscar && conteo(self.conteos, self.solapa) > 0) {
					self.cargar_items({ silencioso: true })
				}
			})
			.catch(err => {
				console.log(err)
			})
		},
		/**
		 * @param {Object} imagen { url, titulo, detalle }
		 */
		ampliar(imagen) {
			if (imagen && imagen.url) {
				this.imagen_visor = imagen
			}
		},
		/**
		 * El modal se cerró (botón, cruz, Escape o clic afuera). Si quedó una sincronización en
		 * espera se hace ya: la fila de la tabla y el número rojo no pueden quedar con los números
		 * de antes de la última aprobación.
		 */
		al_cerrar() {
			this.detener_refresco()
			clearTimeout(this.timer_buscar)
			this.sincronizar_pendiente_sin_esperar()
			this.imagen_visor = null
			this.$emit('cerrado')
		},
	},
}
</script>
<style lang="sass">
// Estilos compartidos del detalle y de sus filas. Sin scope a proposito: el b-modal cuelga de
// <body> y las filas son componentes hijos que usan estas mismas clases (prefijo img-det). Todo
// color va por token con el valor de :root como fallback; los fondos de estado son rgba
// translucidos o los pares de tokens que ya tienen contraparte oscura.

// El cuerpo con el scroll prolijo del sistema (pista transparente, pildora gris).
.img-det-modal__cuerpo
	&::-webkit-scrollbar
		width: 8px

	&::-webkit-scrollbar-track
		background: transparent

	&::-webkit-scrollbar-thumb
		background-color: var(--color-border, rgba(0, 0, 0, .2))
		border-radius: 8px

.img-det
	text-align: left

.img-det__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 40px 20px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

// El nav trae `margin-top: 15px` en sus hijos (.cont-left > div): con eso alcanza de aire arriba.
.img-det__solapas
	scroll-margin-top: 8px

.img-det__nota
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

.img-det__lista
	margin: 0
	padding: 0
	list-style: none
	border-top: 1px solid var(--color-border-secondary, #e9ecef)
	transition: opacity .15s ease

// Mientras llega otra pagina, la actual queda un poco apagada en vez de desaparecer.
.img-det__lista--cargando
	opacity: .5

// --- Una fila ---------------------------------------------------------------------------------
// Lista con separadores finos, sin tarjetas: la jerarquia la dan la tipografia y el aire.
.img-det-fila
	display: flex
	flex-direction: row
	align-items: flex-start
	gap: 14px
	padding: 14px 6px
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)
	transition: background .15s ease, opacity .15s ease

.img-det-fila__tilde
	flex: 0 0 auto
	align-self: center
	margin-right: -8px

.img-det-fila__cuerpo
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 4px
	flex: 1 1 auto
	min-width: 0

.img-det-fila__linea
	display: flex
	align-items: baseline
	justify-content: space-between
	gap: 12px
	width: 100%

.img-det-fila__nombre
	font-size: 0.9375rem
	font-weight: 600
	line-height: 1.3
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.img-det-fila__busquedas
	flex-shrink: 0
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums
	white-space: nowrap

.img-det-fila__meta
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 4px 12px
	font-size: 0.8rem
	color: var(--color-text-secondary, #6c757d)

.img-det-fila__codigo
	font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace
	font-size: 0.78rem
	font-variant-numeric: tabular-nums
	overflow-wrap: anywhere

// "Cód. barras" / "Cód. proveedor": el rótulo va en la tipografía común, apagado, para que el número se lea primero.
.img-det-fila__rotulo
	font-family: inherit
	font-size: 0.72rem
	margin-right: 4px
	color: var(--color-text-secondary, #6c757d)
	opacity: .85

.img-det-fila__detalle
	margin: 2px 0 0
	font-size: 0.82rem
	line-height: 1.4
	color: var(--color-text-primary, #212529)

.img-det-fila__detalle--ia
	color: var(--color-text-secondary, #6c757d)

.img-det-fila__avisos
	display: flex
	flex-wrap: wrap
	gap: 6px
	margin-top: 2px

.img-det-fila__link
	display: inline-flex
	align-items: center
	gap: 5px
	font-size: 0.8rem
	font-weight: 500
	color: var(--color-primary, #007bff)

	i
		font-size: 0.7rem

.img-det-fila__desplegar
	display: inline-flex
	align-items: center
	gap: 6px
	margin-top: 2px
	padding: 2px 0
	border: 0
	background: transparent
	box-shadow: none
	font-size: 0.8125rem
	font-weight: 500
	color: var(--color-primary, #007bff)
	cursor: pointer

	&:hover
		opacity: .75

	i
		font-size: 0.75rem

.img-det-fila__acciones
	display: flex
	flex: 0 0 auto
	align-self: center
	gap: 8px

// A revisar: debajo de la fila de siempre puede abrirse el panel con las otras imágenes.
.img-det-fila--revisar
	flex-wrap: wrap

// Escritorio y tablet: con la fila en wrap, el cuerpo parte de 0 y crece (si no, un nombre largo
// compara su ancho "ideal" contra la línea y manda las acciones a un renglón aparte). En teléfono
// manda el piso de 160px de más abajo, que es lo que baja el cuerpo debajo de la miniatura.
@media (min-width: 576px)
	.img-det-fila--revisar .img-det-fila__cuerpo
		flex-basis: 0

.img-det-otras
	flex: 0 0 100%
	// min-width/max-width: sin esto la tira (nowrap en teléfono) ensancha el panel más allá de la tarjeta.
	min-width: 0
	max-width: 100%
	display: flex
	align-items: flex-start
	gap: 18px
	margin-top: 2px
	padding-top: 12px
	border-top: 1px dashed var(--color-border-secondary, #e9ecef)

.img-det-otras__visor
	display: flex
	flex-direction: column
	flex: 0 0 auto
	gap: 6px
	max-width: 100%

.img-det-otras__nota
	margin: 0
	max-width: 260px
	font-size: 0.75rem
	line-height: 1.35
	color: var(--color-text-secondary, #6c757d)

// La tira de miniaturas: la propuesta primero y después las otras, con la elegida marcada.
.img-det-otras__tira
	display: flex
	flex-wrap: wrap
	flex: 1 1 auto
	align-content: flex-start
	gap: 8px
	min-width: 0
	margin: 0
	padding: 0
	list-style: none

.img-det-opcion
	display: flex
	flex-direction: column
	align-items: center
	gap: 4px
	width: 78px
	padding: 3px
	border: 2px solid transparent
	border-radius: 10px
	background: transparent
	box-shadow: none
	cursor: pointer
	transition: border-color .15s ease

	&:hover:not(:disabled)
		border-color: var(--color-border-secondary, #e9ecef)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: 2px

	&:disabled
		cursor: default
		opacity: .6

// Dos clases a propósito: tiene que ganarle al :hover de arriba.
.img-det-opcion.img-det-opcion--seleccionada
	border-color: var(--color-primary, #007bff)

.img-det-opcion__rotulo
	max-width: 100%
	overflow: hidden
	text-overflow: ellipsis
	white-space: nowrap
	font-size: 0.7rem
	color: var(--color-text-secondary, #6c757d)

// Fila tildada: el celeste de siempre (--bg-nav-hover, con su variante oscura en el token).
.img-det-fila--seleccionada
	background: var(--bg-nav-hover, #e7f1ff)

.img-det-fila--procesando
	opacity: .55

// El diagnostico desplegado ocupa el ancho de la fila.
.img-det-fila--no-asignada
	.img-det-diag
		align-self: stretch

// Salida de una fila resuelta: se desvanece en vez de desaparecer de golpe.
.img-det-fila-leave-active
	transition: opacity .2s ease

.img-det-fila-leave-to
	opacity: 0

// --- Etiquetas (motivo, avisos, resultado de cada candidata) ----------------------------------
.img-det-etiqueta
	display: inline-flex
	align-items: center
	max-width: 100%
	padding: 2px 8px
	border-radius: 999px
	font-size: 0.72rem
	font-weight: 600
	line-height: 1.35
	white-space: normal

.img-det-etiqueta--neutro
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)
	box-shadow: inset 0 0 0 1px var(--color-border-secondary, #e9ecef)

// Ambar: los dos tokens existen solo en html.dark-mode; en claro manda el literal del fallback.
.img-det-etiqueta--aviso
	background: var(--bg-warning-soft, rgba(255, 193, 7, .16))
	color: var(--color-text-warning-strong, #856404)

.img-det-etiqueta--mal
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)

.img-det-etiqueta--ok
	background: var(--caja-abierta-fondo, #f2f7f4)
	color: var(--caja-abierta-texto, #1e6047)

@media (prefers-reduced-motion: reduce)
	.img-det-fila-leave-active,
	.img-det__lista
		transition: none

// Telefono: las acciones bajan debajo de la fila, a lo ancho y con tamaño de dedo.
@media (max-width: 575px)
	.img-det-fila
		flex-wrap: wrap
		gap: 10px 12px
		padding: 12px 2px

	.img-det-fila__cuerpo
		// Al lado de la miniatura, pero con un piso: si no entra, baja entero.
		flex-basis: 160px

	// Teléfono: el visor arriba, a lo ancho, y la tira de miniaturas debajo, con scroll horizontal.
	.img-det-otras
		flex-direction: column
		gap: 12px

	.img-det-otras__visor
		width: 100%

	.img-det-otras__tira
		flex-wrap: nowrap
		width: 100%
		overflow-x: auto
		padding-bottom: 6px
		-webkit-overflow-scrolling: touch

		li
			flex: 0 0 auto

	.img-det-fila__acciones
		width: 100%

		// Tres clases: .btn-modulo--fila.btn (0,2,0) vive en una hoja global y fija 28px.
		.btn.btn-modulo
			flex: 1 1 0
			height: 36px

	.img-det-fila__linea
		flex-direction: column
		align-items: flex-start
		gap: 2px
</style>
