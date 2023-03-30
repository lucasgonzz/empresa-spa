<template>
	<div
	class="colors"
	v-if="getBorderColorProperty(model_name)">
		<div
		v-for="_model in modelsStoreFromName(modelNameFromRelationKey(getBorderColorProperty(model_name)))"
		v-if="_model.color"
		class="colors s-1"
		horizontal>
			<div class="cont-color">
				<div 
				:style="'background-color: '+_model.color.code+''"
				class="color" />
				{{ _model.name }}
			</div>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	}
}
</script>
<style lang="sass">
.colors 
	display: flex
	.cont-color 
		background: #FFF
		display: flex
		align-items: center
		padding: 10px 
	.color
		margin-right: 10px
		width: 25px
		height: 25px
		border-radius: 5px
</style>