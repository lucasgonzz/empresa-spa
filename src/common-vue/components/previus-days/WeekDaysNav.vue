<template>
<nav 
class="pagination-nav previus-days">
	<ul 
	class="pagination m-0" 
	v-if="!loading">
		<li class="page-item">
			<a class="page-link"
			v-show="days.length == 7"
			@click.prevent="getDaysBefore">
				<span>
					&laquo;
				</span>
			</a>
		</li>
		<li class="page-item" 
			v-for="(day, index) in days"
			:key="index"
			:class="isActive(day) ? 'active' : ''">
			<span class="pagination-mes">
				{{ getMonth(day.date) }}
			</span>
			<template
			v-if="date(day.date) == date(today)">
				<a 
				class="page-link" 
				@click.right="setLimitDate(day.date)"
				@click.prevent="changeFromDate(day.date)">
					Hoy
				</a>
			</template>
			<template 
			v-else>
				<a 
				v-if="day.models.length"
				class="page-link" 
				@click.right="setLimitDate(day.date)"
				@click.prevent="changeFromDate(day.date)">
					{{ dayFormat(day.date) }}
				</a>
				<a 
				v-else
				@click.prevent="showNotModels" 
				class="page-link text-muted day-not-sale">
					{{ dayFormat(day.date) }}
				</a>
			</template>
			<span class="pagination-dia bg-primary">
				{{ getDay(day.date) }}
			</span>
		</li>
		<li 
		class="page-item"
		v-show="index >= 1">
			<a 
			class="page-link"
			@click.prevent="getDaysNext">
				<span>
					&raquo;
				</span>
			</a>
		</li>
	</ul>
	<span 
	v-else="loading"
	class="text-primary d-inline">
		<b-skeleton type="input" width="300px"></b-skeleton>
	</span>
</nav>
</template>
<script>
import moment from 'moment'
export default {
	name: 'WeekDaysNav',
    props: {
    	model_name: String,
    	model_name_for_get_models: String,
    	clear_selected: {
    		type: Boolean,
    		default: false
    	}
    },
	data() {
		return {
			days: [],
			index: 0,
			// from_date: moment().format('YYYY-MM-DD'),
			loading: false,
		}
	},
	computed: {
		from_date() {
			return this.$store.state[this.model_name].from_date
		},
		until_date() {
			return this.$store.state[this.model_name].until_date
		},
		has_until() {
			return typeof this.until_date != 'undefined' 
		},
	},
	methods: {
		isActive(day) {
			if (!this.has_until || this.until_date == '') {
				return this.date(this.from_date) == this.date(day.date)	
			} else if (this.has_until && this.until_date != '') {
				return moment(day.date).isBetween(moment(this.from_date).subtract(1, 'days'), moment(this.until_date).add(1, 'days'))
			}
		},
		getDays() {
			this.loading = true 
			let model_name = this.model_name
			if (this.model_name_for_get_models) {
				model_name = this.model_name_for_get_models
			}
			this.$api.get(`previus-day/${this.routeString(model_name)}/${this.index}`)
			.then(res => {
				this.loading = false
				let days = res.data.days
				if (days.length > 0) {
					this.days = days 
				} 
				console.log(days)
			})
			.catch(err => {
				this.loading = false
				console.log(err)
			})
		},
		dayFormat(d) {
			return moment(d).format('DD')
		},
		showNotModels() {
			this.$toast.error('No se hicieron '+this.singular(this.model_name)+' en este dia')
		},
		getDaysBefore() {
			this.index++
			this.getDays()
		},
		getDaysNext() {
			this.index--
			this.getDays()
		},
		changeFromDate(date) { 
			if (this.clear_selected) {
				this.$store.commit(this.model_name+'/setSelected', [])
			}
			if (typeof this.$store.state[this.model_name].filtered != 'undefined') {
				this.$store.commit(this.model_name+'/setFiltered', [])
				this.$store.commit(this.model_name+'/setIsFiltered', false)
			}
			this.$store.commit(this.model_name+'/setFromDate', date)
			if (this.has_until) {
				this.$store.commit(this.model_name+'/setUntilDate', '')
			}
			this.$store.dispatch(this.model_name+'/getModels')
		},
		setLimitDate(date) {
			console.log(date)
			if (moment(date).isBefore(this.from_date)) {
				this.$store.commit(this.model_name+'/setUntilDate', this.from_date)
				this.$store.commit(this.model_name+'/setFromDate', date)
			} else {
				this.$store.commit(this.model_name+'/setUntilDate', date)
			}
			this.$store.dispatch(this.model_name+'/getModels')
		}
	},
	created() {
		this.getDays()
	}
}
</script>
<style scpoed lang="sass">
.col-12 
	display: flex
	justify-content: center
.pagination-nav
	display: flex
	flex-direction: row
	justify-content: center
	@media screen and (max-width: 576px)
		font-size: .7em

.previus-days
	margin: 2em 0

.page-item 
	position: relative
	cursor: pointer
	height: 100%

.pagination-mes
	position: absolute
	background: #38c172
	text-align: center
	bottom: 100%
	color: #fff
	font-size: .5rem
	border-radius: .25rem .25rem 0 0
	width: 90%
	left: 4%

.pagination-dia
	position: absolute
	text-align: center
	top: 100%
	color: #fff
	font-size: .5rem
	border-radius: 0 0 .25rem .25rem
	width: 90%
	left: 4%

.day-not-sale 
	text-decoration: line-through
	font-weight: normal
	cursor: not-allowed

</style>