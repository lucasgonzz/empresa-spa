<template>
<b-sidebar
id="nav-home-mobile" 
shadow>
    <scroll-buttons></scroll-buttons>
</b-sidebar>
</template>
<script>
export default {
    components: {
        ScrollButtons: () => import('@/components/home2/components/nav/ScrollButtons'),
    },
}
</script>
