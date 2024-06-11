<template>
	<b-card
	class="s-1 b-r-5"
	v-if="returned_items.length && client"
	header="Nota de credito">
		<b-form-checkbox
		:value="1"
		:unchecked-value="0"
		v-model="save_nota_credito">
			Guardar nota de credito por los siguientes items
		</b-form-checkbox>

		<b-table 
		class="b-r-1 m-t-15"
		:items="items" 
		head-variant="dark" 
		:fields="fields" 
		responsive 
		hover>
			<template #cell(return_to_stock)="data">
				<b-input-group
				class="input-discount">
					<b-form-input
					type="number"
					min="0"
					v-model="items[data.index].return_to_stock"></b-form-input>
				</b-input-group>
			</template>
		</b-table>

		<b-form-group
		class="m-t-15"
		label="Descripcion">
			<b-form-textarea
			v-model="nota_credito_description"></b-form-textarea>
		</b-form-group>
	</b-card>
</template>
<script>
export default {
	computed: {
		client() {
			return this.$store.state.vender.client
		},
		returned_items() {
			return this.$store.state.vender.returned_items
		},
		nota_credito_description: {
			get() {
				return this.$store.state.vender.nota_credito_description
			},
			set(value) {
				this.$store.commit('vender/setNotaCreditoDescription', value)
			}
		},
		save_nota_credito: {
			get() {
				return this.$store.state.vender.save_nota_credito
			},
			set(value) {
				this.$store.commit('vender/setSaveNotaCredito', value)
			}
		},
		fields() {
			return [
				{ key: 'name', label: 'Nombre' },
				{ key: 'returned_amount', label: 'U. Devueltas' },
				{ key: 'return_to_stock', label: 'Devolver al Stock' },
			]
		},
		items() {
			return this.returned_items
		},
	},
}
</script>