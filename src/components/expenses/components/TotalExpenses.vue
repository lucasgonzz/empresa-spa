<template>
	<h4 
	v-if="total > 0"
	class="total-expenses">
		Total: {{ price(total) }}
	</h4>
</template>
<script>
export default {
	computed: {
		expenses() {
			return this.$store.state.expense.models 
		},
		total() {
			let total = 0
			this.expenses.forEach(expense => {
				total += Number(expense.amount)
			})
			return total
		}
	}
}
</script>
<style lang="sass">
.total-expenses
	text-align: left
	font-size: 30px
	font-weight: bold
</style>