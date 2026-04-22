<template>
	<div>
		<div
		class="j-start align-end m-b-20">
			<b-form-group
			class="m-r-25 m-b-0"
			label="Modo de agrupacion">
				<b-form-select
				v-model="modo_agrupacion"
				:options="agrupar_options"></b-form-select>
			</b-form-group>
			<b-form-group
			class="m-r-25 m-b-0"
			label="Deposito">
				<b-form-select
				v-model="address_id"
				:options="get_options_simple('address', 'street')"></b-form-select>
			</b-form-group>
			<b-button
			@click="buscar">
				Buscar
			</b-button>
		</div>

		<div
		v-if="hay_resultados"
		class="j-start align-center m-b-15">
			<b-button
			class="m-r-10"
			size="sm"
			variant="outline-secondary"
			@click="toggle_select_all">
				{{ todos_seleccionados ? 'Deseleccionar todos' : 'Seleccionar todos' }}
			</b-button>
			<span
			v-if="selected_article_ids.length"
			class="m-r-10 text-muted small">
				{{ selected_article_ids.length }} seleccionado/s
			</span>
			<b-button
			size="sm"
			variant="primary"
			:disabled="!selected_article_ids.length || loading_crear"
			@click="crear_movimientos">
				<b-spinner
				v-if="loading_crear"
				small
				class="m-r-5">
				</b-spinner>
				Crear Movimiento/s de Deposito
			</b-button>
		</div>

		<articles-table
		:select_all="select_all_flag"
		@update:selected="on_selected_change">
		</articles-table>
	</div>
</template>
<script>
import ArticlesTable from './ArticlesTable'
export default {
	components: { ArticlesTable },
	data() {
		return {
			modo_agrupacion: 'origen',
			address_id: 0,
			selected_article_ids: [],
			select_all_flag: false,
			loading_crear: false,
		}
	},
	computed: {
		agrupar_options() {
			return [
				{
					value: 'origen',
					text: 'Desde el deposito ORIGEN'
				},
				{
					value: 'destino',
					text: 'Hacia el deposito DESTINO'
				},
			]
		},
		stock_suggestion() {
			return this.$store.state.stock_suggestion.model
		},
		stock_suggestion_articles() {
			return this.$store.state.stock_suggestion_article.stock_suggestion_articles
		},
		hay_resultados() {
			return this.stock_suggestion_articles.length > 0
		},
		todos_seleccionados() {
			return this.hay_resultados && this.selected_article_ids.length === this.stock_suggestion_articles.length
		},
	},
	methods: {
		buscar() {
			this.selected_article_ids = []
			this.select_all_flag = false
			this.$api.post('stock-suggestion-article', {
				stock_suggestion_id: this.stock_suggestion.id,
				modo_agrupacion: this.modo_agrupacion,
				address_id: this.address_id,
			})
			.then(res => {
				this.$store.commit('stock_suggestion_article/set_stock_suggestion_articles', res.data.models)
			})
		},
		toggle_select_all() {
			this.select_all_flag = !this.todos_seleccionados
		},
		on_selected_change(ids) {
			this.selected_article_ids = ids
		},
		crear_movimientos() {
			this.loading_crear = true
			this.$api.post(`stock-suggestion/${this.stock_suggestion.id}/create-deposit-movement`, {
				article_ids: this.selected_article_ids,
			})
			.then(res => {
				const cantidad = res.data.deposit_movements.length
				const mensaje = cantidad === 1
					? 'Se creó 1 movimiento de depósito.'
					: `Se crearon ${cantidad} movimientos de depósito.`
				this.$bvToast.toast(mensaje, {
					title: 'Movimientos creados',
					variant: 'success',
					solid: true,
				})
				this.selected_article_ids = []
				this.select_all_flag = false
			})
			.catch(() => {
				this.$bvToast.toast('Ocurrió un error al crear los movimientos.', {
					title: 'Error',
					variant: 'danger',
					solid: true,
				})
			})
			.finally(() => {
				this.loading_crear = false
			})
		},
	}
}
</script>
