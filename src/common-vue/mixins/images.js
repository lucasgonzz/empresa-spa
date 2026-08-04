	export default {
	methods: {
		isImageProp(prop) {
			return prop.type == 'image' || prop.type == 'images'
		},
		hasImage(props) {
			let images = props.filter(prop => {
				return prop.type == 'image' || prop.type == 'images'
			})
			return images.length 
		},
		/**
		 * Lista de URLs de imagen para una celda de tabla (una o varias).
		 *
		 * @param {Object} model - Fila del modelo.
		 * @param {Object} prop - Definición de columna (`image` o `images`).
		 * @returns {Array<string>} URLs válidas en orden de visualización.
		 */
		imageUrlsList(model, prop) {
			let urls = []
			if (prop.type == 'image') {
				let single_url = model[prop.key]
				if (single_url) {
					urls.push(single_url)
				}
			} else if (prop.type == 'images' && model[prop.key] && model[prop.key].length) {
				model[prop.key].forEach(function(image_item) {
					if (image_item && image_item.hosting_url) {
						urls.push(image_item.hosting_url)
					} else if (image_item) {
						// Imagen sin hosting_url: se deja rastro en consola en vez de fallar en silencio (ver Grupo 215 Prompt 03)
						console.warn('Imagen sin hosting_url', image_item.id)
					}
				})
			}
			return urls
		},
		/**
		 * Indica si la celda tiene al menos una imagen para mostrar.
		 *
		 * @param {Object} model
		 * @param {Object} prop
		 * @returns {Boolean}
		 */
		hasTableImages(model, prop) {
			return this.imageUrlsList(model, prop).length > 0
		},
		getImageUrl(props, model) {
			if (this.hasImage(props)) {
				let img_prop = props.find(prop => {
					return prop.type == 'image' || prop.type == 'images' 
				})
				let urls = this.imageUrlsList(model, img_prop)
				if (urls.length) {
					return urls[0]
				}
			}
			return null 
		},
		imageUrl(model, prop) {
			let urls = this.imageUrlsList(model, prop)
			if (urls.length) {
				return urls[0]
			}
			return null
		},
	},
}