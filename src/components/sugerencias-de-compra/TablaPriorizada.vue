<template>
	<div class="tabla-priorizada-compra">

		<div
		v-if="loading"
		class="text-center m-t-20 m-b-20">
			<b-spinner></b-spinner>
		</div>

		<b-alert
		v-else-if="!articles.length"
		show
		variant="info">
			No hay lineas sugeridas con estos filtros.
		</b-alert>

		<template v-else>

			<div class="j-between align-center m-b-10">
				<div class="j-start align-center">
					<b-button
					class="btn-modulo m-r-10"
					variant="outline-secondary"
					@click="toggle_seleccionar_pagina">
						{{ pagina_entera_seleccionada ? 'Deseleccionar pagina' : 'Seleccionar pagina' }}
					</b-button>
					<span
					v-if="selected_ids.length"
					class="text-muted small m-r-10">
						{{ selected_ids.length }} seleccionado/s
					</span>
					<b-button
					class="btn-modulo"
					variant="primary"
					:disabled="!selected_ids.length || loading_crear"
					@click="crear_orden_de_compra">
						<b-spinner
						v-if="loading_crear"
						small
						class="m-r-5"></b-spinner>
						Generar orden de compra
					</b-button>
				</div>
				<span class="text-muted small">
					{{ paginacion.total }} linea/s
				</span>
			</div>

			<div class="tabla-modulo-wrapper">
				<b-table
				responsive
				table-class="tabla-modulo tabla-priorizada-compra__tabla"
				:fields="fields"
				:items="articles">

					<template #cell(seleccionado)="data">
						<b-form-checkbox
						:value="data.item.purchase_suggestion_article_id"
						v-model="selected_ids">
						</b-form-checkbox>
					</template>

					<template #cell(prioridad)="data">
						{{ data.item.prioridad === null || typeof data.item.prioridad == 'undefined' ? '—' : data.item.prioridad }}
					</template>

					<template #cell(stock_global)="data">
						{{ numero_o_guion(data.item.stock_global, 0) }}
					</template>

					<template #cell(stock_min_global)="data">
						{{ numero_o_guion(data.item.stock_min_global, 0) }}
					</template>

					<template #cell(velocidad_diaria)="data">
						{{ numero_o_guion(data.item.velocidad_diaria, 2) }}
					</template>

					<template #cell(cobertura_dias)="data">
						<!-- Cobertura null = el articulo no registra ventas: cobertura infinita, no urgente -->
						{{ numero_o_guion(data.item.cobertura_dias, 1) }}
					</template>

					<template #cell(provider_nombre)="data">
						<b-badge
						v-if="!data.item.provider_id"
						variant="warning"
						title="Ningun proveedor tiene oferta vigente ni es el titular del articulo">
							Sin proveedor asignado
						</b-badge>
						<span v-else>
							{{ data.item.provider_nombre }}
							<i
							v-if="es_cambio_de_proveedor(data.item)"
							class="bi bi-arrow-left-right text-warning m-l-5"
							:title="'Proveedor habitual: ' + (data.item.provider_titular_nombre || '—')"></i>
						</span>
					</template>

					<template #cell(costo_estimado)="data">
						{{ price(data.item.costo_estimado) }}
					</template>

					<template #cell(costo_proveedor_titular)="data">
						{{ price(data.item.costo_proveedor_titular) }}
					</template>

					<template #cell(ahorro_estimado)="data">
						{{ data.item.ahorro_estimado === null || typeof data.item.ahorro_estimado == 'undefined' ? '—' : price(data.item.ahorro_estimado) }}
					</template>

					<template #cell(oferta_fecha)="data">
						{{ data.item.oferta_fecha ? date(data.item.oferta_fecha) : '—' }}
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
						{{ paginacion.total }} resultados
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

	</div>
