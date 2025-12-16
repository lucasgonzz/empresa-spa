<template>
	<div
	class="j-start align-center">

		<from-until-dates
		:from_date="from_date"
		:until_date="until_date"
		@setFrom="setFrom"
		@setUntil="setUntil"></from-until-dates>

	    <b-button
	    class="m-l-15"
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
	data() {
		return {
	        from_date: moment().startOf('month').format('YYYY-MM-DD'),
	        until_date: moment().format('YYYY-MM-DD')
		}
	},
	methods: {
		setFrom(date) {
			this.from_date = date.value
		},
		setUntil(date) {
			this.until_date = date.value
		},
		getSales() {
			this.$emit('getSales', {from_date: this.from_date, until_date: this.until_date})
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