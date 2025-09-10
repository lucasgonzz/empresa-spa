export default class ArticleVariants {

    constructor(article, properties) {
        this.article = article
        this.properties = properties
        this.variants = []
    }

    getArticleVariants() {
        // Filtramos solo las propiedades que tengan valores
        const valid_properties = this.properties.filter(p => 
            p.article_property_values && p.article_property_values.length > 0
        )

        const value_lists = valid_properties.map(p => p.article_property_values)

        if (!value_lists.length) {
            return []
        }

        const combinations = this.cartesianProduct(value_lists)

        return combinations.map(combo => this.createVariant(combo))
    }

    createVariant(combo) {
        const description = combo.map(val => val.name).join(' ')

        return {
            article_id: this.article.id,
            price: this.article.final_price,
            image_url: this.article.images?.[0]?.hosting_url || null,
            article_property_values: combo,
            variant_description: description
        }
    }

    cartesianProduct(arrays) {
        return arrays.reduce((a, b) =>
            a.flatMap(d => b.map(e => [...d, e])), [[]])
    }
}
