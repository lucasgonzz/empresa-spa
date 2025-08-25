import syncArticlesMixin from '@/offline/sync_articles'
import syncSalesMixin from '@/offline/sync_sales'
import db from './db'

export default {
    mixins: [syncArticlesMixin, syncSalesMixin],
    methods: {
        sincronizar_offline() {
            console.log('sincronizar_offline')
            if (navigator.onLine) {
                console.log('🟢 Está online')
                this.sync_all_articles()
                this.sync_pending_sales()
            }
        },
        online() {
            this.$store.commit('auth/set_online', true)
            this.sincronizar_offline()
        },
        async offline() {
            this.$store.commit('auth/set_online', false)

            const meta = await db.meta.get('last_articles_sync')
            let last_update = meta.value
            let articles = await this.get_articles_offline()

            let mensaje = 'Se perdio la conexion a Internet, se van a utilizar los '+articles.length+' articulos descargados el '+this.date(last_update)+' a las '+this.hour(last_update)

            this.$toast.warning(mensaje, {
                duration: 7000,
                position: 'top'
            })
        },
    },
    created() {
        window.addEventListener('online', this.online)
        window.addEventListener('offline', this.offline)
        console.log('escuchando eventos online del navegador')
    },
    beforeDestroy() {
        window.removeEventListener('online', this.sincronizar_offline)
    }
}
