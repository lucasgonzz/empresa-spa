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
			    v-model="$store.state[model_name].from_date"></b-form-datepicker>
			</div>
			<div class="date-picker">
			    <p> 
			    	Hasta
			    </p>
			    <b-form-datepicker
			    placeholder="Fecha fin"
			    class="input-date-picker"
			    v-model="$store.state[model_name].until_date"></b-form-datepicker>
			</div>
			<div
			class="btns">
			    <b-button
			    @click="search"
			    variant="primary">
			    	Buscar
			    </b-button>
			    <b-button
			    class="m-l-15"
			    v-if="print_history && models.length"
			    @click="print"
			    variant="danger">
			    	<i class="icon-print"></i>
			    </b-button>
			</div>
		</div>
		<hr>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
		print_history: Boolean,
	},
	computed: {
		models() {
			return this.$store.state[this.model_name].models 
		},
	},
	methods: {
		search() {
			this.$store.dispatch(this.model_name+'/getModels')
		},
		print() {
			let link = process.env.VUE_APP_API_URL+'/'+this.routeString(this.model_name)+'/pdf/'+this.$store.state[this.model_name].from_date+'/'+this.$store.state[this.model_name].until_date+'/'+this.$store.state[this.model_name].selected_model.id
			console.log(link)
			window.open(link)
		}
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