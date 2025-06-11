import axios from 'axios';

export async function fetchCatalog(params = {}) {
  return axios.get('https://learn.microsoft.com/api/catalog/', { params, responseType: 'stream' });
}
