export default {
    methods: {
        async conectar_qz() {

            if (!this.qz) {

                console.log('QZ No esta inicializado')

                if (!window.qz) {
                    console.error("❌ QZ Tray no está disponible. Asegúrate de que el script de QZ Tray está cargado.");
                    return;
                }

                
                if (window.qz.websocket.isActive()) {

                    this.qz = window.qz
                    console.log("✅ QZ Tray ya estaba conectado");
                } else {

                    console.log("QZ no está conectado");
                    return window.qz.websocket.connect()
                    .then(() => {
                        this.qz = window.qz
                        console.log("✅ Conectado a QZ Tray")
                        
                        this.qz.printers.find()
                        .then(found => {
                            alert(found)
                        })
                    })
                    .catch(err => console.error("❌ Error al conectar QZ Tray:", err));
                }

            } else {
                console.log('Ya habia conexion con qz')
            }

        },
        // async seleccionar_impresora() {
        //     this.qz.printers.find()
        //     .then(found => {
                
        //         alert(found)
        //     })
        // },
    },
};
