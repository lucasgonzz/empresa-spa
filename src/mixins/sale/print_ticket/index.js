// import qz from "qz-tray";
import afip_information from '@/mixins/sale/print_ticket/afip_information'
import afip_qr_iva from '@/mixins/sale/print_ticket/afip_qr_iva'
import conectar_impresora from '@/mixins/sale/print_ticket/conectar_impresora'
import table_articles from '@/mixins/sale/print_ticket/table_articles'
import info_cliente from '@/mixins/sale/print_ticket/info_cliente'
export default {
    mixins: [afip_information, afip_qr_iva, conectar_impresora, table_articles, info_cliente],
    data() {
        return {
            qz: null,
            content: [],
            sale_to_print: null,
        }
    },
    computed: {
        impresora() {
            if (this.user.impresora) {
                return this.user.impresora
            }
            return this.owner.impresora
        },
        ancho_impresora() {
            let ancho = this.$cookies.get('ancho_impresora')
            
            if (ancho != 'null') {
                return Number(ancho)
            }

            return this.owner.sale_ticket_width
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
        async printTicket(sale_to_print) {
            try {

                this.sale_to_print = sale_to_print  

                await this.conectar_qz()

                console.log('ya se conecto')

                await this.set_ticket_content();

                let config = this.qz.configs.create(this.impresora, {
                // let config = this.qz.configs.create("XP-80", {
                  encoding: "ISO-8859-1", // para imprimir qr
                  // encoding: "CP437", 
                  copies: 1,
                  forceRaw: true,
                });

                await this.qz.print(config, this.content);

                console.log("Ticket enviado a la impresora");
            } catch (error) {
                console.error("Error al imprimir el ticket:", error);
            }
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

            if (this.sale_to_print.afip_ticket) {
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
