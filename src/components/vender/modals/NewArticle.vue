<template>
<b-modal id="new-article" title="Nuevo artículo" hide-footer>
    <b-form-group>
        <b-form-input
        id="new-article-name"
        v-model="new_article.name"
        placeholder="Ingrese el nombre del artículo"
        @keyup.enter="changeToPrice"></b-form-input>
    </b-form-group>
    <b-form-group>
        <b-form-input
        type="number"
        id="new-article-price"
        min="0"
        v-model="new_article.price"
        placeholder="Ingrese el precio del artículo"
        @keyup.enter="saveNewArticle"></b-form-input>
    </b-form-group>
    <btn-loader
    @clicked="saveNewArticle"
    text="Listo"
    :loader="loading"></btn-loader>
</b-modal>
</template>
<script>
import BtnLoader from '@/common-vue/components/BtnLoader'
import vender from '@/mixins/vender'
export default {
    mixins: [vender],
    components: {
        BtnLoader,
    },
    data() {
        return {
            loading: false,
        }
    },
    computed: {
        new_article() {
            return this.$store.state.vender.new_article
        },
    },
    methods: {
        changeToPrice() {
            document.getElementById('new-article-price').focus()
        },
        saveNewArticle() {
            if (this.check()) {
                this.loading = true
                this.$api.post('article/new-article', this.new_article)
                .then(res => {
                    this.loading = false
                    let article = res.data.model
                    this.$toast.success('Articulo guardado')
                    this.$store.commit('article/add', article)

                    this.$bvModal.hide('new-article')
                    this.setVenderArticle(article)
                })
                .catch(err => {
                    this.loading = false
                    console.log(err)
                })
            }
        },
        check() {
            if (this.new_article.price == '' || typeof this.new_article.price == 'undefined') {
                this.$toast.error('Ingrese un precio para el articulo')
                return false
            } else {
                return true
            }
        },
    }
}
</script>