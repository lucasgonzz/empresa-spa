<template>
	<b-modal
	id="reportes-detalle-modal"
	size="lg"
	hide-footer
	:title="titulo"
	@hidden="alCerrar">

		<div
		v-if="detalle.loading"
		class="all-center p-t-30 p-b-30">
			<b-spinner variant="primary"></b-spinner>
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
		/* Nombres legibles de la whitelist de 13 conceptos que acepta api/reportes/detalle */
		etiquetas_concepto() {
			return {
				ventas_brutas: 'Ventas brutas',
				devoluciones: 'Devoluciones',
				costo_mercaderia_vendida: 'Costo de mercadería vendida',
				gastos: 'Gastos',
				iva_debito: 'IVA débito',
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
		/* Modelo (store module) que corresponde a cada link_tipo devuelto por el backend, para poder
		   abrir el comprobante con el mecanismo generico show_model(model_name, id) que ya usa el
		   resto de la SPA. Mapeo hecho a partir de los nombres de ruta existentes (routes.js/router);
		   'current_acount' y 'movimiento_caja' son la mejor suposicion disponible y conviene
		   confirmarlos contra el backend real. */
		modelo_por_link_tipo() {
			return {
				sale: 'sale',
				expense: 'expense',
				current_acount: 'current_acount',
				cheque: 'cheque',
				movimiento_caja: 'caja',
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
</style>
