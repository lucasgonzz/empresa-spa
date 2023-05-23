<template>
<b-modal
title="Error"
hide-footer
id="error">
	<p>
		Se ha producido un error en el sistema
	</p>
	<btn-loader
	text="Notificar sobre este error"
	variant="primary"></btn-loader>
</b-modal>
</template>
<script>
export default {
	components: {
		BtnLoader: () => import('@/common-vue/components/BtnLoader'),
	},
	created() {
        document.addEventListener(
            'errorEvent', this.errorEvent,
        )
	},
    methods: {
        errorEvent(event) {
            console.log('LLEGO')
            console.log(event)
            this.$store.commit('error/setError', event.detail)
            this.$bvModal.show('error')
        }
    }
}
</script>