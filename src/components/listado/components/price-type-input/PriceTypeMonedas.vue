<template>
    <div class="cont-price-types">
        <!--
            Mision modal-articulo-listas-dolares-estilo-y-ayuda (16/10/2026): cada moneda de la lista
            se dibuja como la tarjeta de una cuenta SIN dolares (ContPriceType + OptionsPriceType):
            el precio grande arriba con su "?", de donde salio, el campo que manda y el que se
            deriva, y los interruptores con su explicacion. Las clases `price-type-card__*` son las
            mismas y se estilan en `price-type-input/Index.vue`: una sola hoja para las dos formas.

            La logica de datos (local.ptm, toPayload, is_inputs_disabled) no cambio.
        -->
        <div
        v-for="(moneda, index) in monedas"
        :key="moneda.id"
        :data-tour="solo_lectura && index === 0 ? 'listado.campo_precio_final' : null"
        class="moneda-block">
            <h5 class="price-type-moneda__nombre">{{ moneda.name }}</h5>

            <div class="price-type-card__encabezado">
                <div class="price-type-card__precio">
                    {{ price(precio_por_moneda(moneda.id).final_price) }}
                </div>

                <!-- Sin id de articulo no hay nada que explicar (alta nueva) y el endpoint
                     contestaria 404, asi que el boton no se dibuja. -->
                <b-button
                v-if="article.id"
                :data-tour="solo_lectura && index === 0 ? 'listado.boton_explicacion_precio' : null"
                class="price-type-card__info btn-explicacion"
                @click="info(moneda.id)"
                variant="outline-secondary"
                title="Ver cómo se calculó este precio"
                size="sm">
                    <i class="bi bi-question-lg"></i>
                </b-button>
            </div>

            <div class="price-type-card__origen">
                {{ origen_del_precio(moneda) }}
            </div>

            <div v-if="!solo_lectura" class="price-type-card__campos">
                <b-input-group
                v-if="!is_inputs_disabled(moneda.id, 'percentage') && can('article.percentage_gain')"
                class="price-type-card__campo price-type-card__campo--manda"
                prepend="%">
                    <b-form-input
                    type="number"
                    aria-label="Margen de ganancia"
                    v-model.number="local.ptm[moneda.id].percentage"
                    @change="toPayload"
                    placeholder="Porcentaje"></b-form-input>
                </b-input-group>

                <b-input-group
                v-if="!is_inputs_disabled(moneda.id, 'final_price')"
                class="price-type-card__campo price-type-card__campo--manda"
                prepend="$">
                    <b-form-input
                    type="number"
                    @change="toPayload"
                    aria-label="Precio final"
                    v-model.number="local.ptm[moneda.id].final_price"
                    placeholder="Precio final"></b-form-input>
                </b-input-group>
            </div>

            <div v-if="!solo_lectura" class="price-type-card__opciones m-t-10">
                <div class="price-type-card__interruptor">
                    <b-form-checkbox
                    switch
                    variant="success"
                    :value="1"
                    @change="toPayload"
                    :unchecked-value="0"
                    :disabled="local.ptm[moneda.id].cotizar_desde_otra_moneda == 1"
                    v-model="local.ptm[moneda.id].setear_precio_final"
                    size="sm">Setear precio final</b-form-checkbox>

                    <div class="price-type-card__interruptor-ayuda">
                        <template v-if="local.ptm[moneda.id].cotizar_desde_otra_moneda == 1">
                            No se carga: el precio sale de la otra moneda
                        </template>
                        <template v-else-if="local.ptm[moneda.id].setear_precio_final == 1">
                            Cargá el precio y el sistema calcula el margen.
                        </template>
                        <template v-else>
                            Cargá el margen y el sistema calcula el precio.
                        </template>
                    </div>
                </div>

                <!--
                    🔴 El `data-tour` va en un div envolvente y NO en el `b-form-checkbox`, y esto se
                    midio: `b-form-checkbox` declara `inheritAttrs: false` y baja los atributos sueltos
                    al `<input>`, que en Bootstrap 4 es el control invisible (`opacity: 0`) escondido
                    detras del label. El lead clickea el LABEL, que no es descendiente del input, asi
                    que el avance por clic del tour nunca se disparaba.

                    🔴 Y sale una sola vez: este bloque se dibuja una vez por MONEDA dentro de cada
                    lista de precios, o sea NxM. Sin la condicion, el mismo valor aparece repetido y el
                    clip 1.5 termina resaltando la moneda que le toque.

                    Es el mismo div que ahora tambien es la caja del interruptor: el envolvente lleva
                    el ancla, la clase es solo estilo.
                -->
                <div
                class="price-type-card__interruptor"
                :data-tour="anclar_opciones && index === 0 ? 'listado.toggle_cotizar_desde_otra_moneda' : null">
                    <b-form-checkbox
                    variant="success"
                    :value="1"
                    :unchecked-value="0"
                    @change="on_change_cotizar_desde_otra(moneda.id)"
                    v-model="local.ptm[moneda.id].cotizar_desde_otra_moneda"
                    size="sm">Cotizar desde la otra moneda</b-form-checkbox>

                    <div class="price-type-card__interruptor-ayuda">
                        El precio sale del de la otra moneda, al dólar de la cuenta
                    </div>
                </div>
            </div>

            <hr>
        </div>
    </div>
