<template>
	<div
	v-if="loading"
	class="container-logo animate__animated animate">
        <img class="logo" src="@/assets/logo.png" alt="">
        
        <b-spinner 
        v-if="!there_is_update"
        variant="primary"></b-spinner>
		<b-progress 
		v-else
		variant="primary" :value="progress" :max="100" show-progress animated></b-progress>

        <p
        v-if="message != ''"
        class="text-loader text-primary">{{ message }}</p>
	</div>
</template>
<script>
import update_app from '@/common-vue/mixins/update_app'
export default {
	name: 'LogoLoading',
	mixins: [update_app],
	computed: {
		loading() {
			return this.$store.state.auth.loading
		},
		message() {
			return this.$store.state.auth.message
		}
	}
}
</script>
<style scoped lang="sass">
@import '@/sass/_custom.scss'
.container-logo
	position: fixed
	width: 100vw
	height: 100vh
	z-index: 10000
	display: flex
	flex-direction: column
	justify-content: center
	align-items: center
	background: #FFF
	@if ($theme == 'dark') 
		background: #333

	.logo
		margin-bottom: 10px
		z-index: 100
		width: 120px
	.spinner-border
		width: 20px
		height: 20px
	.progress 
		width: 200px
	.text-loader
		font-weight: bold
		font-size: 1.1em
		margin-top: 10px
</style>