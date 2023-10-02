<template>
    <b-dropdown-group
    header="Configuracion" 
    v-if="is_owner">
        <b-dropdown-item
        v-b-modal="'user'">
            <i class="icon-configuration"></i>
            General
        </b-dropdown-item>
        <template
        v-if="has_extra_config">
            <b-dropdown-item
            v-for="config_model_name in extra_config"
            @click="setConfig(config_model_name)">
                <i class="icon-configuration"></i>
                {{ singular(config_model_name) }}
            </b-dropdown-item>
        </template>
        <b-dropdown-divider></b-dropdown-divider>
        <b-dropdown-item
        v-b-modal="'update-password'">
            <i class="icon-user"></i>
            Cambiar contraseña
        </b-dropdown-item>
    </b-dropdown-group>
</template>
<script>
import nav from '@/common-vue/mixins/nav'
export default {
    mixins: [nav],
}
</script>