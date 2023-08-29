<template>
	<div
	class="j-start align-end">

		<from-until-dates
		:from_date="from_date"
		:until_date="until_date"
		@setFrom="setFrom"
		@setUntil="setUntil"></from-until-dates>

	    <b-button
	    class="m-b-15 m-l-15"
	    @click="getSales"
	    variant="primary">
	    	Buscar
	    </b-button>

		<hr>
	</div>
</template>
<script>
import moment from 'moment' 
export default {
	components: {
		FromUntilDates: () => import('@/common-vue/components/model/form/FromUntilDates')
	},
	computed: {
		from_date() {
			return moment().startOf('month').format('YYYY-MM-DD')
		},
		until_date() {
			return moment().format('YYYY-MM-DD')
		},
	},
	data() {
		return {
			from: '',
			_until: '',
		}
	},
	methods: {
		setFrom(date) {
			this.from = date.value
		},
		setUntil(date) {
			this._until = date.value
		},
		getSales() {
			this.$emit('getSales', {from_date: this.from, until_date: this._until})
		},
	}
}
</script>
<style lang="sass">
.has-many-nav
	display: flex
	flex-direction: row 
	justify-content: flex-start
	align-items: flex-end
</style>