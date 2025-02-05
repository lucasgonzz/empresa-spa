export default {
	methods: {
		check_amount_vacia(item) {
			if (item.amount == '') {
				item.amount = 1
			}
		}
	}
}