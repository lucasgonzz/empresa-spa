<template>
    <b-button
    @click="refreshApp"
    class="m-t-15 m-b-15"
    variant="primary">
        <i class="icon-download"></i>
        Hay una nueva version disponible, click para actualizar
    </b-button>
</template>
<script>
export default {
	methods: {
        refreshApp() {
            console.log('Se llamo refreshApp.')
            location.reload(true)
        },
	}
}
</script>