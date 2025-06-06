<template>
	<b-button
	v-if="owner.article_pdf_personalizado"
	class="m-l-10"
	@click="pdf"
	variant="success">
		<i class="icon-list"></i>
	</b-button>
</template>
<script>
export default {
	methods: {
		pdf() {
            var link = process.env.VUE_APP_API_URL+'/article/pdf-personalizado'
            window.open(link)
		}
	}
}
</script>