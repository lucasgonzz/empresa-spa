<template>
	<b-form-row
	v-if="has_online">
		<b-col>
			<p
			class="c-p"
			@click="show ? show = false : show = true">
				Colores
				<icon-show
				:show="show"></icon-show>
			</p>
			<div 
			v-show="show"
			class="cont-colors">
				<div 
				@click="addColor(color)"
				:class="isColorSelected(color)"
				v-for="color in colors"
				:key="color.id"
				:style="{backgroundColor: color.value}"
				class="color c-p shadow-1">
					<p>
						{{ color.name }}
					</p>
				</div>
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
		colors() {
			return this.$store.state.colors.colors
		}
	},
	data() {
		return {
			show: false
		}
	},
	methods: {
		addColor(color) {
			if (this.hasColor(color)) {
				let index = this.article.colors.findIndex(col => {
								return col.id == color.id
							})
				console.log(index)
				this.article.colors.splice(index, 1)
			} else {
				this.article.colors.push(color)
			}
		},
		isColorSelected(color) {
			if (this.hasColor(color)) {
				if (color.name == 'White') {
					return 'color-selected-white shadow-1'
				} else {
					return 'color-selected shadow-1'
				}
			}
			return 'color-not-selected'
		},
		hasColor(color) {
			let index = this.article.colors.findIndex(col => {
							return col.id == color.id
						})
			return index != -1
		}
	}
}
</script>