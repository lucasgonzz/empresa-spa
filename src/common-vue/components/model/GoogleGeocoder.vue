<template>
<div>
	
	<b-form-input
	@keyup.enter="search"
	v-model="address"></b-form-input>
	<b-modal
	></b-modal>
</div>
</template>
<script>
export default {
	props: {
		prop: Object,
		model: Object,
	},
	data() {
		return {
			address: '',
		}
	},
	methods: {
		search() {
			const geocoder = new google.maps.Geocoder()
			geocoder.geocode({
				address: this.address+' Argentina'
			})
			.then(res => {
				console.log(res.results)
			})
			.catch(err => {
				console.log(err)
			})
		}
	}
}
</script>