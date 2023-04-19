<template>
	<b-row>
		<b-col
		class="m-lg-b-50"
		cols="12"
		xl="9">
			<nav-component></nav-component>
		</b-col>
		<b-col
		cols="12"
		lg="7"
		xl="5">
			<left-video></left-video>
		</b-col>
		<b-col
		cols="12"
		lg="5"
		xl="4">
			<right-form></right-form>
		</b-col>
	</b-row>
</template>
<script>
export default {
	components: {
		NavComponent: () => import('@/components/home/components/Nav'),
		LeftVideo: () => import('@/components/home/components/LeftVideo'),
		RightForm: () => import('@/components/home/components/RightForm'),
	}
}
</script>