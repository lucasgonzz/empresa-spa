<template>
    <b-nav-item-dropdown 
    v-if="use_help_dropdown && items.length"
    class="help-dropdown"
    right>
        <template #button-content>
            Ayuda
        </template>
        <b-dropdown-item
        v-for="(item, i) in items"
        :key="i"
        @click="setUrl(item)">
            <i class="icon-external-link p-r-5"></i>
            {{ item.text }}
        </b-dropdown-item>
    </b-nav-item-dropdown> 
</template>
<script>
import help from '@/mixins/help'
export default {
    mixins: [help], 
    computed: { 
        items() {
            let item = this.help_items.find(help_item => {
                return help_item.route_name == this.route_name
            })
            if (typeof item != 'undefined') {
                return item.items
            }
            return []
        }
    },
    methods: {
        setUrl(item) {
            window.open(item.url)
        }
    }
}
</script>
<style lang="sass">
.help-dropdown 
    &:marker 
        display: none !important
</style>