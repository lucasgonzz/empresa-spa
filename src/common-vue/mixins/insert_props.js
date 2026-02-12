export default {

    methods: {

        get_insert_index(props, keys_priority) {

            let index = -1
            let key_index = 0

            while (index === -1 && key_index < keys_priority.length) {

                const key = keys_priority[key_index]
                key_index++

                index = props.findIndex(p => p.key === key)
            }

            return index !== -1 ? index + 1 : props.length
        },

        insert_property_by_rules(props, property) {

            const insert_at = this.get_insert_index(
                props,
                property.insert_after_keys || []
            )

            props.splice(insert_at, 0, property)

            return props
        }
    }
}
