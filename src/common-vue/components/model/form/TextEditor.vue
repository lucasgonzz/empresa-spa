<template>
    <div>
        <vue-editor
            v-model="local_value"
            :editor-toolbar="custom_toolbar"
            :editor-options="editor_options"
        />
    </div>
</template>

<script>
import { VueEditor } from "vue2-editor"

export default {
    name: "TextEditor",
    components: { VueEditor },
    props: {
        value: {
            type: String,
            default: ""
        },
        toolbar_options: {
            type: Array,
            default: () => null
        }
    },
    data() {
        return {
            local_value: this.value,
            default_toolbar: [
                ["bold", "italic", "underline"],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'align': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'size': ['small', false, 'large', 'huge'] }],
                [{ 'color': [] }, { 'background': [] }],
                ['link', 'image'],
                ['clean']
            ],
            editor_options: {
                placeholder: "Escribí tu contenido..."
            }
        }
    },
    computed: {
        custom_toolbar() {
            return this.toolbar_options || this.default_toolbar
        }
    },
    watch: {
        value(val) {
            this.local_value = val
        },
        local_value(val) {
            this.$emit("input", val)
        }
    }
}
</script>

<style scoped>
/* Podés ajustar el alto del editor si querés */
.ql-editor {
    min-height: 200px;
}
</style>
