<template>
	<b-form-row
	v-if="has_online">
		<b-col>
			<p
			class="c-p"
			@click="show ? show = false : show = true">
				Condiciones
				<icon-show
				:show="show"></icon-show>
			</p>
			<div 
			v-show="show"
			class="j-start m-b-15">
				<div
				v-if="conditions.length">
					<b-form-radio
					class="m-r-30"
					v-for="condition in conditions"
					:key="condition.id"
					:value="condition.id"
					v-model="article.condition_id">
						{{ condition.name }}
					</b-form-radio>
				</div>
				<p
				class="text-with-icon text-center"
				v-else>
					<i class="icon-not"></i>
					No hay condiciones creadas
				</p>
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
		conditions() {
			return this.$store.state.condition.models
		},
	},
	data() {
		return {
			show: false
		}
	}
}
</script>