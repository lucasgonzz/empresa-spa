<template>
	<b-col  
	md="6">
		<b-form-group
		label="Categoria">
			<b-form-select
			id="article-category"
			v-model="article.category_id"
			:options="getOptions({key: 'category_id', text: 'Categoria'})"></b-form-select>
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
