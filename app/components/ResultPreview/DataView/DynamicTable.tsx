/* eslint-disable @typescript-eslint/no-explicit-any */

export default function DynamicTable({
  hrefFn,
  dbName,
  headers,
  rows,
  th = '_id',
  link = ['_id'],
  onRowClick = () => {},
}: any) {
  return (
    <div className="relative mt-[40px] overflow-x-scroll">
      <table className="text-gray-900 dark:text-gray-100 w-full border-collapse text-left">
        <thead className="relative z-10">
          <tr key={'header' + Math.random()}>
            {headers.map((header: string) => (
              <th key={header} scope="col" className="text-11 text-gray-500 dark:text-gray-400 px-[15px] py-[8px]">
                {header === '_id' ? 'doc id' : header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-14 border">
          {rows.map((fields: any) => (
            <tr
              key={fields._id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-700 cursor-pointer border-b"
              onClick={() => {
                onRowClick(fields._id, dbName);
              }}
            >
              {headers.map((header: string) =>
                header === th ? (
                  <th
                    key={header}
                    scope="row"
                    className="text-14 px-[15px] py-[12px] whitespace-nowrap"
                  >
                    {formatTableCellContent(fields[header], header)}
                  </th>
                ) : (
                  <td key={header} className="px-[15px] py-[12px]">
                    {formatTableCellContent(fields[header], header)}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatTableCellContent(obj: any, header: string): string {
  if (obj === undefined) return '';
  if (header === '_id') return obj.substring(0, 4) + '..' + obj.substring(obj.length - 4);
  const strOut = typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2);
  return strOut.length > 100 ? `${strOut.substring(0, 100)}...` : strOut;
}
