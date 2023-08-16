<template>
	<b-row
	class="all-center">
		<b-col
		cols="12"
		md="6"
		lg="5"
		xl="4">
			<login-form></login-form>
		</b-col>
	</b-row>
</template>
<script>
import LoginForm from '@/common-vue/components/login/LoginForm'
export default {
	components: {
		LoginForm
	},
}
</script>