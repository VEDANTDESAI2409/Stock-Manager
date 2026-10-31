import { useQuery } from '@tanstack/react-query';
import api from './api';

const useApiQuery = (path, { params, ...options } = {}) =>
  useQuery({
    queryKey: ['api', path.replace(/^\/+/, ''), params || {}],
    queryFn: async ({ signal }) => {
      const response = await api.get(path, { params, signal });
      return response.data;
    },
    ...options,
  });

export default useApiQuery;