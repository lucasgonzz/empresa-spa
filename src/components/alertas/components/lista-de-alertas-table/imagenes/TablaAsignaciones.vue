<template>
<div
class="img-asig-tabla"
data-testid="imagenes-listado-asignaciones">

	<!-- Primera carga: todavia no hay nada que mostrar, ni siquiera el estado vacio. -->
	<div
	v-if="!cargado"
	class="img-asig-tabla__cargando"
	data-testid="imagenes-asignaciones-cargando">
		<b-spinner
		small
		variant="primary"></b-spinner>
		<span>Cargando las búsquedas de imágenes…</span>
	</div>

	<!-- El listado fallo y no hay nada viejo para mostrar: se ofrece reintentar. -->
	<empty-state
	v-else-if="error && !asignaciones.length"
	data-testid="imagenes-asignaciones-error"
	icon_class="bi bi-cloud-slash"
	title="No pudimos traer las búsquedas de imágenes"
	hint="Revisá la conexión y volvé a intentar.">
		<b-button
		class="btn-modulo"
		variant="outline-primary"
		@click="recargar">
			Reintentar
		</b-button>
	</empty-state>

	<!--
		Todavia no hubo ninguna busqueda: el estado vacio explica que es esta pestaña y de donde
		se llena, para que nadie crea que esta rota.
	-->
	<empty-state
	v-else-if="!asignaciones.length"
	data-testid="imagenes-asignaciones-vacio"
	icon_class="bi bi-images"
	title="Todavía no hay búsquedas de imágenes"
	hint="Cuando pidas imágenes automáticas desde el listado de artículos, cada búsqueda queda acá: qué imagen se asignó, cuáles quedaron para revisar y por qué no se encontró el resto.">
		<!--
			Una linea aparte, mas chica: quien ya habia buscado imagenes antes de esta version va
			a extrañar sus busquedas, y no estan porque se guardaban en otro lado (el historial
			viejo del listado), no porque se hayan perdido las imagenes.
		-->
		<p class="img-asig-tabla__nota-vacio">
			Las búsquedas anteriores a esta versión no aparecen acá.
		</p>
	</empty-state>

	<template v-else>

		<!--
			El wrapper propio es el que redondea y recorta el scroll horizontal (ver
			_controles_modulo.sass): en telefono la tabla se desliza de costado adentro de la caja
			en vez de romper el ancho de la pagina. Mientras llega otra pagina, la actual queda un
			poco apagada en vez de desaparecer.
		-->
		<div
		class="tabla-modulo-wrapper img-asig-tabla__caja"
		:class="{ 'img-asig-tabla__caja--cargando': loading }">
			<b-table
			responsive
			hover
			primary-key="id"
			data-testid="imagenes-asignaciones-tabla"
			table-class="tabla-modulo img-asig-tabla__tabla"
			:tbody-tr-attr="atributos_de_fila"
			:tbody-tr-class="clase_de_fila"
			:fields="fields"
			:items="asignaciones"
			@row-clicked="abrir">

				<template #cell(fecha)="data">
					<div class="img-asig-tabla__fecha">
						<!-- Punto azul: la busqueda termino y nadie la abrio todavia (suma al numero rojo). -->
						<span
						v-if="es_nueva(data.item)"
						class="img-asig-tabla__nueva"
						title="Todavía no la abriste"></span>
						<span>{{ date(data.item.created_at) }}</span>
						<span class="img-asig-tabla__secundario">{{ hour(data.item.created_at) }}</span>
					</div>
				</template>

				<template #cell(origen)="data">
					<div class="img-asig-tabla__origen">
						<span>{{ texto_origen(data.item) }}</span>
						<span
						v-if="data.item.lanzada_por"
						class="img-asig-tabla__secundario">
							{{ data.item.lanzada_por }}
						</span>
					</div>
				</template>

				<template #cell(estado)="data">
					<estado-asignacion
					compacto
					:asignacion="data.item"></estado-asignacion>
				</template>

				<template #cell(total_articulos)="data">
					<span class="img-asig-tabla__numero">
						{{ entero(data.item.total_articulos) }}
					</span>
				</template>

				<template #cell(asignadas)="data">
					<span class="img-asig-tabla__numero">
						{{ entero(cantidad(data.item, 'asignadas')) }}
					</span>
				</template>

				<!-- A revisar se destaca solo si hay algo: en cero es un dato mas y no tiene que gritar. -->
				<template #cell(a_revisar)="data">
					<span
					class="img-asig-tabla__numero"
					:class="{ 'img-asig-tabla__numero--acento': cantidad(data.item, 'a_revisar') > 0 }">
						{{ entero(cantidad(data.item, 'a_revisar')) }}
					</span>
				</template>

				<template #cell(no_asignadas)="data">
					<span class="img-asig-tabla__numero">
						{{ entero(cantidad(data.item, 'no_asignadas')) }}
					</span>
				</template>

				<template #cell(busquedas)="data">
					<span
					class="img-asig-tabla__busquedas"
					:data-busquedas="data.item.busquedas">
						{{ busquedas(data.item) }}
					</span>
				</template>

				<template #cell(ver)="data">
					<b-button
					size="sm"
					variant="outline-primary"
					class="btn-modulo btn-modulo--fila"
					:data-testid="'imagenes-ver-asignacion-' + data.item.id"
					@click.stop="abrir(data.item)">
						Ver
					</b-button>
				</template>

			</b-table>
		</div>

		<!--
			Capsula de paginacion del sistema (_controles_modulo.sass, la misma de Ofertas). El
			contador va siempre; los botones de pagina, solo si hay mas de una.
		-->
		<div class="paginacion-modulo m-t-15">
			<div class="paginacion-modulo__barra">
				<span
				class="paginacion-modulo__meta"
				data-testid="imagenes-asignaciones-total">
					{{ entero(total) }} {{ total == 1 ? 'búsqueda' : 'búsquedas' }}
				</span>
				<template v-if="total > por_pagina">
					<span
					class="paginacion-modulo__separador"
					aria-hidden="true"></span>
					<!--
						`:value` + `@change` y no v-model: `change` sale solo cuando la persona toca
						una pagina. Con v-model, cada vez que la pagina cambia desde afuera (lanzar el
						catalogo la vuelve a 1) b-pagination lo devuelve como `input` y se pediria dos
						veces lo mismo.
					-->
					<b-pagination
					class="paginacion-modulo__pages m-0"
					pills
					:value="pagina_actual"
					:total-rows="total"
					:per-page="por_pagina"
					:disabled="loading"
					@change="cambiar_pagina"></b-pagination>
				</template>
			</div>
		</div>

	</template>

