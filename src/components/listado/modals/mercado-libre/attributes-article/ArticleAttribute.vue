<template>
	<div class="s-2 attribute">
			
		<h5>
			{{ article_meli_attribute.meli_attribute.name }}:
			<strong
			v-if="article_meli_attribute.meli_attribute_value">
				{{ article_meli_attribute.meli_attribute_value.meli_name }}
			</strong>
			<strong
			v-else-if="article_meli_attribute.value_name">
				{{ article_meli_attribute.value_name }}
			</strong>
			<strong
			v-else-if="article_meli_attribute.value_id">
				{{ article_meli_attribute.value_id }}
			</strong>
		</h5>
	</div>
</template>
<script>
export default {
	props: {
		article_meli_attribute: Object,
	}
}
</script>