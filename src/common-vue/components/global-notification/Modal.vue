<template>
	<b-modal
	title="Notificacion"
	hide-footer
	id="global-notification">
		<h5 class="text-center m-t-15 m-b-25">
			{{ message_text }}
		</h5>

		<hr>
		<div
		v-for="info in info_to_show">
			<h5 class="text-center m-t-15 m-b-15">
				{{ info.title }}
			</h5>
			<div
			v-if="info.parrafos">
				<p
				v-for="parrafo in info.parrafos">
					{{ parrafo }}
				</p>
			</div>
			<p
			v-else>
				{{ info.value }}
			</p>
		</div>

		<hr
		v-if="info_to_show.length">

		<div class="buttons j-center">
			<b-button
			v-for="function_to_execute in functions_to_execute"
			:variant="function_to_execute.btn_variant"
			@click="call_function(function_to_execute)">
				{{ function_to_execute.btn_text }}
			</b-button>
		</div>
	</b-modal>
</template>
<script>
import global_notification_functions from '@/mixins/global_notification_functions'
export default {
	mixins: [global_notification_functions],
	computed: {
		message_text() {
			return this.$store.state.global_notification.message_text
		},
		functions_to_execute() {
			return this.$store.state.global_notification.functions_to_execute
		},
		info_to_show() {
			return this.$store.state.global_notification.info_to_show
		},
	},
	methods: {
		call_function(function_to_execute) {
			if (function_to_execute.function_name) {
				this[function_to_execute.function_name]()
			}
			this.close_notification_modal()
		},
		close_notification_modal() {
			this.$bvModal.hide('global-notification')
		},
	},
}
</script>