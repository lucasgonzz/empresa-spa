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
			alert('Se PERDIO la conexión a INTERNET, ESPERE a que se restablezca para continuar usando el SISTEMA, por favor')
		},
	}
}