<template>
<div>

	<b-modal
	id="medidas-corrida-detalle"
	v-model="visible"
	size="xl"
	scrollable
	modal-class="med-det-modal"
	body-class="med-det-modal__cuerpo"
	:title="titulo"
	@hidden="al_cerrar">

		<div
		class="med-det"
		data-testid="medidas-modal-detalle"
		:data-corrida="corrida ? corrida.id : null">

			<div
			v-if="cargando_corrida && !corrida"
			class="med-det__cargando">
				<b-spinner
				small
				variant="primary"></b-spinner>
				<span>Cargando la búsqueda…</span>
			</div>

			<empty-state
			v-else-if="error_corrida && !corrida"
			data-testid="medidas-detalle-error"
			icon_class="bi bi-exclamation-circle"
			title="No pudimos abrir esta búsqueda"
			hint="Puede que ya no exista, o que se haya cortado la conexión. Cerrá y volvé a intentar."></empty-state>

			<template v-else-if="corrida">

				<encabezado
				:corrida="corrida"
				:es_acceso_maestro="es_acceso_maestro"
				:operando="operando_corrida"
				@detener="detener"
				@reanudar="reanudar"></encabezado>

				<!--
					Las tres solapas con la cantidad de cada una en el nombre: Asignadas · A revisar · Sin
					datos. Es el horizontal-nav del sistema en modo autónomo: el componente pinta y avisa;
					qué pedir lo decide este detalle.
				-->
				<div
				ref="solapas"
				class="med-det__solapas">
					<horizontal-nav
					v-if="solapa"
					:items="items_de_solapas"
					:selected_item_value="solapa"
					:show_display="false"
					emitir_setSelected_al_inicio
					@setSelected="al_elegir_solapa"></horizontal-nav>
				</div>

				<p
				class="med-det__nota"
				:data-testid="'medidas-nota-' + solapa">
					<i
					class="bi bi-info-circle"
					aria-hidden="true"></i>
					{{ nota_de_la_solapa }}
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
				class="med-det__contenido"
				:data-solapa="solapa">

					<div
					v-if="cargando_items && !items.length"
					class="med-det__cargando">
						<b-spinner
						small
						variant="primary"></b-spinner>
						<span>Cargando artículos…</span>
					</div>

					<empty-state
					v-else-if="error_items && !items.length"
					data-testid="medidas-items-error"
					icon_class="bi bi-cloud-slash"
					title="No pudimos traer los artículos"
					hint="Revisá la conexión y volvé a intentar.">
						<b-button
						class="btn-modulo"
						variant="outline-primary"
						data-testid="medidas-items-reintentar"
						@click="cargar_items()">
							Reintentar
						</b-button>
					</empty-state>

					<empty-state
					v-else-if="!items.length"
					data-testid="medidas-solapa-vacia"
					:icon_class="vacio.icono"
					:title="vacio.titulo"
					:hint="vacio.pista"></empty-state>

					<!--
						Una lista por solapa, cada una con su fila. Van separadas (y no con un <component
						:is>) porque las tres filas reciben cosas distintas: pasarle a todas todo terminaría
						como atributos sueltos en el <li>.
					-->
					<transition-group
					v-else-if="solapa === 'sin_datos'"
					tag="ul"
					name="med-det-fila"
					class="med-det__lista"
					:class="clase_de_lista"
					data-testid="medidas-lista-sin-datos">
						<fila-sin-datos
						v-for="item in items"
						:key="item.id"
						:item="item"></fila-sin-datos>
					</transition-group>

					<transition-group
					v-else-if="solapa === 'a_revisar'"
					tag="ul"
					name="med-det-fila"
					class="med-det__lista"
					:class="clase_de_lista"
					data-testid="medidas-lista-a-revisar">
						<fila-a-revisar
						v-for="item in items"
						:key="item.id"
						:item="item"
						:seleccionado="esta_seleccionado(item.id)"
						:procesando="esta_procesando(item.id)"
						@seleccionar="al_seleccionar(item, $event)"
						@aprobar="aprobar(item, $event)"
						@rechazar="rechazar(item)"></fila-a-revisar>
					</transition-group>

					<transition-group
					v-else
					tag="ul"
					name="med-det-fila"
					class="med-det__lista"
					:class="clase_de_lista"
					data-testid="medidas-lista-asignadas">
						<fila-asignada
						v-for="item in items"
						:key="item.id"
						:item="item"
						:procesando="esta_procesando(item.id)"
						@quitar="quitar(item)"></fila-asignada>
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
			data-testid="medidas-detalle-cerrar"
			@click="visible = false">
				Cerrar
			</b-button>
		</template>

	</b-modal>

</div>
</template>
<script>
import HorizontalNav from '@/common-vue/components/horizontal-nav/Index'
import EmptyState from '@/common-vue/components/display/EmptyState'
import Encabezado from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/Encabezado'
import BarraDeSolapa from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/BarraDeSolapa'
import FilaAsignada from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaAsignada'
import FilaARevisar from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaARevisar'
import FilaSinDatos from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/FilaSinDatos'
import PaginacionItems from '@/components/alertas/components/lista-de-alertas-table/medidas/detalle/PaginacionItems'
import { SOLAPAS_DE_MEDIDAS, VALORES_DE_SOLAPA } from '@/utils/medidas_de_catalogo'
import { TEXTOS, esta_activa, conteo, entero_es } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'
import { es_cancelacion } from '@/store/dimension_search'

/** Cada cuánto se refresca el encabezado mientras la corrida sigue avanzando. */
const REFRESCO_MS = 15000

