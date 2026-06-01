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

		<dropdown-section-title
		title="Página Web"
		icon="icon-network"></dropdown-section-title>

		<dropdown-option-item
		icon="icon-share"
		@click="generateLink">
			Seleccion especial para la WEB
		</dropdown-option-item>
	</div>
</template>
<script>
import alert_filtrados from '@/mixins/listado/alert_filtrados'
export default {
	components: {
		DropdownSectionTitle: () => import('@/components/listado/components/selected-filtered-options/DropdownSectionTitle'),
		DropdownOptionItem: () => import('@/components/listado/components/selected-filtered-options/DropdownOptionItem'),
	},
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
</style>
