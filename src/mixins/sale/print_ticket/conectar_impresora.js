/**
 * Conexion con QZ Tray para el Ticket 2.0.
 *
 * Este mixin evita las dos cosas que el flujo viejo hacia y que generaban soporte:
 * fallar en silencio (el operador apretaba imprimir y no pasaba absolutamente nada,
 * porque el error moria en un console.error) y mostrarle un alert con la lista cruda
 * de impresoras, que era un debug que quedo colgado.
 *
 * Ninguno de estos metodos lanza: devuelven el estado y el llamador decide que
 * mensaje mostrarle al operador.
 */
export default {
    methods: {
        /**
         * Conecta con QZ Tray si todavia no habia conexion viva.
         *
         * @returns {Promise<boolean>} true si quedo conectado, false si no.
         */
        conectar_qz() {
            let self = this

            // El script de QZ no llego a cargar (sin internet en el primer load, o bloqueado).
            if (!window.qz) {
                return Promise.resolve(false)
            }

            // Ya habia conexion de una impresion anterior: se reusa.
            if (window.qz.websocket.isActive()) {
                self.qz = window.qz
                return Promise.resolve(true)
            }

            return window.qz.websocket.connect()
            .then(function () {
                self.qz = window.qz
                return true
            })
            .catch(function (error) {
                console.error('No se pudo conectar con QZ Tray:', error)
                self.qz = null
                return false
            })
        },

        /**
         * Impresoras que QZ Tray ve en este equipo.
         *
         * 🔴 Devuelve el estado de QZ SEPARADO de la lista, a proposito: no es lo mismo que
         * QZ no este abierto que QZ este andando pero sin ninguna impresora instalada.
         * Colapsar los dos casos en "lista vacia" hacia que el segundo mostrara el
         * instructivo de "abri QZ Tray", que es un diagnostico falso y manda al operador a
         * revisar donde no esta el problema.
         *
         * @returns {Promise<{qz_disponible: boolean, impresoras: Array<string>}>}
         */
        listar_impresoras_qz() {
            let self = this

            return self.conectar_qz()
            .then(function (conectado) {
                if (!conectado) {
                    return {
                        qz_disponible: false,
                        impresoras: [],
                    }
                }

                return self.qz.printers.find()
                .then(function (encontradas) {
                    // find() devuelve un array, pero con una sola impresora puede venir un string.
                    if (typeof encontradas === 'string') {
                        return {
                            qz_disponible: true,
                            impresoras: [encontradas],
                        }
                    }

                    if (Array.isArray(encontradas)) {
                        return {
                            qz_disponible: true,
                            impresoras: encontradas,
                        }
                    }

                    return {
                        qz_disponible: true,
                        impresoras: [],
                    }
                })
                .catch(function (error) {
                    // QZ contesto la conexion y despues fallo la consulta (o no hay ninguna
                    // impresora instalada, que es como QZ reporta ese caso): sigue disponible.
                    console.error('No se pudieron listar las impresoras de QZ Tray:', error)

                    return {
                        qz_disponible: true,
                        impresoras: [],
                    }
                })
            })
            .catch(function (error) {
                console.error('No se pudo consultar QZ Tray:', error)

                return {
                    qz_disponible: false,
                    impresoras: [],
                }
            })
        },

        /**
         * Mensaje para el operador cuando QZ Tray no responde.
         *
         * Dice que hacer, no que fallo: es el cartel que reemplaza al silencio que
         * el manual documenta como el sintoma que mas confunde.
         *
         * @returns {string}
         */
        mensaje_qz_no_disponible() {
            return 'No se detecta QZ Tray. Abrilo desde el icono de la barra de tareas de Windows y volve a intentar.'
        },
    },
}
