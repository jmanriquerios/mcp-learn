import axios from 'axios';

export async function fetchCatalog(params, stream = false) {
  const url = 'https://learn.microsoft.com/api/catalog/';
  const config = {
    method: 'get',
    url,
    params,
    responseType: stream ? 'stream' : 'json'
  };
  return axios(config);
}


