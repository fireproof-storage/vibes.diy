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
    <div className="relative mt-[40px] max-h-[calc(100vh-140px)] overflow-x-auto overflow-y-auto">
      <table className="w-full border-collapse text-left text-gray-900 dark:text-gray-100">
        <thead className="sticky top-0 z-10 bg-white dark:bg-gray-900">
          <tr key={'header' + Math.random()}>
            {headers.map((header: string) => (
              <th
                key={header}
                scope="col"
                className="text-11 px-[15px] py-[8px] text-gray-500 dark:text-gray-400"
              >
                {header === '_id' ? 'doc id' : header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-14 border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {rows.map((fields: any) => (
            <tr
              key={fields._id}
              className="cursor-pointer border-b border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
              onClick={() => {
                onRowClick(fields._id, dbName);
              }}
            >
              {headers.map((header: string) =>
                header === th ? (
                  <th
                    key={header}
                    scope="row"
                    className="px-[15px] py-[12px] text-xs whitespace-nowrap"
                  >
                    {formatTableCellContent(fields[header], header)}
                  </th>
                ) : (
                  <td
                    key={header}
                    className="px-[15px] py-[12px] text-xs"
                    title="Click to copy"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent row click handler from firing
                      const originalValue =
                        fields[header] !== undefined
                          ? typeof fields[header] === 'string'
                            ? fields[header]
                            : JSON.stringify(fields[header])
                          : '';
                      navigator.clipboard.writeText(originalValue);
                    }}
                  >
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
  return strOut.length > 30 ? `${strOut.substring(0, 25).trim()}...` : strOut;
}
