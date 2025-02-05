export default {
	methods: {

		limpiar_item() {

			this.limpiar_codigo()

			this.limpiar_nombre()

			this.$store.commit('vender/setItem', null)

			if (this.owner.ask_amount_in_vender) {
				
				setTimeout(() => {

					this.limpiar_amount()
				}, 10)
			}

		},
		limpiar_codigo() {

			if (!this.hasExtencion('no_usar_codigos_de_barra')) {
				
				let bar_code = document.getElementById('article-bar-code')

				if (bar_code) {

					bar_code.value = ''
					bar_code.focus()

				} else {
					setTimeout(() => {
						this.limpiar_codigo()
					}, 500)
				}
			}

		}, 
		limpiar_nombre() {

			let search_name = document.getElementById('search-article')

			if (search_name) {

				search_name.value = ''


				if (this.hasExtencion('no_usar_codigos_de_barra')) {
					search_name.focus()
				}

			} else {
				setTimeout(() => {
					this.limpiar_nombre()
				}, 500)
			}

		},
		limpiar_amount() {

			let input_amount = document.getElementById('article-amount')

			if (input_amount) {

				input_amount.value = ''



			} else {
				setTimeout(() => {
					this.limpiar_amount()
				}, 500)
			}

		},
	}
}