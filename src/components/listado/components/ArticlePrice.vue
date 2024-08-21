<template>
	<div>
		<span
		v-if="is_local">
			{{ price(article.price) }}
		</span>
		<span
		v-else>
			{{ price(redondear(article.price)) }}
		</span>
	</div>
</template>
<script>
export default {
	props: {
		article: Object,
	},
}
</script>