// import qz from "qz-tray";
import afip_information from '@/mixins/sale/print_ticket/afip_information'
import afip_qr_iva from '@/mixins/sale/print_ticket/afip_qr_iva'
import conectar_impresora from '@/mixins/sale/print_ticket/conectar_impresora'
import table_articles from '@/mixins/sale/print_ticket/table_articles'
import info_cliente from '@/mixins/sale/print_ticket/info_cliente'
import {
    preferencias_del_puesto,
    parse_ancho_de_ticket_mm,
    hidratar_preferencias_del_puesto,
} from '@/mixins/sale/print_ticket/preferencias_del_puesto'
export default {
    mixins: [afip_information, afip_qr_iva, conectar_impresora, table_articles, info_cliente],
    data() {
        return {
            qz: null,
            content: [],
            sale_to_print: null,
            /**
             * Preferencias de impresion de este puesto. Se expone en data para que los
             * computed que la leen queden atados a un objeto reactivo.
             */
            preferencias_del_puesto: preferencias_del_puesto,
        }
    },
    created() {
        hidratar_preferencias_del_puesto(this.$cookies)
    },
    computed: {
        /**
         * Impresora que usa el Ticket 2.0, en orden de prioridad.
         *
         * La cookie es del PUESTO, no de la persona: un local con dos cajas comparte
         * el mismo usuario, y si la eleccion viviera unicamente en el usuario, la caja 2
         * le pisaria la impresora a la caja 1 cada vez que la cambia. Es el mismo
         * criterio que ya usa ancho_impresora.
         *
         * @returns {string|null} null si todavia no se configuro ninguna.
         */
        impresora() {
            if (this.preferencias_del_puesto.impresora) {
                return this.preferencias_del_puesto.impresora
            }

            /*
             * 🔴 El fallback del usuario y del owner NO puede devolver una impresora de agente.
             *
             * Ese valor es compartido por todo el comercio, y un destino "agente:<id>:..." apunta a
             * una computadora FISICA concreta. Si la caja 1 migra al agente y despues alguien entra
             * desde la caja 2 con un navegador sin cookie, heredaria ese valor y su ticket saldria
             * por la comandera de la caja 1 -- sin ningun error, y sin que nadie lo note hasta que
             * falte el ticket. El equipo se elige por puesto, siempre.
             */
            if (this.user && this.user.impresora && !this.es_destino_de_agente(this.user.impresora)) {
                return this.user.impresora
            }

            if (this.owner && this.owner.impresora && !this.es_destino_de_agente(this.owner.impresora)) {
                return this.owner.impresora
            }

            return null
        },
        /**
         * Por dónde sale el ticket: por el agente de impresion o por QZ Tray.
         *
         * Es lo que permite migrar de QZ al agente cliente por cliente sin cortar a nadie: la
         * decision se toma por impresora elegida, no por una bandera global.
         *
         * @returns {Object|null} {origen, print_agent_id, nombre}
         */
        destino_de_impresion() {
            return this.parse_destino_de_impresion(this.impresora)
        },
        /**
         * Ancho de la comandera en mm: lo configurado en este puesto, o el perfil del owner.
         *
         * @returns {number}
         */
        ancho_impresora() {
            // Prioridad: el ancho configurado en ESTE puesto. Sale del estado reactivo y no
            // de la cookie por lo que explica preferencias_del_puesto.js: leer la cookie acá
            // dejaba al computed sin dependencias y congelado hasta el proximo F5.
            if (this.preferencias_del_puesto.ancho_mm) {
                return this.preferencias_del_puesto.ancho_mm
            }

            // Fallback: ancho del perfil del dueño (sale_ticket_width)
            let ancho_owner = this.parse_valid_ticket_width_mm(this.owner && this.owner.sale_ticket_width)
            if (ancho_owner) {
                return ancho_owner
            }

            return 80
        },
        tamano_letra() {
            return this.owner.tamano_letra
        },
        TICKET_WIDTH() {
            const mm_base = 80;
            const char_base = 48;

            return Math.floor((this.ancho_impresora * char_base) / mm_base);
        }
    },
    methods: {
        /**
         * Valida un ancho de ticket expresado en milímetros.
         *
         * @param {*} raw_value valor crudo (cookie, perfil de usuario, prompt).
         * @returns {number|null} ancho en mm o null si no es válido.
         */
        parse_valid_ticket_width_mm(raw_value) {
            return parse_ancho_de_ticket_mm(raw_value)
        },

        /**
         * Si un valor guardado apunta a un equipo con agente.
         *
         * @param {*} valor
         * @returns {boolean}
         */
        es_destino_de_agente(valor) {
            return typeof valor === 'string' && valor.indexOf('agente:') === 0
        },

        /**
         * Interpreta la impresora guardada y dice por donde hay que mandar el ticket.
         *
         * El valor guardado viene con prefijo: "agente:<id>:<nombre>" o "qz:<nombre>".
         *
         * 🔴 Un valor SIN prefijo se lee como QZ, y no es un caso raro: es exactamente lo que
         * tienen guardado todos los clientes de antes de esta version, en la cookie y en
         * users.impresora. Si esto devolviera null, el Ticket 2.0 dejaria de imprimir en cada
         * comercio que todavia no migro al agente.
         *
         * @param {string|null} valor
         * @returns {Object|null} {origen, print_agent_id, nombre}
         */
        parse_destino_de_impresion(valor) {
            if (!valor) {
                return null
            }

            if (valor.indexOf('agente:') === 0) {
                let partes = valor.split(':')

                if (partes.length < 3) {
                    return null
                }

                return {
                    origen: 'agente',
                    print_agent_id: Number(partes[1]),
                    // El nombre puede tener ":" adentro, asi que se rearma con lo que sobra.
                    nombre: partes.slice(2).join(':'),
                }
            }

            if (valor.indexOf('qz:') === 0) {
                return {
                    origen: 'qz',
                    print_agent_id: null,
                    nombre: valor.substring(3),
                }
            }

            return {
                origen: 'qz',
                print_agent_id: null,
                nombre: valor,
            }
        },

        /**
         * Pasa el ticket armado a los bytes que espera la impresora, en base64.
         *
         * Cada caracter se baja a un byte quedandose con los 8 bits de abajo, que es exactamente
         * lo que hace QZ con `encoding: ISO-8859-1`. Si se mandara el texto tal cual, los
         * comandos ESC/POS (que son caracteres de control) no sobrevivirian al viaje por JSON.
         *
         * @param {Array<string>} partes
         * @returns {string}
         */
        contenido_a_base64(partes) {
            let texto = partes.join('')
            let binario = ''

            for (let i = 0; i < texto.length; i++) {
                let codigo = texto.charCodeAt(i)

                /*
                 * 🔴 Todo lo que no entra en ISO-8859-1 se reemplaza por "?" (0x3F), que es
                 * exactamente lo que hace QZ. NO alcanza con enmascarar con & 0xFF: quedarse con
                 * el byte de abajo convierte caracteres inocentes en COMANDOS ESC/POS.
                 *
                 * El caso real: las comillas tipograficas que llegan al pegar un nombre de
                 * articulo desde Word o WhatsApp. U+201C y U+201D dan 0x1C y 0x1D, que son FS y
                 * GS -- los dos introductores de comando del protocolo. El ticket sale corrido o
                 * con basura de ahi en adelante, y solo por este camino: con QZ el mismo articulo
                 * imprime con signos de pregunta y se ve feo, pero se lee.
                 */
                binario += String.fromCharCode(codigo > 0xFF ? 0x3F : codigo)
            }

            return btoa(binario)
        },

        /**
         * Encola el ticket en el agente de impresion del equipo elegido.
         *
         * @param {Object} destino {print_agent_id, nombre}
         * @returns {Promise<boolean>}
         */
        imprimir_por_agente(destino) {
            let self = this

            return self.$api.post('print-jobs', {
                print_agent_id: destino.print_agent_id,
                printer_name: destino.nombre,
                payload_base64: self.contenido_a_base64(self.content),
            })
            .then(function () {
                return true
            })
            .catch(function (error) {
                console.error('No se pudo mandar el ticket al agente de impresion:', error)

                /*
                 * El backend contesta 409 con el motivo cuando el equipo no esta conectado, que
                 * es el caso frecuente: la PC de la caja apagada. Se muestra ese texto porque
                 * dice cual equipo, y no un mensaje generico.
                 */
                let data = error && error.response && error.response.data

                if (data && data.error) {
                    self.$toast.error(data.error)
                } else {
                    self.$toast.error('No se pudo mandar el ticket a "' + destino.nombre + '".')
                }

                return false
            })
        },

        /**
         * Imprime el Ticket 2.0 de una venta.
         *
         * Cada salida por error avisa al operador. Antes todas terminaban en un
         * console.error que nadie mira: se apretaba imprimir y no pasaba nada, que es
         * el sintoma que el manual documenta como el que mas confunde.
         *
         * @param {Object} sale_to_print
         * @returns {Promise<boolean>} true si el trabajo se envio a la impresora.
         */
        printTicket(sale_to_print) {
            let self = this

            self.sale_to_print = sale_to_print

            let destino = self.destino_de_impresion

            if (!destino) {
                // Sin nombrar donde esta el engranaje: este mixin tambien se usa desde el
                // boton de la factura ARCA del listado, donde no hay dropdown de impresion.
                self.$toast.error('No hay ninguna impresora configurada para el Ticket 2.0. Configurala desde el menu Imprimir de una venta.')
                return Promise.resolve(false)
            }

            /*
             * Camino nuevo: el ticket se encola y lo levanta el agente instalado en esa PC. No
             * necesita QZ abierto, no muestra ningun cartel de permiso, y ni siquiera hace falta
             * estar en la maquina que tiene la impresora.
             */
            if (destino.origen === 'agente') {
                return self.set_ticket_content()
                .then(function () {
                    return self.imprimir_por_agente(destino)
                })
                .catch(function (error) {
                    console.error('Error al armar el ticket:', error)
                    self.$toast.error('No se pudo armar el ticket.')
                    return false
                })
            }

            return self.conectar_qz()
            .then(function (conectado) {
                if (!conectado) {
                    self.$toast.error(self.mensaje_qz_no_disponible())
                    return false
                }

                return self.set_ticket_content()
                .then(function () {
                    // destino.nombre y no self.impresora: el valor guardado puede venir con el
                    // prefijo "qz:", y QZ necesita el nombre pelado de la impresora en Windows.
                    let config = self.qz.configs.create(destino.nombre, {
                        encoding: "ISO-8859-1", // para imprimir qr
                        copies: 1,
                        forceRaw: true,
                    })

                    return self.qz.print(config, self.content)
                })
                .then(function () {
                    return true
                })
            })
            .catch(function (error) {
                console.error('Error al imprimir el ticket:', error)
                self.$toast.error('No se pudo imprimir en "' + destino.nombre + '". Fijate que este encendida, con papel, y que siga siendo la impresora elegida.')
                return false
            })
        },

        /**
         * Imprime un ticket corto de prueba en la impresora indicada.
         *
         * Cierra el lazo en la misma pantalla de configuracion: el operador elige
         * impresora y ancho, y confirma ahi mismo que sale bien, sin tener que cargar
         * una venta de verdad para averiguarlo.
         *
         * @param {string} nombre_impresora
         * @param {number} ancho_mm
         * @returns {Promise<boolean>} true si el trabajo se envio a la impresora.
         */
        imprimir_ticket_de_prueba(valor_impresora, ancho_mm) {
            let self = this
            let destino = self.parse_destino_de_impresion(valor_impresora)

            if (!destino) {
                self.$toast.error('Elegí una impresora')
                return Promise.resolve(false)
            }

            let contenido = self.armar_ticket_de_prueba(destino.nombre, ancho_mm)

            // Por el agente el ticket de prueba viaja igual que uno real: se encola y lo levanta
            // el equipo. Asi la prueba verifica el camino completo y no uno de mentira.
            if (destino.origen === 'agente') {
                let content_original = self.content
                self.content = contenido

                return self.imprimir_por_agente(destino)
                .then(function (impreso) {
                    self.content = content_original
                    return impreso
                })
                .catch(function () {
                    self.content = content_original
                    return false
                })
            }

            return self.conectar_qz()
            .then(function (conectado) {
                if (!conectado) {
                    self.$toast.error(self.mensaje_qz_no_disponible())
                    return false
                }

                let config = self.qz.configs.create(destino.nombre, {
                    encoding: "ISO-8859-1",
                    copies: 1,
                    forceRaw: true,
                })

                return self.qz.print(config, contenido)
                .then(function () {
                    return true
                })
            })
            .catch(function (error) {
                console.error('Error en la impresion de prueba:', error)
                self.$toast.error('No se pudo imprimir en "' + destino.nombre + '". Fijate que este encendida y con papel.')
                return false
            })
        },

        /**
         * Arma el contenido del ticket de prueba.
         *
         * @param {string} nombre_impresora
         * @param {number} ancho_mm
         * @returns {Array<string>}
         */
        armar_ticket_de_prueba(nombre_impresora, ancho_mm) {
            // Misma cuenta que TICKET_WIDTH: 48 caracteres en 80mm de papel.
            let caracteres = Math.floor((ancho_mm * 48) / 80)
            let contenido = []

            contenido.push("\x1B\x74\x02")
            contenido.push("\n")
            contenido.push("\x1B\x45\x01") // Negrita ON
            contenido.push("PRUEBA DE IMPRESION\n")
            contenido.push("\x1B\x45\x00") // Negrita OFF
            // Sin salto de linea: la linea de guiones ocupa el ancho entero y la impresora
            // salta sola, igual que en linea() del ticket real.
            contenido.push("-".repeat(caracteres))
            contenido.push("Impresora: " + nombre_impresora + "\n")
            contenido.push("Ancho: " + ancho_mm + "mm (" + caracteres + " caracteres)\n")
            contenido.push("-".repeat(caracteres))
            contenido.push("Si los guiones entran justo en el\n")
            contenido.push("papel, el ancho esta bien.\n")
            contenido.push("\n\n\n\n")
            contenido.push("\x1D\x56\x00") // Corte de papel
            contenido.push("\n")

            return contenido
        },

        async getQRBase64(url) {
          const response = await fetch(url);
          const blob = await response.blob();
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result); // Esto da el base64
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        },

        async set_ticket_content() {
            this.content = [];

            // 2.5
            // let charWidth = 1; // Estimado, puede ajustarse según la impresora
            let charWidth = 1.2; // Estimado, puede ajustarse según la impresora
            // let charWidth = this.tamano_letra; // Estimado, puede ajustarse según la impresora

            this.reset_impresora()

            this.afip_information()

            this.info_negocio()

            this.info_venta()

            this.info_cliente()


            // Tabla
            this.table_articles()

            this.total()

            if (this.sale_to_print.afip_tickets.length) {
                await this.print_iva_pagado()
            } else {
                this.salto_linea()
                this.salto_linea()
            }

            console.log('asi quedo despues de agregar qr:')
            console.log(this.content)

            // this.content.push(this.centerText("Gracias por su compra"));
            // this.content.push("\n");
            // this.content.push("\x1D\x56\x41\x10"); // Corte de papel

            // this.limpiarTexto()

            this.cortar_papel()

            console.log('asi quedo despues de limpiar qr:')
            console.log(this.content)
        },

        letra_grande() {
            this.content.push("\x1D\x21\x11")
        },
        letra_normal() {
            this.content.push("\x1D\x21\x00")
        },

        salto_linea() {
            this.content.push("\n");
        },

        negrita_on() {
            this.content.push("\x1B\x45\x01"); // Negrita ON
        },
        negrita_off() {
            this.content.push("\x1B\x45\x00"); // Negrita OFF

        },

        info_negocio() {

            this.content.push(`\n`);
            this.content.push(`${this.owner.company_name}\n`);

        },

        reset_impresora() {
            // this.content.push("\x1B\x40"); // Reset impresora
            this.content.push("\x1B\x74\x02"); // Seleccionar codificación UTF-8 o Latin-1
            // this.content.push("\x1B\x74\x04");
        },

        info_venta() {
            // this.content.push("Venta Numero: "+this.sale_to_print.num, this.TICKET_WIDTH + "\n");
            this.content.push("Venta Numero: "+this.sale_to_print.num+"\n");
            this.content.push(this.date(this.sale_to_print.created_at)+' '+this.hour(this.sale_to_print.created_at) + "\n");
            this.linea()
        },

        limpiarTexto() {
            return this.content.map(linea => {
                // Si es un string que parece comando binario, lo dejamos igual
                if (typeof linea !== 'string' || /[\x00-\x1F]/.test(linea)) {
                    return linea;
                }

                return linea.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            });
        },

        linea() {
            let linea = "-".repeat(this.TICKET_WIDTH)
            this.content.push(linea);
            // this.content.push("-".repeat(this.TICKET_WIDTH) + "\n");
        },

        total() {

            this.linea()

            // this.letra_grande()
            this.negrita_on()
            this.content.push(`TOTAL A PAGAR: ${this.price(this.sale_to_print.total, false)}\n`);
            this.negrita_off()
            this.letra_normal()

            this.linea()
        },

        cortar_papel() {
            this.content.push("\n\n\n\n");
            this.content.push("\x1D\x56\x00");
            this.content.push("\n");
        },

        // Centra un texto en el ancho especificado
        centerText(text, width) {
            let padding = Math.max(0, Math.floor((width - text.length) / 2));
            return " ".repeat(padding) + text + " ".repeat(padding);
        },

        // Alinea texto a la derecha dentro del ancho
        rightAlign(text, width) {
            return text.padStart(width, " ");
        },

        // Formatea columnas con anchos específicos
        formatColumns(values, widths) {
            let result = "";

            values.forEach((val, i) => {
                let width = Math.floor(widths[i]);
                val = val.toString();

                // Alineamos a la izquierda (nombre) o a la derecha (precio y total)
                if (i === 0) {
                    result += val.padEnd(width);
                } else {
                    result += val.padStart(width);
                }
            });

            return result;
        },

        wrapText(text, maxLength) {
          let words = text.split(" ");
          let lines = [];
          let currentLine = "";

          words.forEach((word) => {
            if ((currentLine + word).length > maxLength) {
              lines.push(currentLine.trim());
              currentLine = word + " ";
            } else {
              currentLine += word + " ";
            }
          });

          if (currentLine.trim().length > 0) {
            lines.push(currentLine.trim());
          }

          return lines;
        },
    },
};
