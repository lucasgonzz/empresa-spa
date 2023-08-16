<template>
	<div 
	@click="clicked"
	:class="_class"
	:style="style"
	class="card-component s-2 c-p s animate__animated animate__fadeIn">
		<div 
		v-if="!hasImage(properties) && titles.length"
		class="title">
			<p
			v-for="title in titles">
				<!-- <span
				class="prop-text"
				v-if="titles.length >= 2 && propertyText(model, title)">
					{{ title.text }}
				</span> -->
				{{ title.title_prefix }}
				{{ propertyText(model, title) }}
			</p>
		</div>
		<div>
			<vue-load-image
			v-if="hasImage(properties)">
				<img
				slot="image"
				class="slide-img" 
				:src="getImageUrl(properties, model)" 
				:alt="app_name+'-'+model.name">
		        <b-spinner
				slot="preloader"
		        variant="primary"></b-spinner>
				<div slot="error">
					Imagen no encontrada
				</div>
			</vue-load-image>
			<div
			class="cont-props">
				<p
				v-for="prop in propertiesToShow(properties, false)"
				v-if="showProperty(prop, model, true)">
					{{ propText(prop) }}
					<strong>
						{{ propertyText(model, prop) }}
					</strong>
				</p>
				<div
				v-if="_show_created_at">
					<p>
						Creado:
						<strong>
							{{ date(model.created_at) }}
						</strong>
					</p>
				</div>
				<p>
					{{ since(model.created_at) }}
				</p>
			</div>
			<div
			v-if="pivot && pivot.properties_to_set">
				<b-form-group
				v-for="(prop, index) in pivot.properties_to_set"
				:key="'pivot-prop-'+index"
				:label="propText(prop)">
					<b-form-input
					:type="prop.type"
					:placeholder="'Ingrese '+propText(prop)"
					v-model="model.pivot[prop.key]"></b-form-input>
					<hr>
				</b-form-group>
			</div>
			<slot name="table_right_options" v-bind:model="model"></slot>
		</div>
	</div>
</template>
<script>
export default {
	components: {
		VueLoadImage: () => import('vue-load-image'),
	},
	props: {
		model: Object,
		model_name: String,
		properties: Array,
		set_model_on_click: Boolean,
		show_created_at: {
			type: Boolean,
			default: true,
		},
		on_click_set_property: String,
		pivot: Object,
		pivot_model: Object,
	},
	computed: {
		_show_created_at() {
			if (this.$store.state[this.model_name].from_dates) {
				return false 
			}
			return this.show_created_at
		},
		style() {
			let prop = this.getBorderColorProperty(this.model_name)
			let color 
			if (prop && this.model[this.modelNameFromRelationKey(prop)]) {
				color = this.model[this.modelNameFromRelationKey(prop)].color
				return 'border: 6px solid '+color.code+' !important'
			}
			return ''
		},
		_class() {
			if (this.set_model_on_click) {
				return 'apretable'
			}
			return ''
		},
		titles() {
			return this.properties.filter(prop => {
				return prop.is_title 
			})
		}
	},
	watch: {
		pivot_model() {
			console.log('cambio pivot')
			this.setPivotValues()
		},
	},
	methods: {
		clicked() {
			if (this.set_model_on_click) {
				if (this.on_click_set_property) {
					this.setModel(this.model[this.on_click_set_property], this.model_name, this.properties)
				} else {
					// this.setModel(this.model, this.model_name, this.properties)
					this.setModel(this.model, this.model_name)
				}
			} else {
				this.$emit('clicked', this.model)
			}
		},
		getReferencedModel() {
			console.log(this.model)
			let model_relation = this.model[this.pivot.relations_with].find(relationship => {
				return relationship.id == this.pivot_model[this.pivot.related_by]
			})
			console.log(model_relation)
			return model_relation
		},
		setPivotValues() {
			console.log(this.model)
			let model_relation = this.model[this.pivot.relations_with].find(relationship => {
				return relationship.id == this.pivot_model[this.pivot.related_by]
			})
			console.log(model_relation)
		}
	}
}
</script>
<style lang="sass">
@import '@/sass/_custom.scss'
.card-component
	@media screen and (max-width: 576px)
		width: 98%
	@media screen and (min-width: 576px) and (max-width: 768px)
		width: 48%
	@media screen and (min-width: 768px) and (max-width: 992px)
		width: 31%
	@media screen and (min-width: 992px)
		width: 300px
	// width: 300px
	display: flex
	flex-direction: row  
	margin: 1em 1%
	border-radius: 12px
	background: #FFF
	.title 
		font-size: 30px 
		font-weight: bold
		// height: 200px
		display: flex
		flex-direction: column
		justify-content: center
		align-items: center
		padding: 0 10px
		p 
			color: #333 !important
			display: flex
			flex-direction: row
			line-height: 25px
			.prop-text
				font-size: 14px
				padding-right: 5px
	.vue-load-image
		width: 100%
		img 
			width: 100%
			border-radius: 5px 5px 0 0 
	.cont-props
		padding: 1em
		p 
			color: #333 !important
			text-align: left
			margin-bottom: 0
</style>