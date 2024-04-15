<template>
	<div>
		<img 
		v-if="article.images.length"
		:src="article.images[0].hosting_url">
	</div>
</template>
<script>
export default {
	props: {
		article: Object,
	},
}
</script>