/** Espera antes de buscar mientras se escribe (lo mismo que el buscador de Imágenes). */
const ESPERA_BUSCADOR_MS = 400

/**
 * Espera antes de pedir los números frescos después de aprobar / rechazar / quitar: quien está
 * revisando aprueba varias seguidas, y con esto se pide una sola vez al final de la racha.
 */
const ESPERA_SINCRONIZACION_MS = 1200

/**
 * Detalle de una corrida de medidas (modal xl): encabezado con estado, datos y consultas; y las tres
 * solapas —Asignadas · A revisar · Sin datos— paginadas en el servidor (25 por defecto, 50 o 100),
 * con buscador por nombre o código.
 *
 * Se maneja por props: la sección de Alertas le pasa `corrida_id` (y opcionalmente la solapa con la
 * que abrir) y este componente se abre solo; al cerrarse avisa con `cerrado` para que la sección
 * suelte el id y limpie la URL.
 *
 * Lo que cambia algo (aprobar, rechazar, quitar, en lote o de a uno) saca la fila de la lista en el
 * momento y ajusta los contadores de las solapas a mano; un rato después se piden los números reales
 * de la corrida (y el del badge) para que todo quede como lo ve la API.
 *
 * Es el espejo de imagenes/detalle/Index.vue, con tres diferencias: las solapas son otras, «Editar»
 * manda `valores` al aprobar, y no hay visor de imágenes.
 */
