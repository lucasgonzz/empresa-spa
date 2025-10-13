<template>
	<b-modal
	hide-footer
	title="Ubicaciones"
	id="article-ubications">
		
		<div
		v-if="article.addresses.length">
			
			<div
			v-for="address in article.addresses">
				
				<ubication
				v-for="ubication in get_ubications_from_address(address)"
				:ubication="ubication"></ubication>	
			</div>

		</div>
		<div
		v-else>
			<ubication
			v-for="ubication in article.article_ubications"
			:ubication="ubication"></ubication>	
		</div>
	</b-modal>
</template>
<script>
export default {
	methods: {
		get_ubications_from_address(address) {
			return this.article.article_ubications.filter(ubication => ubication.address_id == address.id)
		}
	}
}
</script>