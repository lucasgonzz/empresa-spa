<template>
	<div>
		<div
		class="has-many-nav">
			<div class="date-picker">
				<p>
					Desde
				</p>
			    <b-form-datepicker
			    class="input-date-picker"
			    placeholder="Fecha inicio"
			    v-model="from_date"></b-form-datepicker>
			</div>
			<div class="date-picker">
			    <p>
			    	Hasta
			    </p>
			    <b-form-datepicker
			    placeholder="Fecha fin"
			    class="input-date-picker"
			    v-model="until_date"></b-form-datepicker>
			</div>
			<div
			class="btns">
			    <b-button
			    @click="getCharts"
			    variant="primary">
			    	Buscar
			    </b-button>
			</div>
		</div>
		<hr>
	</div>
</template>
<script>
import moment from 'moment' 
export default {
	data() {
		return {
			from_date: moment().subtract(1, 'months').format('YYYY-MM-DD'),
			until_date: moment().format('YYYY-MM-DD'),
		}
	},
	methods: {
		getCharts() {
			this.$emit('getCharts', {from_date: this.from_date, until_date: this.until_date})
		},
	}
}
</script>
<style lang="sass">
.has-many-nav
	display: flex
	align-items: flex-end
	@media screen and (max-width: 992px)
		flex-direction: column
	@media screen and (min-width: 992px)
		justify-content: flex-start 
	.btns
		display: flex
		flex-direction: columns
	.date-picker
		p 
			margin-bottom: 0
		@media screen and (max-width: 992px) 
			width: 100%
			margin-bottom: 15px
		@media screen and (min-width: 992px) 
			width: 400px
			margin-right: 15px
</style>