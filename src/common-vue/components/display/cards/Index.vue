<template>
	<div
	class="m-t-15">
		<div
		v-if="!loading">
			<div
			v-if="models.length"
			:class="_class"
			class="cont-cards">
				<card-component
				v-for="model in models"
				:key="model.id"
				:properties="properties"
				:show_created_at="show_created_at"
				:model="model"
				:model_name="model_name"
				:set_model_on_click="set_model_on_click"
				:on_click_set_property="on_click_set_property"
				:pivot="pivot"
				:pivot_model="pivot_model"
				@clicked="clicked">
					<template v-slot:default="props">
						<slot :model="props.model"></slot>
					</template>
				</card-component>
			</div>
			<p 
			v-else-if="!models.length"
			class="text-with-icon">
				<i class="icon-eye-slash"></i>
				No hay {{ singular(model_name) }}
			</p>
		</div>
		<div 
		v-else
		class="cont-cards">
			<card-skeleton 
			v-for="i in 6"
			:key="i"
			:properties="properties"></card-skeleton>			
		</div>
	</div>
</template>
<script>
import CardComponent from '@/common-vue/components/display/cards/CardComponent'
import CardSkeleton from '@/common-vue/components/display/cards/CardSkeleton'
export default {
	props: {
		loading: Boolean,
		models: Array,
		model_name: String,
		properties: {
			type: Array,
			default() {
				return require('@/models/'+this.model_name).default.properties
			}
		},
		pivot: {
			type: Object,
			default: null,
		},
		pivot_model: {
			type: Object,
			default: null,
		},
		set_model_on_click: Boolean,
		on_click_set_property: String,
		full_card: {
			type: Boolean,
			default: false,
		},
		show_created_at: {
			type: Boolean,
			default: false,
		},
	},
	components: {
		CardComponent,
		CardSkeleton,
	},
	computed: { 
		_class() {
			if (this.full_card) {
				return 'full-card'
			}
			return ''
		},
	},
	methods: {
		clicked(model) {
			this.$emit('clicked', model)
		}
	}
}
</script>
<style lang="sass">
.cont-cards
	display: flex
	flex-direction: row
	flex-wrap: wrap
	@media screen and (min-width: 992px)
		justify-content: center
.full-card 
	.card-component
		width: 100% 
</style>