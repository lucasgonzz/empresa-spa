<template>
	<div>
		<b-dropdown-divider></b-dropdown-divider>
		
		<!-- <b-dropdown-text>
			
			<h5>
				<i class="icon-down"></i>
				Historial de busquedas
			</h5>
		</b-dropdown-text>
		<b-dropdown-divider></b-dropdown-divider> -->

		<b-dropdown-item
		@click="show">
			<i class="icon-search"></i>
			Historial de busquedas
		</b-dropdown-item>
	</div>
</template>
<script>
export default {
	methods: {
		show() {
			this.$store.dispatch('filter_history/getModels')
			this.$bvModal.show('filter-history')
		}
	}
}
</script>