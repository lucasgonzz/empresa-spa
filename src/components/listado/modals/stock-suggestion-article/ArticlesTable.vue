<template>
	<b-table
	head-variant="dark"
	responsive
	:fields="fields"
	:items="items">
		<template #cell(seleccionado)="data">
			<b-form-checkbox
			:id="'stock-suggestion-article-checkbox-' + data.item._row_selection_key"
			:value="data.item._row_selection_key"
			:disabled="!has_valid_article_id(data.item)"
			v-model="selected_row_keys"
			@change="on_change_selection">
			</b-form-checkbox>
		</template>
	</b-table>
</template>
<script>
export default {
	props: {
		select_all: {
			type: Boolean,
			default: false,
		},
	},
	data() {
		return {
			// Claves únicas de filas seleccionadas para evitar selección visual masiva por ids repetidos/nulos.
			selected_row_keys: [],
		}
	},
	watch: {
		select_all(val) {
			if (val) {
				// Seleccionar solo filas válidas para creación de movimientos.
				this.selected_row_keys = this.items
					.filter(item => this.has_valid_article_id(item))
					.map(item => item._row_selection_key)
			} else {
				this.selected_row_keys = []
			}
			this.emit_selected_ids()
		},
		stock_suggestion_articles() {
			this.selected_row_keys = []
			this.$emit('update:selected', [])
		},
	},
	computed: {
		stock_suggestion_articles() {
			return this.$store.state.stock_suggestion_article.stock_suggestion_articles 
		},
		fields() {
			return [
				{
					label: '',
					key: 'seleccionado',
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
					label: 'Deposito Origen',
					key: 'from_address',
				}, 
				{
					label: 'Deposito Destino',
					key: 'to_address',
				},
				{
					label: 'Cantidad',
					key: 'cantidad',
				},
			]
		},
		items() { 
			let items = []
			this.stock_suggestion_articles.forEach((article, index) => {
				// Cada fila obtiene una clave única para la selección en UI.
				let row_selection_key = this.get_row_selection_key(article, index)
				items.push({
					...article,
					_row_selection_key: row_selection_key,
				})
			})
			return items 
		}
	},
	methods: {
		/**
		 * Determina si la fila tiene id válido para crear movimiento.
		 */
		has_valid_article_id(item) {
			return item
				&& item.stock_suggestion_article_id !== null
				&& item.stock_suggestion_article_id !== undefined
		},
		/**
		 * Crea una clave única de fila para que cada checkbox sea independiente en pantalla.
		 */
		get_row_selection_key(article, index) {
			let article_line_id = article && article.stock_suggestion_article_id !== undefined
				? article.stock_suggestion_article_id
				: 'no-id'
			return article_line_id + '-' + index
		},
		/**
		 * Emite al padre únicamente ids reales seleccionados.
		 */
		emit_selected_ids() {
			let selected_ids = []
			this.items.forEach(item => {
				if (
					this.selected_row_keys.includes(item._row_selection_key)
					&& this.has_valid_article_id(item)
					&& !selected_ids.includes(item.stock_suggestion_article_id)
				) {
					selected_ids.push(item.stock_suggestion_article_id)
				}
			})
			this.$emit('update:selected', selected_ids)
		},
		on_change_selection() {
			this.emit_selected_ids()
		},
	}
}
</script>
