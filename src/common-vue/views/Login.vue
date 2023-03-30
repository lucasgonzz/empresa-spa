<template>
	<b-row
	class="all-center b-w">
		<b-col
		cols="12"
		md="6"
		lg="5"
		xl="4">
			<div  
			class="b-w">
				<login-form></login-form>
			</div>
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