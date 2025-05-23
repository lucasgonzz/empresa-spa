<template>
	<div 
	v-if="show"
	@click="to_version_anterior"
	class="route">
		<div 
    	class="menu-trigger">
    		
    		<div
    		class="ruta-principal">

		    	<div>
			    	<span
			    	class="route-text">
						Cambiar Version  
			    	</span>
		    	</div>

				<img src="@/assets/check.png" alt="">

    		</div>

    	</div>
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