export default {
    computed: {
    },
    methods: {

        afip_information() {
            if (this.sale_to_print.afip_tickets.length) {

                this.condicion_iva()

                this.cuit()

                this.razon_social()

                this.tipo_comprobante()

                this.numero_comprobante()

                this.punto_venta()

                this.cae()

                this.vto_cae()

                this.condicion_iva_cliente()

                this.linea()
            }
        },

        condicion_iva() {
            this.content.push(`${this.sale.afip_information.iva_condition.name}\n`);
        },

        cuit() {
            this.content.push(`CUIT: ${this.sale.afip_information.cuit}\n`);
        },

        tipo_comprobante() {
            this.negrita_on()
            this.content.push(`FACTURA ${this.sale_to_print.afip_tickets[0].cbte_letra}\n`);
            this.negrita_off()
        },

        numero_comprobante() {
            this.content.push(`Numero Factura: ${this.sale_to_print.afip_tickets[0].cbte_numero}\n`);
        },

        punto_venta() {
            this.content.push(`Pto Venta: ${this.sale_to_print.afip_information.punto_venta}\n`);
        },

        cae() {
            this.content.push(`CAE: ${this.sale_to_print.afip_tickets[0].cae}\n`);
        },

        vto_cae() {
            let vto = this.sale_to_print.afip_tickets[0].cae_expired_at
            vto = vto.substring(0, 11)

            this.content.push(`Vto: ${vto}\n`);
        },

        razon_social() {
            this.content.push(`${this.sale.afip_information.razon_social}\n`);
        },

        condicion_iva_cliente() {
            let iva = 'Consumidor final'
            
            if (this.sale_to_print.afip_tickets[0].iva_cliente && this.sale_to_print.afip_tickets[0].iva_cliente != '') {
                iva = this.sale_to_print.afip_tickets[0].iva_cliente
            }

            this.content.push(`Iva Cliente: ${iva}\n`);
        },
    },
};
