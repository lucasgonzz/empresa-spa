<template>
<div
class="med-tabla"
data-testid="medidas-listado-corridas">

	<!-- Primera carga: todavía no hay nada que mostrar, ni siquiera el estado vacío. -->
	<div
	v-if="!cargado"
	class="med-tabla__cargando"
	data-testid="medidas-corridas-cargando">
		<b-spinner
		small
		variant="primary"></b-spinner>
		<span>Cargando las búsquedas de medidas…</span>
	</div>

	<!-- El listado falló y no hay nada viejo para mostrar: se ofrece reintentar. -->
	<empty-state
	v-else-if="error && !corridas.length"
	data-testid="medidas-corridas-error"
	icon_class="bi bi-cloud-slash"
	:title="textos.error_corridas.titulo"
	:hint="textos.error_corridas.pista">
		<b-button
		class="btn-modulo"
		variant="outline-primary"
		data-testid="medidas-corridas-reintentar"
		@click="recargar">
			Reintentar
		</b-button>
	</empty-state>

	<!--
		Todavía no hubo ninguna búsqueda: el estado vacío explica qué es esta pestaña y de dónde se
		llena, para que nadie crea que está rota.
	-->
	<empty-state
	v-else-if="!corridas.length"
	data-testid="medidas-corridas-vacio"
	icon_class="bi bi-rulers"
	:title="textos.sin_corridas.titulo"
	:hint="textos.sin_corridas.pista"></empty-state>

	<template v-else>

		<!--
			Una lista de tarjetas que en escritorio se lee como tabla (una fila por búsqueda, con
			columnas) y en tablet y teléfono se apila: así nunca hay scroll horizontal. Mientras llega
			otra página, la actual queda un poco apagada en vez de desaparecer.
		-->
		<div
		class="med-tabla__caja"
		:class="{ 'med-tabla__caja--cargando': loading }">

			<div
			class="med-corrida med-corrida--encabezado"
			aria-hidden="true">
				<span class="med-corrida__fecha">Fecha</span>
				<span class="med-corrida__origen">Qué se busca</span>
				<span class="med-corrida__estado">Estado</span>
				<span class="med-corrida__cifra">Artículos</span>
				<span class="med-corrida__cifra">Asignadas</span>
				<span class="med-corrida__cifra">A revisar</span>
				<span class="med-corrida__cifra">Sin datos</span>
				<span class="med-corrida__consultas">Consultas</span>
				<span class="med-corrida__ver"></span>
			</div>

			<ul class="med-tabla__lista">
				<li
				v-for="corrida in corridas"
				:key="corrida.id"
				class="med-corrida"
				:class="{ 'med-corrida--nueva': es_nueva(corrida) }"
				role="button"
				tabindex="0"
				:data-testid="'medidas-fila-corrida-' + corrida.id"
				:data-status="corrida.status"
				@click="abrir(corrida)"
				@keydown.enter.self="abrir(corrida)">

					<div class="med-corrida__fecha">
						<!-- Punto azul: la búsqueda terminó y nadie la abrió todavía (suma al número rojo). -->
						<span
						v-if="es_nueva(corrida)"
						class="med-corrida__nueva"
						title="Todavía no la abriste"></span>
						<span>{{ fecha(corrida) }}</span>
						<span class="med-corrida__secundario">{{ hora(corrida) }}</span>
					</div>

					<div class="med-corrida__origen">
						<span>{{ alcance(corrida) }}</span>
						<span
						v-if="corrida.lanzada_por"
						class="med-corrida__secundario">
							{{ corrida.lanzada_por }}
						</span>
					</div>

					<div class="med-corrida__estado">
						<estado-corrida
						compacto
						:corrida="corrida"></estado-corrida>
					</div>

					<span class="med-corrida__cifra">
						<span class="med-corrida__rotulo">Artículos</span>
						<span class="med-corrida__numero">{{ entero(corrida.total) }}</span>
					</span>
					<span class="med-corrida__cifra">
						<span class="med-corrida__rotulo">Asignadas</span>
						<span class="med-corrida__numero">{{ entero(cantidad(corrida, 'asignadas')) }}</span>
					</span>
					<!-- A revisar se destaca solo si hay algo: en cero es un dato más y no tiene que gritar. -->
					<span class="med-corrida__cifra">
						<span class="med-corrida__rotulo">A revisar</span>
						<span
						class="med-corrida__numero"
						:class="{ 'med-corrida__numero--acento': cantidad(corrida, 'a_revisar') > 0 }">
							{{ entero(cantidad(corrida, 'a_revisar')) }}
						</span>
					</span>
					<span class="med-corrida__cifra">
						<span class="med-corrida__rotulo">Sin datos</span>
						<span class="med-corrida__numero">{{ entero(cantidad(corrida, 'sin_datos')) }}</span>
					</span>

					<div
					class="med-corrida__consultas"
					:data-consultas="corrida.busquedas">
						<span class="med-corrida__rotulo">Consultas</span>
						<span class="med-corrida__numero">{{ consultas(corrida) }}</span>
					</div>

					<div class="med-corrida__ver">
						<b-button
						size="sm"
						variant="outline-primary"
						class="btn-modulo btn-modulo--fila"
						:data-testid="'medidas-ver-corrida-' + corrida.id"
						@click.stop="abrir(corrida)">
							Ver
						</b-button>
					</div>

				</li>
			</ul>
		</div>

		<!--
			Cápsula de paginación del sistema (_controles_modulo.sass, la misma de Ofertas). El contador
			va siempre; los botones de página, solo si hay más de una.
		-->
		<div class="paginacion-modulo m-t-15">
			<div class="paginacion-modulo__barra">
				<span
				class="paginacion-modulo__meta"
				data-testid="medidas-corridas-total">
					{{ entero(total) }} {{ total == 1 ? 'búsqueda' : 'búsquedas' }}
				</span>
				<template v-if="total > por_pagina">
					<span
					class="paginacion-modulo__separador"
					aria-hidden="true"></span>
					<!--
						`:value` + `@change` y no v-model: `change` sale solo cuando la persona toca una
						página. Con v-model, cada vez que la página cambia desde afuera (lanzar el catálogo
						la vuelve a 1) b-pagination lo devuelve como `input` y se pediría dos veces lo mismo.
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
import EmptyState from '@/common-vue/components/display/EmptyState'
import EstadoCorrida from '@/components/alertas/components/lista-de-alertas-table/medidas/EstadoCorrida'
import { TEXTOS, esta_activa, conteo, entero_es, texto_de_alcance_de_la_corrida, texto_de_consultas } from '@/components/alertas/components/lista-de-alertas-table/medidas/textos'

