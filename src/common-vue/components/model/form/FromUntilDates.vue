<template>
	<div
	class="from-until-dates">
	
		<b-form-input
		v-model="from_date"
		type="date"
		label="Fecha Inicio"
		@setDate="setFrom"></b-form-input>

		<b-form-input
		v-model="until_date"
		class="m-l-15"
		type="date"
		label="Fecha Fin"
		@setDate="setUntil"></b-form-input>
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