import { env } from '@/runtime_config'
export default {
	methods: {
		printPago(current_acount) {
            let model_id = current_acount.client_id
            if (current_acount.provider_id) {
                model_id = current_acount.provider_id
            }
            let link = env('VUE_APP_API_URL')+'/current-acount/pdf/'+current_acount.id
            window.open(link)
		}
	}
}