/**
 * Lista de las búsquedas de medidas del comercio (una fila por búsqueda), paginada en el servidor de
 * a 25. Lee todo del store `dimension_search`: la sección decide cuándo pedir y este componente solo
 * dibuja, pagina y avisa qué fila se quiere abrir (evento `abrir`).
 *
 * En escritorio se lee como tabla; de 1099 px para abajo cada fila es una tarjeta que se apila
 * (en teléfono, una columna), así la página nunca scrollea de costado.
 */
export default {
	components: {
		EmptyState,
		EstadoCorrida,
	},
	data() {
		return {
			/** Textos de los estados vacíos. */
			textos: TEXTOS,
		}
	},
	computed: {
		/** Página visible de corridas (RunPayload normalizado). */
		corridas() {
			return this.$store.state.dimension_search.models
		},
		cargado() {
			return this.$store.state.dimension_search.cargado
		},
		loading() {
			return this.$store.state.dimension_search.loading
		},
		error() {
			return this.$store.state.dimension_search.error
		},
		total() {
			return this.$store.state.dimension_search.total
		},
		por_pagina() {
			return this.$store.state.dimension_search.per_page
		},
		/** Página visible del listado. */
		pagina_actual() {
			return this.$store.state.dimension_search.page
		},
	},
	methods: {
		/**
		 * Avisa a la sección qué corrida abrir en el detalle. Sirve tanto para el clic en la fila como
		 * para el botón «Ver».
		 *
		 * @param {Object} corrida RunPayload normalizado.
		 */
		abrir(corrida) {
			this.$emit('abrir', corrida)
		},
		/**
		 * La persona tocó otra página: se guarda y se pide.
		 *
		 * @param {Number} numero
		 */
		cambiar_pagina(numero) {
			this.$store.commit('dimension_search/set_page', numero)
			this.$store.dispatch('dimension_search/get_corridas')
		},
		/** Reintento después de un error del listado. */
		recargar() {
			this.$store.dispatch('dimension_search/get_corridas')
		},
		/**
		 * True si la corrida terminó y nadie la abrió todavía. Una que sigue corriendo no se marca:
		 * todavía no hay nada nuevo que ver.
		 *
		 * @param {Object} corrida
		 * @returns {Boolean}
		 */
		es_nueva(corrida) {
			return corrida.visto === false && !esta_activa(corrida)
		},
		/** La fecha de la fila: cuándo se creó o, si la API no la manda, cuándo empezó. */
		fecha(corrida) {
			let valor = corrida.created_at || corrida.started_at
			return valor ? this.date(valor) : '–'
		},
		hora(corrida) {
			let valor = corrida.created_at || corrida.started_at
			return valor ? this.hour(valor) : ''
		},
		alcance(corrida) {
			return texto_de_alcance_de_la_corrida(corrida)
		},
		cantidad(corrida, clave) {
			return conteo(corrida.conteos, clave)
		},
		entero(valor) {
			return entero_es(valor)
		},
		consultas(corrida) {
			return texto_de_consultas(corrida)
		},
	},
}
</script>
<style lang="sass">
// Sin scope: todo va prefijado con med-tabla / med-corrida, así que no hay choque posible. Colores por
// token (_dark_theme.sass) con el valor de :root como fallback.
.med-tabla__cargando
	display: flex
	align-items: center
	justify-content: center
	gap: 10px
	padding: 48px 20px
	font-size: 0.875rem
	color: var(--color-text-secondary, #6c757d)

.med-tabla__caja
	border: 1px solid var(--color-border-secondary, #e9ecef)
	border-radius: 12px
	background: var(--bg-card, transparent)
	overflow: hidden
	transition: opacity .15s ease

.med-tabla__caja--cargando
	opacity: .55

.med-tabla__lista
	margin: 0
	padding: 0
	list-style: none

// --- Una fila: tarjeta apilada por defecto (teléfono) ---------------------------------------------
.med-corrida
	display: grid
	grid-template-columns: repeat(2, minmax(0, 1fr))
	grid-template-areas: "fecha ver" "origen origen" "estado estado" "c1 c2" "c3 c4" "consultas consultas"
	gap: 8px 12px
	align-items: center
	padding: 14px 16px
	text-align: left
	border-bottom: 1px solid var(--color-border-secondary, #e9ecef)
	cursor: pointer
	transition: background .15s ease

	&:last-child
		border-bottom: 0

	&:hover
		background: var(--bg-hover, #f1f3f5)

	&:focus-visible
		outline: 2px solid var(--color-primary, #007bff)
		outline-offset: -2px

// El encabezado de columnas solo existe en escritorio.
.med-corrida--encabezado
	display: none
	cursor: default
	background: var(--bg-section, #f8f9fa)
	font-size: 0.72rem
	font-weight: 600
	letter-spacing: .03em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)

	&:hover
		background: var(--bg-section, #f8f9fa)

.med-corrida__fecha
	grid-area: fecha
	display: flex
	align-items: baseline
	gap: 6px
	white-space: nowrap
	font-variant-numeric: tabular-nums
	min-width: 0

.med-corrida__nueva
	flex: 0 0 auto
	align-self: center
	width: 7px
	height: 7px
	border-radius: 50%
	background: var(--color-primary, #007bff)

.med-corrida__origen
	grid-area: origen
	display: flex
	flex-direction: column
	gap: 1px
	min-width: 0
	overflow-wrap: anywhere

.med-corrida__estado
	grid-area: estado
	min-width: 0

.med-corrida__secundario
	font-size: 0.78rem
	font-weight: 400
	color: var(--color-text-secondary, #6c757d)

.med-corrida__consultas
	grid-area: consultas
	display: flex
	flex-direction: column
	gap: 1px
	font-variant-numeric: tabular-nums

.med-corrida__ver
	grid-area: ver
	justify-self: end

// Las cuatro cifras de la tarjeta (artículos, asignadas, a revisar, sin datos), en dos columnas
// parejas en teléfono. Cada cifra trae su rótulo; en escritorio el rótulo lo da el encabezado.
.med-corrida__cifra
	display: flex
	flex-direction: column
	gap: 1px
	min-width: 0

.med-corrida__rotulo
	font-size: 0.7rem
	font-weight: 500
	letter-spacing: .02em
	text-transform: uppercase
	color: var(--color-text-secondary, #6c757d)

.med-corrida__numero
	font-variant-numeric: tabular-nums
	white-space: nowrap

// A revisar con algo adentro: el mismo ámbar de «Parece trabada», que es el color de «hay que mirarlo».
// Los tokens existen solo en oscuro; en claro manda el literal.
.med-corrida__numero--acento
	display: inline-block
	align-self: flex-start
	min-width: 26px
	padding: 1px 8px
	border-radius: 999px
	font-weight: 600
	text-align: center
	background: var(--bg-warning-soft, rgba(255, 193, 7, .18))
	color: var(--color-text-warning-strong, #856404)

.med-corrida--nueva
	.med-corrida__fecha,
	.med-corrida__origen
		font-weight: 600

// Las cuatro cifras (artículos, asignadas, a revisar, sin datos) son los únicos <span> hijos de la fila,
// así que :nth-of-type las ubica en sus áreas. En teléfono van de a dos por renglón.
.med-corrida__cifra:nth-of-type(1)
	grid-area: c1

.med-corrida__cifra:nth-of-type(2)
	grid-area: c2

.med-corrida__cifra:nth-of-type(3)
	grid-area: c3

.med-corrida__cifra:nth-of-type(4)
	grid-area: c4

// Teléfono: botón de dedo. El alto de siempre de una fila de tabla (28px) es chico para el pulgar.
@media (max-width: 767px)
	.med-corrida__ver .btn.btn-modulo
		height: 36px
		min-width: 64px

// --- Tablet (768 a 1099): dos bandas ----------------------------------------------------------------
@media (min-width: 768px) and (max-width: 1099px)
	.med-corrida
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 1fr) auto
		grid-template-areas: "fecha origen origen origen origen ver" "estado estado c1 c2 c3 c4" "consultas consultas consultas consultas consultas consultas"

// --- Escritorio (1100 en adelante): una fila por búsqueda, con encabezado de columnas --------------
@media (min-width: 1100px)
	.med-corrida
		grid-template-columns: 120px minmax(150px, 1.2fr) minmax(160px, 1.3fr) repeat(4, 76px) minmax(130px, 1fr) 64px
		grid-template-areas: none
		gap: 0 12px

	.med-corrida--encabezado
		display: grid
		padding-top: 10px
		padding-bottom: 10px

	// Sin áreas: cada hijo ocupa su columna en el orden del DOM. La segunda regla gana (por
	// especificidad) a las de :nth-of-type de las cifras.
	.med-corrida > *
		grid-area: auto

	.med-corrida .med-corrida__cifra:nth-of-type(n)
		grid-area: auto

	// Los rótulos de cada cifra sobran: el encabezado ya los da. En el encabezado mismo, `.med-corrida__rotulo`
	// no existe, así que no se ve afectado.
	.med-corrida__rotulo
		display: none

	.med-corrida__cifra
		align-items: flex-end
		text-align: right

	.med-corrida__numero--acento
		align-self: flex-end

	.med-corrida--encabezado .med-corrida__cifra
		align-items: flex-end

	.med-corrida__ver
		justify-self: end

@media (prefers-reduced-motion: reduce)
	.med-tabla__caja,
	.med-corrida
		transition: none
</style>
