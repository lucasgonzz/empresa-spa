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
		getImageUrl(props, model) {
			if (this.hasImage(props)) {
				let img_prop = props.find(prop => {
					return prop.type == 'image' || prop.type == 'images' 
				})
				if (img_prop.type == 'image') {
					return model[img_prop.key] 
				} else if (img_prop.type == 'images' && model[img_prop.key].length) {
					return model[img_prop.key][0][this.image_url_prop_name]  
				}
			}
			return null 
		},
		imageUrl(model, prop) {
			if (prop.type == 'images') {
				if (model[prop.key].length) {
					return model[prop.key][0][this.image_url_prop_name]
				}
			} else if (prop.type == 'image') {
				return model[prop.key]
			}
			return null
		},
	},
}