<template>
	<b-form-row
	v-if="has_online">
		<b-col>
			<p
			class="c-p"
			@click="show ? show = false : show = true">
				Talles
				<icon-show
				:show="show"></icon-show>
			</p>
			<div 
			v-show="show"
			class="sizes">
				<b-form-checkbox
				v-for="size in sizes"
				:key="size.id"
				:id="'size-'+size.id"
				v-model="article.sizes_id"
				:value="size.id">
					{{ size.value }}
				</b-form-checkbox>
			</div>
		</b-col>
	</b-form-row>
</template>
<script>
import IconShow from '@/components/common/IconShow'
export default {
	props: ['article'],
	components: {
		IconShow,
	},
	computed: {
		sizes() {
			return this.$store.state.sizes.sizes
		}
	},
	data() {
		return {
			show: false
		}
	}
}
</script>
<style lang="sass">
.sizes 
	display: flex
	flex-direction: row
	justify-content: flex-start
	flex-wrap: wrap
	.custom-control
		display: inline-block
		margin-right: 20px
		margin-bottom: 10px
</style>