export default {
	components: {
		HorizontalNav,
		EmptyState,
		Encabezado,
		BarraDeSolapa,
		FilaAsignada,
		FilaARevisar,
		FilaSinDatos,
		PaginacionItems,
	},
	props: {
		/** Corrida a mostrar (null = cerrado). */
		corrida_id: {
			type: Number,
			default: null,
		},
		/** Solapa con la que abrir (viene de la URL), o null para que la elija el detalle. */
		solapa_pedida: {
			type: String,
			default: null,
		},
		/** true si la sesión entró con la clave maestra: la piden Detener / Reanudar. */
		es_acceso_maestro: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			/** Visibilidad del modal (v-model). */
			visible: false,
			/** RunPayload normalizado de la corrida abierta. */
			corrida: null,
			cargando_corrida: false,
			error_corrida: false,
			/** true mientras viaja un detener / reanudar. */
			operando_corrida: false,
			/** Solapa visible: asignadas | a_revisar | sin_datos. */
			solapa: null,
			/** Conteos de las solapas (los últimos que mandó la API, ajustados a mano al resolver). */
			conteos: {},
			/** Página visible de artículos (ItemPayload normalizado). */
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
			/** Ids tildados en «A revisar». */
			seleccionados: [],
			/** Ids con una acción en vuelo (sus botones se apagan). */
			procesando_ids: [],
			/** true mientras viaja un aprobar / rechazar en lote. */
			lote_en_curso: false,
			/**
			 * true mientras hay una caja de confirmación abierta (quitar, lote, detener). Un doble clic
			 * no tiene que abrir dos cajas ni mandar dos veces lo mismo.
			 */
			confirmacion_abierta: false,
			/** Contador de pedidos de la lista: una respuesta vieja no pisa una más nueva. */
			pedido_de_items: 0,
			timer_sincronizacion: null,
			timer_refresco: null,
		}
	},
	computed: {
		/**
		 * "Búsqueda de medidas del 27/10/26 a las 14:05".
		 *
		 * @returns {String}
		 */
		titulo() {
			let fecha = this.corrida ? (this.corrida.created_at || this.corrida.started_at) : null
			if (!fecha) {
				return 'Búsqueda de medidas'
			}
			return 'Búsqueda de medidas del ' + this.date(fecha) + ' a las ' + this.hour(fecha)
		},
		/**
		 * Items del horizontal-nav: "A revisar (12)". `route_value` es el valor de la solapa (el
		 * nombre lleva la cantidad, que cambia) y `testid` deja un data-testid fijo.
		 *
		 * @returns {Array}
		 */
		items_de_solapas() {
			let self = this
			let items = []
			SOLAPAS_DE_MEDIDAS.forEach(function (solapa) {
				items.push({
					name: solapa.nombre + ' (' + entero_es(conteo(self.conteos, solapa.valor)) + ')',
					route_value: solapa.valor,
					testid: 'solapa-medidas-' + solapa.valor,
				})
			})
			return items
		},
		/**
		 * La frase que explica qué hay en la solapa abierta (en «A revisar» avisa que todavía no se
		 * cargó nada en los artículos).
		 *
		 * @returns {String}
		 */
		nota_de_la_solapa() {
			if (this.solapa === 'a_revisar') {
				return TEXTOS.nota_a_revisar
			}
			if (this.solapa === 'sin_datos') {
				return TEXTOS.nota_sin_datos
			}
			return TEXTOS.nota_asignadas
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
		 * Mientras la corrida avanza, la solapa puede tener más artículos que los que se ven (la lista
		 * no se refresca sola para no moverle las filas a quien está revisando). Con el buscador puesto
		 * no se compara: ahí el total es el de la búsqueda, no el de la solapa.
		 *
		 * @returns {Boolean}
		 */
		hay_novedades() {
			if (!esta_activa(this.corrida) || this.buscar || !this.items_cargados || this.cargando_items) {
				return false
			}
			return conteo(this.conteos, this.solapa) > this.total_items
		},
		clase_de_lista() {
			return { 'med-det__lista--cargando': this.cargando_items }
		},
		/**
		 * Qué decir cuando la solapa está vacía: no es lo mismo no encontrar nada que no tener nada
		 * para revisar (que es una buena noticia), ni una corrida terminada que una que sigue
		 * corriendo o que todavía no procesó ningún artículo.
		 *
		 * @returns {Object} { icono, titulo, pista }
		 */
		vacio() {
			let corriendo = esta_activa(this.corrida)
			if (this.buscar) {
				return {
					icono: 'bi bi-search',
					titulo: 'Ningún artículo coincide con «' + this.buscar + '»',
					pista: 'Probá con otra parte del nombre o con el código de barras.',
				}
			}
			// Todavía no se procesó ningún artículo (espera turno en la cola, o se frenó antes de llegar al
			// primero): las solapas están vacías por eso, y afirmar un resultado sería mentira.
			if (this.corrida && this.corrida.procesados === 0) {
				return {
					icono: 'bi bi-hourglass-split',
					titulo: 'Todavía no se procesó ningún artículo',
					pista: corriendo
						? 'A medida que la búsqueda avance, cada artículo va a ir apareciendo en una de las tres solapas.'
						: 'La búsqueda se frenó antes de llegar al primero.',
				}
			}
			if (this.solapa === 'a_revisar') {
				return {
					icono: 'bi bi-check2-all',
					titulo: 'No hay medidas para revisar',
					pista: corriendo
						? 'La búsqueda sigue: si aparece una medida dudosa o incompleta, va a quedar acá para que decidas.'
						: 'Cuando el sistema no está seguro de unas medidas, las deja acá para que las apruebes o las rechaces.',
				}
			}
			if (this.solapa === 'asignadas') {
				return {
					icono: 'bi bi-rulers',
					titulo: 'Todavía no se cargaron medidas solas',
					pista: corriendo
						? 'La búsqueda sigue: las medidas van apareciendo acá a medida que se encuentran.'
						: 'Esta búsqueda no le cargó medidas a ningún artículo sin pasar por revisión.',
				}
			}
			return {
				icono: 'bi bi-check2-circle',
				titulo: 'No quedó ningún artículo sin datos',
				pista: corriendo
					? 'La búsqueda sigue: si de algún artículo no se encuentra nada, va a aparecer acá con el motivo.'
					: 'De todo lo que se buscó se encontró algo, y está cargado o esperando revisión.',
			}
		},
	},
	watch: {
		/**
		 * La sección de Alertas pide abrir una corrida (clic, «Ver» o link directo). `immediate`
		 * porque el detalle se monta con el id ya puesto cuando se entra por un link.
		 */
		corrida_id: {
			immediate: true,
			handler(nuevo) {
				if (nuevo) {
					this.abrir(nuevo)
					return
				}
				// La sección soltó el id con el modal todavía abierto (el botón Atrás del navegador con un
				// detalle abierto por URL): se cierra acá, y el @hidden avisa `cerrado` como en cualquier
				// otro cierre.
				if (this.visible) {
					this.visible = false
				}
			},
		},
		/** Un link directo nuevo sobre la misma corrida, pero con otra solapa. */
		solapa_pedida(nueva) {
			if (nueva && this.corrida && nueva !== this.solapa) {
				this.cambiar_solapa(nueva)
			}
		},
		/**
		 * Buscador: espera a que se deje de escribir y recién ahí pide, desde la primera página. Si el
		 * texto confirmado no cambió (por ejemplo, al limpiar al abrir), no pide nada.
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
		// «atrás» del navegador justo después de aprobar), los números se piden igual: si no, el
		// número rojo quedaría contando propuestas que ya se resolvieron.
		this.sincronizar_pendiente_sin_esperar()
	},
	methods: {
		/**
		 * Deja el detalle como recién abierto, sin nada de la corrida anterior.
		 *
		 * 🔴 Antes de soltar la corrida anterior, si le quedó una sincronización en espera (se aprobó
		 * algo hace menos de ESPERA_SINCRONIZACION_MS y se abrió otra corrida), se hace ya: cancelarla
		 * sin más dejaba la fila de esa corrida en la tabla, y el número rojo, con los números de antes
		 * de la aprobación.
		 */
		reiniciar() {
			this.detener_refresco()
			clearTimeout(this.timer_buscar)
			this.sincronizar_pendiente_sin_esperar()
			this.corrida = null
			this.cargando_corrida = false
			this.error_corrida = false
			this.operando_corrida = false
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
		},
		/**
		 * Abre el modal y trae la corrida; con ella decide la solapa y pide su primera página. Del lado
		 * de la API, abrirla la marca como vista: por eso se vuelve a pedir el resumen del número rojo.
		 *
		 * @param {Number} id
		 */
		abrir(id) {
			this.reiniciar()
			this.visible = true
			this.cargando_corrida = true
			this.traer_corrida(id, false)
		},
		/**
		 * El pedido de la corrida que hace `abrir`. Una cancelación no es un error («No pudimos abrir
		 * esta búsqueda» sería mentira): se vuelve a pedir una vez.
		 *
		 * @param {Number} id
		 * @param {Boolean} es_reintento
		 */
		traer_corrida(id, es_reintento) {
			let self = this
			self.$store.dispatch('dimension_search/get_corrida', id)
			.then(corrida => {
				// Mientras viajaba se cerró o se pidió otra: esta respuesta ya no importa.
				if (self.corrida_id !== id) {
					return
				}
				self.cargando_corrida = false
				if (!corrida) {
					self.error_corrida = true
					return
				}
				self.corrida = corrida
				self.conteos = Object.assign({}, corrida.conteos)
				self.solapa = self.solapa_inicial(corrida)
				self.cargar_items()
				self.programar_refresco()
				self.$store.dispatch('dimension_search/get_resumen')
			})
			.catch(err => {
				console.log(err)
				if (self.corrida_id !== id) {
					return
				}
				if (es_cancelacion(err) && !es_reintento) {
					self.traer_corrida(id, true)
					return
				}
				// Un error de verdad, o un segundo corte seguido: el modal no puede quedar en blanco.
				self.cargando_corrida = false
				self.error_corrida = true
			})
		},
		/**
		 * Con qué solapa abrir: la que pidió la URL; si no, «A revisar» si tiene algo (lo que pide
		 * atención); si no, la primera que tenga artículos, en el orden de las solapas.
		 *
		 * @param {Object} corrida
		 * @returns {String}
		 */
		solapa_inicial(corrida) {
			if (this.solapa_pedida && VALORES_DE_SOLAPA.indexOf(this.solapa_pedida) !== -1) {
				return this.solapa_pedida
			}
			let conteos = corrida.conteos
			if (conteo(conteos, 'a_revisar') > 0) {
				return 'a_revisar'
			}
			if (conteo(conteos, 'asignadas') > 0) {
				return 'asignadas'
			}
			if (conteo(conteos, 'sin_datos') > 0) {
				return 'sin_datos'
			}
			return 'a_revisar'
		},
		/**
		 * Pide la página actual de la solapa actual. Con `{ silencioso: true }` no muestra el estado de
		 * carga ni el de error (refrescos que la persona no pidió).
		 *
		 * Si la página quedó fuera de rango (se resolvieron los últimos de la última página), va a la
		 * última que exista.
		 *
		 * @param {Object} opciones { silencioso: Boolean, reintento: Boolean }
		 * @returns {Promise}
		 */
		cargar_items(opciones) {
			let self = this
			if (!self.corrida || !self.solapa) {
				return Promise.resolve()
			}
			let silencioso = !!(opciones && opciones.silencioso)
			self.pedido_de_items++
			let este_pedido = self.pedido_de_items

			if (!silencioso) {
				self.cargando_items = true
				self.error_items = false
			}

			return self.$store.dispatch('dimension_search/get_items', {
				corrida_id: self.corrida.id,
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
				self.total_items = datos.total
				self.ultima_pagina = datos.ultima_pagina
				if (datos.conteos && !self.procesando_ids.length) {
					self.conteos = Object.assign({}, datos.conteos)
				}

				if (!datos.items.length && self.total_items > 0 && self.pagina > self.ultima_pagina) {
					self.pagina = self.ultima_pagina
					return self.cargar_items(opciones)
				}

				self.items = datos.items
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
		 * forma de ver lo último mientras la corrida avanza. El buscador se conserva.
		 *
		 * @param {String} valor
		 */
		cambiar_solapa(valor) {
			if (VALORES_DE_SOLAPA.indexOf(valor) === -1) {
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
		 * Después de cambiar de página, la lista nueva arranca arriba: se lleva la vista a las solapas,
		 * que es donde empieza.
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
		 * Tilde de una fila de «A revisar».
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
		 * «Seleccionar la página»: todas las filas visibles (menos las que tienen una acción en vuelo)
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
		 * Saca de la lista un artículo que se resolvió y mueve su conteo de una solapa a otra. Si la
		 * página quedó vacía y hay más, se pide la que corresponda. Los números reales se piden un
		 * rato después (sincronización): el ajuste a mano es solo para que la pantalla no se vea
		 * desactualizada en ese rato.
		 *
		 * Se llama solo si la corrida y la solapa siguen siendo las mismas que cuando se mandó la
		 * acción (lo controla resolver_uno).
		 *
		 * 🔴 La fila y el total se tocan SOLO si la fila sigue en la lista. Si la lista se volvió a
		 * pedir mientras viajaba la acción, lo que llegó ya viene con el total del servidor: restarle
		 * otra vez dejaba el total uno abajo y un artículo inalcanzable. Los conteos sí se ajustan:
		 * mientras hay una acción en vuelo, ninguna respuesta los pisa (ver cargar_items y
		 * aplicar_corrida), así que siguen siendo los de antes de la acción.
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
		 * Aprueba las medidas de un artículo: se cargan en el artículo (solo en los campos que sigan
		 * vacíos). Sin cartel de éxito a propósito: se revisan de a muchas, y la fila que se va es la
		 * confirmación. Si falla (422: un valor inválido; 409: el artículo ya tenía esos campos), el
		 * interceptor global muestra el motivo y la lista se vuelve a pedir para mostrar lo real.
		 *
		 * @param {Object} item
		 * @param {Object|null} valores {peso, alto, ancho, profundidad} editados (solo los escritos), o
		 *        null para aprobar lo que propuso el sistema.
		 */
		aprobar(item, valores) {
			this.resolver_uno(item, 'aprobar', 'a_revisar', 'asignadas', valores)
		},
		/**
		 * Rechaza la propuesta: no se escribe nada en el artículo y la fila sale de «A revisar».
		 *
		 * @param {Object} item
		 */
		rechazar(item) {
			this.resolver_uno(item, 'rechazar', 'a_revisar', 'sin_datos')
		},
		/**
		 * Lo común de aprobar, rechazar y quitar de a uno.
		 *
		 * 🔴 Se anota de qué corrida y de qué solapa era la fila al mandar la acción. Si cuando vuelve
		 * ya se está mirando otra cosa (se abrió otra corrida, o se cambió de solapa), no se toca nada
		 * de lo que se ve: sacar la fila o mover conteos ahí movía los números de la corrida
		 * equivocada. Solo se refresca la corrida de la acción (su fila en la tabla) y el número rojo.
		 *
		 * @param {Object} item
		 * @param {String} accion aprobar | rechazar | quitar (acción del store).
		 * @param {String} desde Solapa de la que sale.
		 * @param {String} hacia Solapa a la que pasa.
		 * @param {Object|null} valores Solo al aprobar: los valores editados.
		 * @returns {Promise<Boolean>} true si la API la resolvió.
		 */
		resolver_uno(item, accion, desde, hacia, valores) {
			let self = this
			if (!self.corrida || self.esta_procesando(item.id)) {
				return Promise.resolve(false)
			}
			let id_de_la_corrida = self.corrida.id
			let solapa_de_la_accion = self.solapa
			self.marcar_procesando(item.id, true)

			// Al aprobar con valores editados, el store recibe {id, valores}; en todo lo demás, el id.
			let datos = accion === 'aprobar' && valores ? { id: item.id, valores: valores } : item.id

			return self.$store.dispatch('dimension_search/' + accion, datos)
			.then(() => {
				self.marcar_procesando(item.id, false)
				if (self.sigue_siendo(id_de_la_corrida, solapa_de_la_accion)) {
					self.sacar_item(item.id, desde, hacia)
				} else {
					self.despues_de_cambiar_de_pantalla(id_de_la_corrida)
				}
				return true
			})
			.catch(err => {
				console.log(err)
				self.marcar_procesando(item.id, false)
				if (self.sigue_siendo(id_de_la_corrida, solapa_de_la_accion)) {
					// El motivo (422 / 409) ya lo mostró el interceptor; lo que se ve tiene que ser lo real.
					self.cargar_items({ silencioso: true })
					self.programar_sincronizacion()
				} else {
					self.despues_de_cambiar_de_pantalla(id_de_la_corrida)
				}
				return false
			})
		},
		/**
		 * Una acción volvió cuando ya se estaba mirando otra cosa. Si es la misma corrida en otra
		 * solapa, se piden sus números reales (los conteos son de esta corrida y se tienen que
		 * enterar). Si es otra corrida, solo se refresca la de la acción: su fila en la tabla y el
		 * número rojo.
		 *
		 * @param {Number} id_de_la_corrida Corrida de la acción.
		 */
		despues_de_cambiar_de_pantalla(id_de_la_corrida) {
			if (this.sigue_siendo(id_de_la_corrida, null)) {
				this.programar_sincronizacion()
				return
			}
			this.refrescar_en_segundo_plano(id_de_la_corrida)
		},
		/**
		 * True si el detalle sigue mostrando la misma corrida (y, si se pasa, la misma solapa) que
		 * cuando se mandó una acción.
		 *
		 * @param {Number} id_de_la_corrida
		 * @param {String|null} solapa Si es null, no se compara la solapa.
		 * @returns {Boolean}
		 */
		sigue_siendo(id_de_la_corrida, solapa) {
			if (!this.corrida || this.corrida.id !== id_de_la_corrida) {
				return false
			}
			return !solapa || this.solapa === solapa
		},
		/**
		 * Trae una corrida sin tocar lo que muestra el detalle: el store actualiza su fila en la tabla
		 * (actualizar_corrida) y después se pide el número rojo. Es lo que se hace con una corrida que
		 * ya no es la que se está mirando.
		 *
		 * @param {Number} id
		 * @returns {Promise}
		 */
		refrescar_en_segundo_plano(id) {
			let self = this
			return self.$store.dispatch('dimension_search/get_corrida', { id: id, silencioso: true })
			.catch(err => {
				console.log(err)
			})
			.then(() => self.$store.dispatch('dimension_search/get_resumen'))
		},
		/**
		 * Abre una caja de confirmación de a una por vez: mientras hay una abierta, un segundo clic (el
		 * doble clic de siempre) no abre otra. Resuelve true solo si la persona confirmó; cerrar con
		 * Escape o tocando afuera cuenta como no.
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
		 * Quita las medidas de un artículo de «Asignadas», con confirmación: es lo único de esta
		 * pantalla que le saca algo a un artículo que ya las tiene cargadas (y que la tienda usa para
		 * cotizar envíos).
		 *
		 * @param {Object} item
		 */
		quitar(item) {
			let self = this
			if (self.esta_procesando(item.id)) {
				return
			}
			let nombre = item.article_name || ('el artículo N° ' + item.article_id)
			self.confirmar('¿Quitarle las medidas a «' + nombre + '»? Vuelven a quedar vacías, salvo las que ya se hayan cambiado a mano.', {
				title: 'Quitar medidas',
				okTitle: 'Quitar',
				okVariant: 'danger',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				// Se vuelve a mirar después de la caja: mientras estaba abierta pudo haber salido otra
				// acción sobre la misma fila.
				if (!confirmado || self.esta_procesando(item.id)) {
					return
				}
				return self.resolver_uno(item, 'quitar', 'asignadas', 'sin_datos')
				.then(salio_bien => {
					if (salio_bien) {
						self.$toast.success('Listo: le quitamos las medidas al artículo')
					}
				})
			})
		},
		/**
		 * Aprueba o rechaza todas las tildadas de una vez, SIEMPRE con confirmación: son muchos
		 * artículos y las medidas alimentan los envíos de la tienda. Con el indicador global de carga:
		 * no tiene que poder repetirse mientras viaja.
		 *
		 * @param {String} accion aprobar | rechazar
		 */
		resolver_seleccionadas(accion) {
			let self = this
			let ids = self.seleccionados.slice()
			if (!ids.length || self.lote_en_curso || !self.corrida) {
				return
			}
			let id_de_la_corrida = self.corrida.id
			let cantidad = ids.length
			let texto_cantidad = cantidad + (cantidad === 1 ? ' propuesta' : ' propuestas')

			let confirmacion = accion === 'rechazar'
				? self.confirmar('¿Rechazar ' + texto_cantidad + '? Se descartan y no se carga ninguna medida en esos artículos.', {
					title: 'Rechazar seleccionadas',
					okTitle: 'Rechazar',
					okVariant: 'danger',
					cancelTitle: 'No',
					centered: true,
				})
				: self.confirmar('¿Aprobar ' + texto_cantidad + '? Se cargan las medidas en esos artículos (solo en los campos que tengan vacíos). Después se pueden quitar de a uno desde «Asignadas».', {
					title: 'Aprobar seleccionadas',
					okTitle: 'Aprobar',
					okVariant: 'success',
					cancelTitle: 'No',
					centered: true,
				})

			confirmacion.then(confirmado => {
				// Se vuelve a mirar después de la caja: un lote que salió mientras la caja estaba abierta
				// no puede mandar los mismos ids dos veces.
				if (!confirmado || self.lote_en_curso || !self.sigue_siendo(id_de_la_corrida, null)) {
					return
				}
				self.lote_en_curso = true
				self.$store.commit('auth/setMessage', accion === 'aprobar' ? 'Aprobando medidas' : 'Rechazando medidas')
				self.$store.commit('auth/setLoading', true)

				return self.$store.dispatch('dimension_search/' + (accion === 'aprobar' ? 'aprobar_varios' : 'rechazar_varios'), ids)
				.then(respuesta => {
					self.$store.commit('auth/setLoading', false)
					self.$store.commit('auth/setMessage', '')
					self.lote_en_curso = false
					self.avisar_resultado_del_lote(accion, respuesta)
					if (!self.sigue_siendo(id_de_la_corrida, null)) {
						self.refrescar_en_segundo_plano(id_de_la_corrida)
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
					if (self.sigue_siendo(id_de_la_corrida, null)) {
						self.cargar_items({ silencioso: true })
					}
				})
			})
		},
		/**
		 * "12 propuestas aprobadas", y si algunas no se pudieron, cuántas y el primer motivo.
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
				this.$toast.success(entero_es(hechos) + (hechos === 1 ? ' propuesta ' : ' propuestas ') + participio)
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
		 * Detiene la corrida, con confirmación. Solo lo puede hacer el acceso maestro (el encabezado ni
		 * muestra el botón y la API contesta 403).
		 */
		detener() {
			let self = this
			if (!self.corrida || self.operando_corrida) {
				return
			}
			let id_de_la_corrida = self.corrida.id
			self.confirmar('¿Detener la búsqueda? Lo que ya se procesó queda como está y los artículos que faltan no se buscan. Se puede reanudar después.', {
				title: 'Detener la búsqueda',
				okTitle: 'Detener',
				okVariant: 'danger',
				cancelTitle: 'No',
				centered: true,
			})
			.then(confirmado => {
				// Se vuelve a mirar después de la caja (doble clic, u otra corrida abierta).
				if (!confirmado || self.operando_corrida || !self.sigue_siendo(id_de_la_corrida, null)) {
					return
				}
				self.operando_corrida = true
				return self.$store.dispatch('dimension_search/detener', id_de_la_corrida)
				.then(corrida => {
					self.operando_corrida = false
					self.$toast.success('La búsqueda se detuvo')
					if (!self.sigue_siendo(id_de_la_corrida, null)) {
						self.refrescar_en_segundo_plano(id_de_la_corrida)
						return
					}
					self.aplicar_corrida(corrida)
					self.detener_refresco()
					// sincronizar() y no solo el resumen: detenida, la corrida ya salió de proceso, y el
					// GET del detalle es lo que la marca como vista. Sin eso, el número rojo sumaba uno por
					// la misma corrida que se está mirando.
					self.sincronizar()
				})
				.catch(err => {
					console.log(err)
					self.operando_corrida = false
				})
			})
		},
		/**
		 * Reanuda una corrida detenida, cortada o trabada (solo el acceso maestro): sigue desde el
		 * primer artículo pendiente.
		 */
		reanudar() {
			let self = this
			if (!self.corrida || self.operando_corrida) {
				return
			}
			let id_de_la_corrida = self.corrida.id
			self.operando_corrida = true
			self.$store.dispatch('dimension_search/reanudar', id_de_la_corrida)
			.then(corrida => {
				self.operando_corrida = false
				self.$toast.success('La búsqueda sigue desde donde quedó')
				// Si mientras viajaba se abrió otra corrida, esta respuesta no es la que se ve (su fila
				// en la tabla ya la actualizó el store).
				if (!self.sigue_siendo(id_de_la_corrida, null)) {
					return
				}
				self.aplicar_corrida(corrida)
				self.programar_refresco()
			})
			.catch(err => {
				console.log(err)
				self.operando_corrida = false
			})
		},
		/**
		 * Aplica una versión nueva de la corrida. Los conteos de las solapas solo se pisan si no hay
		 * acciones en vuelo: si no, un número del servidor anterior a la acción desharía el ajuste que
		 * ya se hizo a mano.
		 *
		 * @param {Object} corrida RunPayload normalizado.
		 */
		aplicar_corrida(corrida) {
			if (!corrida) {
				return
			}
			this.corrida = corrida
			if (!this.procesando_ids.length) {
				this.conteos = Object.assign({}, corrida.conteos)
			}
		},
		/**
		 * Si hay una sincronización en espera, la hace ya para la corrida que se está mostrando, sin
		 * tocar lo que muestra el detalle. La usan el cierre del modal, abrir otra corrida (reiniciar)
		 * y salir de la pantalla (beforeDestroy): en los tres casos, cancelarla dejaba la fila de la
		 * tabla y el número rojo con los números de antes de la última acción.
		 *
		 * Una acción que todavía viaja se ocupa sola de lo suyo cuando vuelve (ver resolver_uno).
		 */
		sincronizar_pendiente_sin_esperar() {
			if (!this.timer_sincronizacion) {
				return
			}
			clearTimeout(this.timer_sincronizacion)
			this.timer_sincronizacion = null
			if (this.corrida) {
				this.refrescar_en_segundo_plano(this.corrida.id)
				return
			}
			this.$store.dispatch('dimension_search/get_resumen')
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
		 * Trae la corrida (conteos y consultas reales, y de paso actualiza su fila en la tabla de la
		 * sección) y el resumen del número rojo. Si todavía hay acciones en vuelo, espera.
		 */
		sincronizar() {
			let self = this
			if (!self.corrida) {
				return
			}
			if (self.procesando_ids.length) {
				self.programar_sincronizacion()
				return
			}
			let id = self.corrida.id
			self.$store.dispatch('dimension_search/get_corrida', { id: id, silencioso: true })
			.then(corrida => {
				if (self.corrida && self.corrida.id === id) {
					self.aplicar_corrida(corrida)
				}
			})
			.catch(err => {
				console.log(err)
			})
			.then(() => self.$store.dispatch('dimension_search/get_resumen'))
		},
		/**
		 * Mientras la corrida avanza, el encabezado (avance, consultas, conteos de las solapas) se
		 * refresca solo cada 15 s. La lista no: ver `hay_novedades`.
		 */
		programar_refresco() {
			this.detener_refresco()
			if (!esta_activa(this.corrida)) {
				return
			}
			this.timer_refresco = setInterval(this.refrescar_corrida, REFRESCO_MS)
		},
		detener_refresco() {
			clearInterval(this.timer_refresco)
			this.timer_refresco = null
		},
		/**
		 * Un tic del refresco. Si la solapa estaba vacía y ya tiene algo, se trae la lista (no hay
		 * filas que mover). Si la corrida terminó mientras se miraba, se trae la lista final y el
		 * número rojo, y se deja de refrescar.
		 */
		refrescar_corrida() {
			let self = this
			if (!self.visible || !self.corrida) {
				self.detener_refresco()
				return
			}
			if (typeof document !== 'undefined' && document.hidden) {
				return
			}
			let id = self.corrida.id
			let estaba_activa = esta_activa(self.corrida)

			self.$store.dispatch('dimension_search/get_corrida', { id: id, silencioso: true })
			.then(corrida => {
				if (!corrida || !self.corrida || self.corrida.id !== id) {
					return
				}
				self.aplicar_corrida(corrida)

				if (estaba_activa && !esta_activa(corrida)) {
					self.detener_refresco()
					self.cargar_items({ silencioso: true })
					self.$store.dispatch('dimension_search/get_resumen')
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
		 * El modal se cerró (botón, cruz, Escape o clic afuera). Si quedó una sincronización en espera
		 * se hace ya: la fila de la tabla y el número rojo no pueden quedar con los números de antes de
		 * la última aprobación.
		 */
		al_cerrar() {
			this.detener_refresco()
			clearTimeout(this.timer_buscar)
			this.sincronizar_pendiente_sin_esperar()
			this.$emit('cerrado')
		},
	},
}
</script>
<style lang="sass">
// Estilos compartidos del detalle y de sus filas. Sin scope a propósito: el b-modal cuelga de <body>
// y las filas son componentes hijos que usan estas mismas clases (prefijo med-). Todo color va por
// token con el valor de :root como fallback; los fondos de estado son rgba translúcidos o los pares
// de tokens que ya tienen contraparte oscura.

// El cuerpo con el scroll prolijo del sistema (pista transparente, píldora gris).
.med-det-modal__cuerpo
	&::-webkit-scrollbar
		width: 8px

	&::-webkit-scrollbar-track
		background: transparent

	&::-webkit-scrollbar-thumb
		background-color: var(--color-border, rgba(0, 0, 0, .2))
		border-radius: 8px

.med-det
	text-align: left

.med-det__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 40px 20px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

// El nav trae `margin-top: 15px` en sus hijos (.cont-left > div): con eso alcanza de aire arriba.
.med-det__solapas
	scroll-margin-top: 8px

.med-det__nota
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

.med-det__lista
	margin: 0
	padding: 0
	list-style: none
	border-top: 1px solid var(--color-border-secondary, #e9ecef)
	transition: opacity .15s ease

// Mientras llega otra página, la actual queda un poco apagada en vez de desaparecer.
.med-det__lista--cargando
	opacity: .5

// --- Una fila ---------------------------------------------------------------------------------
// Lista con separadores finos, sin tarjetas: la jerarquía la dan la tipografía y el aire.
.med-fila
	display: flex
	flex-direction: row
	align-items: flex-start
	gap: 14px
	padding: 14px 6px
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)
	transition: background .15s ease, opacity .15s ease

.med-fila__tilde
	flex: 0 0 auto
	align-self: flex-start
	margin-right: -8px

.med-fila__cuerpo
	display: flex
	flex-direction: column
	align-items: flex-start
	gap: 6px
	flex: 1 1 0
	min-width: 0

.med-fila__linea
	display: flex
	align-items: baseline
	justify-content: space-between
	gap: 12px
	width: 100%

.med-fila__nombre
	font-size: 0.9375rem
	font-weight: 600
	line-height: 1.3
	color: var(--color-text-primary, #212529)
	overflow-wrap: anywhere

.med-fila__consultas
	flex-shrink: 0
	font-size: 0.78rem
	color: var(--color-text-secondary, #6c757d)
	font-variant-numeric: tabular-nums
	white-space: nowrap

.med-fila__meta
	display: flex
	flex-wrap: wrap
	align-items: center
	gap: 4px 12px
	font-size: 0.8rem
	color: var(--color-text-secondary, #6c757d)

.med-fila__codigo
	font-family: SFMono-Regular, Menlo, Monaco, Consolas, monospace
	font-size: 0.78rem
	font-variant-numeric: tabular-nums
	overflow-wrap: anywhere

// "Cód. barras" / "Cód. proveedor": el rótulo va en la tipografía común, apagado, para que el número se lea primero.
.med-fila__rotulo
	font-family: inherit
	font-size: 0.72rem
	margin-right: 4px
	color: var(--color-text-secondary, #6c757d)
	opacity: .85

.med-fila__detalle
	margin: 2px 0 0
	font-size: 0.82rem
	line-height: 1.4
	color: var(--color-text-primary, #212529)

// La nota de la IA: apagada, y con el ícono de info al lado.
.med-fila__detalle--ia
	color: var(--color-text-secondary, #6c757d)

	i
		margin-right: 4px

.med-fila__avisos
	display: flex
	flex-wrap: wrap
	gap: 6px
	margin-top: 2px

.med-fila__desplegar
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

.med-fila__acciones
	display: flex
	flex: 0 0 auto
	align-self: center
	gap: 8px

// Fila tildada: el celeste de siempre (--bg-nav-hover, con su variante oscura en el token).
.med-fila--seleccionada
	background: var(--bg-nav-hover, #e7f1ff)

.med-fila--procesando
	opacity: .55

// --- Edición de los cuatro valores (A revisar → Editar) ----------------------------------------
.med-edicion
	display: flex
	flex-direction: column
	gap: 10px
	align-self: stretch
	margin-top: 4px
	padding: 12px 14px
	border-radius: 12px
	background: var(--bg-section, #f8f9fa)

.med-edicion__campos
	display: grid
	grid-template-columns: repeat(4, minmax(0, 1fr))
	gap: 10px 12px

.med-edicion__campo
	display: flex
	flex-direction: column
	gap: 3px
	min-width: 0
	margin: 0

.med-edicion__rotulo
	font-size: 0.75rem
	font-weight: 500
	color: var(--color-text-secondary, #6c757d)

.med-edicion__error
	margin: 0
	font-size: 0.75rem
	line-height: 1.3
	color: var(--btn-peligro-texto, #9c3a36)

.med-edicion__acciones
	display: flex
	flex-wrap: wrap
	justify-content: flex-end
	gap: 8px

// Salida de una fila resuelta: se desvanece en vez de desaparecer de golpe.
.med-det-fila-leave-active
	transition: opacity .2s ease

.med-det-fila-leave-to
	opacity: 0

// --- Etiquetas (motivo, avisos, páginas leídas) -------------------------------------------------
.med-etiqueta
	display: inline-flex
	align-items: center
	max-width: 100%
	padding: 2px 8px
	border-radius: 999px
	font-size: 0.72rem
	font-weight: 600
	line-height: 1.35
	white-space: normal

.med-etiqueta--neutro
	background: var(--bg-section, #f8f9fa)
	color: var(--color-text-secondary, #6c757d)
	box-shadow: inset 0 0 0 1px var(--color-border-secondary, #e9ecef)

// Ámbar: los dos tokens existen solo en html.dark-mode; en claro manda el literal del fallback.
.med-etiqueta--aviso
	background: var(--bg-warning-soft, rgba(255, 193, 7, .16))
	color: var(--color-text-warning-strong, #856404)

.med-etiqueta--mal
	background: var(--btn-peligro-fondo, #fdf3f2)
	color: var(--btn-peligro-texto, #9c3a36)

.med-etiqueta--ok
	background: var(--caja-abierta-fondo, #f2f7f4)
	color: var(--caja-abierta-texto, #1e6047)

@media (prefers-reduced-motion: reduce)
	.med-det-fila-leave-active,
	.med-det__lista
		transition: none

// Tablet: las acciones de «A revisar» bajan debajo del cuerpo para que los chips y la edición tengan
// el ancho entero, en vez de pelear con tres botones al costado.
@media (max-width: 991px)
	.med-fila--revisar
		flex-wrap: wrap

	.med-fila--revisar .med-fila__acciones
		flex: 1 0 100%
		justify-content: flex-end

	.med-edicion__campos
		grid-template-columns: repeat(2, minmax(0, 1fr))

// Teléfono: las acciones bajan debajo de la fila, a lo ancho y con tamaño de dedo.
@media (max-width: 575px)
	.med-fila
		flex-wrap: wrap
		gap: 10px 12px
		padding: 12px 2px

	.med-fila__cuerpo
		// Con un piso: si no entra al lado de la tilde, baja entero.
		flex-basis: 160px

	.med-fila__acciones
		width: 100%
		flex: 1 0 100%

		// Tres clases: .btn-modulo--fila.btn (0,2,0) vive en una hoja global y fija 28px.
		.btn.btn-modulo
			flex: 1 1 0
			height: 36px

	.med-edicion__acciones
		.btn.btn-modulo
			flex: 1 1 0
			height: 36px

	.med-fila__linea
		flex-direction: column
		align-items: flex-start
		gap: 2px
</style>
