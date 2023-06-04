import axios from 'axios'

export default class ArticleVariants {

	constructor(article, properties) {
		this.article = article
		this.properties = properties
		this.properties_positions = {}
		this.property_position_iterando = null
		this.last_position = null
		this.finish = false
		this.variants = []
		this.setPropertiesPositions()
	}

	setPropertiesPositions() {
		console.log('setPropertiesPositions')
		console.log(this.properties)
		for (var i = 0; i < this.properties.length; i++) {
			this.properties_positions[i] = 0
		}
		this.last_position = this.properties.length - 1
		if (this.properties.length > 1) {
			this.property_position_iterando = this.properties.length - 2
		} else {
			this.property_position_iterando = 0
		}
	}

	getArticleVariants() {
		while (!this.finish) {
			this.setNewVariant()
		}
		return this.variants 
	}

	setNewVariant() {
		let new_variant = {
			article_property_values: [],	
		}
		for (var i = 0; i < this.properties.length; i++) {
			new_variant.article_property_values.push(this.properties[i].article_property_values[this.properties_positions[i]])
		}
		this.setVariantProperties(new_variant)
		this.variants.push(new_variant)
		// console.log('se agrego la vatiante ')
		// new_variant.article_properties.forEach(p => {
		// 	console.log(p.name)
		// })


		if (this.terminoLaUltima()) {
			this.properties_positions[this.last_position] = 0
			console.log('Llego al final de la ultima, esta se puso en '+this.properties_positions[this.last_position])
			if (this.esLaUltimaDeIterando() || this.properties.length == 1) {
				if (this.property_position_iterando == 0) {
					this.finish = true 
					console.log('Iterando estaba en 0, termino')
				} else {
					this.properties_positions[this.property_position_iterando] = 0
					console.log('Es la ultima posicion en iterando, esta se puso en '+this.properties_positions[this.property_position_iterando])
					this.property_position_iterando--
				}
			} 
			this.properties_positions[this.property_position_iterando]++
			console.log('Se esta iterando la posicion '+this.property_position_iterando+' con la posicion en '+this.properties_positions[this.property_position_iterando])
		} else {
			this.properties_positions[this.last_position]++
			console.log('Se aumento la posicion de la ultima a '+this.properties_positions[this.last_position])
		}
	}

	isLastValueInIterando() {
		return this.properties_positions[this.property_position_iterando] == this.properties[this.property_position_iterando].article_property_values.length - 1
	}

	terminoLaUltima() {
		return this.properties_positions[this.last_position] == this.properties[this.last_position].article_property_values.length - 1
	}

	esLaUltimaDeIterando() {
		return this.properties_positions[this.property_position_iterando] == this.properties[this.property_position_iterando].article_property_values.length - 1
	}

	setVariantProperties(variant) {
		let variant_description = ''
		variant.article_property_values.forEach(article_property_value => {
			variant_description += article_property_value.name+' '
		})
		variant.variant_description = variant_description 

		variant.article_id = this.article.id 
		variant.price = this.article.final_price 
		if (this.article.images.length) {
			variant.image_url = this.article.images[0].hosting_url
		} else {
			variant.image_url = null
		}

	}

}