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
		
		check_price_type_ranges(item) {

			let price_type_id = this.get_price_type_range(item)

			if (price_type_id) {

				item.price_type_personalizado_id = price_type_id
			}

			return item 
		},
		get_price_type_range(item) {

			
			let amount = Number(item.amount) 

			amount = this.check_article_price_type_group(item, amount)

			console.log('articulo: '+item.name)
			console.log('amount para vender: '+amount)

		    const { category_id, sub_category_id } = item;

		    // Filtrar rangos que coincidan con la categoría o subcategoría del artículo
		    
		    let price_ranges = this.$store.state.category_price_type_range.models  

		    console.log('rangos para filtrar:')
		    console.log(price_ranges)

		    console.log('category_id: '+category_id)
		    console.log('sub_category_id: '+sub_category_id)

		    let matching_ranges = price_ranges.filter(range => {
		        return (
		            (
		            	range.category_id === category_id || 
		            	(
		            		sub_category_id
							&& range.sub_category_id
		            		&& range.sub_category_id === sub_category_id
		            	)
		            )
		            && range.min
		            && range.min <= amount 
		            && (range.max === null || range.max >= amount)
		        );
		    });

		    console.log('coincide con estos rangos:')
		    console.log(matching_ranges)


		    // Si hay coincidencias, tomar el rango más específico
		    if (matching_ranges.length > 0) {

		        // Ordenar por prioridad: subcategoría primero, luego categoría
		        matching_ranges.sort((a, b) => {
		            if (a.sub_category_id && !b.sub_category_id) {
		                return -1; // Prioridad a la subcategoría
		            }
		            if (!a.sub_category_id && b.sub_category_id) {
		                return 1;
		            }
		            return b.minQuantity - a.minQuantity; // Ordenar por minQuantity descendente
		        });

		        matching_ranges = matching_ranges.filter(range => {
		        	if (range.sub_category_id) {
		        		return range.sub_category_id == item.sub_category_id
		        	}
		        	return true
		        })

		        let selectedPriceTypeId = matching_ranges[0].price_type_id


		        this.otros_articulos_relacionados.forEach(relatedItem => {
                    relatedItem.price_type_personalizado_id = selectedPriceTypeId;
                });

                console.log('se va a usar este rango:')
                console.log(matching_ranges[0])

		        return selectedPriceTypeId
		    }

		    // Si no hay coincidencias, retornar null o un valor por defecto
		    return null;
		},

		check_article_price_type_group(item, amount) {


			// Verificar si el artículo pertenece a un grupo
            const articleGroups = this.$store.state.article_price_type_group.models;

            const group = articleGroups.find(group =>
                group.articles.some(article => article.id === item.id)
            );

            this.otros_articulos_relacionados = []

            if (group) {


                // Si el artículo pertenece a un grupo, combinar las cantidades
                group.articles.forEach(groupArticle => {
                    const article_vendiendose = this.items.find(saleItem => saleItem.id === groupArticle.id);
                    if (article_vendiendose) {

                    	if (article_vendiendose.id != item.id) {
                    		
	                        amount += Number(article_vendiendose.amount); // Sumar cantidades
	                        this.otros_articulos_relacionados.push(article_vendiendose);
                    	}
                    }
                });

            }
            return amount 
		}
	}
}