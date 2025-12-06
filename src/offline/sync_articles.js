// sync_articles.js
import db from './db'
import moment from 'moment-timezone'
/**
 * Descarga todos los artículos paginados desde la API
 * y los guarda en IndexedDB.
 */
export default {
    methods: {
        async sync_all_articles() {
            console.log('SINCRONIZANDO ARTICULOS')

            if (
                this.user.eliminar_articulos_offline
            ) {

                await db.articles.clear()
                await db.meta.clear()
                
                this.$toast.success('Se actualizo la memoria de productos')

                this.$api.put('user/set_eliminar_articulos_offline/'+this.user.id+'/0')
                .then(() => {
                    this.$toast.success('Reiniciando sistema...')
                    setTimeout(() => {

                        location.reload()
                    }, 2000)
                })
            } else {

                // Obtener la fecha de la última sincronización
                const meta = await db.meta.get('last_articles_sync')
                const updated_after = meta ? meta.value : null

                await this.articulos_eliminados(updated_after)

                await this.articulos_actualizados(updated_after)
            }


        },
        async articulos_eliminados(updated_after) {
            try {

                const res = await this.$api.get('/article/index/eliminados',  {
                    params: { updated_after }
                })

                const articles = res.data.models

                for (const article of articles) {
                    await db.articles.delete(article.id)
                    console.log('Se eliminó artículo id ' + article.id)
                }

                console.log('Se sincronizaron articulos eliminados')

            } catch (error) {
                alert('❌ Error al sincronizar artículos eliminados:', error)
            }
        },
        async articulos_actualizados(updated_after) {
            let current_page = 1
            let last_page = 1
            const per_page = 200 // ajustar si tu API permite más

            let articulos_descargados = 0

            try {

                // Descargo los articulos creados y actualizados
                do {
                 
                    const res = await this.$api.get('/article/index/from-status', {
                        params: {
                            updated_after,
                            page: current_page
                        }
                    })

                    const models = res.data.models

                    const articles = models.data

                    articulos_descargados += articles.length

                    // Guardamos los artículos relevantes
                    const mapped_articles = articles.map(a => ({
                        ...a,
                    }))

                    await db.articles.bulkPut(mapped_articles)

                    current_page = models.current_page + 1
                    last_page = models.last_page

                    console.log('se descargaron '+articles.length+' para offline')

                } while (current_page <= last_page)

                // Guardar nueva fecha de sincronización
                let now = moment().tz('America/Argentina/Buenos_Aires').format('YYYY-MM-DD HH:mm:ss')
                await db.meta.put({
                    key: 'last_articles_sync',
                    value: now
                })

                console.log('✅ Artículos sincronizados con IndexedDB')

                let articles = await this.get_articles_offline()
                console.log('articulos almacenados offline:')
                console.log(articles)

                let toast = 'Se actualizaron '+articulos_descargados+' articulos. '+articles.length+' articulos descargados'

                this.$toast.success(toast, {
                    duration: 5000,
                    position: 'top-right'
                })

            } catch (error) {
                alert('❌ Error al sincronizar artículos actualizados:', error)
            }
        }   
    }
}
