import axios from 'axios';

export async function fetchCatalog(params = {}, asStream = false) {
  return axios.get('https://learn.microsoft.com/api/catalog/', {
    params,
    responseType: asStream ? 'stream' : 'json',
  });
}

