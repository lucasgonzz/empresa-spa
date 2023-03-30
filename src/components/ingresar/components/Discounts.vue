<template>
	<b-form-row>
		<b-col>
			<p
			class="c-p"
			@click="show ? show = false : show = true">
				Descuentos
				<icon-show
				:show="show"></icon-show>
			</p>
			<div
			v-show="show">
				<div class="description"
				v-for="(discount, index) in article.discounts"
				:key="index">
					<b-form-group
					class="m-b-15"
					label="Descuento">
						<b-form-input
						type="number"
						v-model="discount.percentage"
						placeholder="Porcentaje del descuento">
						</b-form-input>
					</b-form-group>
				</div>
				<b-form-group
				v-if="check()"
				class="j-start m-b-15">
					<b-button
					size="sm"
					variant="primary"
					@click="add">
						<i class="icon-plus"></i>
						Agregar descuento
					</b-button>
				</b-form-group>
			</div>
		</b-col>
	</b-form-row>
</template>
<script>
import edit_articles from '@/mixins/edit_articles'
import IconShow from '@/components/common/IconShow'
export default {
	props: ['article'],
	components: {
		IconShow,
	},
	mixins: [edit_articles],
	data() {
		return {
			show: false,
		}
	},
	methods: {
		add() {
			if (this.check()) {
				this.article.discounts.push({
					percentage: '',
				})
			}
		},
		check() {
			return this.article.discounts[this.article.discounts.length-1] && this.article.discounts[this.article.discounts.length-1].percentage != '' 
		}
	},
}
</script>
<style lang="sass">
.description
	display: flex
	padding: 0
</style>