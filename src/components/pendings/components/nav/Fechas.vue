<template>
	<div class="cont-selects m-t-15">

		<b-form-group
		label="Desde">
			<b-form-input
			v-model="from_date"
			type="date"></b-form-input>
		</b-form-group>

		<b-form-group
		label="Hasta">
			<b-form-input
			v-model="until_date"
			type="date"></b-form-input>
		</b-form-group>

		<b-button
		@click="search"
		variant="primary">
			Buscar
		</b-button>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	computed: {
		from_date: {
			get() {
				return this.$store.state[this.model_name].from_date
			},
			set(value) {
				this.$store.commit(this.model_name+'/setFromDate', value)
			}
		},
		until_date: {
			get() {
				return this.$store.state[this.model_name].until_date
			},
			set(value) {
				this.$store.commit(this.model_name+'/setUntilDate', value)
			}
		},
	},
	methods: {
		search() {
			this.$store.dispatch(this.model_name+'/getModels')
		}
	}
}
</script>
<style lang="sass">
	
.cont-selects
	display: flex 
	flex-direction: row 
	align-items: flex-end

	.form-group
		margin-bottom: 0 !important
		margin-right: 15px

		.cont-date-picker
			margin-bottom: 0 !important

</style>