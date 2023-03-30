<template>
	<b-col 
	md="6">
		<b-form-group
		label="Subcategoria">
			<b-form-select
			id="article-sub-category"
			v-model="article.sub_category_id"
			:options="sub_categories_options(article)"></b-form-select>
		</b-form-group>
	</b-col>
</template>
<script>
import categories from '@/mixins/categories'
export default {
	name: 'Categories',
	props: ['article'],
	mixins: [categories],
}
</script>
