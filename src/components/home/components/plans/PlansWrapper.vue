<template>
	<div
	class="p-15">

		<div 
		v-if="loading"
		class="all-center-md">
			<b-spinner
			variant="primary"></b-spinner>
		</div>
		<div
		v-else>
			<vue-horizontal-list 
			v-if="is_mobile"
			:items="plans" :options="options">
				<template v-slot:default="{ item }">
					<plan
					:plan="item"></plan>	
				</template>
			</vue-horizontal-list>


			<div
			class="plans-wrapper"
			v-if="!is_mobile">
				<div>
					<div
					class="feature-title"
					v-for="feature in plan_features">
						{{ feature.name }}
					</div>
				</div>
				<plan
				v-for="plan in plans"
				:plan="plan"></plan>	
			</div>
		</div>
		
	</div>
</template>
<script>
import plans from '@/mixins/plans'
export default {
	created() {
		this.$store.dispatch('plan/getModels')
		this.$store.dispatch('plan_feature/getModels')
		this.$store.dispatch('dolar/getDolar')
	},
	mixins: [plans], 
	components: {
		VueHorizontalList: () => import('vue-horizontal-list'),
		Plan: () => import('@/components/home/components/plans/Plan'),
	},
	data() {
		return {
			options: {
				responsive: [
					{ size: 1 },
				],
				item: {
					// css class to inject into each individual item
					class: "",
					// padding between each item
					padding: 100,
				},
				navigation: {
					// when to show navigation
					start: 0,
					color: "#000",
				},
				list: { 
					// 1200 because @media (min-width: 1200px) and therefore I want to switch to windowed mode
					windowed: 0,

					// Because: #app {padding: 80px 24px;}
					padding: 100,
				},
				position: {
					start: 1,
				},
				autoplay: { play: false, repeat: true, speed: 2000 },
			},
		}
	}
}
</script>
<style lang="sass">
.plans-wrapper
	display: flex 
	flex-direction: row 
	justify-content: center
	align-items: flex-end
	
	.feature-title
		text-align: left
		// max-width: 350px 
		text-wrap: nowrap

		font-size: 17px
		
		color: rgba(0,0,0,.5)
		margin: 10px 0

		border-bottom: 1px solid rgba(0,0,0,.3)

</style>