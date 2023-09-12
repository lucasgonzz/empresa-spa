<template>
	<div 
	@click="$scrollToTop()"
	:class="scroll_bottom ? 'show-btn' : ''"
	class="btn-top c-p">
		<i class="icon-top"></i>
		<i class="icon-up"></i>
	</div>
</template>
<script>
export default {
	data() {
		return {
			scroll: 0,
			scroll_bottom: false,
		}
	},
	created() {
		window.addEventListener('scroll', () => {
			if (this.scroll < window.scrollY) {
				if (window.scrollY >= 200) {
					this.scroll_bottom = true
				}
			} else {
				this.scroll_bottom = false
			} 
			this.scroll = window.scrollY
		})
	},
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.btn-top
	transform: translateX(60px)
	position: fixed
	right: 0px
	bottom: 20px
	background: $blue
	width: 60px
	height: 60px
	z-index: 1000
	display: flex 
	align-items: center 
	justify-content: center
	border-radius: 50%
	transition: all .2s
	i
		font-size: 30px
		color: #FFF
.show-btn
	transform: translateX(-80px)
</style>