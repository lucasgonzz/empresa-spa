<template>
	<b-modal
	v-if="current_acount"
	title="Cheques"
	hide-footer
	id="checks-details">
		<check-component
		:disabled_inputs="true"
		v-for="check in current_acount.checks"
		:check="check"></check-component>
	</b-modal>
</template>
<script>
import CheckComponent from '@/components/ventas/modals/current-acounts/pago/CheckComponent'
export default {
	components: {
		CheckComponent,
	},
	computed: {
		current_acount() {
			return this.$store.state.current_acount.to_show_checks
		},
	},
}
</script>