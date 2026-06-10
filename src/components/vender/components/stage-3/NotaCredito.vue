<template>
	<div
	class="vender-client-block vender-client-block--panel"
	v-if="returned_items.length && client">

		<div class="vender-client-block__header">
			<span class="vender-client-block__title">
				Nota de crédito
			</span>
		</div>

		<vender-toggle
		v-model="save_nota_credito"
		input_id="save_nota_credito_toggle">
			Guardar nota de credito por los siguientes items
		</vender-toggle>

		<div class="vender-client-block__table">
			<b-table
			:items="items"
			:fields="fields"
			responsive
			small
			hover
			bordered>
				<template #cell(return_to_stock)="data">
					<b-form-input
					class="input-discount"
					type="number"
					min="0"
					v-model="items[data.index].return_to_stock">
					</b-form-input>
				</template>
			</b-table>
		</div>

		<b-form-group
		class="vender-client-block__checkbox-group m-t-10"
		label="Descripcion">
			<b-form-textarea
			v-model="nota_credito_description"
			rows="3">
			</b-form-textarea>
		</b-form-group>

	</div>
</template>
<script>
import VenderToggle from '@/components/vender/components/VenderToggle'
export default {
	components: {
		VenderToggle,
	},
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
