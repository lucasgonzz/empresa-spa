<template>
<div
v-if="has_permission">
	<modal-from-dates
	:model_name="model_name"></modal-from-dates>
	<div
	class="cont-previus-days">
		<div
		class="cont-title">
			<title-component
			:model_name="model_name"
			:clear_selected="clear_selected"
			v-if="show_title"></title-component>
		</div>
		<div
		class="cont-nav">
			<week-days-nav
			:model_name_for_get_models="model_name_for_get_models"
			:model_name="model_name"></week-days-nav>
		</div>
		<div
		class="cont-btn"
		v-if="show_modal">
			<b-button
			variant="primary"
			v-b-modal="'from-date'">
				Por fecha
			</b-button>
		</div>
	</div>
</div>
</template>
<script>
import TitleComponent from '@/common-vue/components/previus-days/Title'
import WeekDaysNav from '@/common-vue/components/previus-days/WeekDaysNav'
import ModalFromDates from '@/common-vue/components/previus-days/ModalFromDates'

import moment from 'moment'
export default {
	name: 'PreviusDays',
	components: {
		TitleComponent,
		WeekDaysNav,
		ModalFromDates,
	},
    props: {
    	model_name: String,
    	clear_selected: {
    		type: Boolean,
    		default: false
    	},
    	show_modal: {
    		type: Boolean,
    		default: true,
    	},
    	show_title: {
    		type: Boolean,
    		default: true,
    	},
    	model_name_for_get_models: {
    		type: String,
    		default: null,
    	},
    },
    computed: {
    	has_permission() {
    		return this.can(this.model_name+'.index.previus_days')
    	}
    }
}
</script>
<style scoped lang="sass">
.cont-previus-days
	margin-bottom: 15px
	display: flex
	flex-direction: row 
	align-items: center
	flex-wrap: wrap
	.cont-title, .cont-btn
		@media screen and (max-width: 992px)
			width: 100%
			margin-top: 25px
		@media screen and (min-width: 992px)
			width: 25%
	.cont-nav
		@media screen and (max-width: 992px)
			width: 100%
		@media screen and (min-width: 992px)
			width: 50%
.cont-btn
	display: flex
	flex-direction: row 
	@media screen and (max-width: 992px)
		justify-content: center
	@media screen and (min-width: 992px)
		justify-content: flex-end
</style>