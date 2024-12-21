import { ref } from 'vue';
import axios from 'axios';

export function useFetch(url) {
  const data = ref(null);
  const loading = ref(true);
  const error = ref(null);

  const fetchData = async () => {
    try {
      const response = await axios.get(url);
      data.value = response.data;
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  fetchData();

  return { data, loading, error };
}
