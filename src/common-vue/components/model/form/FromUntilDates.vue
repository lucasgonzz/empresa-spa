<template>
    <div class="from-until-dates">
        <!-- Selector de Fecha Inicio -->
        <b-form-input
            v-model="local_from_date"
            type="date"
            @change="setFrom" />

        <!-- Selector de Fecha Fin -->
        <b-form-input
            v-model="local_until_date"
            class="m-l-15"
            type="date"
            @change="setUntil" />
    </div>
</template>

<script>
export default {
    props: {
        from_date: {
            type: String,
            default: null
        },
        until_date: {
            type: String,
            default: null
        },
    },
    data() {
        return {
            // Copias internas de las props
            local_from_date: this.from_date,
            local_until_date: this.until_date
        }
    },
    watch: {
        // Si cambian las props desde afuera, actualizar localmente
        from_date(val) {
            this.local_from_date = val
        },
        until_date(val) {
            this.local_until_date = val
        }
    },
    methods: {
        setFrom() {
            this.$emit('setFrom', { value: this.local_from_date })
        },
        setUntil() {
            this.$emit('setUntil', { value: this.local_until_date })
        }
    }
}
</script>

<style>
.from-until-dates {
    width: 500px;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}
</style>
