<template>
    <div>
        <div v-for="moneda in monedas" :key="moneda.id" class="moneda-block">
            <h5>{{ moneda.name }}</h5>

            <b-input-group prepend="%">
                <b-form-input
                type="number"
                :disabled="local.ptm[moneda.id].setear_precio_final == 1"
                v-model.number="local.ptm[moneda.id].percentage"
                @change="toPayload"
                placeholder="Porcentaje"></b-form-input>
            </b-input-group>

            <b-input-group 
            class="m-t-10"
            prepend="$">
                <b-form-input
                type="number"
                @change="toPayload"
                :disabled="local.ptm[moneda.id].setear_precio_final == 0"
                v-model.number="local.ptm[moneda.id].final_price"
                placeholder="Precio final"></b-form-input>
            </b-input-group>

            <b-form-checkbox
            class="m-t-10"
            :value="1"
            :unchecked-value="0"
            v-model="local.ptm[moneda.id].setear_precio_final"
            size="sm">Setear precio final</b-form-checkbox>
            <hr>
        </div>
    </div>
</template>
<script>
export default {
    props: ['article_price_type'],
    data() {
        return {
            local: {
                ptm: {} // indexado por moneda.id
            }
        };
    },
    computed: {
        monedas() {
            return this.$store.state.moneda.models 
        },
        article() {
            return this.$store.state.article.model
        },
    },
    created() {
        console.log('CREADO PRICE TYPE MOENDAS, ARTICLE:')
        console.log(this.article.price_type_monedas)

        console.log('article_price_type:')
        console.log(this.article_price_type)

        this.monedas.forEach(m => {

            const existente = this.article.price_type_monedas?.find(ptm =>
                ptm.price_type_id === this.article_price_type.id &&
                ptm.moneda_id === m.id
            );

            console.log('existente:')
            console.log(existente)

            let info = {
                percentage: '',
                final_price: '',
                setear_precio_final: 0,
            }

            if (typeof existente != 'undefined') {
                info.percentage = existente.percentage
                info.final_price = existente.final_price
                info.setear_precio_final = existente.setear_precio_final
            } 

            this.$set(this.local.ptm, m.id, {
                moneda_id: m.id,

                ...info,

                // percentage: existente.percentage,
                // final_price: existente.final_price,
                // setear_precio_final: existente.setear_precio_final,

                // percentage: (existente?.pivot?.percentage != null) ? existente.pivot.percentage : '',
                // final_price: (existente?.pivot?.final_price != null) ? existente.pivot.final_price : '',
                // setear_precio_final: (existente?.pivot?.setear_precio_final != null) ? 1 : 0,
            });
        });
    },
    watch: {
        article_price_type: {
            handler(newVal) {
            // reiniciar local.ptm si hay data previa
            },
            deep: true
        }
    },
    methods: {
        toPayload() {
            let nuevos_datos = Object.values(this.local.ptm).map(entry => ({
                price_type_id: this.article_price_type.id,
                moneda_id: entry.moneda_id,
                percentage: entry.percentage,
                final_price: entry.final_price,
                setear_precio_final: entry.setear_precio_final
            }));

            if (!this.article.price_type_monedas) {
                this.$set(this.article, 'price_type_monedas', []);
            }

            // Eliminamos las entradas anteriores del mismo price_type_id
            const actuales = this.article.price_type_monedas.filter(
                e => e.price_type_id !== this.article_price_type.id
            );

            // Agregamos las nuevas sin duplicar
            this.article.price_type_monedas = [...actuales, ...nuevos_datos];

            console.log(this.article.price_type_monedas);
        }
    }
}
</script>
