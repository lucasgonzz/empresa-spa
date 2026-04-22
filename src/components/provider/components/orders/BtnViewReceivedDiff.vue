<template>
	<b-button
	v-if="has_received"
	class="m-l-15"
	size="sm"
	variant="outline-info"
	@click.stop="viewDiff">
		<i class="icon-eye"></i>
		Dif
	</b-button>
</template>
<script>
export default {
	props: {
		model: {
			type: Object,
			required: true,
		},
	},
	computed: {
		has_received() {
			if (!this.model.articles) return false
			return this.model.articles.some(article => article.pivot && article.pivot.received > 0)
		},
	},
	methods: {
		viewDiff() {
			const diff = (this.model.articles || []).map(article => {
				const pedida   = article.pivot ? Number(article.pivot.amount)   : 0
				const recibida = article.pivot ? Number(article.pivot.received) : 0
				const d        = recibida - pedida

				let status
				if (recibida === pedida)  status = 'completo'
				else if (recibida === 0)  status = 'no_recibido'
				else if (recibida > pedida) status = 'exceso'
				else                      status = 'parcial'

				return {
					id:       article.id,
					name:     article.name,
					pedida,
					recibida,
					diff:     d,
					status,
				}
			})

			this.$store.commit('provider_order/setImportDiff', diff)
			this.$bvModal.show('import-diff-provider-order')
		},
	},
}
</script>
