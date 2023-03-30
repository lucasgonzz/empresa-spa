<template>
	<b-form-row
	v-if="has_online">
		<b-col>
			<b-form-group
			class="m-b-15">
				<b-form-checkbox
				v-model="article.add_photo">
					Agregar foto
				</b-form-checkbox>
			</b-form-group>
		</b-col>
	</b-form-row>
</template>
<script>
export default {
	props: ['article'],
}
</script>
<style lang="sass">
.tag 
	color: #FFF
	border-radius: 50px
	padding: .3em 1em
	margin: 0 .5em
	.btn-remove
		padding-left: .5em
		cursor: pointer
</style>