</div>
</template>
<script>
import {
	ORIGENES,
	texto_de,
	esta_activa,
	conteo,
	entero_es,
	texto_de_busquedas,
} from '@/components/alertas/components/lista-de-alertas-table/imagenes/textos'

/**
 * Tabla de las asignaciones de imágenes del comercio (una fila por búsqueda), paginada en el
 * servidor de a 25. Lee todo del store `image_assignment`: la solapa decide cuándo pedir y este
 * componente solo dibuja, pagina y avisa qué fila se quiere abrir (evento `abrir`).
 */
export default {
	components: {
		EmptyState: () => import('@/common-vue/components/display/EmptyState'),
		EstadoAsignacion: () => import('@/components/alertas/components/lista-de-alertas-table/imagenes/EstadoAsignacion'),
	},
	computed: {
		/** Página visible de asignaciones (RunPayload). */
		asignaciones() {
			return this.$store.state.image_assignment.models
		},
		cargado() {
			return this.$store.state.image_assignment.cargado
		},
		loading() {
			return this.$store.state.image_assignment.loading
		},
		error() {
			return this.$store.state.image_assignment.error
		},
		total() {
			return this.$store.state.image_assignment.total
		},
		por_pagina() {
			return this.$store.state.image_assignment.per_page
		},
		/** Página visible del listado. */
		pagina_actual() {
			return this.$store.state.image_assignment.page
		},
		/**
		 * Columnas, en el orden que pidió Lucas. Los números van a la derecha y con cifras
		 * tabulares, para que se puedan comparar de un vistazo fila contra fila.
		 *
		 * @returns {Array}
		 */
		fields() {
			return [
				{ key: 'fecha', label: 'Fecha' },
				{ key: 'origen', label: 'Origen' },
				{ key: 'estado', label: 'Estado' },
				{ key: 'total_articulos', label: 'Artículos', thClass: 'text-right', tdClass: 'text-right' },
				{ key: 'asignadas', label: 'Asignadas', thClass: 'text-right', tdClass: 'text-right' },
				{ key: 'a_revisar', label: 'A revisar', thClass: 'text-right', tdClass: 'text-right' },
				{ key: 'no_asignadas', label: 'No asignadas', thClass: 'text-right', tdClass: 'text-right' },
				{ key: 'busquedas', label: 'Búsquedas' },
				{ key: 'ver', label: '' },
			]
		},
	},
	methods: {
		/**
		 * Avisa a la solapa qué asignación abrir en el detalle. Sirve tanto para el clic en la
		 * fila como para el botón "Ver".
		 *
		 * @param {Object} asignacion RunPayload.
		 */
		abrir(asignacion) {
			this.$emit('abrir', asignacion)
		},
		/**
		 * La persona tocó otra página: se guarda y se pide.
		 *
		 * @param {Number} numero
		 */
		cambiar_pagina(numero) {
			this.$store.commit('image_assignment/set_page', numero)
			this.$store.dispatch('image_assignment/get_asignaciones')
		},
		/** Reintento después de un error del listado. */
		recargar() {
			this.$store.dispatch('image_assignment/get_asignaciones')
		},
		/**
		 * True si la búsqueda terminó y nadie la abrió todavía. Una que sigue corriendo no se
		 * marca: todavía no hay nada nuevo que ver.
		 *
		 * @param {Object} asignacion
		 * @returns {Boolean}
		 */
		es_nueva(asignacion) {
			return asignacion.visto === false && !esta_activa(asignacion)
		},
		texto_origen(asignacion) {
			return texto_de(ORIGENES, asignacion.origen)
		},
		cantidad(asignacion, clave) {
			return conteo(asignacion.conteos, clave)
		},
		entero(valor) {
			return entero_es(valor)
		},
		busquedas(asignacion) {
			return texto_de_busquedas(asignacion)
		},
		/**
		 * data-testid por fila, con el id de la asignación: la tabla es de muchas filas iguales y
		 * sin esto no hay forma estable de encontrar una.
		 *
		 * @param {Object} asignacion
		 * @param {String} tipo 'row' para las filas de datos.
		 * @returns {Object|null}
		 */
		atributos_de_fila(asignacion, tipo) {
			if (!asignacion || tipo !== 'row') {
				return null
			}
			return { 'data-testid': 'imagenes-fila-asignacion-' + asignacion.id }
		},
		/**
		 * Clase por fila: las nuevas (sin abrir) van en negrita suave, como un mail sin leer.
		 *
		 * @param {Object} asignacion
		 * @param {String} tipo
		 * @returns {String|null}
		 */
		clase_de_fila(asignacion, tipo) {
			if (!asignacion || tipo !== 'row') {
				return null
			}
			return this.es_nueva(asignacion) ? 'img-asig-tabla__fila img-asig-tabla__fila--nueva' : 'img-asig-tabla__fila'
		},
	},
}
</script>
<style lang="sass">
// Sin scope: las celdas las dibuja b-table y las clases de fila llegan por tbody-tr-class, que un
// estilo scoped no alcanza sin ::v-deep en cada regla. Todo va prefijado con img-asig-tabla, asi
// que no hay choque posible. Colores por token (_dark_theme.sass).
.img-asig-tabla__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 48px 20px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

