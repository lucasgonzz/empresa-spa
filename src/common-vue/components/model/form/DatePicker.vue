<template>
	<div
	class="cont-date-picker">
		<label
		v-if="label">
			{{ label }} 
		</label>
		<input 
		@change="setDate"
		v-model="date_value"
		type="date" 
		class="custom-date-picker">
	</div>
</template>
<script>
import moment from 'moment'
export default {
	props: {
		label: {
			type: String,
			default: null
		},
		value: {
			type: String,
			default: null
		},
		prop: {
			type: Object,
			default: null
		},
	},
	created() {
		if (this.value) {
			this.date_value = moment(this.value, 'YYYY-MM-DD').format('YYYY-MM-DD') 
			this.setDate()
		}
	},
	data() {
		return {
			date_value: '',
		}
	},
	methods: {
		setDate() {
			this.$emit('setDate', {
				value: this.date_value,
				prop: this.prop,
			})
		},
	},
}
</script>
<style>
.cont-date-picker {
	display: flex;
	flex-direction: column;
	margin-bottom: 15px;
}

label {
  	display: block !important;
}
.custom-date-picker {
	border: 1px solid #c4c4c4 !important;
	border-radius: 5px !important;
	background-color: #fff !important;
	padding: 0.375rem 0.75rem !important;
	width: 190px !important;
	color: #333 !important;
}
</style>