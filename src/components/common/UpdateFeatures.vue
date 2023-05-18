<template>
<b-modal
hide-footer
title="Caracteristicas de la nueva version"
id="update-features">
	<div
	v-for="feature in update_features">
		<p>
			<strong>
				<i class="icon-check"></i>
				{{ feature.name }}
			</strong>
		</p>
		<p
		v-if="feature.description">
			<i class="icon-right"></i>
			{{ feature.description }}
		</p>
		<hr>
	</div>
	<b-button
	block 
	variant="primary"
	@click="close">
		Entendido
	</b-button>
</b-modal>
</template>
<script>
export default {
	computed: {
		update_features() {
			return this.$store.state.update_feature.models 
		},
	},
	methods: {
		close() {
			this.$cookies.set('update_features_watched', true, -1)
			console.log('coockie quedo en:')
			console.log(this.$cookies.get('update_features_watched'))
			this.$bvModal.hide('update-features')
		}
	}
}
</script>