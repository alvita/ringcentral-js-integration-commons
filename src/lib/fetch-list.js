export default async function fetchList(fn, params = {}) {
  let fetchedPages = 0;
  let totalPages = 1;
  let list = [];
  while (fetchedPages < totalPages) {
    fetchedPages++;
    const data = await fn({
      ...params,
      page: fetchedPages,
    });
    totalPages = data.paging.totalPages;
    list = list.concat(data.records);
  }
  return list;
}