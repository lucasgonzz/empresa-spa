<template>
	<div 
	class="display-nav"> 
		<div   
		:class="isSelected('cards')"
		@click="setDisplay('cards')"
		class="item apretable">
			<i class="icon-grid"></i>
		</div>
		<div 
		:class="isSelected('table')"
		@click="setDisplay('table')"
		class="item apretable">
			<i class="icon-list"></i>
		</div>
	</div>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	computed: {
		current_display() {
			return this.$store.state[this.model_name].display
		},
	},
	methods: {
		setDisplay(display) {
			this.$emit('setDisplay', display)
			if (this.current_display == display) {
				this.$store.dispatch(this.model_name+'/getModels')
			} else {
				this.$store.commit(this.model_name+'/setDisplay', display)
			}
		},
		isSelected(display) {
			if (this.current_display == display) {
				return 'selected-display'
			}
			return 'nooo'
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.display-nav 
	display: flex
	justify-content: flex-end
	// @media screen and (max-width: 576px)
	// 	width: 100%
		// margin-top: 15px
	.item 
		padding: 0 .5em
		font-size: 1.2em
		cursor: pointer
		@if ($theme == 'dark') 
			color: rgba(255, 255, 255, .9)
		@else 
			color: #333 
	[class^='icon-']:before
		margin-right: 0
	.selected-display
		i
			color: $blue
			border-bottom: 3px solid $blue
</style>