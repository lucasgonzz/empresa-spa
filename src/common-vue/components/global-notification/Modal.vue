<template>
	<b-modal
	title="Notificacion"
	hide-footer
	id="global-notification">
		<h6 class="text-center m-t-15 m-b-25">
			{{ message_text }}
		</h6>

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