<template>
	<div 
	v-if="show"
	@click="to_version_anterior"
	class="route">
		Version Anterior 
		<img src="@/assets/check.png" alt="">
	</div>
</template>
<script>
export default {
	computed: {
		show() {
			const pagina_actual = window.location.origin

			let default_version = this.owner.default_version

			if (this.user.default_version) {
				default_version = this.user.default_version
			}

			if (default_version == pagina_actual) {
				return true 
			}

			return false
		},
	},
	methods: {
		to_version_anterior() {
			let estable_version = this.owner.estable_version

			if (this.user.estable_version) {
				estable_version = this.user.estable_version
			}
			
			window.location.href = estable_version+'?forceStable=true'
		}
	}
}
</script>