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
		type="date" name="dateofbirth" class="custom-date-picker">
	</div>
</template>
<script>
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
			this.date_value = this.value 
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
.custom-date-picker::-webkit-inner-spin-button {
	display: none !important;
}
.custom-date-picker::-webkit-calendar-picker-indicator {
  	opacity: 0 !important;
}

label {
  	display: block !important;
}
.custom-date-picker {
/*	background: #fff url(https://cdn1.iconfinder.com/data/icons/cc_mono_icon_set/blacks/16x16/calendar_2.png)  97% 50% no-repeat  !important;*/
	border: 1px solid #c4c4c4 !important;
	border-radius: 5px !important;
	background-color: #fff !important;
	padding: 3px 5px !important;
	box-shadow: inset 0 3px 6px rgba(0,0,0,0.1) !important;
	width: 190px !important;
	color: #333 !important;
}
</style>