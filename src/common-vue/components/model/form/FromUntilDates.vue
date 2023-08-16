<template>
	<div
	class="from-until-dates">
		<date-picker
		:value="from_date"
		label="Fecha Inicio"
		@setDate="setFrom"></date-picker>

		<date-picker
		:value="until_date"
		label="Fecha Fin"
		@setDate="setUntil"></date-picker>
	</div>
</template>
<script>
export default {
	props: {
		from_date: {
			type: String,
			default: null
		},
		until_date: {
			type: String,
			default: null
		},
	},
	components: {
		DatePicker: () => import('@/common-vue/components/model/form/DatePicker'),
	},
	methods: {
		setFrom(date) {
			this.$emit('setFrom', date)
		},
		setUntil(date) {
			this.$emit('setUntil', date)
		},
	}
}
</script>
<style>
.from-until-dates {
	width: 400px;
	display: flex;
	flex-direction: row;
	justify-content: space-between;
}
</style>