// La linea extra del estado vacio: va en el slot de EmptyState (que le suma 16px arriba), asi que
// aca solo se achica y se apaga, sin margenes propios.
.img-asig-tabla__nota-vacio
	margin: 0
	max-width: 320px
	font-size: 0.78rem
	line-height: 1.4
	color: var(--color-text-secondary, #6c757d)

.img-asig-tabla__caja
	transition: opacity .15s ease

.img-asig-tabla__caja--cargando
	opacity: .55

// La tabla no se aprieta por debajo de un ancho legible: en tablet y telefono se desliza de
// costado adentro de la caja redondeada (el wrapper recorta el scroll). Va en la table-class y no
// en el wrapper: con `responsive`, un min-width afuera le prohibe achicarse al contenedor del
// scroll (ver e2e/chequear-min-width-en-tablas-responsive.js).
.img-asig-tabla__tabla
	min-width: 920px

.img-asig-tabla__fila
	cursor: pointer

.img-asig-tabla__fila--nueva
	td
		font-weight: 600

.img-asig-tabla__fecha
	display: flex
	align-items: baseline
	gap: 6px
	white-space: nowrap
	font-variant-numeric: tabular-nums

.img-asig-tabla__nueva
	flex: 0 0 auto
	align-self: center
	width: 7px
	height: 7px
	border-radius: 50%
	background: var(--color-primary, #007bff)

.img-asig-tabla__origen
	display: flex
	flex-direction: column
	gap: 1px
	min-width: 0

.img-asig-tabla__secundario
	font-size: 0.78rem
	font-weight: 400
	color: var(--color-text-secondary, #6c757d)

.img-asig-tabla__numero
	font-variant-numeric: tabular-nums
	white-space: nowrap

// A revisar con algo adentro: el mismo ambar de "Parece trabada", que es el color de "hay que
// mirarlo". Los tokens existen solo en oscuro; en claro manda el literal.
.img-asig-tabla__numero--acento
	display: inline-block
	min-width: 26px
	padding: 1px 8px
	border-radius: 999px
	font-weight: 600
	text-align: center
	background: var(--bg-warning-soft, rgba(255, 193, 7, .18))
	color: var(--color-text-warning-strong, #856404)

.img-asig-tabla__busquedas
	white-space: nowrap
	font-variant-numeric: tabular-nums
</style>
