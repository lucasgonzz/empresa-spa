<template>
<h5>
	<div
	v-if="typeof is_filtered != 'undefined' && is_filtered">
		<strong>
			{{ plural(model_name) }} con filtro
		</strong>
	</div>
	<div
	v-else>
		<strong
		v-if="date(from_date) == date(today)">
			{{ plural(model_name) }} de hoy
		</strong>
		<strong
		v-else-if="until_date == ''">
			{{ plural(model_name) }} del {{ date(from_date) }}
		</strong>
		<strong
		v-else>
			Del {{ date(from_date) }} a {{ date(until_date) }}
		</strong>
	</div>
</h5>
</template>
<script>
export default {
    props: {
    	model_name: String,
    },
	computed: {
		is_filtered() {
			return this.$store.state[this.model_name].is_filtered
		},
		from_date() {
			return this.$store.state[this.model_name].from_date
		},
		until_date() {
			return this.$store.state[this.model_name].until_date
		},
	},
}
</script>
<style scoped lang="sass">
h5
	margin-bottom: 0
	@media screen and (max-width: 768px)
		text-align: center
	@media screen and (min-width: 768px)
		text-align: left
</style>