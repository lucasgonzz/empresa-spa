// sync_sales.js
import db from './db'

export default {
    methods: {
        /**
         * Guarda una venta localmente en IndexedDB
         * @param {Object} sale_data - Información completa de la venta
         */
        async save_sale_offline(sale_data) {
            console.log('agregando venta offlain:')
            console.log(sale_data)

            await db.sales.add({
                ...sale_data,
                created_at: new Date().toISOString()
            })

            const ventas = await db.sales.toArray()
            
            console.log('ventas guardadas:')
            console.log(ventas)

            // alert('🛒 Venta guardada en modo offline')

            let toast = '🛒 Venta guardada en modo offline'

            this.$toast.success(toast, {
                duration: 5000,
                position: 'top-right'
            })
        },

        /**
         * Intenta sincronizar todas las ventas no sincronizadas
         */
        async sync_pending_sales() {
            try {

                console.log('sync_pending_sales')
                const pending_sales = await db.sales.toArray()

                console.log('ventas para guardar:')
                console.log(pending_sales)

                let ventas_guardadas = []

                if (pending_sales.length) {
                    
                    for (const sale of pending_sales) {
                        try {
                            /** Evita enviar campos locales de IndexedDB al backend. */
                            const sale_to_sync = {
                                ...sale
                            }
                            delete sale_to_sync.id
                            delete sale_to_sync.created_at

                            const response = await this.$api.post('/sale', sale_to_sync)

                            if (response.status === 200 || response.status === 201) {
                                
                                // Elimino venta en bbdd local
                                await db.sales.delete(sale.id)
                                
                                ventas_guardadas.push(response.data.model)

                                console.log(`✅ Venta ${sale.id} sincronizada`)
                            }

                        } catch (error) {
                            console.error(`❌ Error al sincronizar venta ${sale.id}`, error)
                        }
                    }

                    // this.notificar_ventas_guardadas(ventas_guardadas)

                    /** Notifica solo la cantidad realmente guardada en servidor. */
                    if (ventas_guardadas.length) {

                        let toast = `🔁 Se sincronizaron ${ventas_guardadas.length} ventas offline exitosamente`
                        this.$toast.success(toast, {
                            duration: 5000,
                            position: 'top-right'
                        })
                    }

                    let ventas_locales = await db.sales.toArray()
                    // alert('quedaron estas ventas en bbdd local:', ventas_locales)
                }


            } catch (e) {
                let error = '❌ Error al guardar ventas offline:'
                console.error(e)
                this.$toast.error(error, {
                    duration: 5000,
                    position: 'top-right'
                })
            }
        },

        notificar_ventas_guardadas(ventas_guardadas) {
            let text = 'Se guardaron correctamente las ventas'
            ventas_guardadas.forEach(sale => {
                text += ' N° '+sale.num+','
            })
            alert(text)
        }
    }
}