</template>
<script>
/*
	Tabla priorizada del detalle de compras: las lineas llegan paginadas y
	ordenadas del backend (por prioridad materializada, no calculada al leer).
	La seleccion es por pagina: cambiar de pagina o de filtro la limpia, para
	que nadie crea que tiene seleccionado algo que ya no esta viendo. Molde de
	sugerencias-de-stock/TablaPriorizada.vue.
*/
export default {
	props: {
		purchase_suggestion_id: {
			type: Number,
			required: true,
		},
	},
	data() {
		return {
			// purchase_suggestion_article_id de las filas tildadas en la pagina actual.
			selected_ids: [],
			loading_crear: false,
		}
	},
	computed: {
		articles() {
			return this.$store.state.purchase_suggestion_article.articles
		},
		paginacion() {
			return this.$store.state.purchase_suggestion_article.paginacion
		},
		loading() {
			return this.$store.state.purchase_suggestion_article.loading_articles
		},
		pagina_entera_seleccionada() {
			return this.articles.length > 0 && this.selected_ids.length === this.articles.length
		},
		pagina_actual: {
			get() {
				return this.paginacion.page
			},
			set(value) {
				if (value != this.paginacion.page) {
					this.$store.dispatch('purchase_suggestion_article/getArticles', {page: value})
				}
			},
		},
		fields() {
			return [
				{
					label: '',
					key: 'seleccionado',
				},
				{
					label: 'Prioridad',
					key: 'prioridad',
				},
				{
					label: 'Num',
					key: 'article_id',
				},
				{
					label: 'Cod barras',
					key: 'bar_code',
				},
				{
					label: 'Cod Prov',
					key: 'provider_code',
				},
				{
					label: 'Nombre',
					key: 'name',
				},
				{
					label: 'Cantidad',
					key: 'cantidad',
				},
				{
					label: 'Stock',
					key: 'stock_global',
				},
				{
					label: 'Stock min',
					key: 'stock_min_global',
				},
				{
					label: 'Venta diaria',
					key: 'velocidad_diaria',
				},
				{
					label: 'Cobertura (dias)',
					key: 'cobertura_dias',
				},
				{
					label: 'Comprarle a',
					key: 'provider_nombre',
				},
				{
					label: 'Costo estimado',
					key: 'costo_estimado',
				},
				{
					label: 'Costo prov. habitual',
					key: 'costo_proveedor_titular',
				},
				{
					label: 'Ahorro estimado',
					key: 'ahorro_estimado',
				},
				{
					label: 'Fecha oferta',
					key: 'oferta_fecha',
				},
			]
		},
	},
	watch: {
		/**
		 * Cada carga nueva (cambio de pagina o de filtro) limpia la seleccion:
		 * es una seleccion por pagina, no acumulada entre paginas.
		 */
		articles() {
			this.selected_ids = []
		},
	},
	methods: {
		/**
		 * Formatea un numero que puede venir null (articulos sin ventas o sin
		 * stock minimo cargado) mostrando un guion en ese caso.
		 */
		numero_o_guion(valor, decimales) {
			if (valor === null || typeof valor == 'undefined' || valor === '') {
				return '—'
			}
			return Number(valor).toFixed(decimales)
		},
		/**
		 * true solo ante un cambio REAL entre dos proveedores conocidos: el
		 * elegido y el titular tienen que existir los dos (si el articulo nunca
		 * tuvo proveedor habitual, provider_id_titular es null y no hay "cambio"
		 * que marcar, aunque se le haya podido asignar uno para esta compra) y
		 * ser distintos entre si. Misma condicion que el filtro server-side
		 * solo_cambio_de_proveedor (PurchaseSuggestionController::articles()),
		 * para marcar la fila con un icono aunque el filtro este apagado.
		 *
		 * Nota: esta funcion se llama solo dentro del v-else de
		 * !data.item.provider_id (arriba, en el template), asi que en la
		 * practica linea.provider_id ya llega truthy; el chequeo queda igual
		 * para que la condicion sea correcta por si sola, sin depender de eso.
		 */
		es_cambio_de_proveedor(linea) {
			return !!linea.provider_id && !!linea.provider_id_titular && linea.provider_id != linea.provider_id_titular
		},
		/**
		 * Tilda o destilda todas las filas de la pagina visible.
		 */
		toggle_seleccionar_pagina() {
			if (this.pagina_entera_seleccionada) {
				this.selected_ids = []
			} else {
				let ids = []
				this.articles.forEach(article => {
					if (article.purchase_suggestion_article_id) {
						ids.push(article.purchase_suggestion_article_id)
					}
				})
				this.selected_ids = ids
			}
		},
		/**
		 * Genera la orden (u ordenes: una por proveedor) de compra para las lineas
		 * tildadas. Si alguna linea no tiene proveedor asignado, el backend
		 * rechaza todo con 422 y no crea nada; el mensaje que manda ya explica
		 * que hacer (asignar proveedor o sacar esa linea de la seleccion), asi
		 * que se muestra tal cual llega.
		 */
		crear_orden_de_compra() {
			let self = this
			this.loading_crear = true
			this.$api.post('purchase-suggestion/' + this.purchase_suggestion_id + '/create-provider-order', {
				purchase_suggestion_article_ids: this.selected_ids,
			})
			.then(function(res) {
				self.loading_crear = false
				let cantidad = res.data.provider_orders.length
				let mensaje = cantidad === 1
					? 'Se genero 1 orden de compra.'
					: 'Se generaron ' + cantidad + ' ordenes de compra.'
				self.$bvToast.toast(mensaje, {
					title: 'Orden de compra creada',
					variant: 'success',
					solid: true,
				})
				self.selected_ids = []
			})
			.catch(function(err) {
				console.log(err)
				self.loading_crear = false
				let mensaje = err.response && err.response.data && err.response.data.message
					? err.response.data.message
					: 'Ocurrio un error al generar la orden de compra.'
				self.$bvToast.toast(mensaje, {
					title: 'Error',
					variant: 'danger',
					solid: true,
				})
			})
		},
	}
}
</script>

<style lang="sass">
.tabla-priorizada-compra
	// Piso de ancho: con dieciseis columnas, abajo de esto las celdas se parten. Con el responsive
	// de la tabla, esto es lo que dispara el scroll horizontal en tablet y telefono en vez de
	// apretar. Va sobre la <table> --por eso la clase entra por `table-class` y no por `class`--:
	// puesto sobre el div .table-responsive el que se ensancha es el contenedor que scrollea, y el
	// scroll se le escapa a la pagina.
	&__tabla
		min-width: 1100px
</style>
