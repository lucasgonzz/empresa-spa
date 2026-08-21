export default {
    methods: {

        table_articles() {

            this.tabla_header()
            
            this.linea()   

            this.articulos()

            this.combos()
     
        },
        combos() {
            this.sale.combos.forEach(combo => {
                
                // Solo la cantidad del nombre. El ancho de las columnas se calcula con
                // TICKET_WIDTH y los padStart de abajo, que quedan intactos: wrapText ya corta
                // este texto a la mitad del ancho, asi que cambiarle el largo no descuadra nada.
                let text_name = combo.name + ' ('+this.numero_es(combo.pivot.amount)+')'
                let name = this.wrapText(text_name, Math.floor(this.TICKET_WIDTH * 0.5)); // Nombre ocupa la mitad
                
                let price = combo.pivot.price.padStart(Math.floor(this.TICKET_WIDTH * 0.25), " ");
                price = this.price(price, false)

                let total_ = (Number(combo.pivot.price) * Number(combo.pivot.amount)).toFixed(2);
                let total = total_.padStart(Math.floor(this.TICKET_WIDTH * 0.25), " ");
                total = this.price(total, false)

                name.forEach((line, index) => {
                    if (index === 0) {
                        this.content.push(this.formatColumns([line, price, total], [this.TICKET_WIDTH * 0.5, this.TICKET_WIDTH * 0.25, this.TICKET_WIDTH * 0.25]) + "\n");
                    } else {
                        this.content.push(line.padEnd(this.TICKET_WIDTH) + "\n");
                    }
                });

                this.linea()
            })
        },
        articulos() {

            this.sale_to_print.articles.forEach((article) => {
                // Idem combos(): solo la cantidad del nombre, nunca los padStart de las columnas.
                let text_name = article.name + ' ('+this.numero_es(article.pivot.amount)+')'
                let name = this.wrapText(text_name, Math.floor(this.TICKET_WIDTH * 0.5)); // Nombre ocupa la mitad
                
                let price = article.pivot.price.padStart(Math.floor(this.TICKET_WIDTH * 0.25), " ");
                price = this.price(price, false)

                let total_ = (Number(article.pivot.price) * Number(article.pivot.amount)).toFixed(2);
                let total = total_.padStart(Math.floor(this.TICKET_WIDTH * 0.25), " ");
                total = this.price(total, false)

                name.forEach((line, index) => {
                    if (index === 0) {
                        this.content.push(this.formatColumns([line, price, total], [this.TICKET_WIDTH * 0.5, this.TICKET_WIDTH * 0.25, this.TICKET_WIDTH * 0.25]) + "\n");
                    } else {
                        this.content.push(line.padEnd(this.TICKET_WIDTH) + "\n");
                    }
                });

                this.linea()
            });    
        },
        tabla_header() {

            let header = this.formatColumns(["NOMBRE", "PRECIO", "TOTAL"], [this.TICKET_WIDTH * 0.5, this.TICKET_WIDTH * 0.25, this.TICKET_WIDTH * 0.25]);
            this.content.push(header + "\n");
        },

    },
};
