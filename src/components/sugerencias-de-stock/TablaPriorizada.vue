<template>
	<div class="tabla-priorizada">

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
					class="m-r-10"
					size="sm"
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
					size="sm"
					variant="primary"
					:disabled="!selected_ids.length || loading_crear"
					@click="crear_movimientos">
						<b-spinner
						v-if="loading_crear"
						small
						class="m-r-5"></b-spinner>
						Crear movimientos de deposito
					</b-button>
				</div>
				<span class="text-muted small">
					{{ paginacion.total }} linea/s
				</span>
			</div>

			<b-table
			head-variant="dark"
			responsive
			:fields="fields"
			:items="articles">

				<template #cell(seleccionado)="data">
					<b-form-checkbox
					:value="data.item.stock_suggestion_article_id"
					v-model="selected_ids">
					</b-form-checkbox>
				</template>

				<template #cell(prioridad)="data">
					{{ data.item.prioridad === null || typeof data.item.prioridad == 'undefined' ? '—' : data.item.prioridad }}
				</template>

				<template #cell(velocidad_diaria)="data">
					{{ numero_o_guion(data.item.velocidad_diaria, 2) }}
				</template>

				<template #cell(cobertura_dias)="data">
					<!-- Cobertura null = el articulo no registra ventas: cobertura infinita, no urgente -->
					{{ numero_o_guion(data.item.cobertura_dias, 1) }}
				</template>

				<template #cell(stock_destino)="data">
					{{ numero_o_guion(data.item.stock_destino, 0) }}
				</template>

			</b-table>

			<b-pagination
			v-if="paginacion.total > paginacion.per_page"
			class="m-0"
			pills
			v-model="pagina_actual"
			:total-rows="paginacion.total"
			:per-page="paginacion.per_page"></b-pagination>

		</template>

	</div>
</template>
<script>
/*
	Tabla priorizada del detalle: las lineas llegan paginadas y ordenadas del
	backend (por prioridad materializada, no calculada al leer). La seleccion es
	por pagina: cambiar de pagina o de filtro la limpia, para que nadie crea que
	tiene seleccionado algo que ya no esta viendo.
*/
export default {
	props: {
		stock_suggestion_id: {
			type: Number,
			required: true,
		},
	},
	data() {
		return {
			// stock_suggestion_article_id de las filas tildadas en la pagina actual.
			selected_ids: [],
			loading_crear: false,
		}
	},
	computed: {
		articles() {
			return this.$store.state.stock_suggestion_article.articles
		},
		paginacion() {
			return this.$store.state.stock_suggestion_article.paginacion
		},
		loading() {
			return this.$store.state.stock_suggestion_article.loading_articles
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
					this.$store.dispatch('stock_suggestion_article/getArticles', {page: value})
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
					label: 'Origen',
					key: 'from_address',
				},
				{
					label: 'Destino',
					key: 'to_address',
				},
				{
					label: 'Cantidad',
					key: 'cantidad',
				},
				{
					label: 'Stock destino',
					key: 'stock_destino',
				},
				{
					label: 'Venta diaria',
					key: 'velocidad_diaria',
				},
				{
					label: 'Cobertura (dias)',
					key: 'cobertura_dias',
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
		 * Formatea un numero que puede venir null (sugerencias viejas sin
		 * backfill, articulos sin ventas) mostrando un guion en ese caso.
		 */
		numero_o_guion(valor, decimales) {
			if (valor === null || typeof valor == 'undefined' || valor === '') {
				return '—'
			}
			return Number(valor).toFixed(decimales)
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
					if (article.stock_suggestion_article_id) {
						ids.push(article.stock_suggestion_article_id)
					}
				})
				this.selected_ids = ids
			}
		},
		/**
		 * Crea los movimientos de deposito para las lineas tildadas, contra el
		 * endpoint que ya usaba el flujo viejo (se comparte a proposito: un solo
		 * camino para crear movimientos desde una sugerencia).
		 */
		crear_movimientos() {
			let self = this
			this.loading_crear = true
			this.$api.post('stock-suggestion/' + this.stock_suggestion_id + '/create-deposit-movement', {
				stock_suggestion_article_ids: this.selected_ids,
			})
			.then(function(res) {
				self.loading_crear = false
				let cantidad = res.data.deposit_movements.length
				let mensaje = cantidad === 1
					? 'Se creo 1 movimiento de deposito.'
					: 'Se crearon ' + cantidad + ' movimientos de deposito.'
				self.$bvToast.toast(mensaje, {
					title: 'Movimientos creados',
					variant: 'success',
					solid: true,
				})
				self.selected_ids = []
			})
			.catch(function(err) {
				console.log(err)
				self.loading_crear = false
				self.$bvToast.toast('Ocurrio un error al crear los movimientos.', {
					title: 'Error',
					variant: 'danger',
					solid: true,
				})
			})
		},
	}
}
</script>
