import { queryOptions } from '@tanstack/react-query';
import { QueryKey } from '@/shared/query/query-key.enum';
import { listTags } from './tags.use-cases';

export const tagQueries = {
  list: () => queryOptions({
    queryKey: [QueryKey.Tags],
    queryFn: listTags,
  }),
};
