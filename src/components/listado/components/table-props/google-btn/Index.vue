<template>
	<div>
		<b-button
		size="sm"
		@click="search"
		variant="outline-primary"
		v-if="!article.images.length">
			<i class="icon-search"></i>
		</b-button>
		<img 
		v-else
		:src="article.images[0].hosting_url">
	</div>
</template>
<script>
export default {
	props: {
		article: Object,
	},
	methods: {
		search() {
			setTimeout(() => {
				this.$bvModal.show('search-image')
				setTimeout(() => {
					document.getElementById('search-image-input').focus()
				}, 200)
			}, 500)
		}
	}
}
</script>