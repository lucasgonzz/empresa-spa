<template>
	<div class="ofertas-sugeridas">

		<div
		v-if="loading"
		class="text-center m-t-20 m-b-20">
			<b-spinner></b-spinner>
		</div>

		<b-alert
		v-else-if="!lineas.length"
		show
		variant="info">
			No hay ofertas sugeridas con estos filtros.
		</b-alert>

		<template v-else>

			<div class="j-between align-center m-b-10">
				<span class="text-muted small">
					{{ numero_es(paginacion.total) }} oferta/s sugerida/s
				</span>
			</div>

			<!--
				responsive: en tablet y telefono la tabla no se puede achicar sin
				volverse ilegible, asi que scrollea en horizontal dentro de su caja
				(el ancho minimo lo fija el sass de abajo, sobre la table-class, asi
				que el scroll queda adentro de tabla-modulo-wrapper) en vez de apretar
				las columnas hasta partir los numeros.
			-->
			<div class="tabla-modulo-wrapper">
				<b-table
				responsive
				table-class="tabla-modulo ofertas-sugeridas__tabla"
				:fields="fields"
				:items="lineas">

					<template #cell(client_nombre)="data">
						{{ data.item.client_nombre }}
						<i
						v-if="data.item.es_buen_pagador"
						class="bi bi-check-circle text-success m-l-5"
						title="Este cliente paga al dia"></i>
					</template>

					<template #cell(criterio)="data">
						<b-badge variant="light">
							{{ texto_criterio(data.item.criterio) }}
						</b-badge>
						<div
						v-if="data.item.criterio_detalle"
						class="text-muted small">
							{{ data.item.criterio_detalle }}
						</div>
						<!-- La frase de la IA va como tooltip: es un extra, no el dato -->
						<i
						v-if="data.item.motivo_ia"
						class="bi bi-stars text-primary"
						:title="data.item.motivo_ia"></i>
					</template>

					<!--
						El techo va SIEMPRE al lado del porcentaje: es lo que le muestra al
						comerciante que el descuento esta acotado por el margen del articulo
						y no lo invento nadie. Sin esto, el numero sugerido parece arbitrario.
					-->
					<template #cell(porcentaje_sugerido)="data">
						<strong>{{ porcentaje_es(data.item.porcentaje_sugerido) }}%</strong>
						<div
						class="text-muted small"
						title="Maximo que no rompe el margen del articulo">
							techo {{ porcentaje_es(data.item.porcentaje_techo) }}%
						</div>
					</template>

					<template #cell(client_offer_id)="data">
						<b-badge
						v-if="data.item.client_offer_id"
						variant="success">
							Activada
						</b-badge>
						<b-button
						v-else
						variant="primary"
						class="btn-modulo btn-modulo--fila"
						@click="abrir_activar(data.item)">
							Activar
						</b-button>
					</template>

				</b-table>
			</div>

			<!--
				Capsula de paginacion del sistema (misma forma que
				common-vue/components/display/table/pagination/Index.vue). El contador de
				resultados se muestra aunque haya una sola pagina: sirve igual. Los botones de
				pagina y su separador aparecen recien cuando hay mas de una.
			-->
			<div
			v-if="paginacion.total"
			class="paginacion-modulo m-t-15">
				<div class="paginacion-modulo__barra">
					<span class="paginacion-modulo__meta">
						{{ numero_es(paginacion.total) }} resultados
					</span>
					<template v-if="paginacion.total > paginacion.per_page">
						<span
						class="paginacion-modulo__separador"
						aria-hidden="true"></span>
						<b-pagination
						class="paginacion-modulo__pages m-0"
						pills
						v-model="pagina_actual"
						:total-rows="paginacion.total"
						:per-page="paginacion.per_page"></b-pagination>
					</template>
				</div>
			</div>

		</template>

		<modal-activar
		:linea="linea_elegida"
		@activada="al_activar"></modal-activar>

	</div>
