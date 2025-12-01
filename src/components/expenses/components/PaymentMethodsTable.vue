<template>
	<div 
		v-if="items && items.length"
		class="m-t-15">
		<h6 class="">Métodos de pago seleccionados:</h6>
		<b-table
			:items="items"
			:fields="fields"
			small
			striped
			responsive
		>
			<template #cell(amount)="row">
				{{ price(row.item.amount) }}
			</template>
		</b-table>
	</div>
</template>

<script>
import generals from '@/common-vue/mixins/generals'
export default {
	mixins: [generals],
	props: {
		items: {
			type: Array,
			default: () => []
		}
	},
	computed: {
		fields() {
			return [
				{ key: 'name', label: 'Método' },
				{ key: 'amount', label: 'Monto' },
			];
		}
	},
}
</script>
