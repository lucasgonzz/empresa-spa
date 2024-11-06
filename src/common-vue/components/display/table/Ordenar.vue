<template>
	<div 
	v-if="show"
	class="ordenar">
		<i 
		:class="active_desc ? 'active' : ''"
		@click="ordenar('DESC')"
		class="icon-up"></i>
		<i 
		:class="active_asc ? 'active' : ''"
		@click="ordenar('ASC')"
		class="icon-down"></i>
	</div>
</template>
<script>
export default {
	props: {
		field: Object,
		model_name: String,
	},
	data() {
		return {
			localField: { ...this.field },
			active_asc: false,
			active_desc: false,
		}
	},
	watch: {
		filter: {
			deep: true,
			immediate: true,
			handler(newField) {
				this.set_active()
			}
		}
	},
	computed: {
		filter() {
			let filter = this.$store.state[this.model_name].filters.find(filter => filter.key == this.field.key)

			if (typeof filter != 'undefined') {
				return filter  
			}
			return null
		},
		show() {
			return this.filter
					&& (
						this.filter.type === 'number' ||
						this.filter.type === 'text' ||
						this.filter.type === 'date'
					);
		},
	},
	methods: {
		set_active() {
			if (!this.filter) {
				return
			}
			if (this.filter.ordenar_de) {

				if (this.filter.ordenar_de == 'ASC') {
					this.active_asc = true
					this.active_desc = false
				} else {
					this.active_asc = false
					this.active_desc = true
				}
			} else {
				this.active_asc = false
				this.active_desc = false
			}
		},
		ordenar(value) {
			this.limpiar_ordernar_de_los_demas()

			this.filter.ordenar_de = value

			this.$store.commit(this.model_name+'/addFilter', {...this.filter})


			// this.$emit('update:field', { ...this.filter }); // Emite el cambio al padre

			this.set_active()

			this.$emit('filtrar')

			// console.log('localField')
			// console.log(this.localField)
		},
		limpiar_ordernar_de_los_demas() {

			this.$store.state[this.model_name].filters.forEach(filter => {

				filter.ordenar_de = null
			})

		}
	}
};

</script>
<style lang="sass">
@import '@/sass/_custom'
.ordenar
	display: flex   
	flex-direction: row  
	align-items: center
	justify-content: center
	.active  
		color: $blue
</style>