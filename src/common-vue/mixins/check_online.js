export default {
	methods: {
		check_online() {
			// Escucha los eventos de conexión/desconexión
			window.addEventListener("online", this.handleOnline);
			window.addEventListener("offline", this.handleOffline);
		},
		handleOnline() {
			alert('Volvio la conexion a internet')
			
		},
		handleOffline() {
			alert('Se perdió la conexión a internet, espere a que se restablezca la conexión para continuar usando el sistema por favor')
		},
	}
}