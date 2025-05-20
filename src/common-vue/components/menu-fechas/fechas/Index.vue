<template>
	<div
	class="j-start">
		<b-input-group
		class="m-b-0 m-l-15"
		prepend="Desde">
			<b-form-input
			type="date"
			v-model="from_date"></b-form-input>
		</b-input-group>

		<b-input-group
		class="m-b-0 m-l-15"
		prepend="Hasta">
			<b-form-input
			type="date"
			v-model="to_date"></b-form-input>
		</b-input-group>

		<b-button
		class="m-l-15"
		variant="primary"
		@click="search">
			<i class="icon-search"></i>
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
		to_date: {
			get() {
				return this.$store.state[this.model_name].to_date
			},
			set(value) {
				this.$store.commit(this.model_name+'/setToDate', value)
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
