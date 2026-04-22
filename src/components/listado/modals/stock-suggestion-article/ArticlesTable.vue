<template>
	<b-table
	head-variant="dark"
	responsive
	:fields="fields"
	:items="items">
		<template #cell(seleccionado)="data">
			<b-form-checkbox
			:value="data.item.id"
			v-model="selected_ids"
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
			selected_ids: [],
		}
	},
	watch: {
		select_all(val) {
			if (val) {
				this.selected_ids = this.items.map(i => i.id)
			} else {
				this.selected_ids = []
			}
			this.$emit('update:selected', this.selected_ids)
		},
		stock_suggestion_articles() {
			this.selected_ids = []
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
					key: 'id',
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
			this.stock_suggestion_articles.forEach(article => {
				items.push({...article})
			})
			return items 
		}
	},
	methods: {
		on_change_selection() {
			this.$emit('update:selected', this.selected_ids)
		},
	}
}
</script>
