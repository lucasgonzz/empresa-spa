<template>
	<div
	v-if="owner.online">
		<b-modal
		hide-footer
		title="Link para el cliente"
		id="copy-seleccion-especial-link">
			<p>Copia y pasale el siguiente link a tu cliente para que pueda ver la seleccion de articulos que armaste para el.</p>

			<p
			class="link-copy">
				{{ link }}
			</p>
		</b-modal>
		<b-dropdown-divider></b-dropdown-divider>
		<b-dropdown-text>
			Pagina Web
		</b-dropdown-text>

		<b-dropdown-item
		@click="generateLink">
			<i class="icon-share"></i>
			Seleccion especial para la WEB
		</b-dropdown-item>
	</div>
</template>
<script>
import alert_filtrados from '@/mixins/listado/alert_filtrados'
export default {
	mixins: [alert_filtrados],
	computed: {
		selected() {
			return this.$store.state.article.selected 
		},
		filtered() {
			return this.$store.state.article.filtered 
		},
	},
	data() {
		return {
			link: '',
		}
	},
	methods: {
		generateLink() {
			let ids = []
			let articles
			if (this.selected.length) {
				articles = this.selected
			} else if (this.filtered.length) {
				this.alert_filtrados()
				articles = this.filtered
			}
			articles.forEach(article => {
				ids.push(article.id)
			})

			this.link = this.owner.online+'/seleccion-especial/'+ids.join('-')

			this.$bvModal.show('copy-seleccion-especial-link')

			// if (navigator.clipboard && navigator.clipboard.writeText) {
			
			// 	navigator.clipboard.writeText(link)
			// 	.then(function() {
			// 		this.$toast.success('Texto copiado al portapapeles');
			// 	})
			// 	.catch(function(err) {
			// 		this.$toast.error('Error al copiar al portapapeles: ', err);
			// 	});
			// } else {
			// 	console.error('El API de clipboard no está disponible en este navegador.');
			// }

		}
	}
}
</script>
<style lang="sass">
.link-copy
	background: rgba(0,0,0,.3)
	padding: 7px
	border-radius: 8px
	border: 1px solid rgba(0, 0, 0, .5)
	// color: rgba(255,255,255,.7)
</style>