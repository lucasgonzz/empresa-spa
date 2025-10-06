<template>
    <div class="s-2 attribute">
        <!-- Mostrar propiedades traducidas -->
        <p
            v-for="(value, key) in attribute"
            v-if="show(value, key)"
            :key="key"
        >
            <strong
            class="key-name"
            v-if="key == 'name'">
                {{ value }}
            </strong>
            <span
            v-else>
                {{ translateKey(key) }}: {{ value }}
            </span>
        </p>

        <!-- Valores sugeridos para string -->
        <div
            v-if="attribute.value_type == 'string'
                && attribute.meli_attributes_values
                && attribute.meli_attributes_values.length"
        >
            <hr>
            <p>Valores sugeridos</p>
            <div class="values-list s-1 m-b-15">
                <p
                    v-for="value in attribute.meli_attributes_values"
                    :key="value.meli_id"
                >
                    {{ value.meli_name }}
                </p>
            </div>
        </div>

        <hr>
        <p><strong>Valor</strong></p>
        <!-- Input para string -->
        <div v-if="attribute.value_type == 'string'">
            <b-form-textarea
                v-model="input_value"
                placeholder="Escriba un valor"
            ></b-form-textarea>
        </div>

        <!-- Select para list -->
        <div v-if="attribute.value_type == 'list'
                && attribute.meli_attributes_values
                && attribute.meli_attributes_values.length"
        >
            <hr>
            <p><strong>Valores posibles</strong></p>
            <b-form-select
                v-model="selected_value"
                :options="value_options(attribute.meli_attributes_values)"
            ></b-form-select>

        </div>

        <!-- Input numérico -->
        <div v-if="attribute.value_type == 'number_unit' || attribute.value_type == 'number'">
            <b-form-textarea
                v-model="input_value"
                type="number"
                placeholder="Ingrese un número"
            ></b-form-textarea>
        </div>

        <!-- Boolean -->
        <div v-if="attribute.value_type == 'boolean'">
            <b-form-select
                v-model="selected_value"
                :options="boolean_options(attribute.meli_attributes_values)"
            ></b-form-select>
        </div>

        <!-- Botón dinámico -->
        <b-button
        size="sm"
        :variant="existingAttribute ? 'primary' : 'outline-primary'"
        class="mt-2"
        @click="saveAttribute"
        >
            {{ existingAttribute ? 'Actualizar atributo' : 'Agregar atributo' }}
        </b-button>
    </div>
</template>

<script>
export default {
    props: {
        attribute: Object
    },
    data() {
        return {
            selected_value: null,
            input_value: '',
            existingAttribute: null // para saber si ya está relacionado
        };
    },
    computed: {
        article_meli_attributes() {
            return this.$store.state.meli.article_meli_attributes;
        },
        article() {
            return this.$store.state.article.model;
        },
    },
    mounted() {
        // Chequear si el artículo ya tiene este atributo asignado
        if (this.article_meli_attributes.length) {
            const related = this.article_meli_attributes.find(
                a => a.meli_attribute_id === this.attribute.id
            );
            if (related) {
                console.log('related de '+related.meli_attribute.name)
                console.log(related.value_name)
                console.log(related.value_id)
                this.existingAttribute = related;
                this.input_value = related.value_name || '';
                this.selected_value = related.value_id || null;
            }
        }
    },
    methods: {
        show(value, key) {
            return (
                value !== null &&
                value !== '' &&
                key != 'meli_attributes_values' &&
                key != 'meli_attributes_tags' &&
                key != 'id' &&
                // key != 'meli_id' &&
                key != 'created_at' &&
                key != 'updated_at' &&
                key != 'meli_category_id' &&
                key != 'attribute_group_id' &&
                key != 'attribute_group_name'
            );
        },
        translateKey(key) {
            const translations = {
                name: "Nombre",
                relevance: "Relevancia",
                value_type: "Tipo de valor",
                value_max_length: "Longitud máxima",
                default_unit: "Unidad por defecto",
                tooltip: "Tooltip",
                hint: "Pista",
                hierarchy: "Jerarquía",
                example: "Ejemplo",
                attribute_group_id: "ID de grupo de atributo",
                attribute_group_name: "Nombre del grupo de atributo",
                value_id: "ID de valor",
                value_name: "Nombre de valor",
                values: "Valores"
            };
            return translations[key] || key;
        },
        value_options(meli_attributes_values) {
            let options = [
                { text: 'Seleccione', value: null }
            ];
            meli_attributes_values.forEach(value => {
                options.push({
                    text: value.meli_name,
                    value: value.meli_id
                });
            });
            return options;
        },
        boolean_options(meli_attributes_values) {
            let options = [
                { text: 'Seleccione', value: null }
            ];
            meli_attributes_values.forEach(value => {
                options.push({
                    text: value.meli_name, // Ej: "Sí" o "No"
                    value: value.meli_id   // Ej: "242084" o "242085"
                });
            });
            return options;
        },
        get_meli_attribute_value_id() {
            let finded = this.attribute.meli_attributes_values.find(
                value => value.meli_id == this.selected_value
            );
            return finded ? finded.id : null;
        },
        async saveAttribute() {
            const payload = {
                article_id: this.article.id,
                meli_attribute_id: this.attribute.id,
                value_id: this.selected_value,
                value_name: this.input_value || this.attribute.value_name,
                meli_attribute_value_id: this.get_meli_attribute_value_id()
            };

            try {
                if (this.existingAttribute) {
                    // actualizar
                    await this.$api.put(`/article-meli-attribute/${this.existingAttribute.id}`, payload);
                    this.$toast.success("Atributo actualizado correctamente");
                } else {
                    // crear
                    const { data } = await this.$api.post("/article-meli-attribute", payload);
                    this.existingAttribute = data.data; // guardar para futuras ediciones
                    this.$toast.success("Atributo agregado correctamente");
                }
            } catch (error) {
                this.$toast.error("Error al guardar atributo");
                console.error(error);
            }
        }
    }
};
</script>

<style lang="sass">
.values-list
    max-height: 200px
    overflow-y: scroll
    padding: 10px
    border-radius: 7px

.key-name
    font-size: 24px
</style>
