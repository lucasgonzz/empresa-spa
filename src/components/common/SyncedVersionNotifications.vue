<template>
<b-modal
hide-footer
no-close-on-backdrop
no-close-on-esc
hide-header-close
:title="title"
id="synced-version-notifications">
	<div v-if="current">
		<p>
			<strong>
				<i class="icon-check"></i>
				{{ current.title }}
			</strong>
		</p>
		<p
		v-if="current.body"
		style="white-space: pre-line;">
			{{ current.body }}
		</p>
		<hr>
		<b-button
		block
		variant="primary"
		:disabled="loading"
		@click="next">
			<span v-if="!loading">
				{{ is_last ? 'Entendido' : 'Siguiente' }}
			</span>
			<span v-else>
				...
			</span>
		</b-button>
	</div>
</b-modal>
</template>
<script>
export default {
	computed: {
		current() {
			return this.$store.getters['synced_version_notification/current']
		},
		total() {
			return this.$store.state.synced_version_notification.pending.length
		},
		index() {
			return this.$store.state.synced_version_notification.current_index
		},
		loading() {
			return this.$store.state.synced_version_notification.loading
		},
		is_last() {
			return this.total <= 1
		},
		title() {
			if (this.total > 1) {
				return 'Novedades (' + (this.index + 1) + ' de ' + this.total + ')'
			}
			return 'Novedades'
		},
	},
	methods: {
		next() {
			this.$store.dispatch('synced_version_notification/mark_read')
			.then(() => {
				if (!this.$store.getters['synced_version_notification/has_pending']) {
					this.$bvModal.hide('synced-version-notifications')
				}
			})
		},
	},
}
</script>
