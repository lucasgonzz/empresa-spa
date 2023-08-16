<template>
<b-modal
:id="id"
:title="title"
hide-footer>
	<b-form-input
	:placeholder="'Buscar '+propText(prop)"
	:id="id_input"
	@keyup="callSearch"
	@keydown.enter="enterSelect"
	@keydown.up="selectUp"
	@keydown.down="selectDown"
	v-model="query"></b-form-input>
	<div
	class="m-t-15"
	v-if="loading || results.length">
		<p
		class="results-title">
			<i class="icon-down"></i>
			Resultados
		</p>
		<table-component
		:properties="properties"
		:selected_index="selected_index"
		select_mode="single"
		:loading="loading"
		:models="results"
		:set_model_on_row_selected="false"
		:striped="false"
		@onRowSelected="setSelected"></table-component>	
	</div>
	<div
	v-else>
		<div class="text-with-icon">
			<i class="icon-search"></i>
			No se encontraron resultados
		</div>
	</div>
</b-modal>
</template>
<script>
export default {
	props: { 
		prop: Object,
		model: Object,
	},
	components: {
		TableComponent: () => import('@/common-vue/components/display/TableComponent'),
	},
	computed: {
		id() {
			return 'google-geocoder-modal-'+this.prop.key
		},
		id_input() {
			return 'google-geocoder-modal-input-'+this.prop.key
		},
		title() {
			return 'Buscar '+this.propText(this.prop) 
		},
		properties() {
			return [
				{
					text: 'Direccion',
					key: 'address',
				},
			]
		},
	},
	data() {
		return {
			query: '',
			loading: false,
			interval: null,
			waiting_time: 2,
			searching: false,
			results: [],
			selected_index: -1,

			geocoder: null,
		}
	},
	methods: {
		callSearch(e) {
			if (e.key != 'ArrowDown' && e.key != 'ArrowUp') {
				this.loading = true 
				if (this.interval) {
		            window.clearInterval(this.interval)
					this.interval = null
				}
				if (this.query.length >= 3) {
					this.waiting_time = 2
					this.interval = window.setInterval(() => {
						if (this.waiting_time == 0) {
		                    window.clearInterval(this.interval)
		                    console.log('Se limpio intervalo')
							this.search()
						} else {
							this.waiting_time--
						}		
					}, 250)
				} else {
					this.loading = false 
				}
			}
		},
		search() {
			console.log('buscando')
			console.log(this.$geocoder)

			var addressObj = {
			    address_line_1: this.query,
			    address_line_2: '',
			    // city:           'Mountain View',
			    // state:          'CA',               // province also valid
			    // zip_code:       '94043',            // postal_code also valid
			    country:        'Argentina'
			}
			this.$geocoder.send(addressObj, response => { 
				console.log(response)
				this.results = response.results.map(response => {
					return {
						address: response.formatted_address,
						geometry: response.geometry,
					}
				})
				this.searching = false
				this.interval = null
				this.loading = false 
				this.setFirstSelectedRow()
			})

			// const geocoder = new google.maps.Geocoder()
			// google.maps.Geocoder.geocode({
			// 	address: this.query+' Argentina'
			// })
			// .then(res => {
			// 	this.results = res.results.map(result => {
			// 		return {
			// 			address: result.formatted_address,
			// 			geometry: result.geometry,
			// 		}
			// 	})
			// 	console.log(res.results)
			// 	this.searching = false
			// 	this.interval = null
			// 	this.loading = false 
			// 	this.setFirstSelectedRow()
			// })
			// .catch(err => {
			// 	console.log(err)
			// })
		},
		enterSelect() { 
			if (!this.loading) {
				if (this.selected_index != -1 && this.results.length) {
					this.setSelected(this.results[this.selected_index])
				}
				this.results = []
				this.$bvModal.hide(this.id)
			} else {
				this.$toast.error('Espere a que termine la busqueda, por favor')
			}
		},
		setFirstSelectedRow() {
			setTimeout(() => {
				this.selected_index = -1
				setTimeout(() => {
					this.selected_index = 0
					console.log('se autoselecciono la primer fila')
				}, 100)
			}, 100)
		},
		setSelected(result) {
			console.log('setSelected')
			console.log(result)
			this.model[this.prop.key] = result.address 
			this.model[this.prop.key+'_lat'] = result.geometry.location.lat
			this.model[this.prop.key+'_lng'] = result.geometry.location.lng
			this.$bvModal.hide(this.id)
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.search-component-modal
	width: 100%
	display: flex
	flex-direction: column
	.header
		display: flex
		flex-direction: row
	.results-title
		font-size: 1.2em
		font-weight: bold
		margin: 1em 0
</style>