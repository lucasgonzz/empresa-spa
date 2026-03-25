export default {
    methods: {
        get_properties_to_show(model_name) {
            let props = require(`@/models/${model_name}`).default.properties
            props = this.check_extencions(props)
            return props
        },
        get_properties_to_show_ordenadas(model_name) {
            let props = this.$store.state[model_name].props_to_show
            if (typeof props == 'undefined') {
                props = require(`@/models/${model_name}`).default.properties
            }

            props = this.check_extencions(props)

            let props_ordenadas = props.filter(prop => prop.table_position)
            if (props_ordenadas.length) {
                return props_ordenadas.sort((a, b) => a.table_position - b.table_position)
            }
            return props
        },
        check_extencions(props) {
            let props_result = []

            props.forEach(prop => {
                if (prop.if_has_extencion) {
                    if (this.hasExtencion(prop.if_has_extencion)) {
                        props_result.push(prop)
                    }
                } else if (prop.if_has_not_extencions) {
                    if (this.check_has_not_extencions(prop)) {
                        props_result.push(prop)
                    }
                } else {
                    props_result.push(prop)
                }
            })

            return props_result
        },
        check_has_not_extencions(prop) {
            let ok = true
            prop.if_has_not_extencions.forEach(extencion => {
                if (this.hasExtencion(extencion)) {
                    ok = false
                }
            })
            return ok
        },
        prop_to_show_in_modal_title(model_name) {
            let prop_to_show_in_modal_title = require('@/models/' + model_name).default.prop_to_show_in_modal_title
            return typeof prop_to_show_in_modal_title != 'undefined' ? prop_to_show_in_modal_title : null
        },
        usePreView(model_name) {
            return typeof require('@/models/' + model_name).default.pre_view != 'undefined'
        },
        form_disabled_to_edit(model_name) {
            return typeof require('@/models/' + model_name).default.form_disabled_to_edit != 'undefined'
        },
        form_disabled_to_edit_function(model_name) {
            return typeof require('@/models/' + model_name).default.form_disabled_to_edit_function != 'undefined'
        },
        show_all_models_on_display(model_name) {
            let show_all_models_on_display = require('@/models/' + model_name).default.show_all_models_on_display
            if (typeof show_all_models_on_display != 'undefined' && !show_all_models_on_display) {
                return false
            }
            return true
        },
        hasFullReactivity(model_name) {
            return typeof require('@/models/' + model_name).default.full_reactivity != 'undefined'
        },
        hasColor(model_name) {
            return typeof require('@/models/' + model_name).default.color_display_function != 'undefined'
        },
        modelPropertiesFromRelationKey(prop) {
            if (prop.store) {
                return require('@/models/' + prop.store).default.properties
            }
            return require('@/models/' + this.modelNameFromRelationKey(prop)).default.properties
        },
        modelPropertiesFromName(model_name) {
            return require('@/models/' + model_name).default.properties
        },
        plural(model_name) {
            return require('@/models/' + model_name + '.js').default.plural_model_name_spanish
        },
        singular(model_name) {
            return require('@/models/' + model_name).default.singular_model_name_spanish
        },
        create_spanish(model_name) {
            let text = require('@/models/' + model_name).default.create_model_name_spanish
            if (text.split(' ').length == 1) {
                return text + ' ' + this.singular(model_name).toLowerCase()
            }
            return text
        },
        text_delete(model_name) {
            return require('@/models/' + model_name).default.text_delete
        },
    },
}
