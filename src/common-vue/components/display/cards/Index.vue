<template>
	<div
	class="m-t-15">
		<div
		v-if="!loading">
			<div
			v-if="models_to_show.length"
			:class="_class"
			class="cont-cards">
				<card-component
				v-for="model in models_to_show"
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
					<template v-slot:table_right_options="props">
						<slot name="table_right_options" :model="props.model"></slot>
					</template>
				</card-component>

				<div 
				v-if="busy">
					Cargando...
				</div>

				<div v-infinite-scroll="loadMore" infinite-scroll-disabled="busy" infinite-scroll-distance="10"></div>
			</div>
			<p 
			v-else-if="!models_to_show.length"
			class="text-with-icon">
				<i class="icon-eye-slash"></i>
				No hay {{ plural(model_name) }}
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
import infiniteScroll from 'vue-infinite-scroll'
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
	directives: {infiniteScroll},
	components: {
		CardComponent,
		CardSkeleton,
	},
	data() {
		return {
			index_to_show: 1,
			busy: false,
		}
	},
	computed: { 
		_class() {
			if (this.full_card) {
				return 'full-card'
			}
			return ''
		},
		models_to_show() {
			let to_show = this.models.slice(0, (this.cant_models_to_show * this.index_to_show))
			return to_show
		},
		loadMore($state) {
			console.log('loadMore')
			if (this.models_to_show.length < this.models.length) {
				console.log('entro loadMore')
				this.busy = true;

				setTimeout(() => {
					this.index_to_show++
					this.busy = false;
				}, 300);
			}
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