<template>
	<b-modal
	id="reportes-detalle-modal"
	size="lg"
	hide-footer
	:title="titulo"
	@hidden="alCerrar">

		<div v-if="detalle.loading">
			<!-- Misma separacion que la linea "Total: $..." real, para que la tabla no se
			corra de lugar cuando llegan los datos -->
			<div class="detalle-modal__total detalle-modal__total--skeleton">
				<b-skeleton width="30%"></b-skeleton>
			</div>

			<!-- 4 columnas: Fecha, Descripcion, Monto y la de acciones. El encabezado viene
			activado por defecto en b-skeleton-table (hide-header es false) -->
			<b-skeleton-table
			:rows="6"
			:columns="4"></b-skeleton-table>
		</div>

		<template v-else>
			<!-- El total del modal tiene que coincidir siempre con el monto de la tarjeta/renglon que lo abrio -->
			<p class="detalle-modal__total">
				Total: <strong>{{ price(detalle.total, false, false) }}</strong>
			</p>

			<b-table
			striped
			hover
			responsive
			:items="detalle.registros"
			:fields="campos"
			:empty-text="'No hay registros para este concepto en el período seleccionado'"
			show-empty>

				<template #cell(monto)="fila">
					{{ price(fila.item.monto, false, false) }}
				</template>

				<template #cell(fecha)="fila">
					{{ date(fila.item.fecha) }}
				</template>

				<template #cell(acciones)="fila">
					<b-button
					v-if="se_puede_abrir(fila.item)"
					size="sm"
					variant="outline-primary"
					@click="irAComprobante(fila.item)">
						Ver comprobante
					</b-button>
				</template>

			</b-table>

			<b-pagination
			v-if="detalle.paginacion.total_registros > detalle.paginacion.per_page"
			class="m-0"
			pills
			v-model="pagina_actual"
			:total-rows="detalle.paginacion.total_registros"
			:per-page="detalle.paginacion.per_page"></b-pagination>
		</template>

	</b-modal>
</template>
<script>
export default {
	computed: {
		detalle() {
			return this.$store.state.reportes.detalle
		},
		titulo() {
			return this.detalle.concepto ? this.etiquetas_concepto[this.detalle.concepto] || this.detalle.concepto : 'Detalle'
		},
		campos() {
			return [
				{key: 'fecha', label: 'Fecha'},
				{key: 'descripcion', label: 'Descripción'},
				{key: 'monto', label: 'Monto'},
				{key: 'acciones', label: ''},
			]
		},
		/* Nombres legibles de la whitelist de 14 conceptos que acepta api/reportes/detalle */
		etiquetas_concepto() {
			return {
				ventas_brutas: 'Ventas brutas',
				devoluciones: 'Devoluciones',
				costo_mercaderia_vendida: 'Costo de mercadería vendida',
				gastos: 'Gastos',
				iva_debito: 'IVA débito',
				iva_notas_credito: 'IVA de notas de crédito emitidas',
				iva_credito: 'IVA crédito',
				percepciones_iva: 'Percepciones de IVA',
				percepciones_iibb: 'Percepciones de IIBB',
				retenciones: 'Retenciones',
				cobranzas: 'Cobranzas',
				pagos_proveedores: 'Pagos a proveedores',
				liquidaciones_pendientes: 'Liquidaciones pendientes',
				cheques_en_cartera: 'Cheques en cartera',
			}
		},
		/* Un tipo entra a este mapa cuando su modal esta efectivamente montado en
		   views/Reportes.vue, no antes: un tipo mapeado sin su modal montado es un clic muerto.
		   Desde la mision 10 (10/8/2026) estan los seis tipos que devuelve el backend. Si mañana
		   aparece un link_tipo nuevo: primero se monta su modal en Reportes.vue, despues entra aca. */
		modelo_por_link_tipo() {
			return {
				sale: 'sale',
				provider_order: 'provider_order',
				// Los cuatro que agrego la mision 10 (hallazgo 20260803-reportes-comprobantes-sin-modal),
				// ahora que views/Reportes.vue monta sus modales. El valor es el model_name del store,
				// no el nombre del link: movimiento_caja apunta a 'movimiento_caja' y NO a 'caja', que
				// es otro modelo (la caja es el contenedor; el movimiento es el comprobante que el
				// usuario quiere ver). Ese mapeo equivocado es parte del hallazgo.
				expense: 'expense',
				current_acount: 'current_acount',
				movimiento_caja: 'movimiento_caja',
				cheque: 'cheque',
			}
		},
		pagina_actual: {
			get() {
				return this.detalle.paginacion.page
			},
			set(value) {
				if (value != this.detalle.paginacion.page) {
					this.$store.dispatch('reportes/getDetalle', {concepto: this.detalle.concepto, page: value})
				}
			},
		},
	},
	methods: {
		/**
		 * Determina si la fila tiene un modal montado en Reportes.vue para poder abrir
		 * su comprobante (tarea 01: evitar el clic muerto de tipos sin modal).
		 *
		 * @param {Object} fila - registro del detalle (con link_tipo y link_id)
		 * @returns {boolean}
		 */
		se_puede_abrir(fila) {
			return typeof this.modelo_por_link_tipo[fila.link_tipo] !== 'undefined' && !!fila.link_id
		},
		/**
		 * Navega al comprobante de origen de una fila del detalle, segun `link_tipo` + `link_id`
		 * (tarea 06). Usa el mecanismo generico `show_model` que ya usa el resto de la SPA para
		 * abrir un registro puntual por id.
		 *
		 * @param {Object} fila - registro del detalle (con link_tipo y link_id)
		 */
		irAComprobante(fila) {
			let model_name = this.modelo_por_link_tipo[fila.link_tipo] || fila.link_tipo

			if (!model_name) {
				return
			}

			this.show_model(model_name, fila.link_id)
		},
		/**
		 * Limpia el detalle guardado en el store al cerrar el modal, para no mostrar por un
		 * instante los datos del concepto anterior la proxima vez que se abra.
		 */
		alCerrar() {
			this.$store.commit('reportes/resetDetalle')
		},
	},
}
</script>
<style lang="sass">
.detalle-modal__total
	font-size: 1rem
	font-weight: 600
	margin-bottom: 14px

	// El margin-bottom que BootstrapVue le pone a .b-skeleton se sumaria al del bloque y
	// correria la tabla hacia abajo respecto de donde queda el total real
	&--skeleton
		.b-skeleton
			margin-bottom: 0
</style>
