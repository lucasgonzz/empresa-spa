<template>
	<div>
		<sale-print-buttons
		:sale="sale"></sale-print-buttons>

		<b-button
		class="m-l-15"
		variant="danger"
		@click.stop="deleteSale">
			<i class="icon-trash"></i>
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		sale: Object,
	},
	components: {
		SalePrintButtons: () => import('@/components/common/SalePrintButtons'),
	},
	methods: {
		deleteSale() {
			this.$store.commit('sale/setDelete', this.sale)
			this.$bvModal.show('delete-sale')
		},
	}
}
</script>