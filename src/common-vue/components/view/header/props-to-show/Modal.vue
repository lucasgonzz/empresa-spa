<template>
	<b-modal
	v-if="usa_props_to_show"
	title="Propiedades para mostrar"
	hide-footer
	id="props-to-show">

		<b-button-group
		class="m-b-10 w-100">
			
			<b-button
			@click="limpiar_todo"
			block
			size="sm"
			variant="outline-primary">
				Limpiar todo
			</b-button>
			<b-button
			block
			@click="marcar_todo"
			size="sm"
			class="m-0"
			variant="primary">
				Marcar todo
			</b-button>
		</b-button-group>

		<hr>

		<div
		v-for="prop in all_properties">
			
			<b-form-checkbox
			:value="prop.key"
			v-model="selected_props">
				{{ getLabel(prop) }}
			</b-form-checkbox>
			<hr>
		</div>

		<b-button
		block
		@click="save"
		class="m-t-15"
		variant="primary">
			Listo
		</b-button>
	</b-modal>
</template>
<script>
export default {
	props: {
		model_name: String,
	},
	data() {
		return {
			selected_props: []
		}
	},
	computed: {
		usa_props_to_show() {
			if (this.$store._mutations[this.model_name+'/set_props_to_show']) {
				return true
			}
			console.warn(`La mutación set_props_to_show no está definida en el store.`);
			return false
		},
		all_properties() {
			let props = require(`@/models/${this.model_name}`).default.properties
			
			props = props.filter(prop => typeof prop.no_mostrar_nunca == 'undefined')
			props = this.check_extencions(props)

			props.push({
				key: 'created_at',
				text: 'Creado',
				type: 'date',
				is_date: true,
			})
			props.push({
				key: 'updated_at',
				text: 'Actualizado',
				type: 'date',
				is_date: true,
			})

			return props.filter(prop => prop.type != 'button')
		},
		props_to_show() {
			return this.$store.state[this.model_name].props_to_show
		},
	},
	watch: {
		model_name() {
			if (this.usa_props_to_show) {

				this.set_props_to_show()

				this.set_selected_props()
			}
		},
	},
	created() {
		if (this.usa_props_to_show) {

			this.set_props_to_show()

			this.set_selected_props()
		}
	},
	methods: {

		limpiar_todo() {
			this.selected_props = []
		},
		marcar_todo() {
			this.all_properties.forEach(prop => {
				this.selected_props.push(prop.key)
			})
		},

		save() {
			let props_to_show = []

			this.all_properties.forEach(prop => {

				if (this.selected_props.includes(prop.key)) {

					props_to_show.push({
						...prop,
						not_show: false,
					})
				}
			})

			this.$store.commit(this.model_name+'/set_props_to_show', props_to_show)

			console.log('props_to_show:')
			console.log(props_to_show)

			this.$bvModal.hide('props-to-show')
		},

		// Setea las propeidades para mostrar en base al archivo del model
		set_props_to_show() {

			console.log('set_props_to_show:')

			let default_props_to_show = this.all_properties.filter(prop => !prop.not_show)

			console.log('default_props_to_show:')
			console.log(default_props_to_show)

			this.$store.commit(this.model_name+'/set_props_to_show', default_props_to_show)
			
		},

		// Agrega esas propiedades por defecto al array de propiedades seleccionadas
		set_selected_props() {

			console.log('set_selected_props:')


			this.selected_props = []

			this.props_to_show.forEach(prop => {

				this.selected_props.push(prop.key)
			})

			console.log('selected_props:')
			console.log(this.selected_props)
		}
	}
}
</script>