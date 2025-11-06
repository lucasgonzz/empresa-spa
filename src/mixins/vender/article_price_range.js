export default {
	computed: {
		items() {
			return this.$store.state.vender.items
		},
	},
	data() {
		return {
			otros_articulos_relacionados: [],
		}
	},
	methods: {
		
		check_price_range(item) {

			console.log('check_price_range')
			console.log(item.is_article)
			console.log(item.article_price_ranges)
			
			if (item.is_article) {

				if (
					item.article_price_ranges
					&& item.article_price_ranges.length
				) {

					console.log('check_price_range entro con '+item.name)

					let amount = Number(item.amount)

					// Filtrar los rangos válidos según el modo
				    const validRanges = item.article_price_ranges.filter(range => {
				        if (range.modo === "Mayor o igual") {
				            return amount >= Number(range.amount);
				        }
				        if (range.modo === "Igual") {
				        	console.log('Comparando '+amount+' con '+Number(range.amount))
				            return amount === Number(range.amount);
				        }
				        return false; // Por seguridad si viene un modo desconocido
				    });


				    if (validRanges.length === 0) {
				    	item.price_vender_personalizado = null
				    	item.price_vender = item.final_price
				    	return item
				    }

				    // Elegir el que tiene mayor amount
				    let range = validRanges.reduce((prev, curr) => 
				        Number(curr.amount) > Number(prev.amount) ? curr : prev
				    );

				    console.log('range price: ')
				    console.log(range.price)

				    item.price_vender_personalizado = Number(range.price) 
				}
			}

			return item 
		},
	}
}