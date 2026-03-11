<template>
    <div>
        <div v-for="moneda in monedas" :key="moneda.id" class="moneda-block">
            <h5>{{ moneda.name }}</h5>

            <b-input-group prepend="%">
                <b-form-input
                type="number"
                :disabled="is_inputs_disabled(moneda.id, 'percentage')"
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
                :disabled="is_inputs_disabled(moneda.id, 'final_price')"
                v-model.number="local.ptm[moneda.id].final_price"
                placeholder="Precio final"></b-form-input>
            </b-input-group>
            
            <p
            class="m-t-10 m-b-0">
                {{ price(local.ptm[moneda.id].final_price) }}
            </p>

            <b-form-checkbox
            class="m-t-10"
            :value="1"
            @change="toPayload"
            :unchecked-value="0"
            :disabled="local.ptm[moneda.id].cotizar_desde_otra_moneda == 1"
            v-model="local.ptm[moneda.id].setear_precio_final"
            size="sm">Setear precio final</b-form-checkbox>

            <b-form-checkbox
            class="m-t-10"
            :value="1"
            :unchecked-value="0"
            @change="on_change_cotizar_desde_otra(moneda.id)"
            v-model="local.ptm[moneda.id].cotizar_desde_otra_moneda"
            size="sm">Cotizar desde la otra moneda</b-form-checkbox>

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
                cotizar_desde_otra_moneda: 0,
            }

            if (typeof existente != 'undefined') {
                info.percentage = existente.percentage
                info.final_price = existente.final_price
                info.setear_precio_final = existente.setear_precio_final
                info.cotizar_desde_otra_moneda = existente.cotizar_desde_otra_moneda
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

        is_inputs_disabled(moneda_id, field) {
            const entry = this.local.ptm[moneda_id]

            // Si esta moneda se cotiza desde la otra => es derivada
            // entonces no se editan % ni final_price (se calculan desde la otra moneda)
            if (entry.cotizar_desde_otra_moneda == 1) {
              return true
            }

            // Modo normal: tu lógica actual
            if (field === 'percentage') {
              return entry.setear_precio_final == 1
            }

            if (field === 'final_price') {
              return entry.setear_precio_final == 0
            }

            return false
        },

        on_change_cotizar_desde_otra(moneda_id_changed) {
          const changed = this.local.ptm[moneda_id_changed]

          // Si lo activaron, apagar el flag en el resto de monedas del mismo price_type
          if (changed.cotizar_desde_otra_moneda == 1) {

            // ESTA moneda pasa a ser derivada -> no puede setear final
            changed.setear_precio_final = 0

            Object.keys(this.local.ptm).forEach(moneda_id => {
              const mid = parseInt(moneda_id)
              if (mid !== moneda_id_changed) {
                this.local.ptm[mid].cotizar_desde_otra_moneda = 0
              }
            })
          }

          this.toPayload()
        },
        toPayload() {
            let nuevos_datos = Object.values(this.local.ptm).map(entry => ({
                price_type_id: this.article_price_type.id,
                moneda_id: entry.moneda_id,
                percentage: entry.percentage,
                final_price: entry.final_price,
                setear_precio_final: entry.setear_precio_final,
                cotizar_desde_otra_moneda: entry.cotizar_desde_otra_moneda,
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
        },
    }
}
</script>