</template>
<script>
import descripcion_de_lista from '@/components/listado/components/price-type-input/descripcion_de_lista'

export default {
    mixins: [descripcion_de_lista],
    props: {
        article_price_type: Object,
        anclar_opciones: Boolean,
        solo_lectura: Boolean,
    },
    data() {
        return {
            local: {
                ptm: {} // indexado por moneda.id
            }
        };
    },
    computed: {
        monedas() {
            let modelos = this.$store.state.moneda.models
            return this.solo_lectura ? modelos.filter(moneda => this.dato_guardado(moneda.id)) : modelos
        },
        article() {
            return this.$store.state.article.model
        },
    },
    created() {
        this.cargar_monedas()
    },
    watch: {
        article() {
            this.cargar_monedas()
        },
        article_price_type() {
            this.cargar_monedas()
        },
    },
    methods: {
        cargar_monedas() {
            if (this.solo_lectura) return

            const cotiza_a_pesos = !!(this.owner && Number(this.owner.cotizar_precios_en_dolares))
            const filas = {}

            this.monedas.forEach(moneda => {
                const existente = this.dato_guardado(moneda.id)
                filas[moneda.id] = {
                    moneda_id: moneda.id,
                    percentage: existente ? existente.percentage : '',
                    final_price: existente ? existente.final_price : '',
                    setear_precio_final: existente ? Number(existente.setear_precio_final) : 0,
                    cotizar_desde_otra_moneda: existente
                        ? existente.cotizar_desde_otra_moneda
                        : Number((cotiza_a_pesos && moneda.id == 2) || (!cotiza_a_pesos && moneda.id == 1)),
                }
            })
            this.local.ptm = filas
        },
        dato_guardado(moneda_id) {
            return (this.article.price_type_monedas || []).find(ptm =>
                ptm.price_type_id == this.article_price_type.id && ptm.moneda_id == moneda_id
            )
        },

        precio_por_moneda(moneda_id) {
            return this.solo_lectura ? this.dato_guardado(moneda_id) : this.local.ptm[moneda_id]
        },

        /**
         * "?" de una moneda de la lista: el desglose del precio de ESTA lista en ESTA moneda, en el
         * mismo modal que usa la tarjeta de una cuenta sin dolares (ver el mixin). Explica lo que
         * esta GUARDADO: igual que en la otra tarjeta, un cambio sin guardar no se refleja hasta
         * que se guarda.
         *
         * @param {Number} moneda_id
         */
        info(moneda_id) {
            this.info_de_lista(this.article_price_type.id, moneda_id)
        },

        /**
         * De donde sale el precio de una moneda, en una linea (el equivalente de la linea "Margen de
         * X%" / "Precio fijado a mano" de la tarjeta de una cuenta sin dolares).
         *
         * @param {Object} moneda
         * @returns {String}
         */
        origen_del_precio(moneda) {
            const entry = this.precio_por_moneda(moneda.id)

            if (entry.cotizar_desde_otra_moneda == 1) {
                const otra = this.monedas.find(m => m.id != moneda.id)

                return 'Cotizado desde ' + (otra ? otra.name : 'la otra moneda')
            }

            if (entry.setear_precio_final == 1) {
                return 'Precio fijado a mano'
            }

            const valor = entry.percentage

            if (valor === null || valor === '' || typeof valor == 'undefined') {
                return 'Margen de 0%'
            }

            return 'Margen de ' + this.porcentaje_es(Math.round(parseFloat(valor) * 100) / 100) + '%'
        },

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
                e => e.price_type_id != this.article_price_type.id
            );

            // Agregamos las nuevas sin duplicar
            this.article.price_type_monedas = [...actuales, ...nuevos_datos];

            console.log(this.article.price_type_monedas);
        },
    }
}
</script>
