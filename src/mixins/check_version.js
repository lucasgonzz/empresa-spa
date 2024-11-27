export default {
	methods: {
		check_version() {

			let default_version = this.owner.default_version

			if (this.user.default_version) {
				default_version = this.user.default_version
			}

			if (default_version) {
				
				// Subdominio actual, ej. refrigeracioncolman.comercity.com
				const currentHost = window.location.origin; 

				const params = new URLSearchParams(window.location.search);

				// Revisar si se incluyó el parámetro
				const forceStable = params.has("forceStable"); 

				if (!forceStable && currentHost !== default_version) {

					alert("Serás redirigido a la versión correspondiente del sistema.");
					window.location.href = default_version;
				}
			}


		}
	}
}