</template>
<script>
/*
	Tabla de ofertas sugeridas del detalle: las lineas llegan paginadas,
	filtradas y ordenadas del backend (por prioridad materializada, no calculada
	al leer). Cada fila se activa de a una desde el modal, que es donde se editan
	el porcentaje, los tramos y la fecha de vencimiento antes de confirmar.
	Molde de sugerencias-de-compra/TablaPriorizada.vue.
*/
export default {
	components: {
		ModalActivar: () => import('@/components/ofertas/ModalActivar'),
	},
	props: {
		offer_suggestion_id: {
			type: Number,
			required: true,
		},
	},
	data() {
		return {
			// Linea que esta mirando el modal de activacion (null: modal cerrado).
			linea_elegida: null,
		}
	},
	computed: {
		lineas() {
			return this.$store.state.offer_suggestion_line.lines
		},
		paginacion() {
			return this.$store.state.offer_suggestion_line.paginacion
		},
		loading() {
			return this.$store.state.offer_suggestion_line.loading_lines
		},
		pagina_actual: {
			get() {
				return this.paginacion.page
			},
			set(value) {
				if (value != this.paginacion.page) {
					this.$store.dispatch('offer_suggestion_line/getLines', {page: value})
				}
			},
		},
		fields() {
			return [
				{label: 'Prioridad', key: 'prioridad', formatter: value => value === null || typeof value == 'undefined' ? '—' : value},
				{label: 'Cliente', key: 'client_nombre'},
				{label: 'Articulo', key: 'name'},
				{label: 'Cod Prov', key: 'provider_code'},
				{label: 'Por que', key: 'criterio'},
				{label: 'Descuento', key: 'porcentaje_sugerido'},
				{label: 'Tipo', key: 'tipo_descuento', formatter: value => value == 'cantidad' ? 'Por cantidad' : 'Por unidad'},
				{label: 'Vence', key: 'fecha_vencimiento_sugerida', formatter: value => value ? this.date(value) : '—'},
				{label: '', key: 'client_offer_id'},
			]
		},
	},
	methods: {
		/**
		 * Criterio en criollo. Los strings crudos ('afinidad', 'carrito_abandonado',
		 * 'reactivacion', 'interes_ecommerce') son los que guarda
		 * offer_suggestion_lines.criterio y los mismos que manda el filtro de
		 * Filtros.vue; el texto es solo de presentacion. Si se agrega un criterio en
		 * CriteriosDeOfertaService, se agrega en los dos lugares o el select filtra
		 * por algo que la tabla muestra con el string crudo.
		 */
		texto_criterio(criterio) {
			if (criterio == 'afinidad') {
				return 'Ya lo compro'
			}
			if (criterio == 'carrito_abandonado') {
				return 'Lo dejo en el carrito'
			}
			if (criterio == 'reactivacion') {
				return 'Hace rato que no compra'
			}
			if (criterio == 'interes_ecommerce') {
				return 'Lo miro o lo busco en la tienda'
			}
			return criterio
		},
		/**
		 * Abre el modal para activar la oferta sugerida de esta fila.
		 *
		 * 🔴 El `show()` va adentro de un `$nextTick`, por la misma razón que en
		 * `Cobros.vue -> abrir_recordatorio()`: `$bvModal.show()` emite `show` de forma
		 * SINCRÓNICA, así que `cargar_desde_la_linea()` del hijo corría antes de que Vue
		 * bajara `linea_elegida` al prop `linea`.
		 *
		 * Acá el síntoma era peor que un cartel: como `linea_elegida` no se resetea nunca,
		 * la PRIMERA apertura salía por la guarda `if (!this.linea) return` y el formulario
		 * quedaba con los valores de `data()`, y de la SEGUNDA en adelante precargaba el
		 * porcentaje, los tramos y la fecha de la fila ANTERIOR mientras el encabezado ya
		 * mostraba el cliente y el artículo de la fila nueva. Y `activar()` manda el
		 * `offer_suggestion_line_id` de la fila nueva —que es reactivo— con el porcentaje de
		 * la vieja: un descuento equivocado que el backend acepta si entra bajo el techo.
		 * Encontrado el 31/8/2026 barriendo la familia del bug del recordatorio de cobro.
		 *
		 * @param {Object} linea Línea sugerida de la fila.
		 * @returns {void}
		 */
		abrir_activar(linea) {
			let self = this
			this.linea_elegida = linea
			this.$nextTick(function() {
				self.$bvModal.show('oferta-modal-activar')
			})
		},
		/**
		 * Despues de activar se recarga la pagina actual (la fila pasa a "Activada"
		 * porque el backend le escribio el client_offer_id) y se avisa al detalle,
		 * que recarga la cabecera. No se toca la fila a mano: la verdad de si quedo
		 * activada la tiene el backend.
		 */
		al_activar() {
			this.$store.dispatch('offer_suggestion_line/getLines', {page: this.paginacion.page})
			this.$emit('activada')
		},
	}
}
</script>
<style lang="sass">
.ofertas-sugeridas
	&__tabla
		// Piso de ancho: con nueve columnas, abajo de esto las celdas se parten y
		// los porcentajes quedan ilegibles. Con el responsive de la tabla, esto es
		// lo que dispara el scroll horizontal en tablet y telefono en vez de apretar.
		// Va sobre la <table> --por eso la clase entra por table-class y no por
		// class--: antes estaba puesta sobre el envoltorio (el div .table-responsive
		// que scrollea) y el ancho minimo terminaba empujando el scroll a la pagina.
		min-width: 900px
</style>
